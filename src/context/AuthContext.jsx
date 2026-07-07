import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('prizeflow_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email, password) => {
    const { user, token } = await api.login(email, password);
    localStorage.setItem('prizeflow_token', token);
    localStorage.setItem('prizeflow_user', JSON.stringify(user));
    setUser(user);
  }, []);

  // New accounts are pending until an admin approves them — this never logs
  // the caller in, it just returns the backend's confirmation message.
  const register = useCallback((payload) => api.register(payload), []);

  const logout = useCallback(() => {
    localStorage.removeItem('prizeflow_token');
    localStorage.removeItem('prizeflow_user');
    setUser(null);
  }, []);

  // Used after a profile edit (name change) so the sidebar/avatar reflect it
  // without requiring a re-login.
  const updateStoredUser = useCallback((partialUser) => {
    setUser((prev) => {
      const next = { ...prev, ...partialUser };
      localStorage.setItem('prizeflow_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateStoredUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
