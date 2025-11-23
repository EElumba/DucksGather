from __future__ import annotations

from datetime import date, time, datetime
from typing import Optional

from flask import Blueprint, jsonify, request, g
import os

from backend.src.db.db_init import get_db
from backend.src.models.models import Event, User, UserEvent, Organization, Location
from backend.src.auth.jwt import require_auth, require_app_user

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
    """Public: list events with optional filtering & pagination.

    Query params:
      category (repeatable or comma list)
      from (date >=)
      to (date <=)
      q (search in title/description, case-insensitive)
      page (1-based)
      page_size (default 20, max 100)

    Response: { items: [...], page, page_size, total }
    """
    db = get_db()
    debug = os.getenv('EVENTS_DEBUG') == '1'
    if debug:
        print('[events] list_events request args:', dict(request.args))
    try:
        q = db.query(Event)

        # Categories filter (case-insensitive, normalized to lowercase)
        from sqlalchemy import func  # local import to avoid global dependency when unused

        raw_list = request.args.getlist("category")
        single = request.args.get("category")
        categories = raw_list or ([s.strip() for s in single.split(",")] if single else [])
        cats = [c.lower().strip() for c in dict.fromkeys(categories) if c]
        if cats:
            q = q.filter(func.lower(Event.category).in_(cats))

        # Date range
        from_str = request.args.get("from")
        to_str = request.args.get("to")
        if from_str:
            try:
                q = q.filter(Event.date >= parse_date(from_str))
            except ValueError:
                return jsonify({"error": "Invalid 'from' date"}), 400
        if to_str:
            try:
                q = q.filter(Event.date <= parse_date(to_str))
            except ValueError:
                return jsonify({"error": "Invalid 'to' date"}), 400

        # Text search
        search = request.args.get("q")
        if search:
            pattern = f"%{search.strip()}%"
            from sqlalchemy import or_, func  # local import to keep top clean and optional in tests
            if db.bind.dialect.name == 'postgresql':
                q = q.filter(or_(Event.title.ilike(pattern), Event.description.ilike(pattern)))
            else:
                lower_pat = pattern.lower()
                q = q.filter(
                    or_(func.lower(Event.title).like(lower_pat), func.lower(Event.description).like(lower_pat))
                )

        # Total before pagination
        total = q.count()

        # Pagination
        try:
            page = int(request.args.get("page", "1"))
            page_size = int(request.args.get("page_size", "20"))
        except ValueError:
            return jsonify({"error": "page and page_size must be integers"}), 400
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 1
        if page_size > 100:
            page_size = 100
        offset = (page - 1) * page_size

        q = q.order_by(Event.date, Event.start_time).offset(offset).limit(page_size)
        items = [e.to_dict() for e in q.all()]
        total_pages = (total + page_size - 1) // page_size
        resp = {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages
        }
        if debug:
            print('[events] list_events response meta:', {"count": len(items), "page": page, "page_size": page_size, "total": total, "total_pages": total_pages})
        return jsonify(resp), 200
    except Exception as e:
        # Emit structured JSON error instead of HTML 500 page
        if debug:
            print('[events] ERROR list_events ->', repr(e))
        return jsonify({"error": "internal", "detail": str(e)}), 500
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
@require_app_user(require_uo_domain=True)
def create_event():
    """Authenticated: create an event.
    Body JSON: title, description?, category, date (YYYY-MM-DD), start_time, end_time,
               organization_id?, location_id?, image_url?, external_url?
    created_by is taken from the JWT (g.user_id).
    """
    db = get_db()

    if g.app_user.role != 'coordinator' and g.app_user.role != 'admin':
        return jsonify({"error": "Insufficient permissions to create events"}), 403
    
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

        # Normalize category to a canonical lowercase form for consistent filtering
        raw_category = data["category"]
        category = raw_category.lower().strip() if isinstance(raw_category, str) else raw_category

        organization_name = (data.get("organization_name") or "").strip() or None
        building_name = (data.get("building_name") or "").strip() or None
        room_number = (data.get("room_number") or "").strip() or None

        org_id = None
        loc_id = None
        if organization_name:
            existing_org = (
                db.query(Organization)
                .filter(Organization.name.ilike(organization_name))
                .first()
            )
            if existing_org:
                org_id = existing_org.organization_id
            else:
                new_org = Organization(name=organization_name)
                db.add(new_org)
                db.flush()
                org_id = new_org.organization_id

        if building_name and room_number:
            existing_loc = (
                db.query(Location)
                .filter(
                    Location.building_name.ilike(building_name),
                    Location.room_number == room_number,
                )
                .first()
            )
            if existing_loc:
                loc_id = existing_loc.location_id
            else:
                new_loc = Location(
                    building_name=building_name,
                    room_number=room_number,
                )
                db.add(new_loc)
                db.flush()
                loc_id = new_loc.location_id

        ev = Event(
            title=data["title"],
            description=data.get("description"),
            category=category,
            date=d,
            start_time=st,
            end_time=et,
            image_url=data.get("image_url"),
            external_url=data.get("external_url"),
            organization_id=org_id,
            location_id=loc_id,
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
@require_app_user()
def update_event(event_id: int):
    """Authenticated: update fields of an event I own."""
    db = get_db()
    try:
        ev = db.query(Event).filter(Event.event_id == event_id).first()
        if not ev:
            return jsonify({"error": "Not found"}), 404
        # Authorization: creator OR admin may update.
        # Normalize types (GUID may be uuid.UUID; g.user_id is str)
        if not ev.created_by:
            return jsonify({"error": "Forbidden"}), 403
        if str(ev.created_by) != str(g.user_id) and g.app_user.role != 'admin':
            return jsonify({"error": "Forbidden"}), 403

        data = request.get_json(force=True)
        # Apply only known fields
        for key in ["title", "description", "category", "image_url", "external_url"]:
            if key in data:
                if key == "category" and isinstance(data[key], str):
                    setattr(ev, key, data[key].lower().strip())
                else:
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
@require_app_user()
def delete_event(event_id: int):
    """Authenticated: delete an event I own or any event if admin."""
    db = get_db()
    try:
        ev = db.query(Event).filter(Event.event_id == event_id).first()
        if not ev:
            return jsonify({"error": "Not found"}), 404

        # Allow creator OR admin
        if not ev.created_by:
            return jsonify({"error": "Forbidden"}), 403
        if str(ev.created_by) != str(g.user_id) and g.app_user.role != 'admin':
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

# _ensure_user removed; handled by @require_app_user decorator.


@bp.post("/<int:event_id>/save")
@require_app_user()
def save_event(event_id: int):
    """Authenticated: save (show interest in) an event for the current user."""
    db = get_db()
    try:
        # Ensure event exists
        ev = db.query(Event).filter(Event.event_id == event_id).first()
        if not ev:
            return jsonify({"error": "Not found"}), 404

    # App user already ensured by decorator (g.app_user)

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
@require_app_user()
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
@require_app_user()
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