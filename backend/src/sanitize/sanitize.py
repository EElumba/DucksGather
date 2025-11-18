import bleach
import unicodedata
import re

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