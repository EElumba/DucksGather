import React, { useState, useRef, useEffect } from "react";
import "../styles/LoginButton.css";

/**
 * LoginButton Component
 * Provides UO email-based login functionality with an accessible modal dialog
 * Styled to match Oregon theme colors and application design
 */
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
    <div className="login-container">
      {/* Accessible login button */}
      <button
        className="login-button"
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
          className="modal-overlay"
        >
          <div
            role="document"
            className="modal-content"
          >
            <h2 id="login-dialog-title" className="modal-title">Log in with your UO email</h2>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email-input">UO Email Address</label>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  ref={emailInputRef}
                  required
                  placeholder="you@uoregon.edu"
                  className="email-input"
                />
              </div>
              <div className="button-group">
                <button type="submit" className="submit-button">Continue</button>
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="cancel-button"
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
