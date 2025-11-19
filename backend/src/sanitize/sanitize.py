import bleach
import unicodedata
import re
from datetime import datetime, timezone

#ALLOWED_TAGS = ["b", "i", "u", "em", "strong", "a", "p", "br", "ul", "ol", "li"]
ALLOWED_ATTRIBUTES = {"a": ["href", "title", "target"]}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]
HTML_TAG_RE = re.compile(r'<[^>]+>')

def normalize_whitespace(s: str | None) -> str | None:
    if s is None: return None
    # Collapse multiple spaces and trim leading/trailing whitespace
    s = unicodedata.normalize("NFKC", s)
    return " ".join(s.split())

def clip(s: str | None, maxlen: int) -> str | None:
    if s is None: return None
    return s[:maxlen]

    
def clean_html(s: str | None) -> str | None:
    if not s: 
        return s
    cleaned_text = bleach.clean(
        text=s,
        tags=[],
        attributes={},
        strip=True,
    )
    return normalize_whitespace(cleaned_text)


def is_future_event(start_at: str | None) -> bool:
    """
    Checks if the event start date  the current date (in UTC).
    Returns True if the eent is in the future or today; False otherwise.

    start_at: must be an ISO 8601 formatted date string. (e.g., "2023-10-15T14:30:00-08:00")
    """

    if not start_at:
        return False
    
    try:
        # Parse the input date string into a datetime object
        event_start = datetime.fromisoformat(start_at)

        #Get the current date in UTC for a consistent comparison
        now_utc = datetime.now(timezone.utc).date()

        # Convert the event start time to UTC for a consistent comparison
        if event_start.tzinfo is None:
            event_start = event_start.replace(tzinfo=timezone.utc)
        else:
            event_start = event_start.astimezone(timezone.utc)
        
        event_start_date = event_start.date()

        return event_start_date >= now_utc
    
    except ValueError:
        print(f"Warning: Could not parse start date string: {start_at}")
        return False
        