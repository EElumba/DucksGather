import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import ExploreNavbar from './ExploreNavbar';
import Navbar from './Navbar';
import EventList from './EventList';
import 'leaflet/dist/leaflet.css';
import '../styles/ExploreEvents.css';
import L from 'leaflet';
import { listEvents } from "../api/client";

/**
 * ExploreEvents Component
 * Main page for exploring events on campus with an interactive map
 * 
 * Features:
 * - Interactive map with event markers
 * - Filterable event list
 * - Event details sidebar
 * - Custom Oregon-themed navigation
 * 
 * @component
 */

// Fix Leaflet's default icon path issues
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

/**
 * Component for the filter buttons at the top
 * @param {Object} props - Component props
 * @param {Object} props.filters - Filter options
 * @param {Function} props.onFilterChange - Filter change handler
 */
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

// TO DO: Add filter functionality
// TO DO: add how to handle population of events from webscaper



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
    'Women, Gender & Sexuality Studies'],
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Events shown in both the sidebar list (via EventList) and map markers
  const [events, setEvents] = useState([]);
  const mapRef = useRef(null);

  const handleFilterChange = (filterType, value) => {
    const normalized = value || "";

    // Map front-end filters to backend query fields
    if (filterType === "Activity" || filterType === "Major") {
      // Both Activity and Major feed into backend category filter
      setActiveCategory(normalized);
    }

    if (filterType === "Search") {
      setSearchQuery(normalized);
    }
  };

  /**
   * Load events from the backend that match the sidebar filters.
   * This mirrors the EventList fetching logic so the map markers and list
   * are driven by the same data source (including nested location info).
   */
  useEffect(() => {
    async function fetchEventsForMap() {
      try {
        const response = await listEvents({
          page: 1,
          page_size: 50,
          // Use the same filter fields as EventList so results stay in sync
          category: activeCategory || undefined,
          q: searchQuery || undefined,
        });

        const items = Array.isArray(response?.items) ? response.items : [];
        setEvents(items);
      } catch (err) {
        console.error("Error fetching events for map:", err);
      }
    }

    fetchEventsForMap();
  }, [activeCategory, searchQuery]);

  const handleEventSelect = (event) => {
    setSelectedEvent(event);

    // When an event marker is clicked, center the map on that event's coordinates.
    // If no coordinates exist, fall back to the default campus center.
    const lat = event?.location?.latitude;
    const lng = event?.location?.longitude;
    const hasCoords =
      typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);

    const targetPosition = hasCoords ? [lat, lng] : DEFAULT_MAP_CENTER;
    mapRef.current?.setView(targetPosition, 15);
  };

  // NOTE: handleFilterChange is defined above, wired to activeCategory/searchQuery

  return (
    <div className="explore-events-container">
      {/* Transparent navbar at the top */}
     
      
      {/* Content wrapper for map and sidebar with clear navbar separation */}
      <div className="explore-content">
        {/* Left sidebar with event listings */}
        <div className="sidebar">
          <h2 className="filter-heading">Filter Event by Type</h2>
          <FilterBar filters={filters} onFilterChange={handleFilterChange} />
          {/* Backend-driven global EventList wired to filters */}
          <EventList category={activeCategory} q={searchQuery} />
        </div>

        {/* Main map container */}
        <div className="map-container">
          {/* Leaflet MapContainer with explicit dimensions */}
          <MapContainer
            // Initial center is the default campus area; individual events
            // will recenter the view when selected.
            center={DEFAULT_MAP_CENTER}
            zoom={16}
            ref={mapRef}
            style={{ height: '100vh', width: '100%', position: 'relative' }}
          >
          {/* Esri World Imagery satellite map tiles */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          {events.map((event) => {
            // Safely derive a Leaflet [lat, lng] position from the backend
            // event.location object. If no coordinates exist, skip the marker
            // so we do not place it at an incorrect location.
            const lat = event?.location?.latitude;
            const lng = event?.location?.longitude;
            const hasCoords =
              typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);

            if (!hasCoords) {
              return null;
            }

            const position = [lat, lng];

            return (
              <Marker
                key={event.event_id}
                position={position}
                eventHandlers={{
                  click: () => handleEventSelect(event),
                }}
              >
                <Popup closeButton={false} className="event-popup">
                  <h3>{event.title}</h3>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default ExploreEvents;
