"""
Seed the locations table from backend/src/db/uo_buildings.json.
"""

import json
import os
from pathlib import Path
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from backend.src.models.models import Location

# --- Load .env reliably ---
# Resolve repo root → backend/
backend_dir = Path(__file__).resolve().parents[1]

env_path = backend_dir / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    print(f"WARNING: .env file not found at {env_path}")

# Load environment variables again as fallback (system env or root .env)
load_dotenv()

# Normalize environment variable name
database_url = (
    os.getenv("DATABASE_URL")
    or os.getenv("DB_URL")
)

if not database_url:
    print("FAIL: No DATABASE_URL or DB_URL found in environment.")
    sys.exit(1)

print("INFO: Loaded database URL (length =", database_url, ")")

def load_buildings() -> list[dict]:
    root = Path(__file__).resolve().parents[1]
    json_path = root / "src" / "db" / "uo_buildings.json"
    if not json_path.exists():
        raise SystemExit(f"uo_buildings.json not found at {json_path}")
    with json_path.open("r", encoding="utf-8") as f:
        return json.load(f)

def seed_locations() -> None:
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        buildings = load_buildings()
        created, updated = 0, 0

        for b in buildings:
            name = (b.get("building_name") or "").strip()
            if not name:
                continue

            address = (b.get("address") or "").strip() or None
            lat = b.get("latitude")
            lng = b.get("longitude")

            existing = (
                db.query(Location)
                .filter(Location.building_name == name, Location.room_number.is_(None))
                .first()
            )

            if existing:
                if address:
                    existing.address = address
                if lat is not None:
                    existing.latitude = lat
                if lng is not None:
                    existing.longitude = lng
                updated += 1
            else:
                db.add(
                    Location(
                        building_name=name,
                        room_number=None,
                        address=address,
                        latitude=lat,
                        longitude=lng,
                    )
                )
                created += 1

        db.commit()
        print(f"Seeded locations: created={created}, updated={updated}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_locations()
