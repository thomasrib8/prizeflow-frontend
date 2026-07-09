import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const POLL_INTERVAL_MS = 1500;
const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', consent: false };

/// Shared logic behind the guest queue experience — used both by the public
/// per-guest page (Guest.jsx, one phone = one session, persisted so a re-scan
/// resumes) and the staff-triggered kiosk overlay (LaunchCampaign.jsx, one
/// shared device cycling through walk-up guests, never persisted, and
/// auto-returns to the form after the reveal instead of staying on it).
///
/// `source` is recorded on the resulting distribution's Operator column in
/// History (see guestQueue.js) so staff can tell "a guest scanned this on
/// their own phone" (source: 'guest') apart from "an operator ran this from
/// the Launch page's kiosk button for a walk-up guest without a phone"
/// (source: 'kiosk').
export function useGuestFlow({ token, persistSession = false, autoReturnMs = null, source = 'guest' }) {
  const storageKey = `prizeflow_guest_session_${token}`;
  const [view, setView] = useState('loading'); // loading | no_campaign | form | queue | expired
  const [campaignInfo, setCampaignInfo] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const sessionTokenRef = useRef(persistSession ? localStorage.getItem(storageKey) : null);

  function checkCampaign() {
    return api.getGuestCampaign(token)
      .then((res) => { setCampaignInfo(res); setView(res.active ? 'form' : 'no_campaign'); })
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
        if (res.status === 'expired') {
          if (persistSession) localStorage.removeItem(storageKey);
          setView('expired');
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

  // The Google review invite is shown only AFTER the gift is won (see the
  // "done" view in GuestFlowScreen) and is purely optional — Google's terms
  // forbid conditioning any reward or game access on leaving a review, even
  // as an unverified "friction gate". Nothing here blocks or delays the spin.
  function openReviewLink() {
    window.open(campaignInfo.googleReviewUrl, '_blank', 'noopener');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.consent) { setError('Consent is required to claim your reward.'); return; }
    setError('');
    await joinQueue();
  }

  async function joinQueue() {
    setBusy(true);
    setError('');
    try {
      const res = await api.joinGuestQueue(token, { ...form, source });
      if (persistSession) localStorage.setItem(storageKey, res.sessionToken);
      sessionTokenRef.current = res.sessionToken;
      setStatus(null);
      setView('queue');
    } catch (err) {
      if (err.message === 'ALREADY_PLAYED') {
        setError("This email has already played in this campaign. Each guest can only spin once.");
      } else {
        setError(err.message);
      }
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

  return { view, campaignInfo, form, setForm, error, busy, status, handleSubmit, restart, openReviewLink };
}
