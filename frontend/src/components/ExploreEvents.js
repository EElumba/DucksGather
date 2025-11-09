import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import ExploreNavbar from './ExploreNavbar';
import 'leaflet/dist/leaflet.css';
import '../styles/ExploreEvents.css';
import L from 'leaflet';

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

/**
 * Component for displaying the list of events
 * Handles image loading and fallback
 * @param {Object} props - Component props
 * @param {Array} props.events - List of events to display
 * @param {Function} props.onEventSelect - Event selection handler
 */
const EventList = ({ events, selectedEvent, onEventSelect }) => (
  <div className="event-list">
    {events.map(event => (
      <div 
        key={event.id} 
        className={`event-card ${selectedEvent?.id === event.id ? 'highlighted' : ''}`}
        onClick={() => onEventSelect(event)}
        ref={selectedEvent?.id === event.id ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : null}
      >
        <div className="event-image">
          <img 
            src={getEventImage(event.image)}
            alt={event.name || IMAGE_CONFIG.DEFAULT_ALT_TEXT}
            onError={(e) => {
              // If image fails to load, use default image
              e.target.onerror = null; // Prevent infinite loop
              e.target.src = IMAGE_CONFIG.DEFAULT_EVENT_IMAGE;
            }}
            loading="lazy" // Add lazy loading for better performance
          />
        </div>
        <div className="event-info">
          <h3>{event.name}</h3>
          <p className="event-location">{event.location}</p>
          <p className="event-details">
            {event.date} • {event.duration} • {event.difficulty}
          </p>
        </div>
      </div>
    ))}
  </div>
);

// TO DO: Add filter functionality
// TO DO: add how to handle population of events from webscaper



const ExploreEvents = () => {
  // State management for filters, selected event, and map reference
  const [filters, setFilters] = useState({
    'Distance away': ['< 1 mile', '< 5 miles', '< 10 miles'],
    'Activity': ['Social', 'Sports', 'Academic', 'Cultural'],
    'Length': ['>30mins', '>1hour', '>1.5hours', '>2hours'],
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const mapRef = useRef(null);

  // Sample events data - replace with your actual events
  // Sample events data - replace images and update details as needed
  const events = [
    {
      id: 1,
      name: 'Campus Tour Social',
      location: 'University of Oregon',
      position: [44.04503839053625, -123.07256258731347],
      date: 'Nov 10, 2023',
      duration: '1 hour',
      difficulty: 'Easy',
      image: '/event-images/campus-tour.jpg',
      description: 'Join us for a social campus tour!'
    },
    {
      id: 2,
      name: 'Knight Library Study Group',
      location: 'Knight Library',
      position: [44.04328239297166, -123.07772853393564],
      date: 'Nov 12, 2023',
      duration: '2 hours',
      difficulty: 'Moderate',
      image: '/event-images/library-study.jpg',
      description: 'Group study session for finals'
    },
    {
      id: 3,
      name: 'Science Fair Prep',
      location: 'Price Science Library',
      position: [44.04624536232639, -123.07218013034097],
      date: 'Nov 15, 2023',
      duration: '3 hours',
      difficulty: 'Challenging',
      image: '/event-images/science-fair.jpg',
      description: 'Prepare for the upcoming science fair'
    },
    {
      id: 4,
      name: 'CS Club Meeting',
      location: 'UO Department of Computer Science',
      position: [44.046025617673784, -123.07108679685953],
      date: 'Nov 11, 2023',
      duration: '1.5 hours',
      difficulty: 'Easy',
      image: '/event-images/cs-club.jpg',
      description: 'Weekly CS club meeting - all welcome!'
    },
    {
      id: 5,
      name: 'Basketball Tournament',
      location: 'Matthew Knight Arena',
      position: [44.044952954092054, -123.06631965565566],
      date: 'Nov 18, 2023',
      duration: '4 hours',
      difficulty: 'Challenging',
      image: '/event-images/basketball.jpg',
      description: 'Inter-department basketball tournament'
    },
    {
      id: 6,
      name: 'Basketball Tournament',
      location: 'Matthew Knight Arena',
      position: [44.044952954092054, -123.06631965565566],
      date: 'Nov 18, 2023',
      duration: '4 hours',
      difficulty: 'Challenging',
      image: '/event-images/basketball.j',
      description: 'Inter-department basketball tournament'
    }
  ];

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    mapRef.current?.setView(event.position, 15);
  };

  const handleFilterChange = (filterType, value) => {
    // Implement filter logic here
    console.log(`Filter ${filterType} changed to ${value}`);
  };

  return (
    <div className="explore-events-container">
      {/* Transparent navbar at the top */}
      <ExploreNavbar />
      
      {/* Content wrapper for map and sidebar with clear navbar separation */}
      <div className="explore-content">
        {/* Left sidebar with event listings */}
        <div className="sidebar">
          <FilterBar filters={filters} onFilterChange={handleFilterChange} />
          <EventList events={events} onEventSelect={handleEventSelect} />
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
