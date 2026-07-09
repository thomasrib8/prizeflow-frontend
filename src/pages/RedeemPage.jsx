import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RewardCard from '../components/RewardCard';

/// Reached by scanning the QR code in a reward email (or via a manual code
/// lookup — see History.jsx and Rewards.jsx). An operator must be signed
/// into PrizeFlow to view or act on it: unauthenticated visitors are sent to
/// /login first, then bounced back here (see the returnTo param handled by
/// Login.jsx). The reward's own PII is never shown without that sign-in.
///
/// This is a standalone full-screen page (not wrapped in the app's sidebar
/// Layout) because it's reached by scanning a QR code from outside the app
/// entirely — there's no persistent shell to render into yet. The Rewards
/// page (Rewards.jsx) is the in-app equivalent for code lookups done while
/// already navigating the app, and keeps the sidebar visible.
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

  async function handleCancel() {
    setBusy(true);
    setError('');
    try {
      await api.cancelReward(code);
      setReward((prev) => ({ ...prev, status: 'cancelled' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    setBusy(true);
    setError('');
    try {
      await api.undistributeReward(code);
      setReward((prev) => ({ ...prev, status: 'active', distributedBy: null, distributedAt: null }));
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
        boxShadow: '0 30px 80px rgba(0,0,0,0.15)',
      }}>
        {state === 'loading' && <p style={{ color: '#64748B', textAlign: 'center' }}>Loading…</p>}

        {state === 'invalid' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#0F172A' }}>Invalid code</h1>
            <p style={{ fontSize: 14, color: '#64748B' }}>{error || 'This redemption link is not valid.'}</p>
          </div>
        )}

        {state === 'loaded' && reward && (
          <RewardCard reward={reward} error={error} busy={busy} onDistribute={handleDistribute} onCancel={handleCancel} onUndo={handleUndo} />
        )}
      </div>
    </div>
  );
}
