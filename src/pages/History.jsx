import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Badge, EmptyState } from '../components/ui';

const REWARD_TONE = { active: 'blue', redeemed: 'green', expired: 'orange', cancelled: 'red' };

export default function History() {
  const [tab, setTab] = useState('distributions');
  const [distributions, setDistributions] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.distributions().then(setDistributions).catch((e) => setError(e.message));
    api.rewards().then(setRewards).catch((e) => setError(e.message));
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
        <button className={`tab${tab === 'distributions' ? ' active' : ''}`} onClick={() => setTab('distributions')}>
          Distributions
        </button>
        <button className={`tab${tab === 'rewards' ? ' active' : ''}`} onClick={() => setTab('rewards')}>
          Rewards (CRM)
        </button>
      </div>

      <Card>
        {tab === 'distributions' &&
          (!distributions ? (
            <p className="page-subtitle">Loading…</p>
          ) : distributions.length === 0 ? (
            <EmptyState title="No distributions yet" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Gift</th>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => (
                  <tr key={d.id}>
                    <td>{new Date(d.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</td>
                    <td>{d.gift_name || `Case ${d.slot_index}`}</td>
                    <td>{d.room_number || '—'}</td>
                    <td>
                      <Badge tone={d.is_demo ? 'neutral' : 'green'}>{d.is_demo ? 'Demo' : 'Real'}</Badge>
                    </td>
                    <td>{d.operator_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {tab === 'rewards' &&
          (!rewards ? (
            <p className="page-subtitle">Loading…</p>
          ) : rewards.length === 0 ? (
            <EmptyState title="No rewards yet" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reward ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Gift</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.id}</td>
                    <td>
                      {r.first_name} {r.last_name}
                    </td>
                    <td>{r.email}</td>
                    <td>{r.gift_name}</td>
                    <td>
                      <Badge tone={REWARD_TONE[r.status] || 'neutral'}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </Card>
    </div>
  );
}
