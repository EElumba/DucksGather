from __future__ import annotations

from flask import Blueprint, jsonify, request, g
from backend.src.auth.jwt import require_app_user
from backend.src.db.db_init import get_db
from backend.src.models.models import User
from datetime import datetime, timedelta, timezone

bp = Blueprint("users", __name__, url_prefix="/api/users")

@bp.get("/me")
@require_app_user()
def me():
    return jsonify(g.app_user.to_dict()), 200

@bp.patch("/me")
@require_app_user()
def update_me():
    db = get_db()
    try:
        data = request.get_json(force=True)

        if "full_name" in data:
            incoming = (data["full_name"] or "").strip()
            current = g.app_user.full_name

            # Only enforce cooldown if there is an existing name and it’s changing
            # Use a naive UTC "now" to match the naive timestamps stored by
            # SQLAlchemy's datetime.utcnow() defaults, avoiding timezone-aware
            # vs. naive comparison errors.
            if current and incoming and incoming != current:
                now = datetime.utcnow()
                last = g.app_user.updated_at or g.app_user.created_at
                if last and now - last < timedelta(days=30):
                    return jsonify({
                        "error": "Full name can only be changed once every 30 days"
                    }), 400

            g.app_user.full_name = incoming or current

        db.commit()
        return jsonify(g.app_user.to_dict()), 200
    finally:
        db.close()
        
@bp.get("/<user_id>")
@require_app_user()
def get_user(user_id: str):
    if g.user_id != user_id and g.app_user.role != 'admin':
        return jsonify({"error": "Forbidden"}), 403
    db = get_db()
    try:
        u = db.query(User).filter(User.user_id == user_id).first()
        if not u:
            return jsonify({"error": "Not found"}), 404
        return jsonify(u.to_dict()), 200
    finally:
        db.close()

@bp.patch("/<user_id>/role")
@require_app_user()
def set_role(user_id: str):
    # Admins only
    if g.app_user.role != 'admin':
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json(force=True)
    new_role = (data.get("role") or '').strip()
    if new_role not in ('user','coordinator','admin'):
        return jsonify({"error": "Invalid role"}), 400
    db = get_db()
    try:
        u = db.query(User).filter(User.user_id == user_id).first()
        if not u:
            return jsonify({"error": "Not found"}), 404
        # Prevent accidental self admin downgrade unless explicit request (optional policy)
        if u.user_id == g.user_id and u.role == 'admin' and new_role != 'admin':
            return jsonify({"error": "Refusing to self-downgrade admin"}), 400
        u.role = new_role
        db.commit()
        return jsonify(u.to_dict()), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
