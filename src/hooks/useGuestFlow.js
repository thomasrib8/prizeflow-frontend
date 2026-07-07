import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const POLL_INTERVAL_MS = 1500;
const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', consent: false };

// Google gives no API/webhook to confirm a specific guest actually posted a
// review — this is an honor-system friction gate, not real verification: we
// just require the guest to click through to the review page, then wait this
// long before "Continue" unlocks. Earlier this also tried to detect the tab
// actually going hidden/visible (Page Visibility API) to prove they left and
// came back, but that's unreliable across mobile browsers (Safari in
// particular doesn't always fire visibilitychange the same way depending on
// how the new tab opens) — a plain timer from the click is simpler and
// actually works everywhere, at the cost of being slightly easier to game.
const REVIEW_MIN_AWAY_MS = 25000;

/// Shared logic behind the guest queue experience — used both by the public
/// per-guest page (Guest.jsx, one phone = one session, persisted so a re-scan
/// resumes) and the staff-triggered kiosk overlay (LaunchCampaign.jsx, one
/// shared device cycling through walk-up guests, never persisted, and
/// auto-returns to the form after the reveal instead of staying on it).
export function useGuestFlow({ token, persistSession = false, autoReturnMs = null }) {
  const storageKey = `prizeflow_guest_session_${token}`;
  const [view, setView] = useState('loading'); // loading | no_campaign | form | review | queue | expired
  const [campaignInfo, setCampaignInfo] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [reviewState, setReviewState] = useState('idle'); // idle | waiting | ready
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

  // Review-gate: once the guest has clicked through to the review page, wait
  // out the minimum delay before "Continue" unlocks (see REVIEW_MIN_AWAY_MS
  // above for why this is a plain timer and not tab-visibility detection).
  useEffect(() => {
    if (view !== 'review' || reviewState !== 'waiting') return undefined;
    const t = setTimeout(() => setReviewState('ready'), REVIEW_MIN_AWAY_MS);
    return () => clearTimeout(t);
  }, [view, reviewState]);

  function openReviewLink() {
    window.open(campaignInfo.googleReviewUrl, '_blank', 'noopener');
    setReviewState('waiting');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.consent) { setError('Consent is required to claim your reward.'); return; }
    setError('');
    if (campaignInfo?.googleReviewRequired && campaignInfo.googleReviewUrl) {
      setReviewState('idle');
      setView('review');
      return;
    }
    await joinQueue();
  }

  async function joinQueue() {
    setBusy(true);
    setError('');
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
    setReviewState('idle');
    checkCampaign();
  }

  return {
    view, form, setForm, error, busy, status, handleSubmit, restart,
    reviewState, openReviewLink, onReviewContinue: joinQueue,
  };
}
