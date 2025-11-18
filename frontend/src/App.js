import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NotFound from './components/NotFound';
import './App.css';
import HomePage from './components/HomePage';
import ExploreEvents from './components/ExploreEvents';
import CreateEvent from './components/CreateEvent';
import EventDetail from './components/EventDetail';
/**
 * Valid routes configuration
 * Add new routes here to make them accessible
 */
const VALID_ROUTES = {
  HOME: '/',
  EXPLORE: '/explore',
  CREATE: '/create',
  EVENT_DETAIL: '/event/:id'
};

/**
 * Main App component with route protection
 * Handles routing and redirects invalid routes to 404
 */
// Sample events data - will be replaced with API data later
const events = [
  {
    id: 1,
    name: 'Campus Tour Social',
    location: 'University of Oregon',
    position: [44.04503839053625, -123.07256258731347],
    date: 'Nov 10, 2023',
    duration: '1 hour',
    difficulty: 'Easy',
    image: '/event-images/campus-tour.jpg',
    description: 'Join us for a social campus tour!'
  },
  {
    id: 2,
    name: 'Knight Library Study Group',
    location: 'Knight Library',
    position: [44.04328239297166, -123.07772853393564],
    date: 'Nov 12, 2023',
    duration: '2 hours',
    difficulty: 'Moderate',
    image: '/event-images/library-study.jpg',
    description: 'Group study session for finals'
  },
  {
    id: 3,
    name: 'Science Fair Prep',
    location: 'Price Science Library',
    position: [44.04624536232639, -123.07218013034097],
    date: 'Nov 15, 2023',
    duration: '3 hours',
    difficulty: 'Challenging',
    image: '/event-images/science-fair.jpg',
    description: 'Prepare for the upcoming science fair'
  },
  {
    id: 4,
    name: 'CS Club Meeting',
    location: 'UO Department of Computer Science',
    position: [44.046025617673784, -123.07108679685953],
    date: 'Nov 11, 2023',
    duration: '1.5 hours',
    difficulty: 'Easy',
    image: '/event-images/cs-club.jpg',
    description: 'Weekly CS club meeting - all welcome!'
  },
  {
    id: 5,
    name: 'Basketball Tournament',
    location: 'Matthew Knight Arena',
    position: [44.044952954092054, -123.06631965565566],
    date: 'Nov 18, 2023',
    duration: '4 hours',
    difficulty: 'Challenging',
    image: '/event-images/basketball.jpg',
    description: 'Inter-department basketball tournament'
  },
  {
    id: 6,
    name: 'Basketball Tournament',
    location: 'Matthew Knight Arena',
    position: [44.044952954092054, -123.06631965565566],
    date: 'Nov 18, 2023',
    duration: '4 hours',
    difficulty: 'Challenging',
    image: '/event-images',
    description: 'Inter-department basketball tournament'
  },
  {
    id: 7,
    name: 'Basketball Tournament',
    location: 'Matthew Knight Arena',
    position: [44.044952954092054, -123.06631965565566],
    date: 'Nov 18, 2023',
    duration: '4 hours',
    difficulty: 'Challenging',
    image: '/event-images',
    description: 'Inter-department basketball tournament'
  }
];

function App() {
  return (
    <Router>
      <Routes>
        {/* Define valid routes */}
        <Route path={VALID_ROUTES.HOME} element={<HomePage />} />
        <Route path={VALID_ROUTES.EXPLORE} element={<ExploreEvents events={events} />} />
        <Route path={VALID_ROUTES.CREATE} element={<CreateEvent />} />
        <Route path={VALID_ROUTES.EVENT_DETAIL} element={<EventDetail events={events} />} />
        
        {/* 404 handling */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
