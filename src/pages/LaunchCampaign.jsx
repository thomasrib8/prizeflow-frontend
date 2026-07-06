import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

// phase: 'form' | 'spinning' | 'result'
const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', consent: false };
const LAUNCH_MOVEMENT_THRESHOLD = 0.5; // matches the hub's own hasStartedMoving check

export default function LaunchCampaign() {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('form');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [spinLaunched, setSpinLaunched] = useState(false); // true once the guest has actually pushed the wheel
  const { agentConnected, wheelStatus } = useWheelSocket();
  const spinStartPosRef = useRef(null);

  const posAngle = wheelStatus ? posToAngle(wheelStatus.currentPos || 0) : 0;

  // The Run;X command only arms the wheel — Main.cpp waits for the guest to
  // physically push it past runLaunchMinSpeed before the forced trajectory
  // actually starts (RunWait -> RunLaunch). The socket protocol reports both
  // as the same "Run" state, so detect the real launch client-side from
  // position movement, the same way hub.js's own pendingSpin tracking does.
  useEffect(() => {
    if (phase !== 'spinning' || spinLaunched || !wheelStatus) return;
    if (spinStartPosRef.current === null) {
      spinStartPosRef.current = wheelStatus.currentPos;
      return;
    }
    if (Math.abs(wheelStatus.currentPos - spinStartPosRef.current) >= LAUNCH_MOVEMENT_THRESHOLD) {
      setSpinLaunched(true);
    }
  }, [phase, spinLaunched, wheelStatus]);

  function loadActiveCampaign() {
    setLoading(true);
    api.listCampaigns()
      .then(all => {
        const active = all.find(c => c.status === 'active') || null;
        if (!active) { setCampaign(null); setLoading(false); return; }
        return api.getCampaign(active.id).then(setCampaign);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadActiveCampaign, []);

  // Reveal the gift for 5s, then reset for the next guest.
  useEffect(() => {
    if (phase !== 'result') return undefined;
    const t = setTimeout(() => {
      setPhase('form');
      setResult(null);
      setForm(EMPTY_FORM);
      loadActiveCampaign();
    }, 5000);
    return () => clearTimeout(t);
  }, [phase]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.consent) { setError('Consent is required to claim your reward.'); return; }
    setError('');
    setBusy(true);
    setSpinLaunched(false);
    spinStartPosRef.current = null;
    setPhase('spinning');
    try {
      const res = await api.spinCampaign();
      let rewardId = null;
      try {
        const rewardRes = await api.submitReward(res.distributionId, form);
        rewardId = rewardRes.rewardId;
      } catch (rewardErr) {
        // Spin already succeeded and stock is consumed; don't block the gift
        // reveal on the reward email — just log it, same as the server's own
        // tolerance for sendRewardEmail failures.
        console.error('Reward submission failed:', rewardErr.message);
      }
      setResult({ ...res, rewardId });
      setPhase('result');
    } catch (err) {
      setPhase('form');
      if (err.message === 'SPIN_ABNORMAL_STOP') {
        // Truncated throw — nothing was consumed server-side (the DB
        // transaction only runs after a confirmed landing), so the same
        // sequence step is retried. Keep the guest's entered details instead
        // of clearing the form, since they don't need to retype anything.
        setError('⚠ An unexpected stop was detected during the spin. Please spin the wheel again.');
      } else if (err.message === 'SPIN_TOO_WEAK') {
        setError('⚡ Please don\'t interact with the wheel — spin it again.');
      } else if (err.message === 'SPIN_TOO_SHORT') {
        setError('⏱ The wheel didn\'t reach the right slot in time. Please spin again.');
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Spinning full screen — deliberately generic, no wheel telemetry ───────
  if (phase === 'spinning') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #0F1C3F 0%, #1a2d5a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, gap: 24,
      }}>
        {!spinLaunched ? (
          <div style={{ textAlign: 'center', color: 'white', fontSize: 22, fontWeight: 800, maxWidth: 420, lineHeight: 1.4, padding: '0 24px' }}>
            Spin the wheel to claim your prize!
          </div>
        ) : (
          <>
            <img src="/logo.svg" alt="" style={{ width: 84, height: 84, animation: 'spin 1.2s linear infinite' }} />
            <div style={{ color: '#60A5FA', fontSize: 15, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Please wait…
            </div>
          </>
        )}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const slotIndex = result.slotIndex || 0;
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #0F1C3F 0%, #1a2d5a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, gap: 24, animation: 'fadeIn 0.4s ease',
      }}>
        <style>{`
          @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          @keyframes confetti { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(-20px) rotate(15deg)} }
        `}</style>

        <div style={{ fontSize: 56, animation: 'confetti 0.6s ease-in-out infinite alternate' }}>🎉</div>

        <div style={{ textAlign: 'center', color: 'white', maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Thank you for participating
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.4 }}>
            You will receive an email with your gift.
          </div>
          {/* Test campaigns only: show the actual gift so staff can verify the sequence/stock without waiting on email. */}
          {!!campaign?.is_test && (
            <div style={{ marginTop: 20, fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', color: '#60A5FA' }}>
              {result.giftName}
            </div>
          )}
        </div>

        {/* Mini wheel showing stopped section — test campaigns only, same reasoning as the gift name above */}
        {!!campaign?.is_test && <WheelSVG positionAngle={posAngle} size={180} highlightSection={slotIndex} />}
      </div>
    );
  }

  // ── Idle: guest-facing form ────────────────────────────────────────────────
  if (loading) return <p className="page-subtitle">Loading…</p>;

  if (!campaign) {
    return (
      <div>
        <div className="page-header">
          <div><h1 className="page-title">Launch Campaign</h1><p className="page-subtitle">Operate the wheel for the active campaign</p></div>
        </div>
        <Card><EmptyState title="No active campaign" description="Start a campaign from the Campaigns page before launching spins." /></Card>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <button onClick={() => navigate('/')} style={{
        position: 'absolute', top: 20, right: 24, background: 'none', border: '1px solid #E2E8F0',
        borderRadius: 8, padding: '7px 14px', fontSize: 13, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit',
      }}>Exit</button>

      <div style={{
        background: 'white', borderRadius: 20, padding: '44px 48px', width: 460,
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
          {!agentConnected && (
            <div style={{ fontSize: 12, color: '#EF4444', background: '#FEF2F2', padding: '8px 14px', borderRadius: 8, marginBottom: 14, textAlign: 'center' }}>
              This kiosk isn't ready yet. Please contact staff.
            </div>
          )}
          <button type="submit" disabled={busy || !agentConnected} style={{
            width: '100%', background: '#0F1C3F', color: 'white', border: 'none',
            borderRadius: 10, padding: '15px', fontSize: 15, fontWeight: 700,
            cursor: busy || !agentConnected ? 'not-allowed' : 'pointer',
            opacity: busy || !agentConnected ? 0.5 : 1, fontFamily: 'inherit', letterSpacing: '0.02em',
          }}>
            {busy ? 'PLEASE WAIT…' : 'CHECK AND SPIN THE WHEEL'}
          </button>
        </form>
      </div>
    </div>
  );
}
