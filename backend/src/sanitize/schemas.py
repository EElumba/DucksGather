from pydantic import BaseModel, Field, EmailStr, AnyUrl, field_validator
from datetime import datetime, timezone
import re

#SAFE_TITLE = re.compile(r"^[\w\s\-.,'!()]{1,100}$") # Alphanumeric, spaces, and some punctuation, max length 100
#SAFE_TITLE = re.compile(r"^[\w\s\-.,'()]{1,100}$")
SAFE_TITLE = re.compile(r"^[a-zA-Z0-9\s\-\.,'()&!?:\"“”%+/#]{1,100}$")

class EventCreate(BaseModel):
    title: str = Field("", min_length=1, max_length=100)
    description: str = Field("", max_length=1000)
    start_at: datetime
    ends_at: datetime
    location: str = Field("", max_length=200)
    address: str = Field("", max_length=100)
    website: AnyUrl | None = None
    latitude: float | None = None
    longitude: float | None = None
    image: AnyUrl | None = None


    @field_validator("title")
    @classmethod
    def title_chars(cls, v: str) -> str:
        # Be permissive: allow most printable punctuation but reject angle brackets
        if not isinstance(v, str):
            raise ValueError("Title must be a string")
        v = v.strip()
        if not v:
            raise ValueError("Title must not be empty")
        if len(v) > 100:
            raise ValueError("Title too long")
        if "<" in v or ">" in v:
            raise ValueError("Title contains invalid characters.")
        return v


    @field_validator("ends_at")
    @classmethod
    def ends_after_start(cls, v: datetime, info):
        start_at = info.data.get("start_at")
        if start_at and v <= start_at:
            raise ValueError("Event end time must be after start time.")
        return v
    
    """
    @field_validator("ends_at")
    @classmethod
    def ends_after_start(cls, v: datetime, info):
        
        start_at = info.data.get("start_at")
    
        if start_at:
            # Standardize for comparison: if either is naive, assume UTC for comparison
            if v.tzinfo is None or v.tzinfo.utcoffset(v) is None:
                v_aware = v.replace(tzinfo=timezone.utc)
            else:
                v_aware = v

            if start_at.tzinfo is None or start_at.tzinfo.utcoffset(start_at) is None:
                start_at_aware = start_at.replace(tzinfo=timezone.utc)
            else:
                start_at_aware = start_at
            
            if v_aware <= start_at_aware:
                raise ValueError("Event end time must be after start time.")
        return v
        """
   
    
    
    
