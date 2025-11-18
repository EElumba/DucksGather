import React, { useEffect, useRef, useState } from "react";
import EventDetails from "./EventDetails";

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const lastFocusedIndexRef = useRef(0);

  // Fetch events from backend
  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        itemRefs.current = [];
      })
      .catch((err) => console.error("Error fetching events:", err));
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
    <div className="event-container">
      {/* Accessible event list */}
      <div
        ref={listRef}
        role="listbox"
        aria-activedescendant={`event-${events[activeIndex]?.event_id}`}
        tabIndex={0}
        onKeyDown={handleListKeyDown}
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "0.5rem",
          borderRadius: "6px",
        }}
      >
        {events.map((event, i) => (
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
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              background: activeIndex === i ? "#dfefff" : "transparent",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <strong>{event.title}</strong>
            {event.date ? <> — {event.date}</> : null}
          </div>
        ))}
      </div>

      {/* Popup */}
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
