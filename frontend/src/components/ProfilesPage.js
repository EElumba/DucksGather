import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateCurrentUser, listSavedEvents } from '../api/client';
import EventList from './EventList';
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

  // Local state for the user's saved events shown on the profile page
  // -----------------------------------------------------------------
  // - savedEvents holds the list of events returned from /api/events/saved.
  // - savedLoading indicates whether the saved-events list is currently loading.
  // - savedError holds any error encountered while fetching saved events.
  // - savedActiveIndex tracks which event card is currently focused/active in EventList.
  const [savedEvents, setSavedEvents] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState(null);
  const [savedActiveIndex, setSavedActiveIndex] = useState(0);

  // Fetch the authenticated user's saved events for display on the profile page.
  // This reuses the backend /api/events/saved endpoint, which already returns
  // only the events saved by the current user.
  useEffect(() => {
    // If there is no authenticated user, do not attempt to load saved events.
    if (!user) return;

    let isCancelled = false;

    async function fetchSaved() {
      setSavedLoading(true);
      setSavedError(null);
      try {
        const data = await listSavedEvents();
        if (!isCancelled) {
          // Ensure we always store an array, even if the response is unexpected.
          setSavedEvents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load saved events:', err);
          setSavedError(err.message || 'Failed to load saved events');
        }
      } finally {
        if (!isCancelled) {
          setSavedLoading(false);
        }
      }
    }

    fetchSaved();

    // Cleanup flag so we do not update state after unmount.
    return () => {
      isCancelled = true;
    };
  }, [user]);

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
  const displayName = (user.full_name || nameInput || profile?.full_name || profile?.name || 'Verified User');
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
      // Call the backend to persist the new full name. The endpoint returns the
      // updated user object, which we can use to immediately reflect the
      // persisted name in this textbox before (or in addition to) a full
      // profile refresh.
      const updatedUser = await updateCurrentUser({ full_name: nameInput.trim() });

      // Immediately sync the local input with whatever the server actually
      // stored (in case it trims or normalizes the value server-side).
      if (updatedUser && (updatedUser.full_name || updatedUser.name)) {
        setNameInput(updatedUser.full_name || updatedUser.name);
      }

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
      {/* Use the shared auth-card styling, plus a profile-specific class name
          so we can make the profile layout wider without affecting other
          auth pages like Login/Sign-Up. */}
      <div className="auth-card profile-card">
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

        {/* Layout row: profile details on the left, saved events on the right.
            The outer flex container keeps both sections side-by-side on
            wider screens while still allowing them to stack naturally on
            smaller viewports. */}
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Simple fields showing name and email. The name field is now editable
              so the user can update the full name stored in the backend. */}
          <div style={{ flex: 1, minWidth: '260px' }}>
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
                      textAlign: 'center',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.85rem',
                      minWidth: 'auto',
                    }}
                    onClick={() => {
                      // Enter edit mode and make sure the input is populated with
                      // the current display name so the user sees their existing
                      // name as actual text rather than only as a placeholder.
                      setIsEditingName(true);
                      setNameError(null);
                      setNameInput(profile?.full_name || profile?.name || nameInput || '');
                    }}
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

          {/* Saved Events section on the profile page
              ---------------------------------------
              This embeds the shared EventList component so that the user can
              quickly see the events they have saved. It pulls data from the
              authenticated /api/events/saved endpoint via the centralized
              listSavedEvents API helper. */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div
              style={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: 'rgba(255,255,255,0.9)',
              }}
            >
              <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                Your Saved Events
              </h2>

              {/* Show basic loading and error states for the saved-events list. */}
              {savedLoading && (
                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                  <p>Loading your saved events...</p>
                </div>
              )}
              {savedError && (
                <div className="auth-error" style={{ marginBottom: '0.5rem' }}>
                  {savedError}
                </div>
              )}

              {/* Only render the EventList when we have at least one saved event.
                  This reuses the existing EventList card layout and keyboard
                  navigation behavior. */}
              {savedEvents.length > 0 ? (
                <EventList
                  events={savedEvents}
                  onSelect={() => {}}
                  activeIndex={savedActiveIndex}
                  setActiveIndex={setSavedActiveIndex}
                />
              ) : !savedLoading && !savedError ? (
                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                  <p>You have no saved events yet.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
