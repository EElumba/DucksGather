import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NotFound from './components/NotFound';
import './App.css';
import HomePage from './components/HomePage';
import ExploreEvents from './components/ExploreEvents';
import CreateEventForm from './components/CreateEventForm';
import EditEventForm from './components/EditEventForm';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ConfirmEmail from './components/ConfirmEmail';
import Navbar from './components/Navbar';
import ExploreNavbar from './components/ExploreNavbar';
import ProfilesPage from './components/ProfilesPage';
import EventDetail from './components/EventDetail';
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
       {/* <Navbar />   {/* always visible */} 
      <ExploreNavbar />
      <Routes>
        {/* Define valid routes */}
        <Route path={VALID_ROUTES.HOME} element={<HomePage />} />
        <Route path={VALID_ROUTES.EXPLORE} element={<ExploreEvents />} />
        <Route path={VALID_ROUTES.CREATE} element={<CreateEventForm />} />
        {/* Event detail route for viewing a single event by ID */}
        <Route path="/events/:id" element={<EventDetail />} />
        {/* Event edit route for updating an existing event by ID */}
        <Route path="/events/:id/edit" element={<EditEventForm />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/profile" element={<ProfilesPage />} />

        {/* 404 handling */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
