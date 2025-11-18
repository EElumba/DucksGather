#!/usr/bin/env bash
set -e

# Always run from repo root
cd "$(dirname "$0")"

cd frontend

# Install npm dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
  npm install
fi

npm start