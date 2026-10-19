import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import RewardCard from '../components/RewardCard';
import './crm.css';
import './launch.css';
import './rewards.css';

const AVATARS = [['#0055F8', '#002881'], ['#00B0FF', '#0055F8'], ['#7AA8FF', '#0055F8'], ['#002881', '#0B1437'], ['#1AA864', '#0D9488'], ['#9333EA', '#4F46E5']];
function avatarGradient(seed) {
  let h = 0; for (const ch of String(seed || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = AVATARS[h % AVATARS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
const STATUS_COLOR = { active: '#F59E0B', redeemed: '#059669', expired: '#94A3B8', cancelled: '#EF4444' };
const FILTERS = ['all', 'active', 'redeemed', 'expired', 'cancelled'];

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
  const [filter, setFilter] = useState('all');
  const statusText = (st) => (STATUS_TKEY[st] ? t(`${STATUS_NS[st]}.${STATUS_TKEY[st]}`) : st);
  const countOf = (f) => (rewards || []).filter((r) => f === 'all' || r.status === f).length;
  const shown = (rewards || []).filter((r) => filter === 'all' || r.status === filter);

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
    <div className="ap">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.redeem')}</h1>
          <p className="page-subtitle">{t('rewards.pageSubtitle')}</p>
        </div>
      </div>

      <div className="rw-hero">
        <form onSubmit={handleSubmit} className="rw-form">
          <input
            className="rw-code"
            placeholder={t('rewards.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus
            maxLength={8}
          />
          <Button type="submit" disabled={busy || !code.trim()} style={{ flexShrink: 0 }}>
            {busy ? t('rewards.lookingUpBtn') : t('rewards.openRewardBtn')}
          </Button>
        </form>
        {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
      </div>

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
          <>
            <div className="crm-quick" style={{ marginBottom: 14 }}>
              {FILTERS.map((f) => (
                <button key={f} type="button" className={`crm-qp${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? t('common.statusAll') : statusText(f)} <b>{countOf(f)}</b></button>
              ))}
            </div>
            <div className="crm-list rw-list">
              <div className="crm-head"><span>{t('history.tableName')}</span><span>{t('common.gift')}</span><span>{t('history.tableStatus')}</span><span>{t('history.tableDate')}</span></div>
              {shown.map((r) => {
                const open = () => handleRowClick(r.id);
                return (
                  <div key={r.id} className="crm-row click" style={{ '--c': STATUS_COLOR[r.status] || '#0055F8' }} role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(); }}>
                    <div className="crm-who">
                      <div className="crm-av" style={{ background: avatarGradient(`${r.first_name} ${r.last_name}`) }} aria-hidden="true">{`${(r.first_name || '').charAt(0)}${(r.last_name || '').charAt(0)}` || '?'}</div>
                      <div className="crm-who-text"><span className="crm-name plain" style={{ color: '#002881' }}>{r.first_name} {r.last_name}</span></div>
                    </div>
                    <div className="crm-gift">{r.gift_name ? <div className="crm-gift-name">{r.gift_name}</div> : <div className="crm-gift-none">—</div>}</div>
                    <div className="rw-st"><Badge tone={STATUS_TONE[r.status] || 'neutral'}>{statusText(r.status)}</Badge></div>
                    <div className="rw-date">{formatDT(r.created_at)}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
