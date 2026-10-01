import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import RewardCard from '../components/RewardCard';

const STATUS_TONE = { active: 'orange', redeemed: 'green', expired: 'neutral', cancelled: 'red' };
const STATUS_TKEY = { active: 'statusToDistribute', redeemed: 'statusDistributed', expired: 'rewardStatusExpired', cancelled: 'rewardStatusCancelled' };
const STATUS_NS = { active: 'rewards', redeemed: 'rewards', expired: 'history', cancelled: 'history' };

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
  const { t } = useTranslation('admin');
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
          <h1 className="page-title">{t('nav.redeem')}</h1>
          <p className="page-subtitle">{t('rewards.pageSubtitle')}</p>
        </div>
      </div>

      <Card className="mt-card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder={t('rewards.codePlaceholder')}
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
            {busy ? t('rewards.lookingUpBtn') : t('rewards.openRewardBtn')}
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
        title={t('rewards.historyTitle')}
        className="mt-card"
        action={
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            style={{ background: 'none', border: 'none', padding: 0, color: '#002881', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
          >
            {historyOpen ? t('rewards.collapseBtn') : t('rewards.expandBtn')}
          </button>
        }
      >
        {!historyOpen ? null : !rewards ? <p className="page-subtitle">{t('common.loading')}</p> : rewards.length === 0 ? (
          <EmptyState title={t('history.noRewardsYet')} />
        ) : (
          <table className="data-table">
            <thead><tr><th>{t('history.tableName')}</th><th>{t('common.gift')}</th><th>{t('history.tableStatus')}</th><th>{t('history.tableDate')}</th></tr></thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} onClick={() => handleRowClick(r.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                  <td>{r.gift_name}</td>
                  <td><Badge tone={STATUS_TONE[r.status] || 'neutral'}>{STATUS_TKEY[r.status] ? t(`${STATUS_NS[r.status]}.${STATUS_TKEY[r.status]}`) : r.status}</Badge></td>
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
