"""Minimal database initialization for DucksGather.

Provides SQLAlchemy engine, Base, SessionLocal, and get_db().
Falls back to a local SQLite file if DATABASE_URL is not set.

NOTE: Previous richer initialization (table creation SQL, sample data) was removed. Restore as needed.
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
	engine = create_engine(DATABASE_URL)
else:
	engine = create_engine("sqlite:///ducks_local.db")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def create_tables_if_needed():
	"""Create ORM tables if they do not yet exist.

	Behavior:
	- Always create when using SQLite (safe for local dev disposable db files).
	- Respect AUTO_CREATE_TABLES flag for non-SQLite engines (to avoid accidental prod schema changes).
	"""
	is_sqlite = engine.dialect.name == "sqlite"
	if not is_sqlite and os.getenv("AUTO_CREATE_TABLES") not in ("1", "true", "True", "yes"):
		return
	try:
		from backend.src.models import models  # ensure model classes are imported
		Base.metadata.create_all(bind=engine)
		print("INFO : created missing tables" + (" (sqlite auto)" if is_sqlite else ""))
	except Exception as e:
		print(f"WARN : failed to auto-create tables -> {e}")

def ensure_auth_fk():

	"""Attempt to add a foreign key from public.users(user_id) -> auth.users(id) on Postgres.

	This protects against orphaned application user rows when the upstream Supabase auth user is deleted.
	Safe to call repeatedly: we check existence before altering.
	Skipped automatically for non-Postgres dialects (e.g., SQLite in tests/local dev).
	"""
	try:
		if engine.dialect.name != "postgresql":
			return
		with engine.connect() as conn:
			exists = conn.execute(text(
				"""
				SELECT 1 FROM pg_constraint c
				JOIN pg_class t ON c.conrelid = t.oid
				JOIN pg_namespace n ON n.oid = t.relnamespace
				WHERE t.relname = 'users'
				  AND n.nspname = 'public'
				  AND c.conname = 'fk_users_auth'
				LIMIT 1
				"""
			)).fetchone()
			if exists:
				return
			# Attempt to create constraint. Use CASCADE so app user disappears with auth user.
			try:
				conn.execute(text(
					"ALTER TABLE public.users ADD CONSTRAINT fk_users_auth FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;"
				))
				print("INFO : added fk_users_auth foreign key constraint")
			except Exception as e:
				# If this fails (e.g., auth.users missing or permission denied), we warn but continue.
				print(f"WARN : could not create fk_users_auth constraint -> {e}")
	except Exception as outer:
		print(f"WARN : ensure_auth_fk unexpected error -> {outer}")

def get_db():
	db = SessionLocal()
	try:
		return db
	except Exception:
		db.close()
		raise
