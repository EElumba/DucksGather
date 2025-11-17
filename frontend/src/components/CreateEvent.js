import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './ExploreNavbar';
import '../styles/CreateEvent.css';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    location: '',
    date: '',
    duration: '',
    difficulty: 'Easy',
    image: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add API integration for event creation
    console.log('Event data:', eventData);
    navigate('/explore'); // Redirect to explore page after submission
  };

  return (
    <>
      <Navbar />
      <div className="create-event-container">
        <div className="create-event-content">
          <h1>Create New Event</h1>
          <form onSubmit={handleSubmit} className="event-form">
            <div className="form-group">
              <label htmlFor="name">Event Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={eventData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={eventData.description}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={eventData.location}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={eventData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration</label>
              <input
                type="text"
                id="duration"
                name="duration"
                placeholder="e.g., 2 hours"
                value={eventData.duration}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                name="difficulty"
                value={eventData.difficulty}
                onChange={handleInputChange}
                required
              >
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Challenging">Challenging</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="image">Image URL</label>
              <input
                type="text"
                id="image"
                name="image"
                placeholder="Enter image URL"
                value={eventData.image}
                onChange={handleInputChange}
              />
            </div>

            <div className="button-group">
              <button type="submit" className="button primary-button">
                Create Event
              </button>
              <button
                type="button"
                className="button secondary-button"
                onClick={() => navigate('/explore')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateEvent;
