# DucksGather Database Schema Diagram

## Entity Relationship Diagram

```
┌─────────────────────┐
│   ORGANIZATIONS     │
├─────────────────────┤
│ PK organization_id  │
│    name (UNIQUE)    │
│    description      │
│    contact_email    │
│    website_url      │
│    created_at       │
│    updated_at       │
└─────────────────────┘
         │
         │ 1
         │
         │ many
         ▼
┌─────────────────────┐         ┌─────────────────────┐
│      EVENTS         │         │     LOCATIONS       │
├─────────────────────┤         ├─────────────────────┤
│ PK event_id         │ many    │ PK location_id      │
│    title            │◄────────┤    building_name    │
│    description      │    1    │    room_number      │
│    category         │         │    address          │
│    date             │         │    latitude         │
│    start_time       │         │    longitude        │
│    end_time         │         │    created_at       │
│    image_url        │         └─────────────────────┘
│    external_url     │
│ FK organization_id  │
│ FK location_id      │         ┌─────────────────────┐
│ FK created_by       │         │       USERS         │
│    is_scraped       │         ├─────────────────────┤
│    created_at       │    1    │ PK user_id (UUID)   │
│    updated_at       │◄────────┤    email (UNIQUE)   │
└─────────────────────┘  many   │    full_name        │
         │                      │    role             │
         │ many                 │    major            │
         │                      │    preferences      │
         │                      │    created_at       │
         │ many                 │    updated_at       │
         ▼                      └─────────────────────┘
┌─────────────────────┐                   │
│    USER_EVENTS      │                   │
├─────────────────────┤                   │
│ PK,FK user_id       │◄──────────────────┘
│ PK,FK event_id      │                many
│    saved_at         │
│    reminder_sent    │
└─────────────────────┘


┌─────────────────────┐
│      IMAGES         │
├─────────────────────┤
│ PK image_id         │
│ FK event_id         │
│ FK organization_id  │
│    image_url        │
│    upload_date      │
│    file_size        │
│    mime_type        │
└─────────────────────┘
         │
         └──────┬──────┘
                │
      (belongs to event
       OR organization,
       not both)
```

## Table Details

### 1. ORGANIZATIONS
**Purpose:** Store information about event organizing groups

| Column | Type | Description |
|--------|------|-------------|
| organization_id | SERIAL | Primary key |
| name | VARCHAR(255) | Unique organization name |
| description | TEXT | About the organization |
| contact_email | VARCHAR(255) | Contact email |
| website_url | VARCHAR(500) | Organization website |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated on change |

**Relationships:**
- One organization can have many events (1:N)

---

### 2. LOCATIONS
**Purpose:** Store reusable campus location data (3NF compliant)

| Column | Type | Description |
|--------|------|-------------|
| location_id | SERIAL | Primary key |
| building_name | VARCHAR(255) | Building name |
| room_number | VARCHAR(50) | Room/space number |
| address | VARCHAR(500) | Full address |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| created_at | TIMESTAMP | Auto-generated |

**Unique Constraint:** (building_name, room_number)

**Relationships:**
- One location can host many events (1:N)

---

### 3. USERS
**Purpose:** Extend Supabase auth with user profiles

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key (references auth.users) |
| email | VARCHAR(255) | UO email (@uoregon.edu) |
| full_name | VARCHAR(255) | User's full name |
| role | VARCHAR(50) | user, coordinator, or admin |
| major | VARCHAR(255) | Academic major |
| preferences | JSONB | User preferences (categories, etc.) |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated on change |

**Role Values:**
- `user` - Regular student
- `coordinator` - Event organizer
- `admin` - System administrator

**Relationships:**
- One user can create many events (1:N)
- One user can save many events (M:N through user_events)

---

### 4. EVENTS
**Purpose:** Main events table storing all event information

| Column | Type | Description |
|--------|------|-------------|
| event_id | SERIAL | Primary key |
| title | VARCHAR(500) | Event title |
| description | TEXT | Event description |
| category | VARCHAR(100) | Event category |
| date | DATE | Event date |
| start_time | TIME | Event start time |
| end_time | TIME | Event end time |
| image_url | VARCHAR(500) | URL to event poster |
| external_url | VARCHAR(500) | Link to external page |
| organization_id | INTEGER | FK to organizations |
| location_id | INTEGER | FK to locations |
| created_by | UUID | FK to users |
| is_scraped | BOOLEAN | True if web-scraped |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated on change |

**Constraints:**
- `end_time > start_time`
- `date >= CURRENT_DATE`

**Categories:** Academic, Career, Sports, Cultural, Environmental, Social, Arts, Recreation, Volunteer, Workshop

**Relationships:**
- Many events belong to one organization (N:1)
- Many events occur at one location (N:1)
- Many events created by one user (N:1)
- Many events can be saved by many users (M:N through user_events)

---

### 5. IMAGES
**Purpose:** Store image metadata for events and organizations

| Column | Type | Description |
|--------|------|-------------|
| image_id | SERIAL | Primary key |
| event_id | INTEGER | FK to events (nullable) |
| organization_id | INTEGER | FK to organizations (nullable) |
| image_url | VARCHAR(500) | URL to stored image |
| upload_date | TIMESTAMP | Upload timestamp |
| file_size | INTEGER | File size in bytes |
| mime_type | VARCHAR(100) | Image MIME type |

**Constraint:** Image must belong to EITHER an event OR an organization (not both)

**Relationships:**
- Many images can belong to one event (N:1)
- Many images can belong to one organization (N:1)

---

### 6. USER_EVENTS (Junction Table)
**Purpose:** Track which events users have saved/are attending

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PK, FK to users |
| event_id | INTEGER | PK, FK to events |
| saved_at | TIMESTAMP | When user saved event |
| reminder_sent | BOOLEAN | Email reminder status |

**Composite Primary Key:** (user_id, event_id)

**Relationships:**
- Implements many-to-many relationship between users and events

---

## Indexes

Performance indexes on frequently queried columns:

- `idx_events_date` on `events(date)`
- `idx_events_category` on `events(category)`
- `idx_events_organization` on `events(organization_id)`
- `idx_events_location` on `events(location_id)`
- `idx_user_events_user` on `user_events(user_id)`
- `idx_user_events_event` on `user_events(event_id)`

## Triggers

Auto-updating `updated_at` timestamps:
- `update_organizations_updated_at`
- `update_users_updated_at`
- `update_events_updated_at`

## Row Level Security (RLS)

All tables have RLS enabled with policies:

**Public Read Access:**
- organizations
- locations
- events
- images

**Protected Write Access:**
- Users can only create/update/delete their own events
- Users can only manage their own saved events (user_events)
- Users can only view their own profile

---

## Normalization (3NF)

The schema is in Third Normal Form (3NF):

1. **1NF**: All columns contain atomic values
2. **2NF**: No partial dependencies (all non-key attributes depend on entire primary key)
3. **3NF**: No transitive dependencies (location and organization data separated into own tables)

**Benefits:**
- ✅ Eliminates data redundancy
- ✅ Maintains data integrity
- ✅ Simplifies updates
- ✅ Improves query performance
