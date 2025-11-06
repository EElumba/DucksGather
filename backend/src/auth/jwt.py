"""
Supabase JWT verification helpers for Flask.

- Verifies HS256 JWTs issued by Supabase using SUPABASE_JWT_SECRET
- Provides a @require_auth decorator that injects g.user (payload) and g.user_id
- Optionally enforces uoregon.edu domain

Note:
- When you connect to Postgres via SQLAlchemy using service credentials, RLS is bypassed.
  This decorator is your guardrail to enforce who can mutate data.
- If you call Supabase HTTP APIs with a user access token instead, RLS policies would enforce this server-side.
"""
from __future__ import annotations

import os
from functools import wraps
from typing import Callable, Optional

import jwt
from flask import request, jsonify, g

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

    Raises jwt.InvalidTokenError if invalid.
    """
    if not JWT_SECRET:
        raise AuthError("Server is missing SUPABASE_JWT_SECRET env var")
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    return payload


def require_auth(require_uo_domain: bool = False) -> Callable:
    """Flask decorator that verifies a JWT and populates g.user and g.user_id.

    - If require_uo_domain is True, ensures email ends with @uoregon.edu
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

            # Common Supabase claims: sub (user id), email
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
