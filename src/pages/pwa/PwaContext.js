import { createContext, useContext } from 'react';

// Everything the PWA's tabs share, provided once by PwaLayout: the active
// campaign (and its live queue), the wheel's connection, and the actions that
// open the shared popups (scan, new prospect, prospect card).
export const PwaContext = createContext(null);

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwa must be used inside PwaLayout');
  return ctx;
}
