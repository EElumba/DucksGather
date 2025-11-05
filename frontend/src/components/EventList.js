import React, { useState, useRef, useEffect } from "react";

export default function EventList() {
  // Placeholder: single loading event shown until backend responds
  const loadingEvent = [
    {
      id: "loading",
      title: "Events Loading",
      date: "",
      location: "",
      description: "Events coming soon.",
    },
  ];

  const [events, setEvents] = useState(loadingEvent);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const detailsHeadingRef = useRef(null);
  const lastFocusedIndexRef = useRef(0);

  // Try to fetch backend events; on success replace the placeholder.
  // If fetch fails, we keep showing the single loading event.
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Network response not ok");
        const data = await res.json();
        // Replace placeholder when fetch succeeds (even if empty array)
        setEvents(Array.isArray(data) ? data : loadingEvent);
        // reset active index to 0 when new data arrives
        setActiveIndex(0);
        itemRefs.current = []; // clear refs for re-render
      } catch (err) {
        // keep the loading placeholder if backend unreachable
        // console.warn("Event fetch failed — keeping placeholder.", err);
      }
    }

    fetchEvents();
  }, []);

  // Utility: move focus to an item index
  const focusItem = (index) => {
    if (index >= 0 && index < events.length) {
      setActiveIndex(index);
      // focus the DOM node if present
      const node = itemRefs.current[index];
      if (node) node.focus();
    }
  };

  // List container keyboard handling (Arrow navigation + activate)
  const handleListKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIndex + 1) % events.length;
      focusItem(next);
      // ensure the focused item is visible inside the scroll container
      itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (activeIndex - 1 + events.length) % events.length;
      focusItem(prev);
      itemRefs.current[prev]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      lastFocusedIndexRef.current = activeIndex;
      setSelectedEvent(events[activeIndex]);
    }
  };

  // Per-item key handling (delegates to list handler for arrows)
  const handleItemKeyDown = (e, index) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      handleListKeyDown(e);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      lastFocusedIndexRef.current = index;
      setSelectedEvent(events[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // return focus to list container (so screen reader knows context)
      listRef.current?.focus();
    }
  };

  // Close dialog and restore focus to the last focused list item
  const closeDetails = () => {
    setSelectedEvent(null);
    const last = Math.min(lastFocusedIndexRef.current, Math.max(0, events.length - 1));
    setTimeout(() => itemRefs.current[last]?.focus(), 0);
    setActiveIndex(last);
  };

  // When dialog opens, move focus to heading for screen readers
  useEffect(() => {
    if (selectedEvent && detailsHeadingRef.current) {
      setTimeout(() => {
        detailsHeadingRef.current.focus();
      }, 0);
    }
  }, [selectedEvent]);

  return (
    <section>
      <h2 id="event-list-heading">Upcoming Events</h2>

      {/* Scrollable, keyboard-navigable listbox (accessible) */}
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
            key={event.id ?? i}
            id={`event-${event.id ?? i}`}
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
            <strong>{event.title}</strong>
            {event.date ? <> — {event.date}</> : null}
            {event.location ? (
              <>
                <br />
                <small>{event.location}</small>
              </>
            ) : null}
          </div>
        ))}
      </div>

      {/* Accessible dialog / details popup */}
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

          {selectedEvent.date && (
            <p>
              <strong>Date:</strong> {selectedEvent.date}
              <br />
              <strong>Location:</strong> {selectedEvent.location}
            </p>
          )}

          <p>{selectedEvent.description}</p>
          <button onClick={closeDetails}>Close</button>
        </div>
      )}
    </section>
  );
}
