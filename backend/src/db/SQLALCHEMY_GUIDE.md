# SQLAlchemy Quick Start Guide

This guide shows you how to use SQLAlchemy with the DucksGather database.

## Installation

First, install the required packages:

```bash
pip install -r requirements.txt
```

This will install:
- `sqlalchemy` - ORM framework
- `psycopg2-binary` - PostgreSQL adapter for Python

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your Supabase credentials:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your-anon-key
```

You can find these in your Supabase Dashboard:
- **DATABASE_URL**: Settings > Database > Connection String > URI
- **SUPABASE_URL**: Settings > API > URL
- **SUPABASE_KEY**: Settings > API > anon/public key

## Database Initialization

Run the initialization script to create all tables:

```bash
python backend/src/db/db_init.py
```

This will:
1. ✅ Test the database connection
2. ✅ Create all tables, indexes, and triggers
3. ✅ Optionally insert sample data

## Using SQLAlchemy Models

### Importing Models

```python
from backend.src.models.models import Event, Organization, Location, User, Image, UserEvent
from backend.src.db.db_init import get_db
```

### Getting a Database Session

```python
# Get a database session
db = get_db()

try:
    # Your database operations here
    db.commit()
except Exception as e:
    db.rollback()
    raise e
finally:
    db.close()
```

### Creating Records

```python
from backend.src.models.models import Organization
from backend.src.db.db_init import get_db

db = get_db()

# Create a new organization
new_org = Organization(
    name="Biology Club",
    description="For biology enthusiasts",
    contact_email="bioclub@uoregon.edu",
    website_url="https://bioclub.uoregon.edu"
)

db.add(new_org)
db.commit()

print(f"Created organization with ID: {new_org.organization_id}")

db.close()
```

### Querying Records

```python
from backend.src.models.models import Event, Organization, Location
from backend.src.db.db_init import get_db
from datetime import date

db = get_db()

# Get all events
all_events = db.query(Event).all()

# Get events by category
academic_events = db.query(Event).filter(Event.category == 'Academic').all()

# Get upcoming events
upcoming_events = db.query(Event).filter(Event.date >= date.today()).all()

# Get event with organization and location
event = db.query(Event).filter(Event.event_id == 1).first()
if event:
    print(f"Event: {event.title}")
    print(f"Organization: {event.organization.name if event.organization else 'N/A'}")
    print(f"Location: {event.location.building_name if event.location else 'N/A'}")

# Join query
events_with_details = db.query(Event, Organization, Location).\\
    join(Organization, Event.organization_id == Organization.organization_id).\\
    join(Location, Event.location_id == Location.location_id).\\
    all()

db.close()
```

### Updating Records

```python
from backend.src.models.models import Event
from backend.src.db.db_init import get_db

db = get_db()

# Get an event
event = db.query(Event).filter(Event.event_id == 1).first()

if event:
    # Update fields
    event.title = "Updated Event Title"
    event.description = "New description"
    
    db.commit()
    print(f"Updated event {event.event_id}")

db.close()
```

### Deleting Records

```python
from backend.src.models.models import Event
from backend.src.db.db_init import get_db

db = get_db()

# Get an event
event = db.query(Event).filter(Event.event_id == 1).first()

if event:
    db.delete(event)
    db.commit()
    print("Event deleted")

db.close()
```

### Working with Relationships

```python
from backend.src.models.models import Event, Organization
from backend.src.db.db_init import get_db

db = get_db()

# Get organization with all its events
org = db.query(Organization).filter(Organization.name == 'Computer Science Club').first()

if org:
    print(f"Organization: {org.name}")
    print(f"Number of events: {len(org.events)}")
    
    for event in org.events:
        print(f"  - {event.title} on {event.date}")

db.close()
```

### Converting to Dictionary (for JSON API responses)

```python
from backend.src.models.models import Event
from backend.src.db.db_init import get_db
from flask import jsonify

db = get_db()

# Get event and convert to dict
event = db.query(Event).filter(Event.event_id == 1).first()

if event:
    event_dict = event.to_dict()
    # This includes organization and location data automatically
    # Returns a dictionary ready for JSON serialization

db.close()

# In a Flask route:
# return jsonify(event_dict), 200
```

## Example Flask Route with SQLAlchemy

```python
from flask import Flask, jsonify, request
from backend.src.models.models import Event, Organization, Location
from backend.src.db.db_init import get_db
from datetime import date

app = Flask(__name__)

@app.route('/api/events', methods=['GET'])
def get_events():
    """Get all upcoming events."""
    db = get_db()
    
    try:
        # Query upcoming events
        events = db.query(Event).\\
            filter(Event.date >= date.today()).\\
            order_by(Event.date, Event.start_time).\\
            all()
        
        # Convert to dictionaries
        events_data = [event.to_dict() for event in events]
        
        return jsonify(events_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    """Get a single event by ID."""
    db = get_db()
    
    try:
        event = db.query(Event).filter(Event.event_id == event_id).first()
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        return jsonify(event.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/events', methods=['POST'])
def create_event():
    """Create a new event."""
    db = get_db()
    
    try:
        data = request.get_json()
        
        # Create new event
        new_event = Event(
            title=data['title'],
            description=data.get('description'),
            category=data['category'],
            date=data['date'],
            start_time=data['start_time'],
            end_time=data['end_time'],
            organization_id=data.get('organization_id'),
            location_id=data.get('location_id'),
            created_by=data.get('created_by')
        )
        
        db.add(new_event)
        db.commit()
        
        return jsonify(new_event.to_dict()), 201
        
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
```

## Database Utility Functions

### Test Connection
```bash
python -c "from backend.src.db.db_init import test_connection; test_connection()"
```

### Create All Tables
```bash
python -c "from backend.src.db.db_init import create_tables; create_tables()"
```

### Insert Sample Data
```bash
python -c "from backend.src.db.db_init import insert_sample_data; insert_sample_data()"
```

### Drop All Tables (⚠️ CAUTION)
```bash
python -c "from backend.src.db.db_init import drop_all_tables; drop_all_tables()"
```

## Common Queries

### Get events by category
```python
academic_events = db.query(Event).filter(Event.category == 'Academic').all()
```

### Get events at a specific location
```python
library_events = db.query(Event).\\
    join(Location).\\
    filter(Location.building_name == 'Knight Library').\\
    all()
```

### Get events for a specific date range
```python
from datetime import date, timedelta

today = date.today()
week_later = today + timedelta(days=7)

this_week_events = db.query(Event).\\
    filter(Event.date >= today).\\
    filter(Event.date <= week_later).\\
    all()
```

### Search events by title
```python
search_term = "workshop"
results = db.query(Event).\\
    filter(Event.title.ilike(f'%{search_term}%')).\\
    all()
```

### Get user's saved events
```python
from backend.src.models.models import UserEvent

user_id = "some-uuid"
saved_events = db.query(Event).\\
    join(UserEvent).\\
    filter(UserEvent.user_id == user_id).\\
    all()
```

## Tips

1. **Always close sessions**: Use try/finally blocks to ensure db.close() is called
2. **Use to_dict()**: Models have a to_dict() method for easy JSON conversion
3. **Relationships are automatic**: Access related data via model.relationship_name
4. **Transactions**: Use db.commit() to save changes, db.rollback() to undo

## Troubleshooting

### "No module named 'sqlalchemy'"
```bash
pip install sqlalchemy psycopg2-binary
```

### "Database connection not configured"
Check your `.env` file has the correct `DATABASE_URL`

### "relation does not exist"
Run the database initialization:
```bash
python backend/src/db/db_init.py
```

## Next Steps

1. ✅ Install dependencies: `pip install -r requirements.txt`
2. ✅ Configure `.env` file
3. ✅ Run `python backend/src/db/db_init.py`
4. ✅ Start building Flask routes using the models
5. ✅ Check out `backend/src/models/models.py` for all available models
