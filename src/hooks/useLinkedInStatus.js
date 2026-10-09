// Whether LinkedIn search is on for this account AND campaign, and the credit balance. Nothing is asked of the
// server on an event box (the feature does not exist there) or while the browser is offline.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { IS_BOX_BUILD } from '../utils/boxMode';

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function useLinkedInStatus(campaignId) {
  const online = useOnline();
  const [status, setStatus] = useState(null);
  const reload = useCallback(() => {
    if (IS_BOX_BUILD || !campaignId) return Promise.resolve();
    return api.linkedinStatus(campaignId).then(setStatus).catch(() => setStatus(null));
  }, [campaignId]);
  useEffect(() => { reload(); }, [reload, online]);
  // The server's answer to a search carries the fresh balance: take it without another round trip.
  const setCredits = useCallback((b) => setStatus((s) => (s ? { ...s, credits: { total: b.total, used: b.used, remaining: b.remaining, level: b.level } } : s)), []);
  return { status, online: online && !IS_BOX_BUILD, offline: IS_BOX_BUILD || !online, reload, setCredits };
}
