import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateCurrentUser } from '../api/client';
import '../styles/AuthPages.css';

/**
 * ProfilesPage Component
 * ----------------------
 * Displays basic information about the currently authenticated user
 * (name and email) inside the same Oregon-themed auth card layout
 * used by the Login and Sign-Up pages.
 */
export default function ProfilesPage() {
  // Grab auth state and actions from the shared AuthContext
  const { user, profile, loading, profileError, signOut, refreshProfile } = useAuth();

  // Local UI state for editing the user's display name
  // --------------------------------------------------
  // - nameInput holds the current value of the editable name field.
  // - isSaving tracks whether a save request is currently in progress.
  // - nameError holds any error message from the API (e.g., cooldown violation).
  const [nameInput, setNameInput] = useState(profile?.full_name || profile?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState(null);
  // - isEditingName controls whether the user is actively editing their name.
  //   When false, the input behaves like read-only and the Save button is hidden.
  const [isEditingName, setIsEditingName] = useState(false);

  // Keep the local name input in sync when the profile finishes loading or changes.
  // This ensures that if we navigate to the page before the profile is ready,
  // the input is updated once the data arrives.
  useEffect(() => {
    if (profile) {
      setNameInput(profile.full_name || profile.name || '');
    }
  }, [profile]);

  // Handler for the Sign out button
  // -------------------------------
  // This wraps the shared signOut action from AuthContext so that:
  // 1) We trigger the actual sign-out logic, and then
  // 2) We show a simple confirmation popup so the user knows they logged out.
  const handleSignOut = async () => {
    try {
      // Call the centralized signOut function (could clear auth state, tokens, etc.)
      await signOut();

      // After sign-out completes, let the user know what happened.
      alert('You have logged out');
    } catch (error) {
      // If something unexpected happens, log it for debugging.
      // (You could later surface a nicer UI error message here if desired.)
      console.error('Error during sign out:', error);
    }
  };

  // While auth state is initializing, show a simple loading state
  if (loading) {
    return (
      <div className="auth-page-root">
        <div className="auth-card">
          <p>Loading your profile…</p>
        </div>
      </div>
    );
  }

  // If there is no authenticated user, gently prompt them to log in
  if (!user) {
    return (
      <div className="auth-page-root">
        <div className="auth-card">
          <div className="auth-logo-circle">🦆</div>
          <h1 className="auth-title">Sorry! No Account Found</h1>
          <p style={{ textAlign: 'center' }}>Please sign in to view your profile information.</p>
        </div>
      </div>
    );
  }

  // Derive display values from the user + profile objects
  const displayName = (nameInput || profile?.full_name || profile?.name || 'Duck User');
  const email = user.email || profile?.email || 'Unknown email';

  // Handler for saving the updated full name
  // ----------------------------------------
  // This sends a PATCH request to the backend using the shared API client.
  // On success, we optimistically update the displayed name and ask
  // AuthContext to refresh the profile so everything stays in sync.
  const handleSaveName = async (event) => {
    event.preventDefault();
    // Short-circuit if nothing to save
    if (!nameInput || !nameInput.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setNameError(null);
    try {
      // Call the backend to persist the new full name
      await updateCurrentUser({ full_name: nameInput.trim() });

      // Ask the auth context to pull down the latest profile data.
      // This ensures any server-side transformations are reflected in the UI.
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }

      // Once the save completes successfully, exit edit mode so the
      // Save button is hidden again and the field behaves like read-only.
      setIsEditingName(false);
    } catch (error) {
      // If the backend rejects the change (e.g., 30-day cooldown), surface
      // a friendly message near the input.
      const message = error?.message || 'Failed to update name.';
      setNameError(message);
      console.error('Error updating full name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-card">
        {/* Reuse the duck logo circle to keep visual consistency */}
        <div className="auth-logo-circle">🦆</div>

        {/* Page title for the profile view */}
        <h1 className="auth-title">Your Profile</h1>

        {/* Optional area for profile loading / error messages */}
        {profileError && (
          <div className="auth-error">
            {profileError}
          </div>
        )}

        {/* Simple fields showing name and email. The name field is now editable
            so the user can update the full name stored in the backend. */}
        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Name</label>
            <form
              className="auth-input"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onSubmit={handleSaveName}
            >
              {/* Controlled input bound to local state so the user can edit their name */}
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={displayName}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent' }}
                readOnly={!isEditingName}
              />
              {/* The Save button is intentionally smaller and only visible while
                  the user is actively editing their name. After a successful
                  save, edit mode is turned off and this button disappears. */}
              {isEditingName && (
                <button
                  type="submit"
                  className="auth-submit-button"
                  disabled={isSaving}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', minWidth: 'auto' }}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              )}
            </form>
            {/* Small helper action under the Duck User display that toggles edit mode.
                When not editing, the input behaves like read-only and there is
                no Save button. Once "Edit name" is pressed, the user can
                modify the value and a Save button appears to persist it. */}
            <div style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
              <button
                type="button"
                className="auth-submit-button"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.85rem',
                  minWidth: 'auto',
                }}
                onClick={() => { setIsEditingName(true); setNameError(null); }}
              >
                Edit name
              </button>
            </div>
            {/* Inline error message specific to the name update (e.g., 30-day rule) */}
            {nameError && (
              <div className="auth-error" style={{ marginTop: '0.25rem' }}>
                {nameError}
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <div className="auth-input" style={{ display: 'flex', alignItems: 'center' }}>
              {email}
            </div>
          </div>

          {/* Optional action row for signing out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="auth-submit-button"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
