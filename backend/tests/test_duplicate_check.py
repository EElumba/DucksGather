"""
Unit tests for duplicate_check.py functions.
Tests event duplicate detection and filtering logic.
"""

import pytest
from datetime import date, time
from backend.src.sanitize.duplicate_check import (
    is_duplicate_event,
    get_duplicate_events,
    filter_duplicate_events
)
from backend.src.models.models import Event, Location
from backend.src.db.db_init import SessionLocal


@pytest.fixture
def db_session():
    """Create a fresh database session for each test."""
    session = SessionLocal()
    yield session
    # Cleanup after test
    session.query(Event).delete()
    session.query(Location).delete()
    session.commit()
    session.close()


@pytest.fixture
def sample_location(db_session):
    """Create a sample location for testing."""
    location = Location(
        building_name="Test Hall",
        room_number="101",
        address="123 Test St",
        latitude=44.0,
        longitude=-123.0
    )
    db_session.add(location)
    db_session.commit()
    return location


@pytest.fixture
def sample_event(db_session, sample_location):
    """Create a sample event for testing."""
    event = Event(
        title="Test Event",
        description="A test event",
        category="test",
        date=date(2025, 12, 15),
        start_time=time(10, 0),
        end_time=time(11, 0),
        location_id=sample_location.location_id,
        is_scraped=True
    )
    db_session.add(event)
    db_session.commit()
    return event


class TestIsDuplicateEvent:
    """Test cases for is_duplicate_event function."""

    def test_duplicate_event_exists(self, db_session, sample_event):
        """Test that function returns True when duplicate exists."""
        result = is_duplicate_event(db_session, "Test Event")
        assert result is True

    def test_no_duplicate_event(self, db_session, sample_event):
        """Test that function returns False when no duplicate exists."""
        result = is_duplicate_event(db_session, "Different Event")
        assert result is False

    def test_empty_title(self, db_session):
        """Test that empty title returns False."""
        assert is_duplicate_event(db_session, "") is False
        assert is_duplicate_event(db_session, None) is False

    def test_whitespace_normalization(self, db_session, sample_event):
        """Test that titles with extra whitespace are normalized."""
        result = is_duplicate_event(db_session, "  Test Event  ")
        assert result is True

    def test_case_sensitive_matching(self, db_session, sample_event):
        """Test that matching is case-sensitive."""
        # The function does exact matching, so different case = different title
        result = is_duplicate_event(db_session, "test event")
        assert result is False


class TestGetDuplicateEvents:
    """Test cases for get_duplicate_events function."""

    def test_find_multiple_duplicates(self, db_session, sample_location):
        """Test finding multiple duplicate events."""
        # Create multiple events
        events = [
            Event(title="Event A", description="", category="test", 
                  date=date(2025, 12, 15), start_time=time(10, 0), 
                  end_time=time(11, 0), location_id=sample_location.location_id),
            Event(title="Event B", description="", category="test",
                  date=date(2025, 12, 16), start_time=time(10, 0),
                  end_time=time(11, 0), location_id=sample_location.location_id),
            Event(title="Event C", description="", category="test",
                  date=date(2025, 12, 17), start_time=time(10, 0),
                  end_time=time(11, 0), location_id=sample_location.location_id)
        ]
        for event in events:
            db_session.add(event)
        db_session.commit()

        # Check which titles are duplicates
        titles_to_check = ["Event A", "Event B", "Event D", "Event E"]
        duplicates = get_duplicate_events(db_session, titles_to_check)

        assert duplicates == {"Event A", "Event B"}
        assert "Event D" not in duplicates
        assert "Event E" not in duplicates

    def test_empty_list(self, db_session):
        """Test that empty list returns empty set."""
        result = get_duplicate_events(db_session, [])
        assert result == set()

    def test_none_in_list(self, db_session, sample_event):
        """Test handling of None values in title list."""
        titles = ["Test Event", None, "", "Another Event"]
        duplicates = get_duplicate_events(db_session, titles)
        assert "Test Event" in duplicates

    def test_whitespace_titles(self, db_session, sample_event):
        """Test handling of titles with whitespace."""
        titles = ["  Test Event  ", "Test Event", "Other Event"]
        duplicates = get_duplicate_events(db_session, titles)
        assert "Test Event" in duplicates


class TestFilterDuplicateEvents:
    """Test cases for filter_duplicate_events function."""

    def test_filter_duplicates(self, db_session, sample_location):
        """Test filtering out duplicate events from a list."""
        # Create existing event
        existing = Event(
            title="Existing Event",
            description="",
            category="test",
            date=date(2025, 12, 15),
            start_time=time(10, 0),
            end_time=time(11, 0),
            location_id=sample_location.location_id
        )
        db_session.add(existing)
        db_session.commit()

        # List of events to filter
        events = [
            {"title": "Existing Event", "description": "Duplicate"},
            {"title": "New Event 1", "description": "Unique"},
            {"title": "New Event 2", "description": "Unique"},
            {"title": "Existing Event", "description": "Another duplicate"}
        ]

        filtered = filter_duplicate_events(db_session, events)

        assert len(filtered) == 2
        assert filtered[0]["title"] == "New Event 1"
        assert filtered[1]["title"] == "New Event 2"

    def test_empty_events_list(self, db_session):
        """Test that empty list returns empty list."""
        result = filter_duplicate_events(db_session, [])
        assert result == []

    def test_all_duplicates(self, db_session, sample_event):
        """Test when all events are duplicates."""
        events = [
            {"title": "Test Event", "description": "Dup 1"},
            {"title": "Test Event", "description": "Dup 2"}
        ]
        filtered = filter_duplicate_events(db_session, events)
        assert len(filtered) == 0

    def test_no_duplicates(self, db_session):
        """Test when no events are duplicates."""
        events = [
            {"title": "Event 1", "description": "Unique"},
            {"title": "Event 2", "description": "Unique"},
            {"title": "Event 3", "description": "Unique"}
        ]
        filtered = filter_duplicate_events(db_session, events)
        assert len(filtered) == 3

    def test_missing_title_key(self, db_session, sample_event):
        """Test handling events without title key."""
        events = [
            {"title": "Test Event", "description": "Has title"},
            {"description": "No title key"},
            {"title": "", "description": "Empty title"},
            {"title": "Unique Event", "description": "Has title"}
        ]
        filtered = filter_duplicate_events(db_session, events)
        # Should filter out "Test Event" (duplicate) and events without valid titles
        assert len(filtered) == 1
        assert filtered[0]["title"] == "Unique Event"

    def test_whitespace_in_event_titles(self, db_session, sample_event):
        """Test that whitespace is normalized in event filtering."""
        events = [
            {"title": "  Test Event  ", "description": "Whitespace"},
            {"title": "New Event", "description": "Unique"}
        ]
        filtered = filter_duplicate_events(db_session, events)
        # "  Test Event  " should be filtered as duplicate after stripping
        assert len(filtered) == 1
        assert filtered[0]["title"] == "New Event"


class TestIntegrationScenarios:
    """Integration test scenarios combining multiple functions."""

    def test_complete_workflow(self, db_session, sample_location):
        """Test complete duplicate detection workflow."""
        # Step 1: Create some existing events
        existing_events = [
            Event(title="Workshop A", description="", category="workshop",
                  date=date(2025, 12, 15), start_time=time(10, 0),
                  end_time=time(11, 0), location_id=sample_location.location_id),
            Event(title="Seminar B", description="", category="seminar",
                  date=date(2025, 12, 16), start_time=time(14, 0),
                  end_time=time(15, 0), location_id=sample_location.location_id)
        ]
        for event in existing_events:
            db_session.add(event)
        db_session.commit()

        # Step 2: Prepare new events (some duplicates, some unique)
        new_events = [
            {"title": "Workshop A", "description": "Duplicate"},
            {"title": "Conference C", "description": "New"},
            {"title": "Seminar B", "description": "Duplicate"},
            {"title": "Meetup D", "description": "New"}
        ]

        # Step 3: Filter duplicates
        unique_events = filter_duplicate_events(db_session, new_events)

        # Step 4: Verify only unique events remain
        assert len(unique_events) == 2
        titles = [e["title"] for e in unique_events]
        assert "Conference C" in titles
        assert "Meetup D" in titles
        assert "Workshop A" not in titles
        assert "Seminar B" not in titles

    def test_batch_duplicate_check(self, db_session, sample_location):
        """Test batch checking for duplicates is more efficient."""
        # Create 10 existing events
        for i in range(10):
            event = Event(
                title=f"Event {i}",
                description="",
                category="test",
                date=date(2025, 12, 15),
                start_time=time(10, 0),
                end_time=time(11, 0),
                location_id=sample_location.location_id
            )
            db_session.add(event)
        db_session.commit()

        # Check which of 20 events are duplicates
        titles_to_check = [f"Event {i}" for i in range(20)]
        duplicates = get_duplicate_events(db_session, titles_to_check)

        # Should find the first 10 as duplicates
        assert len(duplicates) == 10
        for i in range(10):
            assert f"Event {i}" in duplicates
        for i in range(10, 20):
            assert f"Event {i}" not in duplicates
