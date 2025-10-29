import os
import sys
import pathlib
import tempfile
import pytest

# Set env early so db_init uses sqlite and doesn't try to import psycopg2
_tmp_db = os.path.join(tempfile.gettempdir(), "ducks_test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db}"
os.environ.setdefault("SUPABASE_JWT_SECRET", "testsecret")

# Ensure package imports resolve from repo root
ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.src.db.db_init import Base, engine
from backend.src.app import create_app


@pytest.fixture(scope="session")
def app():
    # Create tables using ORM metadata (sufficient for tests)
    Base.metadata.create_all(bind=engine)

    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture()
def client(app):
    return app.test_client()
