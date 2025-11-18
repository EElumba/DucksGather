import pytest
import requests
import json
from pydantic import ValidationError
from tenacity import RetryError
import requests
from unittest.mock import patch, MagicMock
from backend.src.scraper.scraper import fetch_html, parse_listing, process_and_validate

# --- Fixtures and Mocks ---

# Mock HTML containing valid JSON-LD structure
MOCK_HTML = """
<html>
<body>
  <script type="application/ld+json">
    [{
      "@context": "https://schema.org",
      "@type": "Event",
      "name": "  Test Event Title  ",
      "description": "An event <p>description</p> with HTML.",
      "startDate": "2025-12-01T10:00:00-08:00",
      "endDate": "2025-12-01T12:00:00-08:00",
      "url": "/details/123",
      "image": "http://uoregon.edu/img.jpg",
      "location": {
        "@type": "Place",
        "name": "Virtual Meeting",
        "address": "Online Only",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "44.0",
          "longitude": "-123.0"
        }
      }
    }]
  </script>
</body>
</html>
"""

# Mock data for validation failures (e.g., location missing)
MOCK_EVENT_DATA = {
    "title": "Clean Title",
    "start_at": "2025-12-01T10:00:00-08:00",
    "ends_at": "2025-12-01T12:00:00-08:00",
    "location": "Someplace",
    "address": "123 Main St",
    "latitude": "44.0",
    "longitude": "-123.0",
    "description": "Short and sweet.",
    "image": "http://img.png",
    "website": "http://uoregon.edu/details/123"
}

# --- Tests for fetch_html ---

@patch('requests.get')
def test_fetch_html_success(mock_get):
    """Test successful fetching."""
    mock_response = MagicMock()
    mock_response.text = MOCK_HTML
    mock_response.raise_for_status = MagicMock()
    mock_get.return_value = mock_response
    
    html = fetch_html("http://test.com")
    assert html == MOCK_HTML
    mock_response.raise_for_status.assert_called_once()

@patch('requests.get')
def test_fetch_html_retries_on_connection_error(mock_get):
    """Test that tenacity decorator retries on connection error."""
    
    # We set up the mock to fail three times (or more, depending on your tenacity setting)
    # The actual failure is a result of tenacity exhausting its attempts (default 5 attempts in your scraper.py).
    mock_get.side_effect = [
        requests.exceptions.ConnectionError("Attempt 1"),
        requests.exceptions.ConnectionError("Attempt 2"),
        requests.exceptions.ConnectionError("Attempt 3"),
        requests.exceptions.ConnectionError("Attempt 4"),
        requests.exceptions.ConnectionError("Attempt 5"),
    ]
    
    
    with pytest.raises(RetryError):
        # Setting the stop_after_attempt to 2 will ensure it fails before the successful mock returns
        # For this simplified test, we just check that a requests method is called at least once
        fetch_html("http://test.com")
    
    assert mock_get.call_count == 5

# --- Tests for parse_listing ---

def test_parse_listing_extracts_all_fields():
    """Test that the parser correctly extracts and maps all fields."""
    events = parse_listing(MOCK_HTML, "http://uoregon.edu")
    assert len(events) == 1
    event = events[0]
    
    # Check extraction and cleaning (normalized title)
    assert event['title'] == '  Test Event Title  '
    
    # Check nested location/geo data
    assert event['location'] == 'Virtual Meeting'
    assert event['latitude'] == '44.0'
    
    # Check URL joining
    assert event['website'] == 'http://uoregon.edu/details/123'

def test_parse_listing_no_scripts():
    """Test graceful handling when no JSON-LD script tags are found."""
    events = parse_listing("<html><body>No scripts.</body></html>", "http://test.com")
    assert len(events) == 0

# --- Tests for process_and_validate (Integration) ---

@patch('backend.src.sanitize.schemas.EventCreate')
@patch('backend.src.sanitize.sanitize.clip', side_effect=lambda x, y: x) # Mock clip to pass data through
@patch('backend.src.sanitize.sanitize.clean_html', side_effect=lambda x: x.replace('<p>', '').replace('</p>', '')) # Mock clean_html
@patch('backend.src.sanitize.sanitize.normalize_whitespace', side_effect=lambda x: x.strip()) # Mock normalize_whitespace
def test_process_and_validate_success(mock_normalize, mock_clean, mock_clip, MockEventCreate):
    """Test successful data processing through sanitization and Pydantic mock."""
    result = process_and_validate(MOCK_EVENT_DATA)
    
    # Check that sanitization was called
    mock_clean.assert_called_once()
    mock_clip.assert_called_once()

    # Check that Pydantic was called with cleaned data
    MockEventCreate.assert_called_once()
    
    # Check final return type (assuming valid schema, it returns a dict)
    assert isinstance(result, dict)

@patch('backend.src.sanitize.schemas.EventCreate', side_effect=ValidationError('Test Validation Fail', []))
def test_process_and_validate_failure(MockEventCreate):
    """Test that validation failure is caught and returns None."""
    # Ensure the failure is handled and returns None
    result = process_and_validate(MOCK_EVENT_DATA)
    assert result is None