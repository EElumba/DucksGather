# DucksGather Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend (SPA)                       │  │
│  │                                                                │  │
│  │  Components:                                                   │  │
│  │  • ExploreEvents (Map + Event List)                          │  │
│  │  • CreateEventForm (with Building Autocomplete)              │  │
│  │  • EventDetail                                                │  │
│  │  • ProfilePage                                                │  │
│  │  • AuthPage (Login/Signup)                                    │  │
│  │                                                                │  │
│  │  Context:                                                      │  │
│  │  • AuthContext (Supabase JS Client)                          │  │
│  │                                                                │  │
│  │  API Client:                                                   │  │
│  │  • client.js (centralized fetch with auth headers)           │  │
│  │                                                                │  │
│  │  Map Library:                                                  │  │
│  │  • Leaflet with marker clustering                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              │ HTTP/HTTPS                            │
│                              │ Authorization: Bearer <JWT>           │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Flask Backend (Gunicorn)                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   app.py (Flask App)                          │  │
│  │                                                                │  │
│  │  • CORS Configuration                                         │  │
│  │  • Blueprint Registration                                     │  │
│  │  • Health Endpoint: /health                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│         ┌────────────────────┴────────────────────┐                 │
│         ▼                                          ▼                 │
│  ┌─────────────────┐                    ┌──────────────────┐       │
│  │  Events Blueprint│                    │  Users Blueprint │       │
│  │  /api/events     │                    │  /api/users      │       │
│  │                  │                    │                  │       │
│  │ • GET /          │                    │ • GET /me        │       │
│  │ • GET /<id>      │                    │ • PATCH /me      │       │
│  │ • POST /         │                    │ • GET /<id>      │       │
│  │ • PATCH /<id>    │                    │ • PATCH /<id>/   │       │
│  │ • DELETE /<id>   │                    │   role           │       │
│  │ • POST /<id>/save│                    │                  │       │
│  │ • DELETE /<id>/  │                    │                  │       │
│  │   save           │                    │                  │       │
│  │ • GET /saved     │                    │                  │       │
│  │ • GET /buildings │                    │                  │       │
│  └─────────────────┘                    └──────────────────┘       │
│         │                                          │                 │
│         └────────────────────┬────────────────────┘                 │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Auth Middleware (jwt.py)                         │  │
│  │                                                                │  │
│  │  • require_auth() - Verify JWT signature                     │  │
│  │  • require_app_user() - Verify JWT + ensure app user exists │  │
│  │  • Check roles (user, coordinator, admin)                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              SQLAlchemy ORM (models.py)                       │  │
│  │                                                                │  │
│  │  Models:                                                       │  │
│  │  • User                                                        │  │
│  │  • Event                                                       │  │
│  │  • Location                                                    │  │
│  │  • Organization                                                │  │
│  │  • UserEvent (saved events junction)                         │  │
│  │  • Image                                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              │ SQL Queries                           │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Supabase (Cloud Services)                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Postgres Database (Session Pooler)                  │  │
│  │                                                                │  │
│  │  Tables:                                                       │  │
│  │  • users (app profiles, FK to auth.users)                    │  │
│  │  • events                                                      │  │
│  │  • locations (campus buildings with lat/long)                │  │
│  │  • organizations                                               │  │
│  │  • user_events                                                 │  │
│  │  • images                                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Supabase Auth                              │  │
│  │                                                                │  │
│  │  Schema: auth.users                                           │  │
│  │  • Issues JWTs signed with SUPABASE_JWT_SECRET               │  │
│  │  • Email/password authentication                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                     External Data Sources                            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            Python Web Scraper (BeautifulSoup)                 │  │
│  │                                                                │  │
│  │  • Scrapes event data from UO websites                       │  │
│  │  • Sanitizes and validates events                            │  │
│  │  • Posts to Flask API (POST /api/events)                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              │ HTTP POST                             │
│                              └────────────▶ Flask Backend            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Flow Diagrams

### 1. User Authentication Flow

```
┌──────┐                    ┌──────────┐                  ┌──────────┐
│ User │                    │ React    │                  │ Supabase │
│      │                    │ Frontend │                  │ Auth     │
└──┬───┘                    └────┬─────┘                  └────┬─────┘
   │                             │                             │
   │ 1. Enter email/password     │                             │
   │────────────────────────────▶│                             │
   │                             │                             │
   │                             │ 2. supabase.auth.signIn()   │
   │                             │────────────────────────────▶│
   │                             │                             │
   │                             │ 3. JWT token                │
   │                             │◀────────────────────────────│
   │                             │                             │
   │                             │ 4. Store token in localStorage
   │                             │    (key: dg_token)          │
   │                             │                             │
   │ 5. Redirect to /explore     │                             │
   │◀────────────────────────────│                             │
   │                             │                             │
```

### 2. Fetch Events with Filters (Explore Page)

```
┌──────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ User │         │ React    │         │ Flask    │         │ Supabase │
│      │         │ Frontend │         │ Backend  │         │ Postgres │
└──┬───┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
   │                  │                     │                     │
   │ 1. Visit /explore│                     │                     │
   │─────────────────▶│                     │                     │
   │                  │                     │                     │
   │                  │ 2. GET /api/events/ │                     │
   │                  │    ?page=1          │                     │
   │                  │    &category=Social │                     │
   │                  │────────────────────▶│                     │
   │                  │                     │                     │
   │                  │                     │ 3. SELECT * FROM    │
   │                  │                     │    events WHERE ... │
   │                  │                     │────────────────────▶│
   │                  │                     │                     │
   │                  │                     │ 4. Rows + joins     │
   │                  │                     │◀────────────────────│
   │                  │                     │                     │
   │                  │ 5. JSON response:   │                     │
   │                  │    {items: [...],   │                     │
   │                  │     total_pages: N} │                     │
   │                  │◀────────────────────│                     │
   │                  │                     │                     │
   │ 6. Render map +  │                     │                     │
   │    event list    │                     │                     │
   │◀─────────────────│                     │                     │
   │                  │                     │                     │
```

### 3. Create Event (Coordinator/Admin Only)

```
┌──────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ User │         │ React    │         │ Flask    │         │ Supabase │
│(Coord)         │ Frontend │         │ Backend  │         │ Postgres │
└──┬───┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
   │                  │                     │                     │
   │ 1. Fill form     │                     │                     │
   │   (title, date,  │                     │                     │
   │    building,     │                     │                     │
   │    room, etc.)   │                     │                     │
   │─────────────────▶│                     │                     │
   │                  │                     │                     │
   │                  │ 2. POST /api/events │                     │
   │                  │    Authorization:   │                     │
   │                  │    Bearer <JWT>     │                     │
   │                  │    Body: {...}      │                     │
   │                  │────────────────────▶│                     │
   │                  │                     │                     │
   │                  │                     │ 3. Verify JWT       │
   │                  │                     │    (check role)     │
   │                  │                     │                     │
   │                  │                     │ 4. Resolve or create│
   │                  │                     │    Organization +   │
   │                  │                     │    Location         │
   │                  │                     │────────────────────▶│
   │                  │                     │                     │
   │                  │                     │ 5. INSERT INTO      │
   │                  │                     │    events ...       │
   │                  │                     │────────────────────▶│
   │                  │                     │                     │
   │                  │                     │ 6. New event row    │
   │                  │                     │◀────────────────────│
   │                  │                     │                     │
   │                  │ 7. JSON response:   │                     │
   │                  │    {event_id: X,    │                     │
   │                  │     ...}            │                     │
   │                  │◀────────────────────│                     │
   │                  │                     │                     │
   │ 8. Navigate to   │                     │                     │
   │    /events/X     │                     │                     │
   │◀─────────────────│                     │                     │
   │                  │                     │                     │
```

### 4. Building Autocomplete Flow

```
┌──────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ User │         │ React    │         │ Flask    │         │ Supabase │
│      │         │ Frontend │         │ Backend  │         │ Postgres │
└──┬───┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
   │                  │                     │                     │
   │ 1. Type "Alln"   │                     │                     │
   │   in building    │                     │                     │
   │   field          │                     │                     │
   │─────────────────▶│                     │                     │
   │                  │                     │                     │
   │                  │ 2. GET /api/events/ │                     │
   │                  │    buildings?q=Alln │                     │
   │                  │────────────────────▶│                     │
   │                  │                     │                     │
   │                  │                     │ 3. SELECT DISTINCT  │
   │                  │                     │    building_name    │
   │                  │                     │    WHERE ILIKE      │
   │                  │                     │    '%Alln%'         │
   │                  │                     │────────────────────▶│
   │                  │                     │                     │
   │                  │                     │ 4. Matching names   │
   │                  │                     │◀────────────────────│
   │                  │                     │                     │
   │                  │ 5. JSON array:      │                     │
   │                  │    ["Allan Price    │                     │
   │                  │     Science Commons"]│                     │
   │                  │◀────────────────────│                     │
   │                  │                     │                     │
   │ 6. Show dropdown │                     │                     │
   │    with          │                     │                     │
   │    suggestions   │                     │                     │
   │◀─────────────────│                     │                     │
   │                  │                     │                     │
   │ 7. Click         │                     │                     │
   │    suggestion    │                     │                     │
   │─────────────────▶│                     │                     │
   │                  │                     │                     │
   │ 8. Fill building │                     │                     │
   │    field         │                     │                     │
   │◀─────────────────│                     │                     │
   │                  │                     │                     │
```

### 5. Save/Unsave Event Flow

```
┌──────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ User │         │ React    │         │ Flask    │         │ Supabase │
│      │         │ Frontend │         │ Backend  │         │ Postgres │
└──┬───┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
   │                  │                     │                     │
   │ 1. Click "Save"  │                     │                     │
   │   on event card  │                     │                     │
   │─────────────────▶│                     │                     │
   │                  │                     │                     │
   │                  │ 2. POST /api/events/│                     │
   │                  │    <id>/save        │                     │
   │                  │    Authorization:   │                     │
   │                  │    Bearer <JWT>     │                     │
   │                  │────────────────────▶│                     │
   │                  │                     │                     │
   │                  │                     │ 3. Verify JWT       │
   │                  │                     │    Extract user_id  │
   │                  │                     │                     │
   │                  │                     │ 4. INSERT INTO      │
   │                  │                     │    user_events      │
   │                  │                     │    (user_id,        │
   │                  │                     │     event_id)       │
   │                  │                     │────────────────────▶│
   │                  │                     │                     │
   │                  │                     │ 5. Row inserted     │
   │                  │                     │◀────────────────────│
   │                  │                     │                     │
   │                  │ 6. 200 OK           │                     │
   │                  │◀────────────────────│                     │
   │                  │                     │                     │
   │ 7. Update UI     │                     │                     │
   │    (heart filled)│                     │                     │
   │◀─────────────────│                     │                     │
   │                  │                     │                     │
```

### 6. Profile Update Flow

```
┌──────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ User │         │ React    │         │ Flask    │         │ Supabase │
│      │         │ Frontend │         │ Backend  │         │ Postgres │
└──┬───┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
   │                  │                     │                     │
   │ 1. Update name   │                     │                     │
   │   in profile form│                     │                     │
   │─────────────────▶│                     │                     │
   │                  │                     │                     │
   │                  │ 2. PATCH /api/users/│                     │
   │                  │    me               │                     │
   │                  │    Authorization:   │                     │
   │                  │    Bearer <JWT>     │                     │
   │                  │    Body:            │                     │
   │                  │    {full_name: "X"} │                     │
   │                  │────────────────────▶│                     │
   │                  │                     │                     │
   │                  │                     │ 3. Verify JWT       │
   │                  │                     │    Get g.app_user   │
   │                  │                     │                     │
   │                  │                     │ 4. Check cooldown   │
   │                  │                     │    (30 days)        │
   │                  │                     │                     │
   │                  │                     │ 5. UPDATE users     │
   │                  │                     │    SET full_name=X  │
   │                  │                     │    WHERE user_id=Y  │
   │                  │                     │────────────────────▶│
   │                  │                     │                     │
   │                  │                     │ 6. Row updated      │
   │                  │                     │◀────────────────────│
   │                  │                     │                     │
   │                  │ 7. JSON response:   │                     │
   │                  │    {user_id, ...}   │                     │
   │                  │◀────────────────────│                     │
   │                  │                     │                     │
   │ 8. Update UI     │                     │                     │
   │    with new name │                     │                     │
   │◀─────────────────│                     │                     │
   │                  │                     │                     │
```

### 7. Web Scraper Data Flow

```
┌─────────────┐         ┌──────────┐         ┌──────────┐
│ Python      │         │ Flask    │         │ Supabase │
│ Scraper     │         │ Backend  │         │ Postgres │
│(BeautifulSoup)        │          │         │          │
└──────┬──────┘         └────┬─────┘         └────┬─────┘
       │                     │                     │
       │ 1. Scrape event data│                     │
       │    from UO websites │                     │
       │                     │                     │
       │ 2. Sanitize &       │                     │
       │    validate         │                     │
       │    (schemas.py)     │                     │
       │                     │                     │
       │ 3. Check for        │                     │
       │    duplicates       │                     │
       │    (duplicate_check)│                     │
       │                     │                     │
       │ 4. POST /api/events │                     │
       │    with scraped data│                     │
       │    (is_scraped=True)│                     │
       │────────────────────▶│                     │
       │                     │                     │
       │                     │ 5. INSERT INTO      │
       │                     │    events ...       │
       │                     │────────────────────▶│
       │                     │                     │
       │                     │ 6. Success          │
       │                     │◀────────────────────│
       │                     │                     │
       │ 7. 201 Created      │                     │
       │◀────────────────────│                     │
       │                     │                     │
```

---

## Data Flow Summary

1. **User Authentication**: Frontend → Supabase Auth → JWT token stored in localStorage
2. **Event Discovery**: Frontend → Flask API → Postgres → JSON response → Map + List UI
3. **Event Creation**: Frontend form → Flask API (role check) → Insert to Postgres → Redirect to event detail
4. **Building Search**: User types → Frontend → Flask `/api/events/buildings` → Postgres LIKE query → Suggestions dropdown
5. **Save Events**: Click save → Flask API → Insert `user_events` → Update UI
6. **Profile Updates**: Form → Flask API → Update `users` table → Return updated profile
7. **Web Scraping**: Python scraper → Sanitize → POST to Flask API → Store in Postgres with `is_scraped=True`

---

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React (Create React App), Leaflet maps, Supabase JS client |
| **Backend** | Flask, Gunicorn, SQLAlchemy ORM, PyJWT |
| **Database** | Supabase Postgres (session pooler) |
| **Authentication** | Supabase Auth (JWT) |
| **Data Ingestion** | Python + BeautifulSoup web scraper |
| **Deployment** | Render (or similar cloud platform) |

---

## Security & Authorization Flow

```
User Request with JWT
        │
        ▼
┌─────────────────┐
│ Flask receives  │
│ Authorization:  │
│ Bearer <token>  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ @require_auth() │
│ or              │
│ @require_app_user()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify JWT      │
│ signature with  │
│ SUPABASE_JWT_   │
│ SECRET          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract user_id │
│ and role from   │
│ JWT claims      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ensure app user │
│ exists in users │
│ table (auto-    │
│ create if not)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check role      │
│ (user vs.       │
│  coordinator vs.│
│  admin)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Inject g.user_id│
│ and g.app_user  │
│ into request    │
│ context         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute route   │
│ handler logic   │
└─────────────────┘
```

---

This diagram provides a complete view of your DucksGather architecture, showing how users interact with the system, how data flows between components, and how authentication/authorization is enforced at each layer.
