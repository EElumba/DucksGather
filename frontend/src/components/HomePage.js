import React from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import Navbar from './ExploreNavbar';
import '../styles/HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="title">Find Your Next Campus Event</h1>
          <p className="subtitle">
            Discover and join university events, clubs, and activities happening around you
          </p>
          <SearchBar />
          <div className="button-group">
            <button className="button primary-button" onClick={() => navigate('/explore')}>
              Explore Events
            </button>
            <button className="button secondary-button" onClick={() => navigate('/create')}>
              Create Event
            </button>
          </div>
        </div>
      </div>
    </> 
  );
};

export default HomePage;
