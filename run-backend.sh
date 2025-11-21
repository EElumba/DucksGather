#!/usr/bin/env bash
set -e

# Always run from repo root
cd "$(dirname "$0")"

# Create backend venv if missing
if [ ! -d "backend/venv" ]; then
  echo "Creating Python venv in backend/venv..."
  python3 -m venv backend/venv
fi

# Create backend venv if missing
if [ ! -d "backend/venv" ]; then
  echo "Creating Python venv in backend/venv..."
  python3 -m venv backend/venv

# Activate venv
echo "Activating venv..."
source backend/venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r backend/requirements.txt


echo "Activating venv..."
source backend/venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# Optional: export debug env vars
# export EVENTS_DEBUG=1
# export DB_DEBUG=1

# Run Flask app (package-style)
echo "Starting Flask backend on http://127.0.0.1:5000..."
python -m backend.src.app