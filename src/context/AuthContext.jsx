import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import { getToken, setToken, readStoredUser, writeStoredUser } from '../api/tokenStore';
import i18n from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // A stored user without a token (or the reverse) is a half-cleared session —
  // treat it as signed out rather than rendering the app and letting every
  // request bounce.
  const [user, setUser] = useState(() => (getToken() ? readStoredUser() : null));

  // The admin panel's own language (distinct from a campaign's guest-facing
  // language — see i18n/index.js) is set globally, once per account, since
  // there's never more than one admin UI open in a tab at a time. Covers
  // both a fresh login and a page refresh restoring the stored user.
  useEffect(() => {
    if (user?.language) i18n.changeLanguage(user.language);
  }, [user?.language]);

  const startSession = useCallback(({ user, token }) => {
    setToken(token);
    writeStoredUser(user);
    setUser(user);
  }, []);

  // Returns { mfaRequired, mfaToken } when the account needs its authenticator code too;
  // the caller then finishes with completeMfa().
  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    if (res.mfaRequired) return { mfaRequired: true, mfaToken: res.mfaToken };
    startSession(res);
    return { mfaRequired: false };
  }, [startSession]);

  const completeMfa = useCallback(async (mfaToken, code) => {
    startSession(await api.verifyMfa(mfaToken, code));
  }, [startSession]);

  // New accounts are pending until an admin approves them — this never logs
  // the caller in, it just returns the backend's confirmation message.
  const register = useCallback((payload) => api.register(payload), []);

  const logout = useCallback(() => {
    setToken(null);
    writeStoredUser(null);
    setUser(null);
  }, []);

  // Used after a profile edit (name change) so the sidebar/avatar reflect it
  // without requiring a re-login.
  const updateStoredUser = useCallback((partialUser) => {
    setUser((prev) => {
      const next = { ...prev, ...partialUser };
      writeStoredUser(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, completeMfa, register, logout, updateStoredUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
