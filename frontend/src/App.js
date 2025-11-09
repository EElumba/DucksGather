import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NotFound from './components/NotFound';
import './App.css';
import HomePage from './components/HomePage';
import ExploreEvents from './components/ExploreEvents';

/**
 * Valid routes configuration
 * Add new routes here to make them accessible
 */
const VALID_ROUTES = {
  HOME: '/',
  EXPLORE: '/explore',
  CREATE: '/create'
};

/**
 * Main App component with route protection
 * Handles routing and redirects invalid routes to 404
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* Define valid routes */}
        <Route path={VALID_ROUTES.HOME} element={<HomePage />} />
        <Route path={VALID_ROUTES.EXPLORE} element={<ExploreEvents />} />
        <Route path={VALID_ROUTES.CREATE} element={<div>Create Event Page (Coming Soon)</div>} />
        
        {/* 404 handling */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
