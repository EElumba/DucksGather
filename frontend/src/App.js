import React, { useState, useRef, useEffect } from "react";

const events = [
  { id: 1, title: "Campus Cleanup", date: "2025-10-29", location: "Main Quad", description: "Join us to help clean up the campus park!" },
  { id: 2, title: "Hackathon 2025", date: "2025-11-05", location: "Engineering Building", description: "24-hour coding event with prizes." },
  { id: 3, title: "Charity Concert", date: "2025-11-12", location: "Student Union Auditorium", description: "A concert to raise funds for local charities." },
  { id: 4, title: "Guest Lecture: AI Ethics", date: "2025-11-18", location: "Room 204, Science Hall", description: "A lecture on ethical challenges in artificial intelligence." },
  { id: 5, title: "Duck Festival", date: "2025-11-25", location: "Riverside Park", description: "Celebrate the season with live music and food trucks!" },
  { id: 6, title: "Winter Gala", date: "2025-12-10", location: "Grand Ballroom", description: "Formal event to close out the semester." },
];

export default function EventList() {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [listActivated, setListActivated] = useState(false);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const detailsHeadingRef = useRef(null);
  const lastFocusedIndexRef = useRef(-1);

  // Focus a specific event item
  const focusItem = (index) => {
    if (index >= 0 && index < events.length) {
      itemRefs.current[index]?.focus();
    }
  };

  // Enter or Space on listbox only activates the list (does NOT auto-select)
  const handleListKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setListActivated(true);
      return;
    }

    if (listActivated && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const next =
        e.key === "ArrowDown"
          ? (activeIndex + 1) % events.length
          : (activeIndex - 1 + events.length) % events.length;
      focusItem(next === -1 ? 0 : next);
    }
  };

  const handleItemFocus = (i) => setActiveIndex(i);

  const handleItemKeyDown = (e, i) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem((i + 1) % events.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem((i - 1 + events.length) % events.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      lastFocusedIndexRef.current = i;
      setSelectedEvent(events[i]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      listRef.current?.focus();
      setActiveIndex(-1);
      setListActivated(false);
    } else if (e.key === "Tab") {
      setListActivated(false);
      setActiveIndex(-1);
    }
  };

  const handleItemClick = (i) => {
    lastFocusedIndexRef.current = i;
    setSelectedEvent(events[i]);
  };

  const closeDetails = () => {
    setSelectedEvent(null);
    const last = lastFocusedIndexRef.current;
    if (last >= 0 && itemRefs.current[last]) {
      setTimeout(() => itemRefs.current[last].focus(), 0);
      setActiveIndex(last);
      setListActivated(true);
    } else {
      listRef.current?.focus();
      setActiveIndex(-1);
      setListActivated(false);
    }
  };

  const handleContainerBlur = () => {
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setListActivated(false);
        setActiveIndex(-1);
      }
    }, 0);
  };

  useEffect(() => {
    if (selectedEvent && detailsHeadingRef.current) {
      setTimeout(() => detailsHeadingRef.current.focus(), 0);
    }
  }, [selectedEvent]);

  return (
    <section>
      <h2 id="event-list-heading">Upcoming Events</h2>

      <div
        ref={listRef}
        role="listbox"
        aria-labelledby="event-list-heading"
        tabIndex={0}
        onKeyDown={handleListKeyDown}
        onBlur={handleContainerBlur}
        style={{
          border: "2px solid #444",
          borderRadius: "8px",
          padding: "0.5rem",
          maxWidth: "400px",
        }}
      >
        {events.map((event, index) => (
          <div
            key={event.id}
            ref={(el) => (itemRefs.current[index] = el)}
            role="option"
            aria-selected={activeIndex === index}
            tabIndex={activeIndex === index ? 0 : -1}
            onFocus={() => handleItemFocus(index)}
            onKeyDown={(e) => handleItemKeyDown(e, index)}
            onClick={() => handleItemClick(index)}
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              background:
                activeIndex === index ? "#dfefff" : "transparent",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <strong>{event.title}</strong> — {event.date}
            <br />
            <small>{event.location}</small>
          </div>
        ))}
      </div>

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
            maxWidth: "400px",
            background: "#f9f9f9",
          }}
        >
          <h3
            id="event-details-heading"
            ref={detailsHeadingRef}
            tabIndex={-1}
          >
            {selectedEvent.title}
          </h3>

          <p>{selectedEvent.description}</p>

          <p>
            <strong>Date:</strong> {selectedEvent.date}
            <br />
            <strong>Location:</strong> {selectedEvent.location}
          </p>

          <button onClick={closeDetails}>Close</button>
        </div>
      )}
    </section>
  );
}
