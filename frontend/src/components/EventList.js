import React, { useState, useRef } from "react";

const events = [
  { id: 1, title: "Campus Cleanup", date: "2025-10-29", location: "Main Quad", description: "Join us to help clean up the campus park!" },
  { id: 2, title: "Hackathon 2025", date: "2025-11-05", location: "Engineering Building", description: "24-hour coding event with prizes." },
  { id: 3, title: "Charity Concert", date: "2025-11-12", location: "Student Union Auditorium", description: "A concert to raise funds for local charities." },
  { id: 4, title: "Guest Lecture: AI Ethics", date: "2025-11-18", location: "Room 204, Science Hall", description: "A lecture on ethical challenges in AI." },
  { id: 5, title: "Duck Festival", date: "2025-11-25", location: "Riverside Park", description: "Celebrate the season with live music and food trucks!" },
  { id: 6, title: "Winter Gala", date: "2025-12-10", location: "Grand Ballroom", description: "Formal event to close out the semester." },
];

export default function EventList() {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  const focusItem = (i) => {
    if (i >= 0 && i < events.length) {
      itemRefs.current[i]?.focus();
      setActiveIndex(i);
    }
  };

  const handleListKeyDown = (e) => {
    // Keyboard navigation when the region (list) has focus
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(activeIndex === -1 ? 0 : (activeIndex + 1) % events.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(activeIndex === -1 ? events.length - 1 : (activeIndex - 1 + events.length) % events.length);
    }
  };

  const handleItemKeyDown = (e, i) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem((i + 1) % events.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem((i - 1 + events.length) % events.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedEvent(events[i]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      listRef.current?.focus();
      setActiveIndex(-1);
    }
  };

  const handleItemClick = (i) => {
    setSelectedEvent(events[i]);
  };

  return (
    <div>
      {/* Scrollable region container */}
      <div
        ref={listRef}
        tabIndex={0}
        role="region"
        aria-label="Upcoming Events"
        aria-roledescription="Scrollable list of upcoming events"
        onKeyDown={handleListKeyDown}
        style={{
          border: "1px solid #aaa",
          padding: "0.5rem",
          width: 350,
          height: 220,
          overflowY: "auto",
          borderRadius: 6,
          outline: "none",
        }}
      >
        {/* Actual list structure */}
        <div role="list">
          {events.map((event, i) => (
            <div
              key={event.id}
              role="listitem"
              id={`event-${event.id}`}
              ref={(el) => (itemRefs.current[i] = el)}
              tabIndex={-1}
              onFocus={() => setActiveIndex(i)}
              onKeyDown={(e) => handleItemKeyDown(e, i)}
              onClick={() => handleItemClick(i)}
              style={{
                padding: "0.25rem 0.5rem",
                background: i === activeIndex ? "#ddd" : "transparent",
                cursor: "pointer",
              }}
            >
              <strong>{event.title}</strong> — {event.date}
            </div>
          ))}
        </div>
      </div>

      {/* Selected event details */}
      {selectedEvent && (
        <div style={{ marginTop: "1rem" }}>
          <h2>{selectedEvent.title}</h2>
          <p>
            {selectedEvent.date} | {selectedEvent.location}
          </p>
          <p>{selectedEvent.description}</p>
        </div>
      )}
    </div>
  );
}
