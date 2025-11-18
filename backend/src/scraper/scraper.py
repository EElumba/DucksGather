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

# Add parent directories to path to allow imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.sanitize import sanitize
from src.sanitize import schemas

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
    """
    Finds and parses Schema.org Event JSON-LD data from script tags.
    This is the most reliable method when data is available in this format.
    
    soup = BeautifulSoup(html, "lxml")
    rows = []
    
    # Target specific script tags used for JSON-LD (Schema.org data)
    # The UO calendar uses <script type="application/ld+json"> for its event data.
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
                # Filter to ensure we only process actual "Event" objects based on Schema.org rules
                if isinstance(event, dict) and event.get("@type") == "Event":
                    
                    # Extract fields using .get() for safe access
                    title = event.get("name", "")
                    start_time = event.get("startDate", "")
                    end_time = event.get("endDate", "")
                    raw_link = event.get("url", "")
                    link = urljoin( base_url, raw_link)
                    description = event.get("description", "")
                    image = event.get("image", "")  

                    location = event.get("location", {})
                    if isinstance(location, dict):
                        loc_name = location.get("name", "")
                        address = location.get("address", "")

                    geocoordinates = location.get("geo", {})
                    if isinstance(geocoordinates, dict):
                        latitude = geocoordinates.get("latitude", "")
                        longitude = geocoordinates.get("longitude", "")                           
                    
                    rows.append({
                        "title": title,
                        "start_at": start_time,
                        "ends_at": end_time,
                        "location": loc_name,
                        "address": address,
                        "latitude": latitude,
                        "longitude": longitude,
                        "description": description,
                        "image": image,
                        "website": link
                    })
            
        except json.JSONDecodeError:
            # Silently ignore script tags that fail to parse as JSON
            pass

    print(f"\nFinished parsing scripts. Total events found: {len(rows)}")
    #print(rows)
    return rows
"""

# --- Sanitization and Validation Logic ---
def process_and_validate(event_data: dict) -> dict | None:
    try: 
        cleaned_data = {}
        
        raw_description = event_data.get("description", "")
        cleaned_description = sanitize.clean_html(raw_description)
        clipped_description = sanitize.clip(cleaned_description, 1000)
        final_description = sanitize.normalize_whitespace(clipped_description)

        final_title = sanitize.normalize_whitespace(event_data.get("title", ""))


        event_data["description"] = final_description

        cleaned_title = sanitize.normalize_whitespace(event_data.get("title"))
        cleaned_location = sanitize.normalize_whitespace(event_data.get("location"))

        start_at = event_data.get("start_at")
        ends_at = event_data.get("ends_at")

        # If date is given as a bare date string (YYYY-MM-DD), append end-of-day
        if isinstance(ends_at, str) and len(ends_at) == 10:
            ends_at = f"{ends_at}T23:59:59-08:00"

        if isinstance(start_at, str) and len(start_at) == 10:
            start_at = f"{start_at}T00:00:00-08:00"

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

        

           

            """    
            # Use raw data for optional fields, converting "" to None for Pydantic
            "location": cleaned_location or None, 
            "address": event_data.get("address") or None,
            "latitude": event_data.get("latitude") or None,
            "longitude": event_data.get("longitude") or None,
            """
            
        

        validated_model = schemas.EventCreate(**validated_input)
        return validated_model.model_dump()
    
    except (ValidationError, ValueError, TypeError) as e:
        print(f"Validation failed for event: {event_data.get('title')}. Error: {e}")
        return None

    """
    #Sanitizes and validates event data using the sanitize module.
    try:
        cleaned_data = {}

        cleaned_data["title"] = sanitize.normalize_whitespace(event_data.get("title"))
        cleaned_data["location"] = sanitize.normalize_whitespace(event_data.get("location"))
        cleaned_data["description"] = sanitize.clean_html(event_data.get("description"))

        validated_input = {
            "title": cleaned_data["title"],
            "description": cleaned_data["description"],
            "start_at": event_data.get("start_at"),
            "ends_at": event_data.get("ends_at"),
            "location": cleaned_data["location"] or None,
            "website": event_data.get("website") or None,
            "address": event_data.get("address") or None,
            "latitude": event_data.get("latitude") or None,
            "longitude": event_data.get("longitude") or None,
            "image": event_data.get("image") or None,
        }

        validated_model = schemas.EventCreate(**validated_input)
        return validated_model.model_dump()
    
    except (ValidationError, ValueError, TypeError) as e:
        print(f"Validation failed for event: {event_data.get('title')}. Error: {e}")
        return None
    """

    

# --- Main Orchestration ---

def crawl(url: str, out_csv: str):
#def crawl(url: str):
    
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
            #return validated_events
            

        if page_counter >= MAX_PAGES:
            print(f"Found {len(validated_events)} events on this page. Total: {len(validated_events)}")

    except requests.RequestException as e:
            print(f"FATAL ERROR: Failed to fetch URL or connect to site. Stopping crawl: {e}")
    except Exception as e:
            print(f"An unexpected error occurred during crawl: {e}")

            
    
    if not validated_events:
        print("No events were extracted during the entire crawl.")
        return
    
    
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
    


if __name__ == "__main__":
    
    html = fetch_html(TARGET_URL)
    events = parse_listing(html, base_url=TARGET_URL)
    for raw_event in events:
                validated_event = process_and_validate(raw_event)
                if validated_event:
                    pprint.pprint(validated_event)



    #crawl(TARGET_URL, OUTPUT_FILE) 
    #crawl(TARGET_URL) 
    