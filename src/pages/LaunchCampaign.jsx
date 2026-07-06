import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

// phase: 'form' | 'spinning' | 'result'
const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', consent: false };

export default function LaunchCampaign() {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('form');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const { agentConnected, wheelStatus } = useWheelSocket();

  const posAngle = wheelStatus ? posToAngle(wheelStatus.currentPos || 0) : 0;

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
      if (err.message === 'SPIN_TOO_WEAK') {
        setError('⚡ Lancez la roue plus fort — le programme de forçage ne s\'est pas déclenché.');
      } else if (err.message === 'SPIN_TOO_SHORT') {
        setError('⏱ La roue n\'a pas atteint la bonne case dans le temps imparti. Relancez.');
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
        <img src="/logo.svg" alt="" style={{ width: 84, height: 84, animation: 'spin 1.2s linear infinite' }} />
        <div style={{ color: '#60A5FA', fontSize: 15, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Please wait…
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Result: Congratulations ───────────────────────────────────────────────
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

        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Congratulations
          </div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1, maxWidth: 480 }}>
            {result.giftName}
          </div>
        </div>

        {/* Mini wheel showing stopped section */}
        <WheelSVG positionAngle={posAngle} size={180} highlightSection={slotIndex} />
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
