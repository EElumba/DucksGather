import React, { useState, useRef, useEffect } from "react";

export default function EventList() {
  const events = [
    { id: 1, title: "Campus Cleanup", date: "2025-10-29", location: "Main Quad", description: "Join us to help clean up the campus park!" },
    { id: 2, title: "Hackathon 2025", date: "2025-11-05", location: "Engineering Building", description: "24-hour coding event with prizes." },
    { id: 3, title: "Charity Concert", date: "2025-11-12", location: "Student Union Auditorium", description: "A concert to raise funds for local charities." },
    { id: 4, title: "Guest Lecture: AI Ethics", date: "2025-11-18", location: "Room 204, Science Hall", description: "A lecture on ethical challenges in AI." },
    { id: 5, title: "Duck Festival", date: "2025-11-25", location: "Riverside Park", description: "Celebrate the season with live music and food trucks!" },
    { id: 6, title: "Winter Gala", date: "2025-12-10", location: "Grand Ballroom", description: "Formal event to close out the semester." },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const detailsHeadingRef = useRef(null);
  const lastFocusedIndexRef = useRef(0);

  // Move focus visually and logically to an item
  const focusItem = (index) => {
    if (index >= 0 && index < events.length) {
      setActiveIndex(index);
      itemRefs.current[index]?.focus();
    }
  };

  const handleListKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIndex + 1) % events.length;
      focusItem(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (activeIndex - 1 + events.length) % events.length;
      focusItem(prev);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      lastFocusedIndexRef.current = activeIndex;
      setSelectedEvent(events[activeIndex]);
    }
  };

  const handleItemKeyDown = (e, index) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      handleListKeyDown(e);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      lastFocusedIndexRef.current = index;
      setSelectedEvent(events[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      listRef.current?.focus();
    }
  };

  const closeDetails = () => {
    setSelectedEvent(null);
    const last = lastFocusedIndexRef.current;
    setTimeout(() => itemRefs.current[last]?.focus(), 0);
    setActiveIndex(last);
  };

  useEffect(() => {
    if (selectedEvent && detailsHeadingRef.current) {
      setTimeout(() => detailsHeadingRef.current.focus(), 0);
    }
  }, [selectedEvent]);

  return (
    <section>
      <h2 id="event-list-heading">Upcoming Events</h2>

      {/* Accessible Listbox */}
      <div
        ref={listRef}
        role="listbox"
        aria-labelledby="event-list-heading"
        tabIndex={-1}
        onKeyDown={handleListKeyDown}
        style={{
          border: "2px solid #444",
          borderRadius: "8px",
          padding: "0.5rem",
          width: 350,
          height: 220,
          overflowY: "auto",
        }}
      >
        {events.map((event, i) => (
          <div
            key={event.id}
            id={`event-${event.id}`}
            ref={(el) => (itemRefs.current[i] = el)}
            role="option"
            aria-selected={activeIndex === i}
            tabIndex={activeIndex === i ? 0 : -1}
            onFocus={() => setActiveIndex(i)}
            onClick={() => {
              lastFocusedIndexRef.current = i;
              setSelectedEvent(events[i]);
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
            <strong>{event.title}</strong> — {event.date}
            <br />
            <small>{event.location}</small>
          </div>
        ))}
      </div>

      {/* Event details dialog */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-labelledby="event-details-heading"
          aria-modal="true"
          style={{
            marginTop: "1rem",
            border: "2px solid #888",
            borderRadius: "8px",
            padding: "1rem",
            width: 350,
            background: "#f9f9f9",
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              closeDetails();
            }
          }}
        >
          <h3 id="event-details-heading" ref={detailsHeadingRef} tabIndex={-1}>
            {selectedEvent.title}
          </h3>
          <p>
            <strong>Date:</strong> {selectedEvent.date}
            <br />
            <strong>Location:</strong> {selectedEvent.location}
          </p>
          <p>{selectedEvent.description}</p>
          <button onClick={closeDetails}>Close</button>
        </div>
      )}
    </section>
  );
}
