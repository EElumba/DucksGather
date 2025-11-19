import React, { useState, useRef, useEffect } from "react";

//This button calls on the delete route to remove events from the database, and asks for conformation before deleting.


export default function DeleteEvent({ eventId, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Return focus to the delete button after closing modal
  const deleteButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (confirmOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [confirmOpen]);

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        // Add your Authorization header once token is available
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete event");
      }

      if (onDelete) onDelete(eventId);
      setConfirmOpen(false);
      deleteButtonRef.current?.focus();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Delete Button */}
      <button
        ref={deleteButtonRef}
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        aria-haspopup="dialog"
        aria-expanded={confirmOpen}
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

      {/* Error Message */}
      {error && (
        <p
          style={{ color: "red", marginTop: "8px" }}
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`confirm-title-${eventId}`}
          aria-describedby={`confirm-desc-${eventId}`}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "320px",
              width: "100%",
              boxShadow: "0px 4px 8px rgba(0,0,0,0.3)"
            }}
          >
            <h2
              id={`confirm-title-${eventId}`}
              style={{ marginTop: 0 }}
            >
              Confirm Delete
            </h2>

            <p id={`confirm-desc-${eventId}`}>
              Are you sure you want to delete this event?
            </p>

            <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
              <button
                ref={cancelButtonRef}
                onClick={() => {
                  setConfirmOpen(false);
                  deleteButtonRef.current?.focus();
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#e0e0e0",
                  border: "1px solid #888",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                No
              </button>

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
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
