import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { useAuth } from '../context/AuthContext';

function LoginButton() {
  const navigate = useNavigate();
  return (
    <button className="nav-button" onClick={() => navigate('/login')}>
      Log In
    </button>
  );
}

function SignUpButton() {
  const navigate = useNavigate();
  return (
    <button className="nav-button" onClick={() => navigate('/signup')}>
      Sign Up
    </button>
  );
}

function LogoutButton() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const handleClick = async () => {
    await signOut();
    navigate('/');
  };
  return (
    <button className="nav-button" onClick={handleClick}>
      Log Out
    </button>
  );
}

const Navbar = () => {
  const { user, role } = useAuth();

  const canCreate = role === 'admin' || role === 'coordinator';

  return (
    <nav className="nav">
      <Link to="/" className="logo">
        <div className="logo-icon">
          <img src="/logo.png" alt="DucksGather logo" />
        </div>
      </Link>

      <div className="nav-links">
        <Link to="/explore" className="nav-link-button">
          Explore
        </Link>

        {canCreate && (
          <Link to="/create" className="nav-link-button">
            Create Event
          </Link>
        )}

        {!user && (
          <>
            <LoginButton />
            <SignUpButton />
          </>
        )}

        {user && (
          <>
            <span className="nav-user-email">
              {user.email}
              {role && ` (${role})`}
            </span>
            <LogoutButton />
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;