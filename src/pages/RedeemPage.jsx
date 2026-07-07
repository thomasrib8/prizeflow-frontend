import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_INFO = {
  active: { color: '#10B981', label: 'Valid — ready to redeem' },
  redeemed: { color: '#F59E0B', label: 'Already used' },
  expired: { color: '#EF4444', label: 'Expired' },
  cancelled: { color: '#EF4444', label: 'Cancelled' },
};

/// Public page reached by scanning the QR code in a reward email (or via the
/// "Redeem by ID" fallback in History.jsx, which resolves to the same signed
/// code). Anyone can view the status — no PrizeFlow login required, this
/// works with any camera app or QR scanner. Only an operator who is already
/// logged into this same app (checked via useAuth, not a separate login
/// step) sees the "Mark as distributed" action.
export default function RedeemPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState('loading'); // loading | invalid | loaded
  const [reward, setReward] = useState(null);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getRedeemStatus(code)
      .then((res) => { setReward(res); setState('loaded'); })
      .catch((e) => { setError(e.message); setState('invalid'); });
  }, [code]);

  useEffect(() => {
    if (!user) return;
    const parts = (user.name || '').trim().split(/\s+/);
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
  }, [user]);

  async function handleDistribute(e) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { setError('Enter your first and last name.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api.distributeReward(code, { operatorFirstName: firstName, operatorLastName: lastName });
      setReward((prev) => ({ ...prev, status: 'redeemed', distributedBy: res.distributedBy }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '40px 36px', width: 440, maxWidth: '94vw',
        boxShadow: '0 30px 80px rgba(0,0,0,0.15)', textAlign: 'center',
      }}>
        {state === 'loading' && <p style={{ color: '#64748B' }}>Loading…</p>}

        {state === 'invalid' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#0F172A' }}>Invalid code</h1>
            <p style={{ fontSize: 14, color: '#64748B' }}>{error || 'This redemption link is not valid.'}</p>
          </>
        )}

        {state === 'loaded' && reward && (
          <>
            <div style={{
              display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              color: 'white', background: STATUS_INFO[reward.status]?.color || '#64748B', marginBottom: 18,
            }}>
              {STATUS_INFO[reward.status]?.label || reward.status}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#0F172A' }}>{reward.giftName}</h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 24px' }}>
              For {reward.firstName} {reward.lastName}
            </p>

            {reward.status === 'redeemed' && reward.distributedBy && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
                Distributed by {reward.distributedBy}{reward.distributedAt ? ` · ${new Date(reward.distributedAt.replace(' ', 'T') + 'Z').toLocaleString()}` : ''}
              </p>
            )}

            {reward.status === 'active' && !user && (
              <p style={{ fontSize: 13, color: '#94A3B8' }}>Please show this to a staff member to confirm redemption.</p>
            )}

            {reward.status === 'active' && user && (
              <form onSubmit={handleDistribute} style={{ textAlign: 'left' }}>
                {error && <div className="error-banner">{error}</div>}
                <div className="field">
                  <label>Your first name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Your last name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <button type="submit" disabled={busy} style={{
                  width: '100%', background: '#0F1C3F', color: 'white', border: 'none',
                  borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
                }}>
                  {busy ? 'Confirming…' : 'Mark as distributed'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
