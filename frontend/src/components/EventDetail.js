import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/EventDetail.css';
import { getEvent, saveEvent, unsaveEvent, isEventSaved } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TextDirections from "./text_directions"

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

  // Access the authenticated user and profile (including role) from AuthContext
  const { user, profile, role } = useAuth();

  // Local state for loading, error, and event data
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // State for tracking if the event is saved and loading state for save operations
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    // Fetch the event details when the component mounts or id changes
    async function fetchEvent() {
      try {
        setLoading(true);
        setError(null);
        const data = await getEvent(id);
        setEvent(data);
        
        // After getting event data, check if it's saved by the current user
        const saved = await isEventSaved(id);

        // If the viewer is also the creator of the event, we treat the event
        // as "saved" in the UI and also ensure it is persisted in the
        // backend saved-events list. This way, creator-owned events show up
        // under "Your Saved Events" on the profile page.
        const createdBy = data.created_by;
        const isOwnerView = createdBy && user && String(createdBy) === String(user.id);

        if (isOwnerView && !saved) {
          try {
            // Trigger the backend save API once for creator-owned events.
            await saveEvent(data.event_id);
            setIsSaved(true);
          } catch (saveErr) {
            // If auto-save fails, fall back to whatever the server reported
            // for the saved status so the UI remains consistent.
            setIsSaved(saved);
          }
        } else {
          setIsSaved(saved || !!isOwnerView);
        }
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
  }, [id, user]);

  /**
   * Handle saving/unsaving an event
   * Toggles the saved state of the event by calling the appropriate API endpoint
   */
  const handleSaveEvent = async () => {
    if (saveLoading || !event) return;
    
    try {
      setSaveLoading(true);
      
      if (isSaved) {
        // Unsave the event if it's currently saved
        await unsaveEvent(event.event_id);
        setIsSaved(false);
      } else {
        // Save the event if it's not currently saved
        await saveEvent(event.event_id);
        setIsSaved(true);
      }
    } catch (err) {
      // Log error but don't crash the app - user can try again
      console.error('Failed to toggle save state:', err);
      // Could show a toast notification here in a real app
    } finally {
      setSaveLoading(false);
    }
  };

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

  // Determine if the current viewer is allowed to edit this event.
  // The backend allows the creator or an admin to update an event; we mirror that logic here.
  const isOwner = event.created_by && user && String(event.created_by) === String(user.id);
  const isAdmin = role === 'admin';
  const canEdit = !!(isOwner || isAdmin);

  // Navigate to the full-screen Edit Event page that reuses the create-event
  // styling and layout but pre-fills fields from this event.
  const goToEditPage = () => {
    if (!canEdit || !event) return;
    navigate(`/events/${event.event_id}/edit`);
  };

  return (
    <div className="event-detail-container">
      <div className="event-detail-content">
        {/* Top bar with back navigation on the left and edit action on the right.
            This visually mirrors the primary action placement from the
            create-event page while keeping navigation easy to find. */}
        <div className="event-detail-topbar">
          {/* Simple back button to return to Explore view */}
          <button
            className="back-button"
            onClick={() => navigate('/explore')}
          >
            Back to Explore
          </button>

          {/* Edit Event button: visible only to the event owner or an admin.
              Placing it in the top bar keeps it aligned with the back button
              but on the opposite side, separated by the container's border. */}
          {canEdit && (
            <button
              className="back-button"
              onClick={goToEditPage}
              title="Edit this event"
            >
              Edit event
            </button>
          )}
        </div>

        {/* Header with title and meta information (date, time, duration) */}
        <div className="event-header">
          <div className="event-header-top">
            <h1>{title}</h1>
            <div className="event-header-actions">
              {/* Save interest button - seamlessly integrated in the header */}
              <button
                className={`save-button ${isSaved ? 'saved' : ''}`}
                onClick={handleSaveEvent}
                disabled={saveLoading}
                title={isSaved ? 'Remove from saved events' : 'Save this event'}
              >
                {saveLoading ? (
                  // Show loading spinner while saving/unsaving
                  <span className="save-spinner">⟳</span>
                ) : isSaved ? (
                  // Show filled heart when saved
                  <span className="save-icon">♥</span>
                ) : (
                  // Show empty heart when not saved
                  <span className="save-icon">♡</span>
                )}
              </button>
            </div>
          </div>
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
          < TextDirections/>
          <h2>Description</h2>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
