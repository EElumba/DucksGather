"""
Duplicate detection logic for event data.
Prevents duplicate events from being added to the database.
"""

from sqlalchemy.orm import Session
from backend.src.models.models import Event as EventModel


def is_duplicate_event(db: Session, title: str) -> bool:
    """
    Check if an event with the given title already exists in the database.
    
    Args:
        db: SQLAlchemy database session
        title: Event title to check for duplicates
        
    Returns:
        True if a duplicate exists, False otherwise
    """
    if not title:
        return False
    
    # Normalize title for comparison (strip whitespace, case-insensitive)
    normalized_title = title.strip()
    
    # Query database for existing event with same title
    existing_event = db.query(EventModel).filter(
        EventModel.title == normalized_title
    ).first()
    
    return existing_event is not None


def get_duplicate_events(db: Session, event_titles: list[str]) -> set[str]:
    """
    Batch check for multiple event titles to find which ones are duplicates.
    
    Args:
        db: SQLAlchemy database session
        event_titles: List of event titles to check
        
    Returns:
        Set of titles that already exist in the database
    """
    if not event_titles:
        return set()
    
    # Normalize titles
    normalized_titles = [title.strip() for title in event_titles if title]
    
    # Query all existing events with matching titles
    existing_events = db.query(EventModel.title).filter(
        EventModel.title.in_(normalized_titles)
    ).all()
    
    # Return set of existing titles
    return {event.title for event in existing_events}


def filter_duplicate_events(db: Session, events: list[dict]) -> list[dict]:
    """
    Filter out duplicate events from a list of event dictionaries.
    
    Args:
        db: SQLAlchemy database session
        events: List of event dictionaries with 'title' keys
        
    Returns:
        List of unique events (non-duplicates only)
    """
    if not events:
        return []
    
    # Extract all titles
    titles = [event.get("title") for event in events if event.get("title")]
    
    # Get duplicates
    duplicates = get_duplicate_events(db, titles)
    
    # Filter out duplicates
    unique_events = [
        event for event in events 
        if event.get("title") and event.get("title").strip() not in duplicates
    ]
    
    return unique_events
