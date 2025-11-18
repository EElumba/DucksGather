from pydantic import BaseModel, Field, EmailStr, AnyUrl, field_validator
from datetime import datetime
import re

SAFE_TITLE = re.compile(r"^[\w\s\-.,'!()]{1,100}$") # Alphanumeric, spaces, and some punctuation, max length 100

class EventCreate(BaseModel):
    title: str = Field("", min_length=1, max_length=100)
    description: str = Field("", max_length=1000)
    start_at: datetime
    ends_at: datetime
    location: str = Field("", min_length=1, max_length=200)
    address: str = Field("", min_length=1, max_length=100)
    website: AnyUrl | None = None
    latitude: float | None = None
    longitude: float | None = None
    image: AnyUrl | None = None


    @field_validator("title")
    @classmethod
    def title_chars(cls, v: str) -> str:
        if not SAFE_TITLE.match(v):
            raise ValueError("Title contains invalid characters.")
        return v

   
    @field_validator("ends_at")
    @classmethod
    def ends_after_start(cls, v: datetime, info):
        start_at = info.data.get("start_at")
        if start_at and v <= start_at:
            raise ValueError("Event end time must be after start time.")
        return v
