import bleach
import unicodedata

ALLOWED_TAGS = ["b", "i", "u", "em", "strong", "a", "p", "br", "ul", "ol", "li"]
ALLOWED_ATTRIBUTES = {"a": ["href", "title", "target"]}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]

def normalize_whitespace(s: str | None) -> str | None:
    if s is None: return None
    # Collapse multiple spaces and trim leading/trailing whitespace
    s = unicodedata.normalize("NFKC", s)
    return " ".join(s.split())

def clip(s: str | None, maxlen: int) -> str | None:
    if s is None: return None
    return s[:maxlen]

def clean_html(s: str | None, allow_basic_formatting: bool = True) -> str | None:
    if not s: return s
    if allow_basic_formatting:
        return bleach.clean(
            text=s,
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRIBUTES,
            protocols=ALLOWED_PROTOCOLS,
            strip=True,
        )
    return bleach.clean(text=s, tags=[], attributes={}, strip=True)