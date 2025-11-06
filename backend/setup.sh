#!/bin/bash

# Stop if any command fails
set -e

# Name of your virtual environment folder
VENV_DIR="venv"

echo "🔍 Checking for Python..."
if ! command -v python3 &> /dev/null
then
    echo "❌ Python3 not found. Please install Python 3 first."
    exit 1
fi

echo "🐍 Setting up virtual environment..."
# Create venv if not exists
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    echo "✅ Virtual environment created in $VENV_DIR/"
else
    echo "⚙️ Virtual environment already exists."
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "📦 Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
else
    echo "⚠️ No requirements.txt found."
fi

echo "✅ Setup complete! Virtual environment is active."
echo "To deactivate, run: deactivate"
