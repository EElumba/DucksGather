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

# Add repository root to path so `backend` package imports resolve
# (Path(__file__).parent.parent.parent.parent points to the repo root)
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from backend.src.sanitize import sanitize
from backend.src.sanitize import schemas
from backend.src.db.db_init import create_tables_if_needed, SessionLocal
from backend.src.models.models import Event as ORMEvent, Location as ORMLocation
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from datetime import date, time

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
OUTPUT_FILE = "uoregon_events.csv"
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


def save_event_to_db(validated: dict, db: Session):
    """Persist a validated event dict into the database.

    This will upsert a Location (by building_name + address) and insert an Event row.
    """
    try:
        # parse datetimes if they are strings
        def _parse_dt(v):
            if v is None:
                return None
            if isinstance(v, str):
                try:
                    return datetime.fromisoformat(v)
                except Exception:
                    return None
            return v

        start = _parse_dt(validated.get("start_at"))
        ends = _parse_dt(validated.get("ends_at"))

        # derive date and time values expected by ORM
        db_date = start.date() if isinstance(start, datetime) else None
        db_start_time = start.time().replace(tzinfo=None) if isinstance(start, datetime) else None
        db_end_time = ends.time().replace(tzinfo=None) if isinstance(ends, datetime) else None

        # Upsert location
        building_name = validated.get("location") or "Unknown"
        address = validated.get("address")
        loc = None
        try:
            loc = db.query(ORMLocation).filter(ORMLocation.building_name == building_name, ORMLocation.address == address).first()
        except Exception:
            loc = None

        if not loc:
            loc = ORMLocation(
                building_name=building_name,
                room_number=None,
                address=address,
                latitude=validated.get("latitude"),
                longitude=validated.get("longitude"),
            )
            db.add(loc)
            db.flush()

        # Create event record
        ev = ORMEvent(
            title=(validated.get("title") or "")[:500],
            description=validated.get("description"),
            category="scraped",
            date=db_date or date.today(),
            start_time=db_start_time or time(0, 0),
            end_time=db_end_time or time(23, 59),
            image_url=str(validated.get("image")) if validated.get("image") else None,
            external_url=str(validated.get("website")) if validated.get("website") else None,
            location_id=loc.location_id if loc else None,
            is_scraped=True,
        )

        db.add(ev)
        db.flush()
        return ev
    except SQLAlchemyError as e:
        db.rollback()
        raise


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
            #pprint.pprint(validated_events)
            

        if page_counter >= MAX_PAGES:
            print(f"Found {len(validated_events)} events on this page. Total: {len(validated_events)}")

    except requests.RequestException as e:
            print(f"FATAL ERROR: Failed to fetch URL or connect to site. Stopping crawl: {e}")
    except Exception as e:
            print(f"An unexpected error occurred during crawl: {e}")

    
    if not validated_events:
        print("No events were extracted during the entire crawl.")
        return
    
    return validated_events
    
    """
    try:
        # Write data to CSV
        with open(out_csv, "w", newline="", encoding="utf-8") as f:
            # Define fieldnames based on the keys we extracted
            fieldnames = ["title", "start_at", "ends_at", "location", "address", "latitude", "longitude", "description", "image", "website"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
    
            writer.writeheader()
            writer.writerows(validated_events)
        
        print(f"\n Success! Scraped {len(validated_events)} events and saved to **{out_csv}**")

    except IOError as e:
        print(f"Error writing to CSV file: {e}")
    
    
# Initialize DB (create tables if running locally)
    create_tables_if_needed()

    html = fetch_html(TARGET_URL)
    events = parse_listing(html, base_url=TARGET_URL)

    # Open a DB session for persistence
    db = SessionLocal()
    try:
        for raw_event in events:
            validated_event = process_and_validate(raw_event)
            if validated_event:
                pprint.pprint(validated_event)
                try:
                    # attempt to save to DB; ignore errors per-event to continue
                    save_event_to_db(validated_event, db)
                except Exception as e:
                    print(f"DB save failed for {validated_event.get('title')}: {e}")
        db.commit()
    finally:
        db.close()
    """


if __name__ == "__main__":
    #crawl(TARGET_URL, OUTPUT_FILE) 
    #crawl(TARGET_URL)
    
    import argparse

    parser = argparse.ArgumentParser(description="Scrape UO calendar")
    parser.add_argument("--persist", action="store_true", help="Persist scraped events to DB")
    parser.add_argument("--max-pages", type=int, default=MAX_PAGES, help="Maximum pages to crawl")
    parser.add_argument("--target", type=str, default=TARGET_URL, help="Target URL to crawl")
    args = parser.parse_args()

    # allow overriding global MAX_PAGES for this run
    MAX_PAGES = args.max_pages

    # Run crawl (returns list of validated event dicts)
    events = crawl(args.target)

    if not events:
        print("No validated events extracted.")
        sys.exit(0)

    if args.persist:
        # Initialize/create tables (safe: will only auto-create for sqlite or if AUTO_CREATE_TABLES set)
        create_tables_if_needed()

        db = SessionLocal()
        try:
            inserted = 0
            for ev in events:
                try:
                    save_event_to_db(ev, db)
                    inserted += 1
                except Exception as e:
                    print(f"Failed to save '{ev.get('title')}' -> {e}")
            db.commit()
            print(f"Persisted {inserted} events to the DB.")
        finally:
            db.close()
    else:
        # Dry-run: just pretty-print validated events
        for ev in events:
            pprint.pprint(ev)




    """
    html = fetch_html(TARGET_URL)
    events = parse_listing(html, base_url=TARGET_URL)
    for raw_event in events:
                validated_event = process_and_validate(raw_event)
                if validated_event:
                    pprint.pprint(validated_event)
    """


     
    