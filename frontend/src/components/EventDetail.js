import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/EventDetail.css';

/**
 * EventDetail Component
 * Displays detailed information about a specific event
 * 
 * @component
 */
const EventDetail = ({ events }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Find the event with the matching ID
  const event = events?.find(e => e.id === parseInt(id));

  // If event not found, redirect to 404
  if (!event) {
    navigate('/404');
    return null;
  }

  return (
    <div className="event-detail-container">
      <div className="event-detail-content">
        <button className="back-button" onClick={() => navigate('/explore')}>
          Back to Explore
        </button>
        
        <div className="event-header">
          <h1>{event.name}</h1>
          <div className="event-meta">
            <span>{event.date}</span>
            <span>•</span>
            <span>{event.duration}</span>
            <span>•</span>
            <span>{event.difficulty}</span>
          </div>
        </div>

        <div className="event-image-container">
          <img 
            src={event.image} 
            alt={event.name}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/campus-hero.jpg';
            }}
          />
        </div>

        <div className="event-info-section">
          <h2>Location</h2>
          <p>{event.location}</p>
          
          <h2>Description</h2>
          <p>{event.description}</p>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
