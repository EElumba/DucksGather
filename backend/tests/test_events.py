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
    token = make_token("00000000-0000-0000-0000-000000000001", "test@uoregon.edu")
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
