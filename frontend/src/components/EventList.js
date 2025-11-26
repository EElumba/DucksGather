import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listEvents } from "../api/client";
import EventDetails from "./EventDetail";
import "../styles/ExploreEvents.css";

export default function EventList({ category, date, q }) {
  const [events, setEvents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const navigate = useNavigate();

  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const lastFocusedIndexRef = useRef(0);

  // Fetch events from backend
  useEffect(() => {
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
  }, [category, date, q]);

  // Keyboard navigation for list container
  const handleListKeyDown = (e) => {
    if (events.length === 0) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = (activeIndex - 1 + events.length) % events.length;
      setActiveIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
      lastFocusedIndexRef.current = newIndex;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = (activeIndex + 1) % events.length;
      setActiveIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
      lastFocusedIndexRef.current = newIndex;
    }
  };

  // Keyboard: Enter opens popup
  const handleItemKeyDown = (e, index) => {
    if (e.key === "Enter") {
      setSelectedEvent(events[index]);
    }
  };

  return (
    <div className="event-list">
      <div
        ref={listRef}
        role="listbox"
        aria-activedescendant={`event-${events[activeIndex]?.event_id}`}
        tabIndex={0}
        onKeyDown={handleListKeyDown}
      >
        {events.map((event, i) => {
          const imageUrl = event.image_url || "/campus-hero.jpg";
          const location = event.location || {};
          const dateLabel = event.date || "TBD";

          return (
            <div
              key={event.event_id}
              id={`event-${event.event_id}`}
              ref={(el) => (itemRefs.current[i] = el)}
              role="option"
              aria-selected={activeIndex === i}
              tabIndex={activeIndex === i ? 0 : -1}
              onFocus={() => setActiveIndex(i)}
              onClick={() => {
                lastFocusedIndexRef.current = i;
                setSelectedEvent(event);
              }}
              onKeyDown={(e) => handleItemKeyDown(e, i)}
              className={`event-card ${activeIndex === i ? "highlighted" : ""}`}
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
