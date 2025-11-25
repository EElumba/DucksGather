import React, { useEffect, useRef, useState } from "react";
//import EventDetails from "./EventDetails";
import { useNavigate } from "react-router-dom";
import { listEvents } from "../api/client";
import "../styles/ExploreEvents.css";

export default function EventList({ events, onSelect, activeIndex, setActiveIndex }) {
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  const handleListKeyDown = (e) => {
    if (events.length === 0) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = (activeIndex - 1 + events.length) % events.length;
      setActiveIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = (activeIndex + 1) % events.length;
      setActiveIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
    }
  };

  const handleItemClick = (event, index) => {
    setActiveIndex(index);
    onSelect(event);
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
        {events.map((event, i) => (
          <div
            key={event.event_id}
            id={`event-${event.event_id}`}
            ref={(el) => (itemRefs.current[i] = el)}
            role="option"
            aria-selected={activeIndex === i}
            tabIndex={activeIndex === i ? 0 : -1}
            onClick={() => handleItemClick(event, i)}
            className={`event-card ${activeIndex === i ? "highlighted" : ""}`}
          >
            <div className="event-image">
              <img
                src={event.image_url || "/campus-hero.jpg"}
                alt={event.title || "Event"}
                onError={(e) => { e.target.onerror = null; e.target.src = "/campus-hero.jpg"; }}
                loading="lazy"
              />
            </div>
            <div className="event-info">
              <h3>{event.title}</h3>
              <p className="event-location">
                {event.location?.building_name}{event.location?.room_number ? `, room ${event.location.room_number}` : ''}
              </p>
              <p className="event-details">{event.date || 'TBD'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
