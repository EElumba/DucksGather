import csv
import re
import json
from datetime import datetime
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from pydantic import ValidationError

from src.sanitize import sanitize
from src.sanitize import schemas


# --- Configuration ---
TARGET_URL = "https://calendar.uoregon.edu"
OUTPUT_FILE = "uoregon_events.csv"
MAX_PAGES = 10
HEADERS = {
    # It's always best practice to identify your scraper
    "User-Agent": "UOEventScraper/1.0 (Contact: user@example.com)"
}

# --- Fetching with Retry Logic (using tenacity) ---

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
    """
    Finds and parses Schema.org Event JSON-LD data from script tags.
    This is the most reliable method when data is available in this format.
    """
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
                    link = event.get("url", base_url)
                    description = event.get("description", "")
                    image = event.get("image", "")  

                    loc_name = ""
                    adress = ""
                    latitude = ""
                    longitude = ""

                    location = event.get("location", {})
                    if isinstance(location, dict):
                        loc_name = location.get("name", "")
                        address = location.get("address", "")
                        latitude = location.get("latitude", "")
                        longitude = location.get("longitude", "")
                                         
                    
                    rows.append({
                        "title": title,
                        "start_time": start_time,
                        "end_time": end_time,
                        "location": loc_name,
                        "address": address,
                        "latitude": latitude,
                        "longitude": longitude,
                        "description": description,
                        "image": image,
                        "link": link
                    })
            
        except json.JSONDecodeError:
            # Silently ignore script tags that fail to parse as JSON
            pass

    print(f"\nFinished parsing scripts. Total events found: {len(rows)}")
    return rows


# --- Sanitization and Validation Logic ---
def process_and_validate(event_data: dict) -> dict | None:
    """
    Sanitizes and validates event data using the sanitize module."""
    try:
        cleaned_data = {}

        cleaned_data["title"] = sanitize.normalize_whitespae(event_data.get("title"))
        cleaned_data["location"] = sanitize.normalize_whitespace(event_data.get("location"))
        cleaned_data["description"] = sanitize.clean_html(event_data.get("description"))

        validated_input = {
            "title": cleaned_data["title"],
            "description": cleaned_data["description"],
            "start_at": event_data.get("start_time"),
            "ends_at": event_data.get("end_time"),
            "location": cleaned_data["location"],
            "website": event_data.get("link"),
        }

        validated_model = schemas.EventCreate(**validated_input)
        return validated_model.model_dump()
    
    except (ValidationError, ValueError, TypeError) as e:
        print(f"Validation failed for event: {event_data.get('title')}. Error: {e}")
        return None
    

# --- Main Orchestration ---

def crawl(url: str, out_csv: str):
    """
    Runs the scraping process: fetches the page, parses the data, 
    and writes the results to a CSV file.
    """
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
                validated_events = process_and_validate(raw_event)
                if validated_events:
                    validated_events.append(validated_events)

            print(f"-> Validated {len(validated_events)} events on this page.")
            

        if page_counter >= MAX_PAGES:
            print(f"Found {len(validated_events)} events on this page. Total: {len(events_on_page)}")

    except requests.RequestException as e:
            print(f"FATAL ERROR: Failed to fetch URL or connect to site. Stopping crawl: {e}")
    except Exception as e:
            print(f"An unexpected error occurred during crawl: {e}")

            
    # Final CSV Writing
    if not validated_events:
        print("No events were extracted during the entire crawl.")
        return

    try:
        # Write data to CSV
        with open(out_csv, "w", newline="", encoding="utf-8") as f:
            # Define fieldnames based on the keys we extracted
            fieldnames = ["title", "start_time", "end_time", "location", "address", "latitude", "longitude", "description", "image", "link"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(validated_events)
        
        print(f"\n Success! Scraped {len(validated_events)} events and saved to **{out_csv}**")

    except IOError as e:
        print(f"Error writing to CSV file: {e}")


if __name__ == "__main__":
    crawl(TARGET_URL, OUTPUT_FILE)