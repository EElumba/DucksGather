import React from "react";

export default function SearchBar({ searchTerm, onSearchChange, onSearchSubmit }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearchSubmit?.();
      }}
      role="search"
      aria-label="Search events"
      style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
    >
      <label htmlFor="event-search" className="sr-only">
        Search events
      </label>
      <input
        id="event-search"
        type="search"
        placeholder="Search events"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          padding: "0.4rem",
          borderRadius: "6px",
          border: "1px solid #666",
        }}
      />
      <button type="submit">Search</button>
    </form>
  );
}
