# DucksGather Database Setup Guide

This directory contains all the SQL scripts and utilities needed to set up the DucksGather database on Supabase.

## 📁 Files Overview

- **`schema.sql`** - Complete database schema with all tables, indexes, triggers, and RLS policies
- **`sample_data.sql`** - Sample data for testing (organizations, locations, events)
- **`db_init.py`** - Python utility script for database management

## 🗄️ Database Schema

### Tables

1. **organizations** - Event organizing groups (CS Club, Student Union, etc.)
2. **locations** - Reusable location data (buildings, rooms, coordinates)
3. **users** - User profiles extending Supabase auth
4. **events** - Main events table
5. **images** - Event and organization images metadata
6. **user_events** - Junction table tracking which users saved which events

### Key Features

- ✅ **3NF Compliant** - Normalized to eliminate redundancy
- ✅ **Row Level Security (RLS)** - Built-in security policies
- ✅ **Auto-updating timestamps** - Triggers maintain `updated_at` fields
- ✅ **Performance indexes** - Optimized queries on date, category, location
- ✅ **Data validation** - CHECK constraints ensure data integrity

## 🚀 Setup Instructions

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run Schema Script

1. Open `schema.sql` in your code editor
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** or press `Ctrl+Enter`

You should see: "Success. No rows returned"

### Step 3: Run Sample Data (Optional)

1. Open `sample_data.sql`
2. Copy the entire contents
3. Paste into a new query in Supabase SQL Editor
4. Click **Run**

This will insert sample organizations, locations, and events for testing.

### Step 4: Verify Setup

Run this query in Supabase to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see: `events`, `images`, `locations`, `organizations`, `user_events`, `users`

## 🔧 Using the Python Utility

The `db_init.py` file provides helper functions for database management:

```bash
# Print all SQL statements to console
python backend/src/db/db_init.py
```

This will display all SQL needed to set up your database.

## 📊 Database Relationships

```
organizations (1) ──────< (many) events
                                    │
locations (1) ──────────────< (many) │
                                    │
users (1) ──────────────────< (many) │
     │                              │
     │                              │
     └──< (many) user_events >──────┘
```

## 🔐 Row Level Security Policies

The schema includes RLS policies that:

- Allow **everyone** to read events, organizations, and locations
- Allow **authenticated users** to create events
- Allow users to **update/delete only their own events**
- Allow users to **manage their own saved events**

## 📝 Example Queries

### Get all upcoming events with location and organization info

```sql
SELECT 
    e.title,
    e.date,
    e.start_time,
    e.category,
    o.name as organization,
    l.building_name,
    l.room_number
FROM events e
LEFT JOIN organizations o ON e.organization_id = o.organization_id
LEFT JOIN locations l ON e.location_id = l.location_id
WHERE e.date >= CURRENT_DATE
ORDER BY e.date, e.start_time;
```

### Get events by category

```sql
SELECT title, date, start_time, description
FROM events
WHERE category = 'Academic' AND date >= CURRENT_DATE
ORDER BY date;
```

### Get user's saved events

```sql
SELECT e.*
FROM events e
JOIN user_events ue ON e.event_id = ue.event_id
WHERE ue.user_id = 'YOUR_USER_UUID'
ORDER BY e.date;
```

## 🔄 Automatic Cleanup

The events table has a CHECK constraint that prevents creating events in the past:

```sql
CONSTRAINT valid_date CHECK (date >= CURRENT_DATE)
```

You'll need to implement a scheduled job (Flask background task or Supabase Function) to delete expired events:

```sql
DELETE FROM events 
WHERE date < CURRENT_DATE - INTERVAL '1 day';
```

## 📚 Categories for Events

Suggested categories for the `category` field:
- Academic
- Career
- Sports
- Cultural
- Environmental
- Social
- Arts
- Recreation
- Volunteer
- Workshop

## 🛠️ Troubleshooting

### "relation already exists" error
Tables already exist. You can either:
- Skip this error (tables are already set up)
- Drop existing tables first (⚠️ destroys data)

### "permission denied" error
Make sure you're running queries as the service role or authenticated user with proper permissions.

### Can't insert events
Check that:
1. Referenced organization_id exists in organizations table
2. Referenced location_id exists in locations table
3. Date is not in the past
4. End time is after start time

## 🔗 Next Steps

1. ✅ Run schema.sql in Supabase
2. ✅ Run sample_data.sql (optional)
3. Configure `.env` file with Supabase credentials
4. Implement Flask API routes in `backend/src/routes/`
5. Test API endpoints with sample data

## 📞 Support

For issues or questions about the database setup, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
