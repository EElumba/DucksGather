import requests
from bs4 import BeautifulSoup
import json

def extract_events_from_url(url):
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to retrieve content from {url}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    json_ld_scripts = soup.find_all('script', type='application/ld+json')

    events = []

    for script in json_ld_scripts:
        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                for item in data:
                    if item.get('@type') == 'Event':
                        events.append(parse_event(item))
            elif isinstance(data, dict) and data.get('@type') == 'Event':
                events.append(parse_event(data))
        except json.JSONDecodeError:
            continue

    return events

def parse_event(event_data):
    title = event_data.get('name', 'No Title')
    start_date = event_data.get('startDate', 'No Start Date')
    end_date = event_data.get('endDate', 'No End Date')
    location_data = event_data.get('location', {})
    location_name = location_data.get('name', 'No Location') if isinstance(location_data, dict) else 'No Location'
    description = event_data.get('description', 'No Description')
    
    # Extract geolocation data
    geo_data = location_data.get('geo', {}) if isinstance(location_data, dict) else {}
    latitude = geo_data.get('latitude', 'No Latitude') if isinstance(geo_data, dict) else 'No Latitude'
    longitude = geo_data.get('longitude', 'No Longitude') if isinstance(geo_data, dict) else 'No Longitude'
    
    # Extract URLs
    event_url = event_data.get('url', 'No URL')
    image_url = event_data.get('image', 'No Image URL')

    return {
        'title': title,
        'start_date': start_date,
        'end_date': end_date,
        'location': location_name,
        'description': description,
        'latitude': latitude,
        'longitude': longitude,
        'event_url': event_url,
        'image_url': image_url
    }

# Example usage
url = "https://calendar.uoregon.edu/calendar"


url_list = ["https://calendar.uoregon.edu/calendar", 
            "https://calendar.uoregon.edu", 
            "https://calendar.uoregon.edu/calendar/2", 
            "https://calendar.uoregon.edu/calendar/3", 
            "https://calendar.uoregon.edu/calendar/4", 
            "https://calendar.uoregon.edu/calendar/5", 
            "https://calendar.uoregon.edu/calendar/6", 
            "https://calendar.uoregon.edu/calendar/7"]



#vents = extract_events_from_url(url)


count = 0




#TODO: Return in JSON format
for page in url_list:
    events = extract_events_from_url(page)
    for event in events:
        count += 1
        print("Event Title:", event['title'])
        print("Start Date:", event['start_date'])
        print("End Date:", event['end_date'])
        print("Location:", event['location'])
        print("Latitude:", event['latitude'])
        print("Longitude:", event['longitude'])
        print("Event URL:", event['event_url'])
        print("Image URL:", event['image_url'])
        print("Description:", event['description'])
        print("-" * 80)
        
    
print(count)