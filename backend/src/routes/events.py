from __future__ import annotations

from datetime import date, time, datetime
from typing import Optional

from flask import Blueprint, jsonify, request, g

from backend.src.db.db_init import get_db
from backend.src.models.models import Event, User, UserEvent
from backend.src.auth.jwt import require_auth

bp = Blueprint("events", __name__, url_prefix="/api/events")


# Helpers

def parse_date(value: str) -> date:
    return datetime.fromisoformat(value).date() if isinstance(value, str) else value


def parse_time(value: str) -> time:
    # Accept formats like "14:00" or "14:00:00"
    if isinstance(value, str) and len(value.split(":")) == 2:
        value = value + ":00"
    if isinstance(value, str):
        try:
            return time.fromisoformat(value)
        except ValueError:
            raise ValueError(f"Invalid time format: '{value}'. Expected HH:MM or HH:MM:SS.")
    return value


# Routes

@bp.get("/")
def list_events():
    """Public: list upcoming events (optionally filter by category/date).
    Query params: category, from, to
    """
    db = get_db()
    try:
        q = db.query(Event)

       # Collect categories from repeatable params or comma-separated fallback (can now accept many categories)
        raw_list = request.args.getlist("category")  # ?category=a&category=b
        single = request.args.get("category")        # ?category=a or ?category=a,b
        categories = raw_list or ([s.strip() for s in single.split(",")] if single else [])
        # De-dup and drop empties
        cats = [c for c in dict.fromkeys(categories) if c]
        if cats:
            q = q.filter(Event.category.in_(cats))

        from_str = request.args.get("from")
        to_str = request.args.get("to")
        if from_str:
            q = q.filter(Event.date >= parse_date(from_str))
        if to_str:
            q = q.filter(Event.date <= parse_date(to_str))

        q = q.order_by(Event.date, Event.start_time)
        items = [e.to_dict() for e in q.all()]
        return jsonify(items), 200
    finally:
        db.close()


@bp.get("/<int:event_id>")
def get_event(event_id: int):
    """Public: get single event.

    Responses:
        200: Event found and returned as JSON.
        404: Event not found.
    """
    db = get_db()
    try:
        ev = db.query(Event).filter(Event.event_id == event_id).first()
        if not ev:
            return jsonify({"error": "Not found"}), 404
        return jsonify(ev.to_dict()), 200
    finally:
        db.close()


@bp.post("/")
@require_auth(require_uo_domain=False)
def create_event():
    """Authenticated: create an event.
    Body JSON: title, description?, category, date (YYYY-MM-DD), start_time, end_time,
               organization_id?, location_id?, image_url?, external_url?
    created_by is taken from the JWT (g.user_id).
    """
    db = get_db()
    try:
        data = request.get_json(force=True)
        # Only core fields are required; organization/location are optional
        required = ["title", "category", "date", "start_time", "end_time"]
        missing = [k for k in required if not data.get(k)]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        # Parse and validate
        d = parse_date(data["date"])  # may raise ValueError -> 400
        st = parse_time(data["start_time"])
        et = parse_time(data["end_time"]) 
        if et <= st:
            return jsonify({"error": "end_time must be after start_time"}), 400

        ev = Event(
            title=data["title"],
            description=data.get("description"),
            category=data["category"],
            date=d,
            start_time=st,
            end_time=et,
            image_url=data.get("image_url"),
            external_url=data.get("external_url"),
            organization_id=data.get("organization_id"),
            location_id=data.get("location_id"),
            created_by=g.user_id,
            is_scraped=False,
        )
        db.add(ev)
        db.commit()
        return jsonify(ev.to_dict()), 201
    except ValueError as ve:
        db.rollback()
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@bp.put("/<int:event_id>")
@bp.patch("/<int:event_id>")
@require_auth()
def update_event(event_id: int):
    """Authenticated: update fields of an event I own."""
    db = get_db()
    try:
        ev = db.query(Event).filter(Event.event_id == event_id).first()
        if not ev:
            return jsonify({"error": "Not found"}), 404
        if not ev.created_by or ev.created_by != g.user_id:
            return jsonify({"error": "Forbidden"}), 403

        data = request.get_json(force=True)
        # Apply only known fields
        for key in ["title", "description", "category", "image_url", "external_url"]:
            if key in data:
                setattr(ev, key, data[key])
        if "date" in data:
            ev.date = parse_date(data["date"])
        if "start_time" in data:
            ev.start_time = parse_time(data["start_time"])
        if "end_time" in data:
            ev.end_time = parse_time(data["end_time"])
        if ev.end_time <= ev.start_time:
            return jsonify({"error": "end_time must be after start_time"}), 400
        if "organization_id" in data:
            ev.organization_id = data["organization_id"]
        if "location_id" in data:
            ev.location_id = data["location_id"]

        db.commit()
        return jsonify(ev.to_dict()), 200
    except ValueError as ve:
        db.rollback()
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@bp.delete("/<int:event_id>")
@require_auth()
def delete_event(event_id: int):
    """Authenticated: delete an event I own."""
    db = get_db()
    try:
        ev = db.query(Event).filter(Event.event_id == event_id).first()
        if not ev:
            return jsonify({"error": "Not found"}), 404
        if not ev.created_by or ev.created_by != g.user_id:
            return jsonify({"error": "Forbidden"}), 403
        db.delete(ev)
        db.commit()
        return jsonify({"status": "deleted"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# Interest (save/unsave) endpoints

def _ensure_user(db) -> User:
    """Ensure a User row exists for the authenticated subject.
    Supabase provides the user id (sub) and email in the JWT. If the user row
    doesn't exist yet (first action in our DB), create it.
    """
    uid = g.user_id
    email = g.get("email")
    user = db.query(User).filter(User.user_id == uid).first()
    if user:
        return user
    user = User(user_id=uid, email=email)
    db.add(user)
    db.commit()
    return user


@bp.post("/<int:event_id>/save")
@require_auth()
def save_event(event_id: int):
    """Authenticated: save (show interest in) an event for the current user."""
    db = get_db()
    try:
        # Ensure event exists
        ev = db.query(Event).filter(Event.event_id == event_id).first()
        if not ev:
            return jsonify({"error": "Not found"}), 404

        # Ensure user row exists
        _ensure_user(db)

        # Upsert into user_events
        existing = (
            db.query(UserEvent)
            .filter(UserEvent.user_id == g.user_id, UserEvent.event_id == event_id)
            .first()
        )
        if not existing:
            rel = UserEvent(user_id=g.user_id, event_id=event_id)
            db.add(rel)
            db.commit()
        return jsonify({"saved": True, "event_id": event_id}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@bp.delete("/<int:event_id>/save")
@require_auth()
def unsave_event(event_id: int):
    """Authenticated: remove saved event for the current user."""
    db = get_db()
    try:
        rel = (
            db.query(UserEvent)
            .filter(UserEvent.user_id == g.user_id, UserEvent.event_id == event_id)
            .first()
        )
        if not rel:
            return jsonify({"saved": False, "event_id": event_id}), 200
        db.delete(rel)
        db.commit()
        return jsonify({"saved": False, "event_id": event_id}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@bp.get("/saved")
@require_auth()
def list_saved_events():
    """Authenticated: list my saved events."""
    db = get_db()
    try:
        # Join user_events -> events; eager-load related location/organization via to_dict
        saved = (
            db.query(Event)
            .join(UserEvent, UserEvent.event_id == Event.event_id)
            .filter(UserEvent.user_id == g.user_id)
            .order_by(Event.date, Event.start_time)
            .all()
        )
        return jsonify([e.to_dict() for e in saved]), 200
    finally:
        db.close()