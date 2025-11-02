import React, { useState, useRef, useEffect } from "react";

const LoginButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const emailInputRef = useRef(null);

  // When dialog opens, focus on the email input
  useEffect(() => {
    if (isDialogOpen && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isDialogOpen]);

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder for later authentication logic
    alert("Email submitted (functionality coming soon)");
    handleCloseDialog();
  };

  return (
    <div>
      {/* Accessible login button */}
      <button
        onClick={handleOpenDialog}
        aria-haspopup="dialog"
        aria-controls="login-dialog"
        aria-expanded={isDialogOpen}
      >
        Log in
      </button>

      {/* Accessible modal dialog */}
      {isDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-dialog-title"
          id="login-dialog"
          className="modal"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            role="document"
            style={{
              background: "white",
              padding: "1.5rem",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "400px",
            }}
          >
            <h2 id="login-dialog-title">Log in with your UO email</h2>
            <form onSubmit={handleSubmit}>
              <label htmlFor="email-input">UO Email Address</label>
              <input
                id="email-input"
                name="email"
                type="email"
                ref={emailInputRef}
                required
                placeholder="you@uoregon.edu"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "0.5rem",
                  marginBottom: "1rem",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <button type="submit">Continue</button>
                <button
                  type="button"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginButton;
