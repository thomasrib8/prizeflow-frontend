import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Badge, EmptyState, GiftPill } from '../components/ui';

const REWARD_TONE = { active: 'blue', redeemed: 'green', expired: 'orange', cancelled: 'red' };

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export default function History() {
  const [tab, setTab] = useState('distributions');
  const [distributions, setDistributions] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.distributions().then(setDistributions).catch(e => setError(e.message));
    api.rewards().then(setRewards).catch(e => setError(e.message));
  }, []);

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

      <Card>
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
                    <td><GiftPill slotIndex={d.slot_index} name={d.gift_name || `Case ${d.slot_index}`} /></td>
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
                <tr><th>Reward ID</th><th>Name</th><th>Email</th><th>Gift</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rewards.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{r.id}</td>
                    <td style={{ fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.email}</td>
                    <td><GiftPill slotIndex={0} name={r.gift_name} /></td>
                    <td><Badge tone={REWARD_TONE[r.status] || 'neutral'}>{r.status}</Badge></td>
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
