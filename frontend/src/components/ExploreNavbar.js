import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/ExploreNavbar.css';
import { useAuth } from '../context/AuthContext';

// Local button components mirror the behavior from the main Navbar
// while reusing the existing "nav-button" styling.
function LoginButton() {
  const navigate = useNavigate();
  return (
    <button className="explore-nav-link active" onClick={() => navigate('/login')}>
      Log In
    </button>
  );
}

function SignUpButton() {
  const navigate = useNavigate();
  return (
    <button className="explore-nav-link active" onClick={() => navigate('/signup')}>
      Sign Up
    </button>
  );
}

function LogoutButton() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // When the user clicks Log Out, sign them out and then navigate home.
  const handleClick = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <button className="explore-nav-link active" onClick={handleClick}>
      Log Out
    </button>
  );
}


/**
 * ExploreNavbar - Custom navigation bar for the Explore page
 * Features:
 * - Transparent background with Oregon theme colors
 * - Custom styling for the explore page context
 * - Maintains consistent branding while being distinct
 */
const ExploreNavbar = () => {
  // Get the authenticated user and their role from context.
  const { user, role } = useAuth();

  // Determine if the current user is allowed to create events
  // (same rule as the main Navbar: admins and coordinators can create).
  const canCreate = role === 'admin' || role === 'coordinator';

  return (
    <nav className="explore-nav">
      {/* Logo and branding section */}
      <Link to="/" className="explore-logo">
        <div className="explore-logo-icon">
          <img src="/logo.png" alt="DucksGather logo" />
        </div>
        <span className="explore-brand-text">DucksGather</span>
      </Link>

      {/* Navigation links */}
      <div className="explore-nav-links">
        {/* Explore is always visible for everyone */}
        <Link to="/explore" className="explore-nav-link active">Explore</Link>

        {/* Only show Create Event when the user has permission (admin or coordinator) */}
        {canCreate && (
          <Link to="/create" className="explore-nav-link active">Create Event</Link>
        )}

        {/* If there is no logged-in user, show Log In and Sign Up buttons */}
        {!user && (
          <>
            <LoginButton />
            <SignUpButton />
          </>
        )}

        {/* If a user is logged in, show their email/role and a Log Out button */}
        {user && (
          <>
            <span className="nav-user-email">
              {user.email}
              {role && ` (${role})`}
            </span>
            <LogoutButton />
          </>
        )}
      </div>
    </nav>
  );
};

export default ExploreNavbar;
