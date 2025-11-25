import csv
import re
import json
from datetime import datetime
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from pydantic import ValidationError
import sys
import pprint
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from env file
load_dotenv()

# Add parent directories to path to allow imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.sanitize import sanitize
from src.sanitize import schemas
from models.models import Event as EventModel, Location as LocationModel
from db.db_init import SessionLocal

"""
Script Example

Type1
[{"@context":"https://schema.org",
"@type":"Event",
"name":"name",
"description":"description",
"startDate":"2025-11-17T08:00:00-08:00",
"endDate":"2025-11-17T17:00:00-08:00",
"eventStatus":"EventScheduled",
"url":"https://calendar.uoregon.edu/event/",
"image":"https://localist-images.azureedge.net.jpg"}]

Type2
[{"@context":"https://schema.org",
"@type":"Event",
"name":"name",
"description":"description",
"startDate":"2025-11-17T09:00:00-08:00",
"endDate":"2025-11-17T18:00:00-08:00",
"eventStatus":"EventScheduled",

"location":
{"@type":"Place",
"name":"Lawrence Hall",
"address":"1190 Franklin Boulevard, Eugene, OR",

"geo":
{"@type":
"GeoCoordinates",
"latitude":"44.047367",
"longitude":"-123.07431"},
"sameAs":"https://calendar.uoregon.edu/LawrenceHall",
"url":"https://calendar.uoregon.edu/event/",
"image":"https://localist-images.azureedge.net.jpg"}]
"""

# --- Configuration ---
TARGET_URL = "https://calendar.uoregon.edu"
MAX_PAGES = 10
HEADERS = {
    # It's always best practice to identify your scraper
    "User-Agent": "UOEventScraper/1.0 (Contact: user@example.com)"
}

# --- Fetching with Retry Logic  ---

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=0.5, max=8),
    retry=retry_if_exception_type((requests.RequestException,))
)

def fetch_html(url: str) -> str:
    """
    Fetches HTML content from a URL with robust error handling and exponential backoff.
    Raises an HTTPError for bad status codes (4xx, 5xx).
    """
    print(f"Fetching URL: {url}")
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.text


# --- Parsing Logic (Targeting JSON-LD) ---

def parse_listing(html: str, base_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    rows = []

    target_scripts = soup.find_all("script", {"type": "application/ld+json"})
    
    if not target_scripts:
        print("Warning: Could not find any script tags with type='application/ld+json'.")


    for script_tag in target_scripts:
        script_text = script_tag.string
        if not script_text:
            continue

        try:
            # The entire script content is a clean JSON payload
            data = json.loads(script_text)

            # Normalize data: It can be a single dict or a list of dicts
            events = []
            if isinstance(data, list):
                events.extend(data)
            elif isinstance(data, dict):
                events.append(data)
            
            for event in events:
                if isinstance(event, dict) and event.get("@type") == "Event":
                
                    # --- Location Variable Initialization ---
                    loc_name = ""
                    address = ""
                    latitude = ""
                    longitude = "" 
                
                    # Extract fields using .get() for safe access
                    title = event.get("name", "")
                
                    
                    start_at = event.get("startDate", "") 
                    ends_at = event.get("endDate", "")   
                
                    raw_link = event.get("url", "")
                    website = urljoin(base_url, raw_link) 
                    description = event.get("description", "")
                    image = event.get("image", "")
                
                    location = event.get("location", {})
                    if isinstance(location, dict):
                        loc_name = location.get("name", "")
                        address = location.get("address", "")

                    geocoordinates = location.get("geo", {})
                    if isinstance(geocoordinates, dict):
                        latitude = geocoordinates.get("latitude", latitude) 
                        longitude = geocoordinates.get("longitude", longitude)  
                        
                    rows.append({
                        "title": title,
                        "start_at": start_at,  
                        "ends_at": ends_at,    
                        "location": loc_name,
                        "address": address,
                        "latitude": latitude,
                        "longitude": longitude,
                        "description": description,
                        "image": image,
                        "website": website     
                    })
                
        except json.JSONDecodeError:
            # Silently ignore script tags that fail to parse as JSON
            pass

    print(f"\nFinished parsing scripts. Total events found: {len(rows)}")
    #pprint.pprint(rows)
    return rows

# --- Sanitization and Validation Logic ---
def process_and_validate(event_data: dict) -> dict | None:
    try: 
        
        raw_description = event_data.get("description", "")
        cleaned_description = sanitize.clean_html(raw_description)
        clipped_description = sanitize.clip(cleaned_description, 1000)
        final_description = sanitize.normalize_whitespace(clipped_description)

        final_title = sanitize.normalize_whitespace(event_data.get("title", ""))


        event_data["description"] = final_description

        start_at = event_data.get("start_at")
        ends_at = event_data.get("ends_at")

        # If date is given as a bare date string (YYYY-MM-DD), append end-of-day
        if isinstance(ends_at, str) and len(ends_at) == 10:
            ends_at = f"{ends_at}T23:59:59-08:00"

        if isinstance(start_at, str) and len(start_at) == 10:
            start_at = f"{start_at}T00:00:00-08:00"

        if not sanitize.is_future_event(start_at):
            print(f"Discarding event '{event_data.get('title')}' because it is in the past.")
            return None

        # Prepare validated input; optional fields should be None when missing/empty
        validated_input = {
            "title": final_title,
            "description": final_description,
            "start_at": start_at or None,
            "ends_at": ends_at or None,
            "website": event_data.get("website") or None,
            "image": event_data.get("image") or None,
        }

        # Normalize and attach location-related fields
        for field in ("location", "address"):
            raw_value = event_data.get(field)
            if isinstance(raw_value, str):
                cleaned = sanitize.normalize_whitespace(raw_value)
                validated_input[field] = cleaned if cleaned not in (None, "") else None
            else:
                validated_input[field] = raw_value if raw_value is not None else None

        # Latitude/longitude: coerce strings to floats, leave None when missing
        for coord in ("latitude", "longitude"):
            raw_value = event_data.get(coord)
            if raw_value is None or raw_value == "":
                validated_input[coord] = None
            elif isinstance(raw_value, (int, float)):
                validated_input[coord] = float(raw_value)
            else:
                try:
                    validated_input[coord] = float(str(raw_value))
                except (ValueError, TypeError):
                    validated_input[coord] = None            
        

        validated_model = schemas.EventCreate(**validated_input)
        return validated_model.model_dump()
    
    except (ValidationError, ValueError, TypeError) as e:
        print(f"Validation failed for event: {event_data.get('title')}. Error: {e}")
        return None


# --- Database Insertion Logic ---
def insert_events_to_db(validated_events: list[dict]) -> tuple[int, int]:
    """
    Insert validated events into the database.
    Returns a tuple of (successful_inserts, failed_inserts).
    """
    db = SessionLocal()
    success_count = 0
    failure_count = 0
    
    try:
        for event_data in validated_events:
            try:
                # Parse datetime strings to datetime objects
                start_at = event_data.get("start_at")
                ends_at = event_data.get("ends_at")
                
                if isinstance(start_at, str):
                    start_at = datetime.fromisoformat(start_at.replace('Z', '+00:00'))
                if isinstance(ends_at, str):
                    ends_at = datetime.fromisoformat(ends_at.replace('Z', '+00:00'))
                
                # Extract date and time components
                event_date = start_at.date() if start_at else None
                start_time = start_at.time() if start_at else None
                end_time = ends_at.time() if ends_at else None
                
                # Handle location data
                location_id = None
                location_name = event_data.get("location")
                address = event_data.get("address")
                latitude = event_data.get("latitude")
                longitude = event_data.get("longitude")
                
                # Create or find location if we have location data
                if location_name or address or (latitude and longitude):
                    # Check if location already exists
                    existing_location = db.query(LocationModel).filter(
                        LocationModel.building_name == (location_name or "Unknown"),
                        LocationModel.address == address
                    ).first()
                    
                    if existing_location:
                        location_id = existing_location.location_id
                    else:
                        # Create new location
                        new_location = LocationModel(
                            building_name=location_name or "Unknown",
                            address=address,
                            latitude=latitude,
                            longitude=longitude
                        )
                        db.add(new_location)
                        db.flush()  # Get the location_id without committing
                        location_id = new_location.location_id
                
                # Create Event model instance
                event = EventModel(
                    title=event_data.get("title"),
                    description=event_data.get("description"),
                    category="Scraped",  # Default category for scraped events
                    date=event_date,
                    start_time=start_time,
                    end_time=end_time,
                    image_url=str(event_data.get("image")) if event_data.get("image") else None,
                    external_url=str(event_data.get("website")) if event_data.get("website") else None,
                    location_id=location_id,
                    is_scraped=True
                )
                
                # TODO: Handle location insertion 
                
                db.add(event)
                db.commit()
                success_count += 1
                print(f"Inserted: {event_data.get('title')}")
                
            except Exception as e:
                db.rollback()
                failure_count += 1
                print(f"✗ Failed to insert '{event_data.get('title')}': {e}")
                
    finally:
        db.close()
    
    return success_count, failure_count



# --- Main Orchestration ---

# def crawl(url: str, out_csv: str):
def crawl(url: str):
    
    #Runs the scraping process: fetches the page, parses the data, 
    #and writes the results to a CSV file.
    
    base_url = url.rstrip('/')
    validated_events = []

    try:
        for page_counter in range(1, MAX_PAGES + 1):
            if page_counter == 1:
                current_url = base_url
            else:
                current_url = f"{base_url}/calendar/{page_counter}"

            print(f"\n--- Scraping Page {page_counter} ---")

            try:
                html = fetch_html(current_url)

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    print(f"Page{page_counter} returned 404. Ending crawl.")
                    break

                else:
                    raise e
                
            events_on_page = parse_listing(html, base_url=current_url)

            if not events_on_page:
                print(f"Page {page_counter} returned no events. Ending crawl.")
                break

            for raw_event in events_on_page:
                validated_event = process_and_validate(raw_event)
                if validated_event:
                    validated_events.append(validated_event)

            print(f"-> Validated {len(validated_events)} events on this page.")
            

        if page_counter >= MAX_PAGES:
            print(f"Found {len(validated_events)} events on this page. Total: {len(validated_events)}")

    except requests.RequestException as e:
            print(f"FATAL ERROR: Failed to fetch URL or connect to site. Stopping crawl: {e}")
    except Exception as e:
            print(f"An unexpected error occurred during crawl: {e}")

    
    if not validated_events:
        print("No events were extracted during the entire crawl.")
        return
    
    print(f"\n=== Inserting {len(validated_events)} events into database ===")
    success_count, failure_count = insert_events_to_db(validated_events)
    
    print(f"\nSuccessfully inserted: {success_count} events")
    print(f"Failed to insert: {failure_count} events")
    print(f"Total processed: {len(validated_events)} events")
    
    


if __name__ == "__main__":
    #crawl(TARGET_URL, OUTPUT_FILE) 
    crawl(TARGET_URL)

    """
    html = fetch_html(TARGET_URL)
    events = parse_listing(html, base_url=TARGET_URL)
    for raw_event in events:
                validated_event = process_and_validate(raw_event)
                if validated_event:
                    pprint.pprint(validated_event)
    """


     
    