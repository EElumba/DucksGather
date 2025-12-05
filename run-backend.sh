#!/usr/bin/env bash
set -e

# Always run from repo root
cd "$(dirname "$0")"

cd backend

# Create venv if missing
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

# Activate venv
source setup.sh
cd ..

# Optional: export debug env vars
# export EVENTS_DEBUG=1
# export DB_DEBUG=1

# Run scraper first to populate database
echo "Running scraper to fetch events..."
python3 -m backend.src.scraper.scraper

# Run Flask app (package-style)
python -m backend.src.app