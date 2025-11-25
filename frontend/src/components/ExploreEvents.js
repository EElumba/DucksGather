import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import ExploreNavbar from './ExploreNavbar';
import Navbar from './Navbar';
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

const ExploreEvents = () => {
  const [filters] = useState({
    'Activity': ['Social', 'Sports', 'Academic', 'Cultural'],
    'Major': [/* your 70+ majors unchanged */]
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
        setEvents(items);
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
      mapRef.current?.setView([lat, lng], 16);
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
          <EventList category={activeCategory} q={searchQuery} />
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
