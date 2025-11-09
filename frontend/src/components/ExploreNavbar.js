import React from 'react';
import { Link } from 'react-router-dom';
import LoginButton from './LoginButton';
import '../styles/ExploreNavbar.css';

/**
 * ExploreNavbar - Custom navigation bar for the Explore page
 * Features:
 * - Transparent background with Oregon theme colors
 * - Custom styling for the explore page context
 * - Maintains consistent branding while being distinct
 */
const ExploreNavbar = () => {
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
        <Link to="/explore" className="explore-nav-link active">Explore</Link>
        <Link to="/create" className="explore-nav-link">Create Event</Link>
        <Link to="/login" className="explore-nav-link">Login</Link>
        <LoginButton />
      </div>
    </nav>
  );
};

export default ExploreNavbar;
