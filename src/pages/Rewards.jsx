import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import RewardCard from '../components/RewardCard';

const STATUS_TONE = { active: 'orange', redeemed: 'green', expired: 'neutral', cancelled: 'red' };
const STATUS_LABEL = { active: 'To distribute', redeemed: 'Distributed', expired: 'Expired', cancelled: 'Cancelled' };

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

/// Destination for the "unique code" redemption flow (see
/// campaign_slots.redeem_method): a guest's reward email shows an 8-char
/// code, and its QR opens this generic page instead of a direct reward
/// deep-link. Also reachable by clicking any row in the recap table below.
/// Unlike the direct-QR flow (RedeemPage.jsx, full-screen — reached from
/// outside the app entirely), a lookup here stays inline on this page, with
/// the sidebar still visible, since the operator is already navigating the app.
export default function Rewards() {
  const [code, setCode] = useState('');
  const [signedCode, setSignedCode] = useState(null);
  const [reward, setReward] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);

  function loadList() {
    api.rewards().then(setRewards).catch((e) => setError(e.message));
  }

  useEffect(loadList, []);

  async function openReward(resolve) {
    setBusy(true);
    setError('');
    try {
      const { code: resolvedSignedCode } = await resolve();
      const detail = await api.getRedeemStatus(resolvedSignedCode);
      setSignedCode(resolvedSignedCode);
      setReward(detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    openReward(() => api.getRewardCodeLookup(code.trim()));
  }

  function handleRowClick(rewardId) {
    openReward(() => api.getRewardRedeemCode(rewardId));
  }

  async function handleDistribute() {
    setBusy(true);
    setError('');
    try {
      const res = await api.distributeReward(signedCode);
      setReward((prev) => ({ ...prev, status: 'redeemed', distributedBy: res.distributedBy }));
      loadList();
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
      await api.cancelReward(signedCode);
      setReward((prev) => ({ ...prev, status: 'cancelled' }));
      loadList();
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
      await api.undistributeReward(signedCode);
      setReward((prev) => ({ ...prev, status: 'active', distributedBy: null, distributedAt: null }));
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rewards</h1>
          <p className="page-subtitle">Enter a guest's 8-character code to open their reward</p>
        </div>
      </div>

      <Card className="mt-card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="e.g. K8Q7F3N2"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus
            maxLength={8}
            style={{
              flex: '1 1 180px', minWidth: 0, padding: '11px 14px', border: '1px solid #E2E8F0', borderRadius: 8,
              fontSize: 16, letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase',
            }}
          />
          <Button type="submit" disabled={busy || !code.trim()} style={{ flexShrink: 0 }}>
            {busy ? 'Looking up…' : 'Open reward'}
          </Button>
        </form>
        {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
      </Card>

      {reward && (
        <Card className="mt-card">
          <RewardCard reward={reward} error="" busy={busy} onDistribute={handleDistribute} onCancel={handleCancel} onUndo={handleUndo} />
        </Card>
      )}

      <Card
        title="Rewards history"
        className="mt-card"
        action={
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            style={{ background: 'none', border: 'none', padding: 0, color: '#2563EB', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
          >
            {historyOpen ? 'Collapse ▲' : 'Expand ▼'}
          </button>
        }
      >
        {!historyOpen ? null : !rewards ? <p className="page-subtitle">Loading…</p> : rewards.length === 0 ? (
          <EmptyState title="No rewards yet" />
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Gift</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} onClick={() => handleRowClick(r.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                  <td>{r.gift_name}</td>
                  <td><Badge tone={STATUS_TONE[r.status] || 'neutral'}>{STATUS_LABEL[r.status] || r.status}</Badge></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDT(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
