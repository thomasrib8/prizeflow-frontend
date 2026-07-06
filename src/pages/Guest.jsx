import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import WheelSVG from '../components/WheelSVG';

// view: 'loading' | 'no_campaign' | 'form' | 'queue' | 'expired'
// 'queue' covers both waiting-in-line and the active turn (spin prompt / spinning / done),
// driven entirely by the polled status rather than separate local phases.
const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', consent: false };
const POLL_INTERVAL_MS = 1500;

const RETRY_MESSAGES = {
  SPIN_ABNORMAL_STOP: '⚠ An unexpected stop was detected during the spin. Please spin the wheel again.',
  SPIN_TOO_WEAK: "⚡ Please don't interact with the wheel — spin it again.",
  SPIN_TOO_SHORT: "⏱ The wheel didn't reach the right slot in time. Please spin again.",
};

function sessionKey(token) {
  return `prizeflow_guest_session_${token}`;
}

export default function Guest() {
  const { token } = useParams();
  const [view, setView] = useState('loading');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // last polled status payload
  const sessionTokenRef = useRef(localStorage.getItem(sessionKey(token)));

  const posAngle = 0; // guest page never shows real wheel telemetry, see WheelSVG usage below

  // Resume an existing session, or check whether there's a campaign to join.
  useEffect(() => {
    if (sessionTokenRef.current) {
      setView('queue');
      return;
    }
    api.getGuestCampaign(token)
      .then((res) => setView(res.active ? 'form' : 'no_campaign'))
      .catch(() => setView('no_campaign'));
  }, [token]);

  // Poll status while we have a session and haven't reached a terminal state.
  useEffect(() => {
    if (view !== 'queue') return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const res = await api.getGuestStatus(token, sessionTokenRef.current);
        if (cancelled) return;
        if (!res.found) {
          localStorage.removeItem(sessionKey(token));
          setView('expired');
          return;
        }
        setStatus(res);
        if (res.status === 'expired') {
          localStorage.removeItem(sessionKey(token));
          setView('expired');
        }
      } catch {
        // transient network hiccup — just try again next tick
      }
    }

    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [view, token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.consent) { setError('Consent is required to claim your reward.'); return; }
    setError('');
    setBusy(true);
    try {
      const res = await api.joinGuestQueue(token, form);
      localStorage.setItem(sessionKey(token), res.sessionToken);
      sessionTokenRef.current = res.sessionToken;
      setView('queue');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleRestart() {
    localStorage.removeItem(sessionKey(token));
    sessionTokenRef.current = null;
    setStatus(null);
    setForm(EMPTY_FORM);
    setError('');
    api.getGuestCampaign(token)
      .then((res) => setView(res.active ? 'form' : 'no_campaign'))
      .catch(() => setView('no_campaign'));
  }

  const fullScreenBase = {
    position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #0F1C3F 0%, #1a2d5a 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, gap: 24, padding: '0 24px', textAlign: 'center',
  };

  if (view === 'loading') {
    return <div style={fullScreenBase}><div style={{ color: 'white' }}>Loading…</div></div>;
  }

  if (view === 'no_campaign') {
    return (
      <div style={fullScreenBase}>
        <div style={{ color: 'white', fontSize: 20, fontWeight: 700, maxWidth: 420 }}>
          No campaign is currently running. Please check back later.
        </div>
      </div>
    );
  }

  if (view === 'expired') {
    return (
      <div style={fullScreenBase}>
        <div style={{ color: 'white', fontSize: 20, fontWeight: 700, maxWidth: 420, lineHeight: 1.4 }}>
          Your turn has timed out.
        </div>
        <button onClick={handleRestart} style={{
          background: 'white', color: '#0F1C3F', border: 'none', borderRadius: 10,
          padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>Try again</button>
      </div>
    );
  }

  if (view === 'queue' && status) {
    // Done — persistent thank-you screen, no auto-return.
    if (status.status === 'done') {
      const result = status.result || {};
      return (
        <div style={fullScreenBase} key="done">
          <style>{`
            @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            @keyframes confetti { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(-20px) rotate(15deg)} }
          `}</style>
          <div style={{ fontSize: 56, animation: 'confetti 0.6s ease-in-out infinite alternate' }}>🎉</div>
          <div style={{ color: 'white', maxWidth: 480, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Thank you{status.firstName ? `, ${status.firstName}` : ''}!
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.4 }}>
              You will receive an email with your gift.
            </div>
            {!!result.isTest && (
              <div style={{ marginTop: 20, fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', color: '#60A5FA' }}>
                {result.giftName}
              </div>
            )}
          </div>
          {!!result.isTest && <WheelSVG positionAngle={posAngle} size={180} />}
        </div>
      );
    }

    // Waiting in line.
    if (status.status === 'waiting') {
      return (
        <div style={fullScreenBase} key="waiting">
          <div style={{ color: 'white', fontSize: 20, fontWeight: 800, maxWidth: 420 }}>
            You're #{status.position + 1} in line
          </div>
          <div style={{ color: '#60A5FA', fontSize: 14, fontWeight: 600 }}>
            {status.activeFirstName
              ? `${status.activeFirstName} is currently playing`
              : 'You will be notified when it\'s your turn'}
          </div>
        </div>
      );
    }

    // Active turn: spin prompt, retry warning, or the loading logo once launched.
    if (status.status === 'active') {
      return (
        <div style={fullScreenBase} key="active">
          {status.retryMessage && RETRY_MESSAGES[status.retryMessage] && (
            <div style={{ fontSize: 13, color: '#FCA5A5', background: 'rgba(239,68,68,0.15)', padding: '8px 16px', borderRadius: 20, maxWidth: 420 }}>
              {RETRY_MESSAGES[status.retryMessage]}
            </div>
          )}
          {!status.launched ? (
            <div style={{ color: 'white', fontSize: 22, fontWeight: 800, maxWidth: 420, lineHeight: 1.4 }}>
              Spin the wheel to claim your prize!
            </div>
          ) : (
            <>
              <img src="/logo.svg" alt="" style={{ width: 84, height: 84, animation: 'spin 1.2s linear infinite' }} />
              <div style={{ color: '#60A5FA', fontSize: 15, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Please wait…
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </>
          )}
        </div>
      );
    }
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '44px 48px', width: 460, maxWidth: '92vw',
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.svg" alt="" style={{ width: 44, height: 44, marginBottom: 14 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#0F172A' }}>Win your reward!</h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>Enter your details below to claim your gift.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>First name</label>
              <input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Last name</label>
              <input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Email address</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Phone number</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: '#64748B', cursor: 'pointer', margin: '12px 0 20px', lineHeight: 1.5 }}>
            <input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} style={{ marginTop: 2, flexShrink: 0 }} />
            I agree to receive my reward by email and consent to the processing of my personal data.
          </label>
          <button type="submit" disabled={busy} style={{
            width: '100%', background: '#0F1C3F', color: 'white', border: 'none',
            borderRadius: 10, padding: '15px', fontSize: 15, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
            fontFamily: 'inherit', letterSpacing: '0.02em',
          }}>
            {busy ? 'PLEASE WAIT…' : 'CHECK AND SPIN THE WHEEL'}
          </button>
        </form>
      </div>
    </div>
  );
}
