"""DB URL Verification Script

Purpose:
  Provide a clear diagnostic of the DATABASE_URL (or override via DB_URL env) to ensure it works.

Checks performed:
  1. Load .env and resolve effective URL.
  2. Parse URL components (driver, user, host, port, database, ssl params).
  3. Mask password for display; show percent-encoded vs decoded.
  4. Attempt engine.connect(); run basic queries:
       SELECT current_database(), current_user, version(), now();
  5. Attempt a lightweight transaction (CREATE TEMP TABLE, INSERT, SELECT, DROP).
  6. Surface exceptions with detailed context.
  7. Exit code 0 on success; non-zero on failure.

Usage:
  python3 backend/scripts/verify_db_url.py
  DB_URL=postgresql+psycopg2://... python3 backend/scripts/verify_db_url.py (override)

Environment:
  DATABASE_URL from .env (backend/.env) if DB_URL not provided.

Notes:
  - Password is percent-decoded only for display; not logged raw unless VERBOSE=1.
  - Requires SQLAlchemy & psycopg2 installed.
"""
from __future__ import annotations

import os
import sys
from urllib.parse import unquote
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

VERBOSE = os.getenv("VERBOSE", "0") in ("1", "true", "True")

# Load env similar to other scripts
here = os.path.dirname(__file__)
backend_dir = os.path.abspath(os.path.join(here, os.pardir))
load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv()  # fallback

raw_env_url = os.getenv("DB_URL") or os.getenv("DATABASE_URL")

if not raw_env_url:
    print("FAIL: No DATABASE_URL or DB_URL found in environment.")
    sys.exit(1)

print("INFO: raw URL length=", len(raw_env_url))

try:
    url = make_url(raw_env_url)
except Exception as e:
    print("FAIL: Could not parse URL ->", e)
    sys.exit(1)

# Extract components
user = url.username or "(none)"
password = url.password or "(none)"
host = url.host or "(none)"
port = url.port or "(none)"
database = url.database or "(none)"
dialect = url.drivername
query = url.query

masked_pw = "***" if password != "(none)" else password
decoded_pw = unquote(password) if password not in ("(none)", "***") else password

print(f"INFO: dialect={dialect}")
print(f"INFO: user={user}")
print(f"INFO: password(masked)={masked_pw}")
if VERBOSE:
    print(f"INFO: password(decoded)={decoded_pw}")
print(f"INFO: host={host}")
print(f"INFO: port={port}")
print(f"INFO: database={database}")
print(f"INFO: query params={query}")

# SSL expectation
if 'sslmode' not in query:
    print("WARN: sslmode not present; Supabase requires ?sslmode=require")

# Build engine exactly as provided
try:
    engine = create_engine(raw_env_url)
except Exception as e:
    print("FAIL: Engine creation failed ->", e)
    sys.exit(1)

# Connection + basic queries
try:
    with engine.connect() as conn:
        print("INFO: Connection established.")
        # Basic identity queries
        rows = conn.execute(text("SELECT current_database(), current_user, version(), now()")).fetchone()
        print("INFO: current_database=", rows[0])
        print("INFO: current_user=", rows[1])
        print("INFO: version snippet=", rows[2].split('\n')[0][:80])
        print("INFO: now=", rows[3])

        # Temp table test
        conn.execute(text("CREATE TEMP TABLE dg_verify(id INT);"))
        conn.execute(text("INSERT INTO dg_verify(id) VALUES (1),(2);"))
        count = conn.execute(text("SELECT COUNT(*) FROM dg_verify;")).scalar()
        print("INFO: temp table count=", count)
        conn.execute(text("DROP TABLE dg_verify;"))
        print("INFO: temp table lifecycle OK.")

        # Simple performance ping
        ping = conn.execute(text("SELECT 1")).scalar()
        if ping != 1:
            print("WARN: ping expected 1 got", ping)

except SQLAlchemyError as e:
    print("FAIL: SQL operation failed ->", e)
    if VERBOSE:
        import traceback; traceback.print_exc()
    sys.exit(2)
except Exception as e:
    print("FAIL: Unexpected error ->", e)
    if VERBOSE:
        import traceback; traceback.print_exc()
    sys.exit(3)

print("SUCCESS: DATABASE_URL verified.")
sys.exit(0)
