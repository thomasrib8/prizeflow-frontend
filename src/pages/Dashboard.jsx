import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Stat, Badge, EmptyState, GiftPill, MiniBar } from '../components/ui';

const SLOT_COLORS = ['var(--blue)','var(--green)','var(--orange)','var(--purple)','#E11D48','#15803D','#D97706','#4F46E5','#BE185D','#0D9488','#A16207','#7C3AED'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.dashboard().then(d => !cancelled && setData(d)).catch(e => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="page-subtitle">Loading…</p>;

  const { kpi, rewards, recentActivity } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{kpi ? kpi.campaign.name + ' — in progress' : 'No active campaign'}</p>
        </div>
      </div>

      {kpi ? (
        <>
          <div className="grid-stats">
            <Card><Stat label="Gifts planned" value={kpi.planned.toLocaleString()} pct={100} /></Card>
            <Card><Stat label="Distributed" value={kpi.distributed.toLocaleString()} accent="blue" pct={kpi.progressPct} /></Card>
            <Card><Stat label="Remaining" value={kpi.remaining.toLocaleString()} accent="orange" pct={Math.round((kpi.remaining/kpi.planned)*100)} /></Card>
            <Card><Stat label="Progress" value={`${kpi.progressPct}%`} accent="green" pct={kpi.progressPct} /></Card>
          </div>

          <div className="dash-row">
            <Card title="Gift distribution">
              {kpi.campaign.slots && kpi.campaign.slots.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Gift</th>
                      <th>Stock</th>
                      <th>Left</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpi.campaign.slots.map(s => {
                      const pct = s.stock_initial ? Math.round(((s.stock_initial - s.stock_remaining) / s.stock_initial) * 100) : 0;
                      return (
                        <tr key={s.slot_index}>
                          <td><GiftPill slotIndex={s.slot_index} name={s.gift_name} /></td>
                          <td style={{ color: 'var(--text-muted)' }}>{s.stock_initial}</td>
                          <td style={{ fontWeight: 600 }}>{s.stock_remaining}</td>
                          <td><MiniBar pct={pct} color={SLOT_COLORS[s.slot_index % SLOT_COLORS.length]} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="campaign-summary">
                  <div>
                    <div className="campaign-name">{kpi.campaign.name}</div>
                    <div className="campaign-meta">Created {formatDate(kpi.campaign.created_at)}</div>
                  </div>
                  <Badge tone="green">{kpi.campaign.status}</Badge>
                </div>
              )}
            </Card>

            <Card title="Rewards">
              <div className="reward-stats">
                <Stat label="Sent" value={rewards.sent || 0} />
                <Stat label="Redeemed" value={rewards.used || 0} accent="green" />
                <Stat label="Recovery" value={`${rewards.recoveryRatePct}%`} accent="blue" />
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="mt-card">
          <EmptyState title="No active campaign" description="Start a campaign from the Campaigns page to see KPIs here." />
        </Card>
      )}

      <Card title="Recent activity" className="mt-card">
        {recentActivity.length === 0 ? (
          <EmptyState title="No distributions yet" />
        ) : (
          <div className="activity-list">
            {recentActivity.map((row, i) => (
              <div className="activity-item" key={i}>
                <div className="act-icon spin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/><line x1="12" y1="3" x2="12" y2="7"/></svg>
                </div>
                <div className="act-info">
                  <div className="act-title">Gift distributed — {row.gift_name || `Case ${row.slot_index}`}</div>
                  <div className="act-time">{formatTime(row.created_at)}{row.room_number ? ` · Room ${row.room_number}` : ''}{row.first_name ? ` · ${row.first_name} ${row.last_name}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
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
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}
