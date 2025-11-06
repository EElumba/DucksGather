from __future__ import annotations

from datetime import date, time, datetime
from typing import List, Optional

from backend.src.models.models import Event, User, UserEvent
from backend.src.services.errors import ValidationError, NotFoundError, ForbiddenError


# Local helpers (service-scoped) ------------------------------------------------

def _parse_date(value: Optional[str | date]) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(value).date()
    except Exception:
        raise ValidationError("Invalid date format; expected YYYY-MM-DD")


def _parse_time(value: Optional[str | time]) -> Optional[time]:
    if value is None:
        return None
    if isinstance(value, time):
        return value
    if isinstance(value, str) and len(value.split(":")) == 2:
        value = value + ":00"
    try:
        return time.fromisoformat(value)  # type: ignore[arg-type]
    except Exception:
        raise ValidationError("Invalid time format; expected HH:MM or HH:MM:SS")


def _ensure_user(db, user_id, email: Optional[str]) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        return user
    user = User(user_id=user_id, email=email)
    db.add(user)
    return user


def _get_user_role(db, user_id) -> str:
    """Return the user's role; default to 'user' when unknown or missing.
    Valid roles in this system: 'user', 'coordinator', 'admin'.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if user and getattr(user, "role", None):
        return user.role
    return "user"


# Query/list --------------------------------------------------------------------

def list_events(
    db,
    *,
    category: Optional[str] = None,
    from_str: Optional[str] = None,
    to_str: Optional[str] = None,
) -> List[Event]:
    q = db.query(Event)
    if category:
        q = q.filter(Event.category == category)
    if from_str:
        q = q.filter(Event.date >= _parse_date(from_str))
    if to_str:
        q = q.filter(Event.date <= _parse_date(to_str))
    q = q.order_by(Event.date, Event.start_time)
    return q.all()


def get_event(db, event_id: int) -> Optional[Event]:
    return db.query(Event).filter(Event.event_id == event_id).first()


# Mutations ---------------------------------------------------------------------

def create_event(db, *, user_id, data: dict) -> Event:
    # Enforce RBAC: only coordinators and admins can create events
    role = _get_user_role(db, user_id)
    if role not in ("coordinator", "admin"):
        raise ForbiddenError("Forbidden")

    required = ["title", "category", "date", "start_time", "end_time"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        raise ValidationError(f"Missing fields: {', '.join(missing)}")

    d = _parse_date(data["date"])  # may raise ValidationError
    st = _parse_time(data["start_time"])  # may raise ValidationError
    et = _parse_time(data["end_time"])  # may raise ValidationError
    assert st is not None and et is not None
    if et <= st:
        raise ValidationError("end_time must be after start_time")

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
        created_by=user_id,
        is_scraped=False,
    )
    db.add(ev)
    return ev


def update_event(db, *, user_id, event_id: int, data: dict) -> Event:
    ev = db.query(Event).filter(Event.event_id == event_id).first()
    if not ev:
        raise NotFoundError("Not found")
    role = _get_user_role(db, user_id)
    if not (role == "admin" or (ev.created_by and ev.created_by == user_id)):
        raise ForbiddenError("Forbidden")

    # Apply only known fields
    for key in ["title", "description", "category", "image_url", "external_url"]:
        if key in data:
            setattr(ev, key, data[key])
    if "date" in data:
        ev.date = _parse_date(data["date"])  # may raise ValidationError
    if "start_time" in data:
        ev.start_time = _parse_time(data["start_time"])  # may raise ValidationError
    if "end_time" in data:
        ev.end_time = _parse_time(data["end_time"])  # may raise ValidationError
    if ev.end_time <= ev.start_time:
        raise ValidationError("end_time must be after start_time")
    if "organization_id" in data:
        ev.organization_id = data["organization_id"]
    if "location_id" in data:
        ev.location_id = data["location_id"]

    return ev


def delete_event(db, *, user_id, event_id: int) -> None:
    ev = db.query(Event).filter(Event.event_id == event_id).first()
    if not ev:
        raise NotFoundError("Not found")
    role = _get_user_role(db, user_id)
    if not (role == "admin" or (ev.created_by and ev.created_by == user_id)):
        raise ForbiddenError("Forbidden")
    db.delete(ev)


def save_event(db, *, user_id, email: Optional[str], event_id: int) -> bool:
    ev = db.query(Event).filter(Event.event_id == event_id).first()
    if not ev:
        raise NotFoundError("Not found")

    _ensure_user(db, user_id, email)

    existing = (
        db.query(UserEvent)
        .filter(UserEvent.user_id == user_id, UserEvent.event_id == event_id)
        .first()
    )
    if existing:
        return True
    rel = UserEvent(user_id=user_id, event_id=event_id)
    db.add(rel)
    return True


def unsave_event(db, *, user_id, event_id: int) -> bool:
    rel = (
        db.query(UserEvent)
        .filter(UserEvent.user_id == user_id, UserEvent.event_id == event_id)
        .first()
    )
    if not rel:
        return False
    db.delete(rel)
    return False


def list_saved_events(db, *, user_id) -> List[Event]:
    return (
        db.query(Event)
        .join(UserEvent, UserEvent.event_id == Event.event_id)
        .filter(UserEvent.user_id == user_id)
        .order_by(Event.date, Event.start_time)
        .all()
    )