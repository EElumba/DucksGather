import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import '../styles/HomePage.css';
import EventList from "./EventList";
import ExploreNavbar from "./ExploreNavbar";

const HomePage = () => {
  const navigate = useNavigate();
  // Local search text for the homepage. This is passed to EventList as `q`
  // so the backend/global event list can filter by the typed keyword.
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <ExploreNavbar />
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="title">Find Your Next Campus Event</h1>
          <p className="subtitle">
            Discover and join university events, clubs, and activities happening around you
          </p>
          {/* Homepage search bar wired to the same backend search (`q`) used elsewhere. */}
          <SearchBar
            // Initialize the input with the current search query
            initialValue={searchQuery}
            // Update local searchQuery on every keystroke for live filtering
            onSearchChange={(value) => setSearchQuery(value)}
            // On Enter, ensure searchQuery is in sync and navigate to the Explore page
            onSearchSubmit={(value) => {
              setSearchQuery(value);
              navigate('/explore');
            }}
            // On Escape/clear, reset searchQuery so EventList shows all events
            onClear={() => setSearchQuery('')}
          />
          <div className="button-group">
            <button className="button primary-button" onClick={() => navigate('/explore')}>
              Explore Events
            </button>
            <button className="button secondary-button" onClick={() => navigate('/login')}>
              Log in
            </button>
          </div>
        </div>
      </div>
      
      <div className="events-section">
        {/* Pass searchQuery into EventList as `q` so it filters by keyword */}
        <EventList q={searchQuery} />
      </div>
    </> 
  );
};

export default HomePage;
