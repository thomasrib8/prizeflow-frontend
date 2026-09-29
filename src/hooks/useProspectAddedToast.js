import { useCallback, useRef, useState } from 'react';
import { api } from '../api/client';

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 8; // ~12s — comfortably past Hunter's own 10s server-side timeout
const DISMISS_MS = 6000;

/// The "✓ X added" toast shown after New prospect saves, shared by the
/// desktop Launch page and the PWA shell (LaunchCampaign.jsx / LaunchPWA.jsx)
/// so the two don't drift. When the backend kicked off an automatic Hunter
/// email lookup (POST /prospects's emailEnrichment flag — see
/// NewProspectModal), polls for the result and updates the same toast in
/// place instead of leaving the rep wondering whether anything happened.
export function useProspectAddedToast() {
  const [message, setMessage] = useState('');
  const dismissTimer = useRef(null);
  const pollTimer = useRef(null);

  const scheduleDismiss = useCallback((ms = DISMISS_MS) => {
    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setMessage(''), ms);
  }, []);

  const notify = useCallback(({ name, queued, emailMissing, prospectId, emailEnrichment }) => {
    clearTimeout(pollTimer.current);
    const who = name || 'The prospect';
    const base = `${who} added${queued ? ' & queued' : ''}.`;

    if (emailEnrichment && prospectId) {
      setMessage(`${base} Looking for their email…`);
      let attempts = 0;
      const poll = () => {
        attempts += 1;
        api
          .getEmailEnrichmentStatus(prospectId)
          .then((res) => {
            if (res.status === 'found') {
              setMessage(`${base} ✓ Email found via Hunter: ${res.email}.`);
              scheduleDismiss();
            } else if (res.status === 'searching' && attempts < POLL_MAX_ATTEMPTS) {
              pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
            } else {
              // 'not_found' | 'error' | ran out of attempts — same message
              // either way, the rep doesn't need to know which.
              setMessage(`${base} Email not found — add it from their card.`);
              scheduleDismiss();
            }
          })
          .catch(() => {
            setMessage(`${base} Email not found — add it from their card.`);
            scheduleDismiss();
          });
      };
      pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
      return;
    }

    setMessage(base + (emailMissing ? ' No email yet — add it from their card.' : ''));
    scheduleDismiss();
  }, [scheduleDismiss]);

  return { message, notify };
}
