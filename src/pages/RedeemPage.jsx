import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_INFO = {
  active: { color: '#10B981', label: 'Valid — ready to redeem' },
  redeemed: { color: '#F59E0B', label: 'Already used' },
  expired: { color: '#EF4444', label: 'Expired' },
  cancelled: { color: '#EF4444', label: 'Cancelled' },
};

function formatDT(s) {
  if (!s) return null;
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString();
}

/// Reached by scanning the QR code in a reward email (or via a manual code
/// lookup — see History.jsx and Rewards.jsx). An operator must be signed
/// into PrizeFlow to view or act on it: unauthenticated visitors are sent to
/// /login first, then bounced back here (see the returnTo param handled by
/// Login.jsx). The reward's own PII is never shown without that sign-in.
export default function RedeemPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState('loading'); // loading | invalid | loaded
  const [reward, setReward] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }
    api.getRedeemStatus(code)
      .then((res) => { setReward(res); setState('loaded'); })
      .catch((e) => { setError(e.message); setState('invalid'); });
  }, [code, user]);

  async function handleDistribute() {
    setBusy(true);
    setError('');
    try {
      const res = await api.distributeReward(code);
      setReward((prev) => ({ ...prev, status: 'redeemed', distributedBy: res.distributedBy }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

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
            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 4px' }}>
              For {reward.firstName} {reward.lastName}
            </p>
            {reward.launchedAt && (
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 24px' }}>
                Wheel launched {formatDT(reward.launchedAt)}
              </p>
            )}

            {error && <div className="error-banner">{error}</div>}

            {reward.status === 'redeemed' && reward.distributedBy && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
                Distributed by {reward.distributedBy}{reward.distributedAt ? ` · ${formatDT(reward.distributedAt)}` : ''}
              </p>
            )}

            {reward.status === 'active' && (
              <button type="button" onClick={handleDistribute} disabled={busy} style={{
                width: '100%', background: '#0F1C3F', color: 'white', border: 'none',
                borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
              }}>
                {busy ? 'Confirming…' : 'Mark as distributed'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
