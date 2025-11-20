import React from 'react';
import { useAuth } from '../context/AuthContext';
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
  const { user, profile, loading, profileError, signOut } = useAuth();

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
  const displayName = profile?.full_name || profile?.name || 'Duck User';
  const email = user.email || profile?.email || 'Unknown email';

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

        {/* Simple read-only fields showing name and email */}
        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Name</label>
            <div className="auth-input" style={{ display: 'flex', alignItems: 'center' }}>
              {displayName}
            </div>
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
            onClick={signOut}
            className="auth-submit-button"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
