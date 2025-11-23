"""Events API Smoke Test

Sequence:
  1. Load .env (backend/.env + CWD) and build app test client.
  2. Seed (or reuse) a coordinator user (UUID) so create is allowed.
  3. Issue JWT (HS256) using SUPABASE_JWT_SECRET.
  4. POST /api/events/ (minimal required fields).
  5. GET /api/events/ verify presence.
  6. DELETE /api/events/<id> cleanup.
  7. Remove seeded user if we created it.

Run:
  SMOKE_VERBOSE=1 python3 backend/scripts/smoke_events_api.py
  # Stable user id:
  SMOKE_USER_ID=00000000-0000-0000-0000-000000000123 SMOKE_VERBOSE=1 python3 backend/scripts/smoke_events_api.py

Env Required:
  - DATABASE_URL (Supabase or local) validated separately by verify_db_url.py
  - SUPABASE_JWT_SECRET (from Supabase Settings > API)

SMOKE_VERBOSE=1 SMOKE_NO_EXIT=1 python3 backend/scripts/smoke_events_api.py

Exit Codes:
  0 success; 1 failure at any stage.
"""
from __future__ import annotations

import os
import sys
import time
import traceback
import uuid
from contextlib import contextmanager

from dotenv import load_dotenv
import jwt
import pathlib

# Ensure project root is on sys.path even if invoked from a subdirectory or IDE context
try:
    ROOT_DIR = pathlib.Path(__file__).resolve().parents[2]  # DucksGather root
    root_str = str(ROOT_DIR)
    if root_str not in sys.path:
        sys.path.insert(0, root_str)
except Exception as _path_err:
    print("WARN : could not adjust sys.path", _path_err)


def _load_env() -> None:
    here = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(here, os.pardir))
    load_dotenv(os.path.join(backend_dir, ".env"))
    load_dotenv()


def _make_app():
    """Create the Flask app, injecting root path if needed for package resolution."""
    try:
        from backend.src.app import create_app  # type: ignore
    except ModuleNotFoundError as e:
        print("WARN : initial import failed (backend.src.app) ->", e)
        # Attempt to re-insert root and retry once
        try:
            if root_str not in sys.path:
                sys.path.insert(0, root_str)
            from backend.src.app import create_app  # type: ignore
        except ModuleNotFoundError as e2:
            raise RuntimeError(f"Unable to import backend.src.app after path fix: {e2}")
    return create_app()


@contextmanager
def db_session():
    from backend.src.db.db_init import get_db
    db = get_db()
    try:
        yield db
    finally:
        db.close()


def _select_existing_auth_user():
    """Fetch an existing Supabase auth user (id,email) from auth.users.
    Returns (id,email) or (None,None) if none present or query fails.
    """
    from sqlalchemy import text
    from backend.src.db.db_init import engine
    try:
        with engine.connect() as conn:
            row = conn.execute(text("SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1")).fetchone()
            if row:
                return str(row[0]), row[1]
    except Exception as e:
        print("WARN : could not query auth.users ->", e)
    return None, None


def ensure_user(user_id: str, email: str) -> bool:
    """Ensure user exists in application users table; return True if newly created.
    Assumes caller already chose a valid auth.users id.
    """
    verbose = os.getenv("SMOKE_VERBOSE", "0") in ("1", "true", "True")
    from backend.src.models.models import User
    with db_session() as db:
        u = db.query(User).filter(User.user_id == user_id).first()
        if u:
            return False
        u = User(user_id=user_id, email=email, role="coordinator")
        db.add(u)
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            if verbose:
                print("FAIL: user insert exception ->", e)
                traceback.print_exc()
            raise
        return True


def delete_user(user_id: str) -> None:
    from backend.src.models.models import User
    with db_session() as db:
        u = db.query(User).filter(User.user_id == user_id).first()
        if u:
            db.delete(u)
            db.commit()


def make_jwt(user_id: str, email: str) -> str:
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise RuntimeError("SUPABASE_JWT_SECRET not set")
    now = int(time.time())
    payload = {"sub": user_id, "email": email, "aud": "authenticated", "iat": now, "exp": now + 900}
    return jwt.encode(payload, secret, algorithm="HS256")


def smoke_test() -> int:
    _load_env()
    app = _make_app()
    client = app.test_client()
    verbose = os.getenv("SMOKE_VERBOSE", "0") in ("1", "true", "True")

    # Diagnostics
    try:
        print("INFO : python=", sys.executable)
        db_url = os.getenv("DATABASE_URL")
        print("INFO : DATABASE_URL set=" + ("yes" if db_url else "no"))
        if db_url and verbose:
            print("INFO : DATABASE_URL prefix=" + db_url[:60] + ("..." if len(db_url) > 60 else ""))
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        print("INFO : SUPABASE_JWT_SECRET set=" + ("yes" if jwt_secret else "no"))
        if jwt_secret and verbose:
            print("INFO : JWT secret length=", len(jwt_secret))
    except Exception as e:
        print("WARN : diagnostics failed", e)

    # Preflight counts
    if verbose or os.getenv("SMOKE_PREFLIGHT", "1") in ("1", "true", "True"):
        try:
            from backend.src.models.models import User, Event
            with db_session() as db:
                print("INFO : preflight user_count=", db.query(User).count())
                print("INFO : preflight event_count=", db.query(Event).count())
        except Exception as e:
            print("FAIL: preflight exception ->", e)
            if verbose:
                traceback.print_exc()
            return 1

    def fail(msg: str, resp=None):
        print(f"FAIL: {msg}")
        if resp is not None and hasattr(resp, 'data'):
            try:
                print("Body:", resp.get_json())
            except Exception:
                print("Raw body:", getattr(resp, 'data', b'')[:300])
        if verbose:
            traceback.print_exc()
        return 1

    # /health
    try:
        r = client.get("/health")
    except Exception:
        return fail("/health request exception")
    if r.status_code != 200:
        return fail(f"/health -> {r.status_code}", r)
    print("OK  : /health")

    # User + token
    # Resolve a valid auth user id/email first to satisfy FK
    user_id = os.getenv("SMOKE_USER_ID")
    email = ""
    if user_id:
        if verbose:
            print(f"INFO : using provided SMOKE_USER_ID={user_id}")
    else:
        auth_id, auth_email = _select_existing_auth_user()
        if not auth_id:
            return fail("No Supabase auth user available. Create one or set SMOKE_USER_ID.")
        user_id = auth_id
        if auth_email:
            email = auth_email
        if verbose:
            print(f"INFO : selected auth user {user_id} email={email}")

    # Now ensure application user row
    try:
        created_user = ensure_user(user_id, email)
    except Exception as e:
        return fail(f"ensure_user exception: {e}")
    print("OK  :", ("seeded user" if created_user else "user exists"), user_id)

    try:
        token = make_jwt(user_id, email)
    except Exception as e:
        if created_user:
            delete_user(user_id)
        return fail(f"make_jwt exception: {e}")

    # Create event
    title = f"Smoke Test Event {int(time.time())}"
    payload = {"title": title, "category": "general", "date": "2030-01-01", "start_time": "10:00", "end_time": "11:00"}
    try:
        r = client.post("/api/events/", json=payload, headers={"Authorization": f"Bearer {token}"})
    except Exception:
        if created_user:
            delete_user(user_id)
        return fail("POST /api/events exception")
    if r.status_code != 201:
        if created_user:
            delete_user(user_id)
        return fail(f"POST /api/events -> {r.status_code}", r)
    event_id = (r.get_json() or {}).get("event_id")
    print(f"OK  : created event id={event_id}")

    # List events (adapt to new paginated shape {items:[...], ...})
    try:
        r = client.get("/api/events/")
    except Exception:
        client.delete(f"/api/events/{event_id}", headers={"Authorization": f"Bearer {token}"})
        if created_user:
            delete_user(user_id)
        return fail("GET /api/events exception")
    if r.status_code != 200:
        client.delete(f"/api/events/{event_id}", headers={"Authorization": f"Bearer {token}"})
        if created_user:
            delete_user(user_id)
        return fail(f"GET /api/events -> {r.status_code}", r)
    list_json = r.get_json() or {}
    if isinstance(list_json, dict) and "items" in list_json:
        items = list_json.get("items") or []
    elif isinstance(list_json, list):
        items = list_json
    else:
        items = []
    found = any(
        isinstance(e, dict) and (e.get("event_id") == event_id or e.get("title") == title)
        for e in items
    )
    if not found:
        client.delete(f"/api/events/{event_id}", headers={"Authorization": f"Bearer {token}"})
        if created_user:
            delete_user(user_id)
        return fail("created event not found in list", r)
    print("OK  : listed created event")

    # Delete event
    try:
        r = client.delete(f"/api/events/{event_id}", headers={"Authorization": f"Bearer {token}"})
    except Exception:
        if created_user:
            delete_user(user_id)
        return fail(f"DELETE /api/events/{event_id} exception")
    if r.status_code != 200:
        if created_user:
            delete_user(user_id)
        return fail(f"DELETE /api/events/{event_id} -> {r.status_code}", r)
    print("OK  : deleted event")

    if created_user:
        delete_user(user_id)
        print("OK  : removed seeded user")

    print("SUCCESS: Smoke test completed")
    return 0


if __name__ == "__main__":
    rc = smoke_test()
    # Allow disabling exit code propagation to keep shell session 'successful' for inspection.
    # Set SMOKE_NO_EXIT=1 to suppress sys.exit.
    if os.getenv("SMOKE_NO_EXIT", "0") in ("1", "true", "True"):
        print(f"INFO : smoke_test completed with rc={rc} (exit suppressed)")
    else:
        sys.exit(rc)
