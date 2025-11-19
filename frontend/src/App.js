import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NotFound from './components/NotFound';
import './App.css';
import HomePage from './components/HomePage';
import ExploreEvents from './components/ExploreEvents';
import CreateEvent from './components/CreateEvent';
import CreateEventForm from './components/CreateEventForm';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ConfirmEmail from './components/ConfirmEmail';
import Navbar from './components/Navbar';
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
       <Navbar />   {/* always visible */}
      <Routes>
        {/* Define valid routes */}
        <Route path={VALID_ROUTES.HOME} element={<HomePage />} />
        <Route path={VALID_ROUTES.EXPLORE} element={<ExploreEvents />} />
        <Route path={VALID_ROUTES.CREATE} element={<CreateEventForm />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />

        {/* 404 handling */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
