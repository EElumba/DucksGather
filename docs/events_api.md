# DucksGather Events API

This document covers the new Flask Events API, authentication, how to run it locally, and example requests.

## Prerequisites

- Python 3.10+
- Install dependencies once:
  - pip install -r requirements.txt
- A working database connection in your environment (.env at repo root) — see backend/src/db/README.md for details.
- SUPABASE_JWT_SECRET from your Supabase project (Settings > API).

## Environment variables (.env)

At minimum, set these (examples only; use your real values):

- SUPABASE_JWT_SECRET=your_supabase_jwt_secret
- user=postgres.[project-ref]
- password=<your_password>
- host=aws-1-us-west-1.pooler.supabase.com
- port=6543
- dbname=postgres

Note: The DB env names above match backend/src/db/db_init.py.

## Run the server

From the repo root:

- python backend/src/app.py

Server starts at http://localhost:5000

Health check:

 - curl http://localhost:5000/health

## Auth model

- Endpoints that mutate data (POST/PUT/PATCH/DELETE) require a valid Supabase user access token (Bearer token) in the Authorization header.
- The server verifies the token using SUPABASE_JWT_SECRET.
- On success, g.user_id is set to the Supabase user id (sub claim) and used as created_by for events.

## Endpoints

Base path: /api/events

- GET /api/events
  - Query params: category, from=YYYY-MM-DD, to=YYYY-MM-DD
  - Returns list of events (public)
- GET /api/events/{id}
  - Returns a single event (public)
- POST /api/events
  - Auth required
  - Body JSON: title, category, date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), optional: description, organization_id, location_id, image_url, external_url
  - created_by is taken from the JWT
- PATCH /api/events/{id}
  - Auth required, only creator can update
  - Partial update of fields listed above
- DELETE /api/events/{id}
  - Auth required, only creator can delete
 - POST /api/events/{id}/save
   - Auth required; marks interest (saves event) for current user
   - If this is the user's first action, a user row is created in our DB using the JWT's sub/email
 - DELETE /api/events/{id}/save
   - Auth required; removes saved event
 - GET /api/events/saved
   - Auth required; lists the current user's saved events

## Example requests

Replace $TOKEN with a real Supabase user access token.

List events:

- curl "http://localhost:5000/api/events?category=social&from=2025-01-01&to=2025-12-31"

Get event by id:

- curl http://localhost:5000/api/events/1

Create event (authenticated):

- curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hack Night",
    "category": "tech",
    "date": "2025-02-01",
    "start_time": "18:00",
    "end_time": "20:00",
    "description": "Weekly CS club hack night"
  }'

Update event (only creator):

- curl -X PATCH http://localhost:5000/api/events/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hack Night XL"}'

Delete event (only creator):

- curl -X DELETE http://localhost:5000/api/events/1 \
  -H "Authorization: Bearer $TOKEN"

Save an event (mark interest):

- curl -X POST http://localhost:5000/api/events/1/save \
  -H "Authorization: Bearer $TOKEN"

Unsave an event:

- curl -X DELETE http://localhost:5000/api/events/1/save \
  -H "Authorization: Bearer $TOKEN"

List my saved events:

- curl -X GET http://localhost:5000/api/events/saved \
  -H "Authorization: Bearer $TOKEN"

## Notes

 - Times accept HH:MM or HH:MM:SS; server normalizes HH:MM to HH:MM:00.
- The ORM model enforces end_time > start_time; the API validates that before saving.
- When running against Supabase, ensure the DB user has permissions for these tables; service connections bypass RLS by design. If you switch to Supabase HTTP APIs from the backend, RLS policies will apply using the user JWT automatically.
 - For "saved events": on first use, the API will upsert a user row (id/email) based on your JWT to satisfy the foreign key.
 - Frontend dev setup: use a dev proxy (Vite/CRA) so fetch('/api/...') goes through the frontend origin and gets forwarded to Flask (no CORS required).
