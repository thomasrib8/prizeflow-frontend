import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Stat, Badge, EmptyState } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .dashboard()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="page-subtitle">Loading…</p>;

  const { kpi, rewards, recentActivity } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your wheel operations</p>
        </div>
      </div>

      {kpi ? (
        <>
          <div className="grid-stats">
            <Card><Stat label="Gifts planned" value={kpi.planned} /></Card>
            <Card><Stat label="Gifts distributed" value={kpi.distributed} accent="blue" /></Card>
            <Card><Stat label="Gifts remaining" value={kpi.remaining} accent="orange" /></Card>
            <Card><Stat label="Progress" value={`${kpi.progressPct}%`} accent="green" /></Card>
          </div>

          <div className="dash-row">
            <Card title="Active campaign">
              <div className="campaign-summary">
                <div>
                  <div className="campaign-name">{kpi.campaign.name}</div>
                  <div className="campaign-meta">
                    Created {formatDate(kpi.campaign.created_at)}
                  </div>
                </div>
                <Badge tone="green">{kpi.campaign.status}</Badge>
              </div>
            </Card>

            <Card title="Rewards">
              <div className="reward-stats">
                <Stat label="Sent" value={rewards.sent || 0} />
                <Stat label="Redeemed" value={rewards.used || 0} accent="green" />
                <Stat label="Recovery rate" value={`${rewards.recoveryRatePct}%`} accent="blue" />
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <EmptyState
            title="No active campaign"
            description="Start a campaign from the Campaigns page to see KPIs here."
          />
        </Card>
      )}

      <Card title="Recent activity" className="mt-card">
        {recentActivity.length === 0 ? (
          <EmptyState title="No distributions yet" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Gift</th>
                <th>Client</th>
                <th>Room</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((row, i) => (
                <tr key={i}>
                  <td>{formatTime(row.created_at)}</td>
                  <td>{row.gift_name || '—'}</td>
                  <td>{row.first_name ? `${row.first_name} ${row.last_name}` : '—'}</td>
                  <td>{row.room_number || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function formatDate(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString();
}
function formatTime(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
