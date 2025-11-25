FROM python:3.11-slim

WORKDIR /app

# System deps (add more if any Python package needs build tools)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy and install Python deps
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Environment
ENV PYTHONUNBUFFERED=1

EXPOSE 5000

# Start your Flask app the same way you do locally (package-style)
CMD ["python", "-m", "backend.src.app"]