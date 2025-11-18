import React, { useEffect, useRef, useState } from "react";
//import EventDetails from "./EventDetails";
import { listEvents } from "../api/client";
import "../styles/ExploreEvents.css";

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const lastFocusedIndexRef = useRef(0);

  // Fetch events from backend using centralized client (matches /api/events/ response shape)
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await listEvents({ page: 1, page_size: 20 });
        const items = Array.isArray(response?.items) ? response.items : [];
        setEvents(items);
        itemRefs.current = [];
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    }

    fetchEvents();
  }, []);

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

  const handleItemKeyDown = (e, index) => {
    if (e.key === "Enter") {
      setSelectedEvent(events[index]);
    }
  };

  return (
    <div className="event-list">
      {/* Accessible event list with cards matching ExploreEvents style */}
      <div
        ref={listRef}
        role="listbox"
        aria-activedescendant={`event-${events[activeIndex]?.event_id}`}
        tabIndex={0}
        onKeyDown={handleListKeyDown}
      >
        {events.map((event, i) => {
          const imageUrl = event.image_url || "/campus-hero.jpg";
          const location = event.location || "University of Oregon";
          const date = event.date || "TBD";
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
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/campus-hero.jpg";
                  }}
                  loading="lazy"
                />
              </div>
              <div className="event-info">
                <h3>{event.title}</h3>
                <p className="event-location">{location}</p>
                <p className="event-details">{date}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Popup (temporarily disabled until EventDetails exists) */}
      {/**
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
      */}
    </div>
  );
}
