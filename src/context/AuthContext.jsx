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

  const register = useCallback(async (email, password, name) => {
    const { user, token } = await api.register(email, password, name);
    localStorage.setItem('prizeflow_token', token);
    localStorage.setItem('prizeflow_user', JSON.stringify(user));
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('prizeflow_token');
    localStorage.removeItem('prizeflow_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
