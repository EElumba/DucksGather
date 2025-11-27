import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listEvents } from "../api/client";
import EventDetails from "./EventDetail";
import "../styles/ExploreEvents.css";

5export default function EventList({ category, date, q, events: propEvents, onSelect, activeIndex: propActiveIndex, setActiveIndex: propSetActiveIndex }) {
  const [events, setEvents] = useState(propEvents || []);
  const [activeIndex, setActiveIndex] = useState(propActiveIndex || 0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Determine if we should use internal state or props
  const useInternalState = !propEvents;
  const currentActiveIndex = propActiveIndex !== undefined ? propActiveIndex : activeIndex;
  const currentSetActiveIndex = propSetActiveIndex || setActiveIndex;

  const navigate = useNavigate();

  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const lastFocusedIndexRef = useRef(0);

  // Fetch events from backend (only if no events provided as props)
  useEffect(() => {
    // If events are provided as props, don't fetch
    if (propEvents) return;
    
    async function fetchEvents() {
      try {
        const response = await listEvents({
          page: 1,
          page_size: 20,
          category: category || undefined,
          date: date || undefined,
          q: q || undefined,
        });

        const items = Array.isArray(response?.items) ? response.items : [];
        setEvents(items);
        itemRefs.current = [];
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    }

    fetchEvents();
  }, [category, date, q, propEvents]);

  // Update events when prop changes
  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents);
      itemRefs.current = [];
    }
  }, [propEvents]);

  const currentEvents = propEvents || events;

  // Keyboard navigation for list container
  const handleListKeyDown = (e) => {
    if (currentEvents.length === 0) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = (currentActiveIndex - 1 + currentEvents.length) % currentEvents.length;
      currentSetActiveIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
      lastFocusedIndexRef.current = newIndex;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = (currentActiveIndex + 1) % currentEvents.length;
      currentSetActiveIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
      lastFocusedIndexRef.current = newIndex;
    }
  };

  // Keyboard: Enter opens popup
  const handleItemKeyDown = (e, index) => {
    if (e.key === "Enter") {
      setSelectedEvent(currentEvents[index]);
    }
  };

  return (
    <div className="event-list">
      <div
        ref={listRef}
        role="listbox"
        aria-activedescendant={`event-${currentEvents[currentActiveIndex]?.event_id}`}
        tabIndex={0}
        onKeyDown={handleListKeyDown}
      >

{currentEvents.map((event, i) => {
          const imageUrl = event.image_url || "/campus-hero.jpg";
          const location = event.location || {};
          const dateLabel = event.date || "TBD";

          return (
            <div
              key={event.event_id}
              id={`event-${event.event_id}`}
              ref={(el) => (itemRefs.current[i] = el)}
              role="option"
              aria-selected={currentActiveIndex === i}
              tabIndex={currentActiveIndex === i ? 0 : -1}
              onFocus={() => currentSetActiveIndex(i)}
              onClick={() => {
                lastFocusedIndexRef.current = i;
                setSelectedEvent(event);
                // Call onSelect prop if provided (used by ProfilesPage)
                if (onSelect) {
                  onSelect(event);
                }
              }}
              onKeyDown={(e) => handleItemKeyDown(e, i)}
              className={`event-card ${currentActiveIndex === i ? "highlighted" : ""}`}
            >
              <div className="event-image">
                <img
                  src={imageUrl}
                  alt={event.title || "Event"}
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/campus-hero.jpg";
                  }}
                />
              </div>

              <div className="event-info">
                <h3>{event.title}</h3>

                <p className="event-location">
                  {location.building_name && location.room_number
                    ? `${location.building_name}, room ${location.room_number}`
                    : location.building_name || ""}
                </p>

                <p className="event-details">{dateLabel}</p>

                {/* Navigate to /events/:id */}
                <button
                  type="button"
                  className="event-view-details-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/events/${event.event_id}`);
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Popup Modal */}
      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            const index = lastFocusedIndexRef.current;
            itemRefs.current[index]?.focus();
          }}
        />
      )}
    </div>
  );
}
