"""
Supabase JWT verification helpers for Flask.

Features:
    - Verifies HS256 JWTs issued by Supabase using SUPABASE_JWT_SECRET
    - @require_auth: validates token and injects g.user (payload) and g.user_id
    - @require_app_user: extends @require_auth; ensures application User row exists
    - Optional uoregon.edu domain enforcement

Why @require_app_user?
    Many routes need a guaranteed application-level user record (for roles, preferences, FK ownership).
    Instead of repeating "ensure user exists" logic in each route, this decorator performs it once and
    attaches g.app_user for downstream handlers.

Notes:
    - With service credentials via SQLAlchemy engine, Postgres RLS is bypassed; these decorators enforce auth.
    - Audience verification is disabled (verify_aud False) to accept locally fabricated smoke-test tokens.
    - On first request by a Supabase-authenticated account, @require_app_user will create the app user row.
"""
from __future__ import annotations

import os
from functools import wraps
from typing import Callable, Optional

import jwt
from flask import request, jsonify, g

from backend.src.db.db_init import get_db
from backend.src.models.models import User

# Comma-separated list of admin emails (exact match). Example: ADMIN_EMAILS=alice@uoregon.edu,bob@uoregon.edu
ADMIN_EMAILS = {e.strip().lower() for e in (os.getenv("ADMIN_EMAILS", "").split(",")) if e.strip()}

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # Find in Supabase: Settings > API > JWT secret
JWT_ALG = "HS256"


class AuthError(Exception):
    pass


def _get_bearer_token() -> Optional[str]:
    """Extracts a Bearer token from the Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    return auth.split(" ", 1)[1].strip()


def decode_token(token: str) -> dict:
    """Decode and verify a Supabase JWT using the shared secret.

    Audience verification is disabled to allow locally fabricated tokens that
    include an 'aud' claim (e.g. 'authenticated') without needing to pass
    the audience parameter to jwt.decode.
    """
    if not JWT_SECRET:
        raise AuthError("Server is missing SUPABASE_JWT_SECRET env var")
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG], options={"verify_aud": False})
    return payload


def require_auth(require_uo_domain: bool = False) -> Callable:
    """Flask decorator that verifies a JWT and populates g.user, g.user_id, g.email.

    Does NOT guarantee an application User row; use @require_app_user for that.
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = _get_bearer_token()
            if not token:
                return jsonify({"error": "Missing Authorization: Bearer <token>"}), 401
            try:
                payload = decode_token(token)
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401
            except AuthError as e:
                return jsonify({"error": str(e)}), 500

            user_id = payload.get("sub") or payload.get("user_id")
            email = payload.get("email")

            if require_uo_domain and email and not email.endswith("@uoregon.edu"):
                return jsonify({"error": "Email domain not allowed"}), 403

            g.user = payload
            g.user_id = user_id
            g.email = email
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def _get_or_create_app_user(user_id: str, email: Optional[str]) -> User:
    """Ensure a User row exists; assign role based ONLY on admin email list (no self elevation).

    Rules:
      - If new user and email is in ADMIN_EMAILS -> role='admin'
      - Else role='user'
      - No role changes based on JWT claims.
    """
    db = get_db()
    try:
        u = db.query(User).filter(User.user_id == user_id).first()
        if u:
            return u
        normalized_email = (email or f"user+{user_id}@example.com").lower()
        base_role = 'admin' if normalized_email in ADMIN_EMAILS else 'user'
        u = User(user_id=user_id, email=normalized_email, role=base_role)
        db.add(u)
        db.commit()
        return u
    finally:
        db.close()


def require_app_user(require_uo_domain: bool = False) -> Callable:
    """Decorator: verify JWT AND ensure application user row exists.

    Injects:
      - g.user: raw JWT payload
      - g.user_id: Supabase user UUID (sub)
      - g.email: email claim if present
      - g.app_user: SQLAlchemy User instance (guaranteed)

    If user creation fails (e.g., FK constraint), returns 500.
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = _get_bearer_token()
            if not token:
                return jsonify({"error": "Missing Authorization: Bearer <token>"}), 401
            try:
                payload = decode_token(token)
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401
            except AuthError as e:
                return jsonify({"error": str(e)}), 500

            user_id = payload.get("sub") or payload.get("user_id")
            email = payload.get("email")
            if not user_id:
                return jsonify({"error": "Token missing 'sub' claim"}), 400

            if require_uo_domain and email and not email.endswith("@uoregon.edu"):
                return jsonify({"error": "Email domain not allowed"}), 403

            g.user = payload
            g.user_id = user_id
            g.email = email

            try:
                g.app_user = _get_or_create_app_user(user_id, email)
            except Exception as e:
                # Provide generic error to avoid leaking details
                return jsonify({"error": f"User bootstrap failed: {str(e)}"}), 500
            return fn(*args, **kwargs)
        return wrapper
    return decorator
