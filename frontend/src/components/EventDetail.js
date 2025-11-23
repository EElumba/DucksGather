import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/EventDetail.css';
import { getEvent } from '../api/client';

/**
 * EventDetail Component
 * Displays detailed information about a specific event.
 *
 * This component fetches a single event from the backend using the
 * event ID from the URL params and renders a detailed view.
 */
const EventDetail = () => {
  // Read the dynamic :id segment from the route
  const { id } = useParams();
  const navigate = useNavigate();

  // Local state for loading, error, and event data
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch the event details when the component mounts or id changes
    async function fetchEvent() {
      try {
        setLoading(true);
        setError(null);
        const data = await getEvent(id);
        setEvent(data);
      } catch (err) {
        // If we cannot load the event, store the error so we can handle it below
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchEvent();
    }
  }, [id]);

  // If loading, show a basic loading state
  if (loading) {
    return (
      <div className="event-detail-container">
        <div className="event-detail-content">
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  // If there was an error or no event data, redirect to 404
  if (error || !event) {
    navigate('/404');
    return null;
  }

  // Safely derive fields from the event payload with fallbacks
  const title = event.title || 'Event';
  const date = event.date || 'Date TBD';
  const duration = event.duration || '';
  const timeLabel = event.start_time || event.time || '';
  const description = event.description || 'No description available.';

  // Image: use backend image_url if present, otherwise fall back
  const imageSrc = event.image_url || '/campus-hero.jpg';

  // Location: handle both string and object formats, mirroring EventList display
  let locationText = '';
  if (typeof event.location === 'string') {
    locationText = event.location;
  } else if (event.location && typeof event.location === 'object') {
    const { building_name, room_number } = event.location;
    if (building_name && room_number) {
      locationText = `${building_name}, room ${room_number}`;
    } else if (building_name) {
      locationText = building_name;
    }
  }

  return (
    <div className="event-detail-container">
      <div className="event-detail-content">
        {/* Simple back button to return to Explore view */}
        <button
          className="back-button"
          onClick={() => navigate('/explore')}
        >
          Back to Explore
        </button>

        {/* Header with title and meta information (date, time, duration) */}
        <div className="event-header">
          <h1>{title}</h1>
          <div className="event-meta">
            <span>{date}</span>
            {timeLabel && (
              <>
                <span>•</span>
                <span>{timeLabel}</span>
              </>
            )}
            {duration && (
              <>
                <span>•</span>
                <span>{duration}</span>
              </>
            )}
          </div>
        </div>

        {/* Main image for the event with a safe fallback */}
        <div className="event-image-container">
          <img
            src={imageSrc}
            alt={title}
            onError={(e) => {
              // Ensure we only fall back once to avoid infinite loop
              e.target.onerror = null;
              e.target.src = '/campus-hero.jpg';
            }}
          />
        </div>

        {/* Detailed information section for location and description */}
        <div className="event-info-section">
          <h2>Location</h2>
          <p>{locationText || 'Location TBD'}</p>

          <h2>Description</h2>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
