// src/components/delete_event.js
import React, { useState } from "react";

export default function DeleteEvent({ eventId, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",

        // -------------------------------
        // 🔐 AUTH PLACEHOLDER
        // Add authentication headers here once your auth system is decided.
        // Example (to be replaced):
        //
        // headers: {
        //   "Authorization": `Bearer ${token}`,
        // },
        //
        // For now, we leave it empty.
        // -------------------------------
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete event");
      }

      // Notify parent to update UI
      if (onDelete) onDelete(eventId);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          padding: "6px 12px",
          backgroundColor: "#c62828",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Deleting..." : "Delete"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "8px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
