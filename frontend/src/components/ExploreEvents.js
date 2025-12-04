import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import EventList from './EventList';
import 'leaflet/dist/leaflet.css';
import '../styles/ExploreEvents.css';
import L from 'leaflet';
import { listEvents } from "../api/client";

// Fix Leaflet icon path issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});
/**
 * Default image configurations
 * Provides fallback images for events without images or when image loading fails
 */
const IMAGE_CONFIG = {
  DEFAULT_EVENT_IMAGE: '/campus-hero.jpg',
  DEFAULT_ALT_TEXT: 'Event at University of Oregon'
};

/**
 * Helper function to get event image URL
 * @param {string} imageUrl - The event's image URL
 * @returns {string} - Valid image URL or default image
 */
const getEventImage = (imageUrl) => {
  return imageUrl || IMAGE_CONFIG.DEFAULT_EVENT_IMAGE;
};

/**
 * Default map center used when an event does not have latitude/longitude.
 * This keeps the map focused on the main campus area.
 */
const DEFAULT_MAP_CENTER = [44.04503839053625, -123.07256258731347];

const FilterBar = ({ filters, onFilterChange }) => (
  <div className="filter-bar">
    {Object.entries(filters).map(([key, options]) => (
      <div key={key} className="filter-dropdown">
        <select onChange={(e) => onFilterChange(key, e.target.value)}>
          <option value="">{key}</option>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    ))}
  </div>
);

// Function to slightly offset overlapping markers
const spreadMarkers = (events) => {
  const grouped = {};

  events.forEach(event => {
    const lat = event?.location?.latitude;
    const lng = event?.location?.longitude;

    if (typeof lat !== "number" || typeof lng !== "number") return;

    const key = `${lat},${lng}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(event);
  });

  // Apply offsets
  const result = [];
  const OFFSET = 0.00008; // Small enough to keep markers close, large enough to click

  Object.values(grouped).forEach(group => {
    if (group.length === 1) {
      result.push({ ...group[0], _offsetPos: [group[0].location.latitude, group[0].location.longitude] });
    } else {
      // Spread around in a circle
      const centerLat = group[0].location.latitude;
      const centerLng = group[0].location.longitude;

      group.forEach((event, idx) => {
        const angle = (idx / group.length) * 2 * Math.PI;
        const lat = centerLat + OFFSET * Math.cos(angle);
        const lng = centerLng + OFFSET * Math.sin(angle);

        result.push({ ...event, _offsetPos: [lat, lng] });
      });
    }
  });

  return result;
};

/**
 * Filter out events that have already passed
 * @param {Array} events - Array of event objects
 * @returns {Array} - Filtered array of upcoming events only
 */
const filterOutdatedEvents = (events) => {
  const now = new Date();

  return events.filter(event => {
    // If no date, keep the event (avoid filtering out events without dates)
    if (!event.date) {
      console.log('Event has no date, keeping:', event.title);
      return true;
    }

    try {
      // Parse the event date - handle both ISO format and simple date strings
      let eventDate;
      
      // Check if date is in YYYY-MM-DD format
      if (typeof event.date === 'string' && event.date.match(/^\d{4}-\d{2}-\d{2}/)) {
        eventDate = new Date(event.date + 'T00:00:00');
      } else {
        eventDate = new Date(event.date);
      }
      
      console.log('Checking event:', event.title, 'Date:', event.date, 'Time:', event.time, 'Parsed:', eventDate);
      
      // If event has a time, use the full datetime comparison
      if (event.time) {
        const timeMatch = event.time.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const [_, hours, minutes] = timeMatch;
          eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          console.log('Event with time - EventDateTime:', eventDate, 'Now:', now, 'Show:', eventDate >= now);
          return eventDate >= now;
        }
      }
      
      // For events without time, compare dates only (include entire day)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      console.log('Event without time - EventDate:', eventDate, 'TodayStart:', todayStart, 'Show:', eventDate >= todayStart);
      return eventDate >= todayStart;
      
    } catch (err) {
      // If date parsing fails, keep the event
      console.warn('Failed to parse event date:', event.date, err);
      return true;
    }
  });
};

const ExploreEvents = () => {
  // Static filter options
  const [filters] = useState({
    'Activity': ['Social', 'Sports', 'Academic', 'Cultural'],
      'Major': [
    'Accounting',
    'Anthropology',
    'Architecture',
    'Art',
    'Art and Technology',
    'Art History',
    'Asian Studies',
    'Biochemistry',
    'Biology',
    'Business Administration',
    'Chemistry',
    'Child Behavioral Health',
    'Chinese',
    'Cinema Studies',
    'Classics',
    'Communication Disorders & Sciences',
    'Comparative Literature',
    'Computer Science',
    'Cybersecurity',
    'Dance',
    'Data Science',
    'Earth Sciences',
    'Economics',
    'Educational Foundations',
    'English',
    'Environmental Design',
    'Environmental Science',
    'Environmental Studies',
    'Ethnic Studies',
    'Family & Human Services',
    'Folklore & Public Culture',
    'French & Francophone Studies',
    'General Social Science',
    'Geography',
    'German',
    'Global Studies',
    'History',
    'Human Physiology',
    'Humanities',
    'Interior Architecture',
    'Italian Studies',
    'Journalism',
    'Journalism: Advertising',
    'Journalism: Media Studies',
    'Journalism: Public Relations',
    'Judaic Studies',
    'Japanese',
    'Landscape Architecture',
    'Latin American Studies',
    'Linguistics',
    'Mathematics',
    'Mathematics & Computer Science',
    'Marine Biology',
    'Materials Science & Technology',
    'Medieval Studies',
    'Multidisciplinary Science',
    'Music',
    'Music Composition',
    'Music Education',
    'Music: Jazz Studies',
    'Music Performance',
    'Native American & Indigenous Studies',
    'Neuroscience',
    'Philosophy',
    'Physics',
    'Planning, Public Policy & Management',
    'Political Science',
    'Popular Music',
    'Product Design',
    'Psychology',
    'Religious Studies',
    'Romance Languages',
    'Russian, East European & Eurasian Studies',
    'Sociology',
    'Spatial Data Science & Technology',
    'Spanish',
    'Theater Arts',
    'Women, Gender & Sexuality Studies']
  });

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState([]);
  const mapRef = useRef(null);

  const handleFilterChange = (filterType, value) => {
    const normalized = value || "";

    if (filterType === "Activity" || filterType === "Major") {
      setActiveCategory(normalized);
    }

    if (filterType === "Search") {
      setSearchQuery(normalized);
    }
  };

  useEffect(() => {
    async function fetchEventsForMap() {
      try {
        const response = await listEvents({
          page: 1,
          page_size: 50,
          category: activeCategory || undefined,
          q: searchQuery || undefined,
        });

        const items = Array.isArray(response?.items) ? response.items : [];
        // Filter out outdated events
        const upcomingEvents = filterOutdatedEvents(items);
        setEvents(upcomingEvents);
      } catch (err) {
        console.error("Error fetching events for map:", err);
      }
    }

    fetchEventsForMap();
  }, [activeCategory, searchQuery]);

const handleEventSelect = (event) => {
  setSelectedEvent(event);

  const lat = event?.location?.latitude;
  const lng = event?.location?.longitude;

  if (typeof lat === "number" && typeof lng === "number") {
    // Smoothly fly to the selected event
    mapRef.current?.flyTo([lat, lng], 16, {
      animate: true,
      duration: 1.5 // seconds, adjust for faster/slower
    });
  }
};


  // Prevent marker stacking
  const adjustedEvents = spreadMarkers(events);

  return (
    <div className="explore-events-container">
      <div className="explore-content">

        {/* Sidebar */}
        <div className="sidebar">
          <h2 className="filter-heading">Filter Event by Type</h2>
          <FilterBar filters={filters} onFilterChange={handleFilterChange} />
          <EventList
            events={adjustedEvents}
            onSelect={handleEventSelect}
            activeIndex={events.findIndex(e => e === selectedEvent) || 0}
            setActiveIndex={() => {}}
          />
        </div>

        {/* MAP */}
        <div className="map-container">
          <MapContainer
            center={DEFAULT_MAP_CENTER}
            zoom={16}
            whenCreated={(map) => (mapRef.current = map)}
            style={{ height: '100vh', width: '100%' }}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri & others"
            />

            {adjustedEvents.map(event => (
              <Marker
                key={event.event_id}
                position={event._offsetPos}
                eventHandlers={{ click: () => handleEventSelect(event) }}
              >
                <Popup closeButton={false}>
                  <h3>{event.title}</h3>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default ExploreEvents;