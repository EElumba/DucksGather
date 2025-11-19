import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { signIn, signUp, loading, user, profile, role, signOut } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  if (loading) return <div>Loading auth...</div>;
  if (user) {
    return (
      <div style={{ maxWidth: 400, margin: '2rem auto', fontFamily: 'sans-serif' }}>
        <h2>Account</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>App Role:</strong> {role || '(fetching...)'}</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h2>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={pending}>{pending ? 'Please wait...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}</button>
      </form>
      <div style={{ marginTop: '1rem' }}>
        {mode === 'signin' ? (
          <button onClick={() => setMode('signup')}>Need an account? Sign Up</button>
        ) : (
          <button onClick={() => setMode('signin')}>Already have an account? Sign In</button>
        )}
      </div>
    </div>
  );
}
