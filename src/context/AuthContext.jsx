import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase.js';
import { saveUserSettings, useUserDoc } from '../data/store.js';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function readLocalTheme() {
  try {
    return localStorage.getItem('rf-theme');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { data: settings } = useUserDoc(currentUser?.uid);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
    setLoading(false);
  }), []);

  // Apply the saved theme everywhere (the old app only applied it on the Settings page).
  const darkMode = settings?.darkMode ?? readLocalTheme() === 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    try {
      localStorage.setItem('rf-theme', darkMode ? 'dark' : 'light');
    } catch {
      /* storage unavailable; theme still applies for this session */
    }
  }, [darkMode]);

  const value = {
    currentUser,
    settings: settings || {},
    darkMode,
    citationStyle: settings?.citationStyle || 'apa',
    updateSettings: (changes) => currentUser && saveUserSettings(currentUser.uid, changes),
  };

  if (loading) return <div className="page-loading">Loading…</div>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
