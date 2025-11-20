import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import ExploreNavbar from './ExploreNavbar';
import EventList from './EventList';
import { listEvents } from '../api/client';
import 'leaflet/dist/leaflet.css';
import '../styles/ExploreEvents.css';
import L from 'leaflet';

/**
 * ExploreEvents Component
 * Main page for exploring events on campus with an interactive map
 * 
 * Features:

  
 * - Event details sidebar
 * - Custom Oregon-themed navigation
 * 
 * @component
 */


// Handle filter changes from FilterBar
// (moved inside component so it can access local state setters)

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
    'Distance away': ['< 1 mile', '< 5 miles', '< 10 miles'],
    'Activity': ['Social', 'Sports', 'Academic', 'Cultural'],
    'Length': ['>30mins', '>1hour', '>1.5hours', '>2hours'],
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  // Fetch events from backend when filters change
  useEffect(() => {
    async function fetchAndTransformEvents() {
      try {
        setLoading(true);
        const response = await listEvents({
          page: 1,
          page_size: 50,
          category: activeCategory || undefined,
          q: searchQuery || undefined,
        });
        
        // Transform backend events to frontend map format
        const items = Array.isArray(response?.items) ? response.items : [];
        const transformedEvents = items
          .map(ev => {
            // coerce lat/lon to numbers
            const lat = ev?.latitude === null || ev?.latitude === undefined ? NaN : Number(ev.latitude);
            const lon = ev?.longitude === null || ev?.longitude === undefined ? NaN : Number(ev.longitude);
            return { ev, lat, lon };
          })
          .filter(({ lat, lon }) => Number.isFinite(lat) && Number.isFinite(lon))
          .map(({ ev, lat, lon }) => ({
            id: ev.event_id,
            name: ev.title,
            location: typeof ev.location === 'object' ? ev.location?.building_name || 'Unknown' : ev.location || 'Unknown',
            position: [lat, lon],
            date: ev.date || 'TBD',
            image: ev.image_url || IMAGE_CONFIG.DEFAULT_EVENT_IMAGE,
            description: ev.description || '',
            ...ev, // Include all other fields from backend
          }));
        
        setEvents(transformedEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAndTransformEvents();
  }, [activeCategory, searchQuery]);

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    mapRef.current?.setView(event.position, 15);
  };

  // Handle filter changes from FilterBar
  const handleFilterChange = (filterType, value) => {
    const normalized = value || "";
    if (filterType === "Activity" || filterType === "Major") {
      setActiveCategory(normalized);
    } else if (filterType === "Search") {
      setSearchQuery(normalized);
    } else {
      // Other filters can be handled here if needed
    }
  };

  return (
    <div className="explore-events-container">
      {/* Transparent navbar at the top */}
      <ExploreNavbar />
      
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
            center={[44.04503839053625, -123.07256258731347]}
            zoom={16}
            ref={mapRef}
            style={{ height: '100vh', width: '100%', position: 'relative' }}
          >
          {/* Esri World Imagery satellite map tiles */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          {events.map(event => (
            <Marker
              key={event.id}
              position={event.position}
              eventHandlers={{
                click: () => handleEventSelect(event)
              }}
            >
              <Popup closeButton={false} className="event-popup">
                <h3>{event.name}</h3>
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
