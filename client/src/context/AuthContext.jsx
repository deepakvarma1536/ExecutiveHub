import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true); // hydrating from localStorage

  // On mount: if a token exists, fetch the current user to validate it.
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {
        // Token invalid/expired — clear it
        localStorage.removeItem('auth_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(({ token: t, user: u }) => {
    // Keep localStorage token fallback for smoother transition for clients not using cookies yet
    if (t) localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed:', err);
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
