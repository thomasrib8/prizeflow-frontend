import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

// phase: 'idle' | 'spinning' | 'result' | 'form' | 'sent'

export default function LaunchCampaign() {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomNumber, setRoomNumber] = useState('');
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [rewardId, setRewardId] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const { agentConnected, wheelStatus } = useWheelSocket();

  const posAngle = wheelStatus ? posToAngle(wheelStatus.currentPos || 0) : 0;
  const isForce = phase === 'spinning' || wheelStatus?.state === 'Run';

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

  async function handleSpin() {
    setError('');
    setPhase('spinning');
    try {
      const res = await api.spinCampaign(roomNumber.trim() || undefined);
      setResult(res);
      setPhase('result');
    } catch (e) {
      setPhase('idle');
      if (e.message === 'SPIN_TOO_WEAK') {
        setError('⚡ Lancez la roue plus fort — le programme de forçage ne s\'est pas déclenché.');
      } else if (e.message === 'SPIN_TOO_SHORT') {
        setError('⏱ La roue n\'a pas atteint la bonne case dans le temps imparti. Relancez.');
      } else {
        setError(e.message);
      }
    }
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!form.consent) { setFormError('Consent is required to send the reward.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await api.submitReward(result.distributionId, form);
      setRewardId(res.rewardId);
      setPhase('sent');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    setPhase('idle');
    setResult(null);
    setRewardId(null);
    setRoomNumber('');
    setForm({ firstName: '', lastName: '', email: '', phone: '', consent: false });
    loadActiveCampaign();
  }

  // ── Spinning full screen ───────────────────────────────────────────────────
  if (phase === 'spinning') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #0F1C3F 0%, #1a2d5a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, gap: 28,
      }}>
        {/* Force indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'absolute', top: 24, right: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Force mode</span>
        </div>

        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Spin in progress
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {roomNumber ? `Room ${roomNumber}` : 'Demo spin'}
          </div>
        </div>

        {/* Live wheel */}
        <div style={{ position: 'relative' }}>
          <WheelSVG positionAngle={posAngle} size={300} />
          {/* Spinning pulse ring */}
          <div style={{
            position: 'absolute', inset: -12, borderRadius: '50%',
            border: '2px solid rgba(96, 165, 250, 0.3)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        </div>

        <div style={{ color: '#60A5FA', fontSize: 14, fontWeight: 500, letterSpacing: '0.04em' }}>
          Waiting for the wheel to stop…
        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.03)} }`}</style>
      </div>
    );
  }

  // ── Result: Congratulations ───────────────────────────────────────────────
  if (phase === 'result' && result && !result.demo) {
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
          {result.roomNumber && (
            <div style={{ marginTop: 14, fontSize: 16, color: '#60A5FA', fontWeight: 500 }}>
              Room {result.roomNumber}
            </div>
          )}
        </div>

        {/* Mini wheel showing stopped section */}
        <WheelSVG positionAngle={posAngle} size={180} highlightSection={slotIndex} />

        <button onClick={() => setPhase('form')} style={{
          marginTop: 8, background: 'white', color: '#0F1C3F', border: 'none',
          borderRadius: 10, padding: '13px 32px', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Continue → Customer details
        </button>
      </div>
    );
  }

  // Demo result
  if (phase === 'result' && result && result.demo) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #0F1C3F 0%, #1a2d5a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, gap: 20,
      }}>
        <div style={{ fontSize: 48 }}>🎡</div>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Demo spin</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>Case {result.slotIndex}</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 10 }}>No stock was used, no client recorded.</div>
        </div>
        <WheelSVG positionAngle={posAngle} size={180} highlightSection={result.slotIndex} />
        <button onClick={handleDone} style={{
          background: 'white', color: '#0F1C3F', border: 'none',
          borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
        }}>Done</button>
      </div>
    );
  }

  // ── Customer form ─────────────────────────────────────────────────────────
  if (phase === 'form') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(15,28,63,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}>
        <div style={{
          background: 'white', borderRadius: 16, padding: '32px 36px',
          width: 440, boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          maxHeight: '90vh', overflowY: 'auto',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>Guest details</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
            {result?.giftName} · {result?.roomNumber ? `Room ${result.roomNumber}` : 'Demo'}
          </p>
          {formError && <div className="error-banner">{formError}</div>}
          <form onSubmit={handleSubmitForm}>
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
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: '#64748B', cursor: 'pointer', margin: '12px 0 8px', lineHeight: 1.5 }}>
              <input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} style={{ marginTop: 2, flexShrink: 0 }} />
              I agree to receive my reward by email and consent to the processing of my personal data.
            </label>
            <button type="submit" disabled={submitting} style={{
              width: '100%', background: '#0F1C3F', color: 'white', border: 'none',
              borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 8, opacity: submitting ? 0.6 : 1,
              fontFamily: 'inherit',
            }}>
              {submitting ? 'Sending…' : 'Send reward'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Reward sent ───────────────────────────────────────────────────────────
  if (phase === 'sent') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #0F1C3F 0%, #1a2d5a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, gap: 18, color: 'white', textAlign: 'center',
      }}>
        <div style={{ fontSize: 56 }}>✅</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Reward sent</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{rewardId}</div>
          <div style={{ fontSize: 13, color: '#64748B', maxWidth: 320, lineHeight: 1.6 }}>An email with the reward reference has been sent to the guest.</div>
        </div>
        <button onClick={handleDone} style={{
          background: 'white', color: '#0F1C3F', border: 'none', borderRadius: 10,
          padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', marginTop: 8,
        }}>Done</button>
      </div>
    );
  }

  // ── Idle: main screen ─────────────────────────────────────────────────────
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

  const remaining = (campaign.slots || []).reduce((sum, s) => sum + s.stock_remaining, 0);
  const progressPct = campaign.total_stock ? Math.round((campaign.total_distributed / campaign.total_stock) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Launch Campaign</h1>
          <p className="page-subtitle">{campaign.name}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Free / Force mode indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 20,
            background: isForce ? 'rgba(37,99,235,0.1)' : 'rgba(16,185,129,0.1)',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isForce ? '#2563EB' : '#10B981',
            }} />
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: isForce ? '#2563EB' : '#10B981',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {isForce ? 'Force' : 'Free'}
            </span>
          </div>
          <Badge tone={agentConnected ? 'green' : 'red'}>{agentConnected ? 'Wheel ready' : 'Wheel offline'}</Badge>
        </div>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Card><div className="stat"><div className="stat-label">Distributed</div><div className="stat-value accent-blue">{campaign.total_distributed}</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Remaining</div><div className="stat-value accent-orange">{remaining}</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Progress</div><div className="stat-value accent-green">{progressPct}%</div></div></Card>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Card title="Spin the wheel" className="mt-card">
        <p className="launch-hint">
          Leave Room Number empty for a free demo spin (nothing is counted). Fill it in to attribute the next campaign gift to a guest.
        </p>
        <div className="launch-controls">
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Room Number (optional)</label>
            <input value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
              placeholder="e.g. 215" />
          </div>
          <Button onClick={handleSpin} disabled={!agentConnected} style={{ padding: '11px 28px', fontSize: 14 }}>
            START SPIN
          </Button>
        </div>
      </Card>
    </div>
  );
}