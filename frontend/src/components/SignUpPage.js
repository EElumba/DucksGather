import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthPages.css';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  setError(null);

  // 1) ENFORCE UOregon email
  if (!email.endsWith('@uoregon.edu')) {
    setError('Only @uoregon.edu email addresses are allowed.');
    setSubmitting(false);
    return;
  }

  // 2) Passwords must match
  if (password !== confirmPassword) {
    setError('Passwords do not match.');
    setSubmitting(false);
    return;
  }

  try {
    // AuthContext.signUp will throw if Supabase returns an error
    await signUp(email, password);

    // 3) Tell the user to check their email
    navigate('/confirm-email', { state: { email } });
  } catch (err) {
    setError(err.message || 'Sign up failed');
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="auth-page-root">
      <div className="auth-card">
        <div className="auth-logo-circle">🦆</div>

        <h1 className="auth-title">Create Account</h1>

        {error && <div className="auth-error">{error}</div>}

        {password !== confirmPassword && confirmPassword.length > 0 && (
          <div className="auth-error">Passwords do not match.</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="auth-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field auth-field-password">
            <label className="auth-label">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="auth-input auth-input-with-icon"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-eye-button"
            >
              {showPassword ? '👁️':'👁️‍🗨️'}
            </button>
          </div>

          <div className="auth-field auth-field-password">
            <label className="auth-label">Confirm Password</label>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="auth-input auth-input-with-icon"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="auth-eye-button"
            >
              {showConfirm ? '👁️' : '👁️‍🗨️'}
            </button>

            {/* 🚨 Password too short warning */}
            {password.length > 0 && password.length < 6 && (
                <p className="auth-hint" style={{ color: '#d9534f', marginTop: '4px' }}>
                Password must be at least 6 characters.
                </p>
            )}
            
          </div>

          <button
            type="submit"
            disabled={
              submitting || password !== confirmPassword || password.length < 6
            }
            className="auth-submit-button"
          >
            {submitting ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-footer-link">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}