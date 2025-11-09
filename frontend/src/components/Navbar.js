import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  return (
    <nav className="nav">
      <Link to="/" className="logo">
        <div className="logo-icon">
          <img src="/logo.png" alt="DucksGather logo" />
        </div>
      </Link>
      <div className="nav-links">
        <Link to="/explore" className="nav-link-button">Explore</Link>
        <Link to="/create" className="nav-link-button">Create Event</Link>
        <Link to="/login" className="nav-button">Log In</Link>
      </div>
    </nav>
  );
};

export default Navbar;
