import React from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import Navbar from './Navbar';
import '../styles/HomePage.css';
import EventList from "./EventList";
import TextDirections from "./text_directions"

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="title">Find Your Next Campus Event</h1>
          <TextDirections/>
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
      
      <div className="events-section">
        <EventList />
      </div>
    </> 
  );
};

export default HomePage;
