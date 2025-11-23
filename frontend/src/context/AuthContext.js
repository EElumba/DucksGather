import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { fetchCurrentUser, setAuthToken, clearAuthToken } from '../api/client';

// Expect env vars injected via CRA (REACT_APP_*)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const AuthContext = createContext({
  loading: true,
  user: null,
  profile: null,
  role: null,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) { setProfile(null); setProfileError(null); return; }
    try {
      setProfileError(null);
      const data = await fetchCurrentUser();
      setProfile(data);
    } catch (e) {
      console.warn('Failed to fetch profile', e);
      setProfileError(e.message || 'Profile fetch failed');
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!supabase) { setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setAuthToken(session.access_token);
      }
      setLoading(false);
    }
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  useEffect(() => {
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setAuthToken(session.access_token);
        refreshProfile();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        clearAuthToken();
        setProfile(null);
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, [refreshProfile]);

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    setAuthToken(data.session.access_token);
    refreshProfile();
  };

  const signUp = async (email, password, fullName) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Supabase typically uses status 400 with a message like
    // "User already registered" or "User already exists"
    if (error.message && /already/i.test(error.message)) {
      const e = new Error('An account with this email already exists.');
      e.code = 'USER_EXISTS';
      throw e;
    }
    throw error;
  }

  if (data.session) {
    setUser(data.session.user);
    setAuthToken(data.session.access_token);

    await fetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ full_name: fullName }),
    });

    await refreshProfile();
  }
};

  const signOut = async () => {
    if (!supabase) { clearAuthToken(); setUser(null); setProfile(null); return; }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      loading,
      user,
      profile,
      role: profile?.role || null,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

const signUp = async (email, password) => {
  return await supabase.auth.signUp({
    email,
    password,
  });
};

export function useAuth() {
  return useContext(AuthContext);
}
