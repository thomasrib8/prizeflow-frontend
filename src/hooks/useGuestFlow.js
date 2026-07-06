import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const POLL_INTERVAL_MS = 1500;
const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', consent: false };

/// Shared logic behind the guest queue experience — used both by the public
/// per-guest page (Guest.jsx, one phone = one session, persisted so a re-scan
/// resumes) and the staff-triggered kiosk overlay (LaunchCampaign.jsx, one
/// shared device cycling through walk-up guests, never persisted, and
/// auto-returns to the form after the reveal instead of staying on it).
export function useGuestFlow({ token, persistSession = false, autoReturnMs = null }) {
  const storageKey = `prizeflow_guest_session_${token}`;
  const [view, setView] = useState('loading'); // loading | no_campaign | form | queue | expired
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const sessionTokenRef = useRef(persistSession ? localStorage.getItem(storageKey) : null);

  function checkCampaign() {
    return api.getGuestCampaign(token)
      .then((res) => setView(res.active ? 'form' : 'no_campaign'))
      .catch(() => setView('no_campaign'));
  }

  useEffect(() => {
    if (sessionTokenRef.current) { setView('queue'); return; }
    checkCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Poll while in queue, but stop once a terminal state is reached — no need
  // to keep hitting the server once the turn is done or expired.
  useEffect(() => {
    if (view !== 'queue') return undefined;
    if (status && (status.status === 'done' || status.status === 'expired')) return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const res = await api.getGuestStatus(token, sessionTokenRef.current);
        if (cancelled) return;
        if (!res.found) {
          if (persistSession) localStorage.removeItem(storageKey);
          setView('expired');
          return;
        }
        setStatus(res);
        if (res.status === 'expired' && persistSession) {
          localStorage.removeItem(storageKey);
        }
      } catch {
        // transient network hiccup — just try again next tick
      }
    }

    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, token, status?.status]);

  // Kiosk mode only: auto-return to the form a fixed delay after the reveal,
  // ready for the next walk-up guest.
  useEffect(() => {
    if (!autoReturnMs || status?.status !== 'done') return undefined;
    const t = setTimeout(() => restart(), autoReturnMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, autoReturnMs]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.consent) { setError('Consent is required to claim your reward.'); return; }
    setError('');
    setBusy(true);
    try {
      const res = await api.joinGuestQueue(token, form);
      if (persistSession) localStorage.setItem(storageKey, res.sessionToken);
      sessionTokenRef.current = res.sessionToken;
      setStatus(null);
      setView('queue');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    if (persistSession) localStorage.removeItem(storageKey);
    sessionTokenRef.current = null;
    setStatus(null);
    setForm(EMPTY_FORM);
    setError('');
    checkCampaign();
  }

  return { view, form, setForm, error, busy, status, handleSubmit, restart };
}
