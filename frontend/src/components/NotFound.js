import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

/**
 * NotFound Component
 * Displayed when users access undefined routes
 * Provides navigation back to valid routes
 */
const NotFound = () => {
  return (
    <div className="not-found-container">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <div className="valid-routes">
        <h2>Available Pages:</h2>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/explore">Explore Events</Link>
          </li>
          <li>
            <Link to="/create">Create Event</Link>
          </li>
        </ul>
      </div>
      <Link to="/" className="home-button">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;
