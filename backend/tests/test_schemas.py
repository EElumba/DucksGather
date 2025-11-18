import pytest
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError
from backend.src.sanitize.schemas import EventCreate

# Define a fixture for valid base data
@pytest.fixture
def valid_event_data():
    # Use timezone-aware datetimes for robust testing
    now = datetime.now(timezone.utc)
    future = now + timedelta(hours=2)

    return {
        "title": "A Valid Title - Event (10%)",
        "description": "Short description.",
        "start_at": now.isoformat(),
        "ends_at": future.isoformat(),
        "location": "Some Hall",
        "address": "123 Main St",
        "website": "http://example.com/event",
        "latitude": 44.0,
        "longitude": -123.0,
        "image": "http://example.com/img.jpg",
        "organizer_email": "test@uoregon.edu",
        "is_public": True,
    }

def test_valid_event_creation(valid_event_data):
    """Test successful validation of a complete and valid event."""
    event = EventCreate(**valid_event_data)
    assert event.title == "A Valid Title - Event (10%)"
    assert isinstance(event.start_at, datetime)

def test_title_invalid_characters(valid_event_data):
    """Test custom title validator rejection."""
    # Assume SAFE_TITLE regex excludes HTML tags
    valid_event_data["title"] = "Bad <script> Title"
    with pytest.raises(ValidationError, match="Title contains invalid characters"):
        EventCreate(**valid_event_data)

def test_end_date_before_start_date(valid_event_data):
    """Test rejection when end date is before start date."""
    valid_event_data["ends_at"] = valid_event_data["start_at"] # Same time is invalid
    with pytest.raises(ValidationError, match="end time must be after start time"):
        EventCreate(**valid_event_data)

def test_optional_float_as_none(valid_event_data):
    """Test successful handling of None for optional float fields."""
    valid_event_data["latitude"] = None
    event = EventCreate(**valid_event_data)
    assert event.latitude is None

def test_description_too_long(valid_event_data):
    """Test max_length constraint failure (assuming max_length=1000)."""
    valid_event_data["description"] = "A" * 1001
    with pytest.raises(ValidationError, match="String should have at most 1000 characters"):
        EventCreate(**valid_event_data)