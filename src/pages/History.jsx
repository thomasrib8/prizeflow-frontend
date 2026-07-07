import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState, GiftPill } from '../components/ui';

const REWARD_TONE = { active: 'blue', redeemed: 'green', expired: 'orange', cancelled: 'red' };

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export default function History() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('distributions');
  const [distributions, setDistributions] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [error, setError] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);

  useEffect(() => {
    api.distributions().then(setDistributions).catch(e => setError(e.message));
    api.rewards().then(setRewards).catch(e => setError(e.message));
  }, []);

  // Manual fallback for when scanning the reward's QR code fails — looks up
  // the same signed redemption code by Reward ID and opens the normal
  // /redeem/:code page (works whether typed by hand or clicked from a row).
  async function openRedeemPage(rewardId) {
    setLookupBusy(true);
    setError('');
    try {
      const { code } = await api.getRewardRedeemCode(rewardId);
      navigate(`/redeem/${code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLookupBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">Full record of distributions and customer rewards</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        <button className={`tab${tab === 'distributions' ? ' active' : ''}`} onClick={() => setTab('distributions')}>Distributions</button>
        <button className={`tab${tab === 'rewards' ? ' active' : ''}`} onClick={() => setTab('rewards')}>Rewards (CRM)</button>
      </div>

      {tab === 'rewards' && (
        <Card className="mt-card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' }}>Scan didn't work?</span>
            <input
              placeholder="Enter Reward ID (e.g. REWARD-00000001)"
              value={lookupId}
              onChange={e => setLookupId(e.target.value)}
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
            />
            <Button disabled={lookupBusy || !lookupId.trim()} onClick={() => openRedeemPage(lookupId.trim())}>
              {lookupBusy ? 'Looking up…' : 'Open redemption page'}
            </Button>
          </div>
        </Card>
      )}

      <Card className={tab === 'rewards' ? 'mt-card' : ''}>
        {tab === 'distributions' && (!distributions ? <p className="page-subtitle">Loading…</p> :
          distributions.length === 0 ? <EmptyState title="No distributions yet" /> : (
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Gift</th><th>Room</th><th>Type</th><th>Operator</th></tr>
              </thead>
              <tbody>
                {distributions.map(d => (
                  <tr key={d.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDT(d.created_at)}</td>
                    <td><GiftPill slotIndex={d.slot_index} name={d.gift_name || `Case ${d.slot_index + 1}`} /></td>
                    <td>{d.room_number || '—'}</td>
                    <td><Badge tone={d.is_demo ? 'neutral' : 'green'}>{d.is_demo ? 'Demo' : 'Real'}</Badge></td>
                    <td style={{ color: 'var(--text-muted)' }}>{d.operator_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'rewards' && (!rewards ? <p className="page-subtitle">Loading…</p> :
          rewards.length === 0 ? <EmptyState title="No rewards yet" /> : (
            <table className="data-table">
              <thead>
                <tr><th>Reward ID</th><th>Name</th><th>Email</th><th>Gift</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rewards.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{r.id}</td>
                    <td style={{ fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.email}</td>
                    <td><GiftPill slotIndex={0} name={r.gift_name} /></td>
                    <td><Badge tone={REWARD_TONE[r.status] || 'neutral'}>{r.status}</Badge></td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={lookupBusy}
                        onClick={() => openRedeemPage(r.id)}
                      >Open →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </Card>
    </div>
  );
}
