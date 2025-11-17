import os
from datetime import date, timedelta

import jwt


def make_token(sub: str, email: str) -> str:
    secret = os.environ["SUPABASE_JWT_SECRET"]
    payload = {
        "sub": sub,
        "email": email,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_create_requires_auth(client):
    # Minimal body, should be unauthorized without token
    body = {
        "title": "Hack Night",
        "category": "tech",
        "date": (date.today() + timedelta(days=1)).isoformat(),
        "start_time": "18:00",
        "end_time": "19:00",
    }
    resp = client.post("/api/events/", json=body)
    assert resp.status_code == 401


def test_create_and_save_flow(client):
    # Seed coordinator role explicitly (no self-assign via token) before making requests.
    from backend.src.db.db_init import SessionLocal
    from backend.src.models.models import User
    user_id = "00000000-0000-0000-0000-000000000001"
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.user_id == user_id).first():
            db.add(User(user_id=user_id, email="test@uoregon.edu", role="coordinator"))
            db.commit()
    finally:
        db.close()
    token = make_token(user_id, "test@uoregon.edu")
    headers = {"Authorization": f"Bearer {token}"}

    # Create an event
    body = {
        "title": "Club Meetup",
        "category": "social",
        "date": (date.today() + timedelta(days=2)).isoformat(),
        "start_time": "17:00",
        "end_time": "18:00",
    }
    r = client.post("/api/events/", json=body, headers=headers)
    assert r.status_code == 201, r.get_data(as_text=True)
    event = r.get_json()
    event_id = event["event_id"]
    assert event["created_by"] == "00000000-0000-0000-0000-000000000001"

    # Save the event
    r = client.post(f"/api/events/{event_id}/save", headers=headers)
    assert r.status_code == 200
    assert r.get_json()["saved"] is True

    # List saved events
    r = client.get("/api/events/saved", headers=headers)
    assert r.status_code == 200
    saved = r.get_json()
    assert any(e["event_id"] == event_id for e in saved)

    # Unsave the event
    r = client.delete(f"/api/events/{event_id}/save", headers=headers)
    assert r.status_code == 200
    assert r.get_json()["saved"] is False

    # Verify it's gone
    r = client.get("/api/events/saved", headers=headers)
    assert r.status_code == 200
    saved = r.get_json()
    assert all(e["event_id"] != event_id for e in saved)


def test_me_returns_seeded_role(client):
    """Ensure /api/users/me reflects the role we manually seeded (coordinator)."""
    from backend.src.db.db_init import SessionLocal
    from backend.src.models.models import User
    user_id = "00000000-0000-0000-0000-000000000009"
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.user_id == user_id).first()
        if not existing:
            db.add(User(user_id=user_id, email="me-check@uoregon.edu", role="coordinator"))
            db.commit()
    finally:
        db.close()
    token = make_token(user_id, "me-check@uoregon.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/users/me", headers=headers)
    assert resp.status_code == 200, resp.get_data(as_text=True)
    body = resp.get_json()
    assert body["user_id"] == user_id
    assert body["role"] == "coordinator"
    assert body["email"] == "me-check@uoregon.edu"


def test_events_pagination_and_search(client):
    """Create multiple events and verify pagination + search filtering works."""
    from backend.src.db.db_init import SessionLocal
    from backend.src.models.models import User, Event
    db = SessionLocal()
    user_id = "00000000-0000-0000-0000-000000000010"
    try:
        if not db.query(User).filter(User.user_id == user_id).first():
            db.add(User(user_id=user_id, email="pager@uoregon.edu", role="coordinator"))
            db.commit()
        # Bulk create 25 events
        existing_count = db.query(Event).count()
        to_create = max(0, 25 - existing_count)
        from datetime import date, timedelta, time as _t
        for i in range(to_create):
            ev = Event(
                title=f"Pagination Event {i}",
                category="test",
                date=date.today() + timedelta(days=i+1),
                start_time=_t(10, 0),
                end_time=_t(11, 0),
                created_by=user_id,
                is_scraped=False,
            )
            db.add(ev)
        if to_create:
            db.commit()
    finally:
        db.close()
    token = make_token(user_id, "pager@uoregon.edu")
    headers = {"Authorization": f"Bearer {token}"}
    # Page 2 with page_size=10 should return items 11-20 (IDs may not be contiguous, so verify count & meta)
    r = client.get("/api/events/?page=2&page_size=10", headers=headers)
    assert r.status_code == 200, r.get_data(as_text=True)
    body = r.get_json()
    assert body["page"] == 2
    assert body["page_size"] == 10
    assert body["total"] >= 25
    assert len(body["items"]) <= 10
    assert body["total_pages"] >= 3  # 25 items over page_size 10 => at least 3 pages
    # Search test - pick a known title fragment
    r2 = client.get("/api/events/?q=Pagination+Event+1", headers=headers)
    assert r2.status_code == 200
    body2 = r2.get_json()
    assert isinstance(body2["items"], list)
    assert any("Pagination Event 1" in e["title"] for e in body2["items"])


def test_event_update_flow(client):
    """Owner can update an event, non-owner forbidden."""
    from backend.src.db.db_init import SessionLocal
    from backend.src.models.models import User, Event
    owner_id = "00000000-0000-0000-0000-000000000011"
    other_id = "00000000-0000-0000-0000-000000000012"
    db = SessionLocal()
    try:
        for uid, email in [(owner_id, "owner@uoregon.edu"), (other_id, "other@uoregon.edu")]:
            if not db.query(User).filter(User.user_id == uid).first():
                db.add(User(user_id=uid, email=email, role="coordinator"))
        db.commit()
        # Create event by owner
        from datetime import date, timedelta, time as _t
        ev = Event(
            title="Update Target",
            category="update",
            date=date.today() + timedelta(days=3),
            start_time=_t(9, 0),
            end_time=_t(10, 0),
            created_by=owner_id,
            is_scraped=False,
        )
        db.add(ev)
        db.commit()
        event_id = ev.event_id
    finally:
        db.close()
    owner_token = make_token(owner_id, "owner@uoregon.edu")
    other_token = make_token(other_id, "other@uoregon.edu")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    other_headers = {"Authorization": f"Bearer {other_token}"}
    # Owner updates
    r = client.patch(f"/api/events/{event_id}", json={"title": "Updated Title"}, headers=owner_headers)
    assert r.status_code == 200, r.get_data(as_text=True)
    assert r.get_json()["title"] == "Updated Title"
    # Non-owner tries
    r2 = client.patch(f"/api/events/{event_id}", json={"title": "Hacked Title"}, headers=other_headers)
    assert r2.status_code == 403


def test_admin_can_update_others_event(client):
    """Admin should be able to patch an event they did not create."""
    from backend.src.db.db_init import SessionLocal
    from backend.src.models.models import User, Event
    creator_id = "00000000-0000-0000-0000-000000000021"
    admin_id = "00000000-0000-0000-0000-000000000022"
    db = SessionLocal()
    try:
        # Seed creator (coordinator) and admin
        for uid, email, role in [
            (creator_id, "creator@uoregon.edu", "coordinator"),
            (admin_id, "admin@uoregon.edu", "admin"),
        ]:
            if not db.query(User).filter(User.user_id == uid).first():
                db.add(User(user_id=uid, email=email, role=role))
        db.commit()
        # Create event owned by creator
        from datetime import date, timedelta, time as _t
        ev = Event(
            title="Admin Update Target",
            category="admin-test",
            date=date.today() + timedelta(days=4),
            start_time=_t(13, 0),
            end_time=_t(14, 0),
            created_by=creator_id,
            is_scraped=False,
        )
        db.add(ev)
        db.commit()
        event_id = ev.event_id
    finally:
        db.close()
    admin_token = make_token(admin_id, "admin@uoregon.edu")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    r = client.patch(f"/api/events/{event_id}", json={"title": "Admin Updated"}, headers=admin_headers)
    assert r.status_code == 200, r.get_data(as_text=True)
    assert r.get_json()["title"] == "Admin Updated"
