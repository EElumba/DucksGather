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
    result = g.app_user.to_dict()
    print(f"[DEBUG] GET /api/users/me - Returning: {result}")
    return jsonify(result), 200

@bp.patch("/me")
@require_app_user()
def update_me():
    db = get_db()
    try:
        data = request.get_json(force=True)
        print(f"[DEBUG] PATCH /api/users/me - Received data: {data}")
        
        # Re-query the user in the current session instead of using g.app_user
        # which is attached to a closed session from the decorator
        user = db.query(User).filter(User.user_id == g.user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        print(f"[DEBUG] Current user full_name before update: {user.full_name}")

        if "full_name" in data:
            incoming = (data["full_name"] or "").strip()
            current = user.full_name
            print(f"[DEBUG] Incoming full_name: '{incoming}', Current full_name: '{current}'")

            # Only enforce cooldown if there is an existing name and it's changing
            # Normalize both timestamps to timezone-aware UTC before subtracting,
            # so we do not mix offset-naive and offset-aware datetimes.
            if current and incoming and incoming != current:
                now = datetime.now(timezone.utc)
                last = user.updated_at or user.created_at
                if last is not None:
                    # If the DB timestamp is naive, assume it is UTC and attach tzinfo.
                    if last.tzinfo is None:
                        last = last.replace(tzinfo=timezone.utc)
                    if now - last < timedelta(days=30):
                        return jsonify({
                            "error": "Full name can only be changed once every 30 days"
                        }), 400

            user.full_name = incoming or current
            print(f"[DEBUG] Setting full_name to: '{user.full_name}'")
            print(f"[DEBUG] SQLAlchemy session dirty objects: {db.dirty}")
            print(f"[DEBUG] Is user in session.dirty? {user in db.dirty}")

        db.flush()  # Force SQLAlchemy to send the UPDATE to the database
        print(f"[DEBUG] After flush, full_name is: '{user.full_name}'")
        db.commit()
        print(f"[DEBUG] After commit, full_name is: '{user.full_name}'")
        
        # Query again in a fresh transaction to verify persistence
        db.expire_all()  # Clear session cache
        user_check = db.query(User).filter(User.user_id == g.user_id).first()
        print(f"[DEBUG] Fresh query after commit, full_name is: '{user_check.full_name if user_check else 'USER NOT FOUND'}'")
        result = user.to_dict()
        print(f"[DEBUG] Returning to client: {result}")
        return jsonify(result), 200
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
