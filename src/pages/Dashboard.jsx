import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge, EmptyState, GiftPill, MiniBar } from '../components/ui';
import { useAdmin } from '../hooks/useAdmin';
import EmailQuotaTable from '../components/EmailQuotaTable';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

function EmailQuotaCard() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.getEmailStatus().then(setStatus).catch(() => {});
  }, []);

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">Quota email</h3>
        <span style={{ fontSize: 11, color: 'var(--text-light)' }}>Brevo</span>
      </div>
      <EmailQuotaTable status={status} />
      {status && !status.configured && (
        <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 10 }}>
          Set BREVO_API_KEY (and BREVO_DAILY_QUOTA to track quota usage) to enable this module.
        </p>
      )}
    </div>
  );
}

function EmailHistoryCard() {
  const [log, setLog] = useState(null);

  useEffect(() => {
    api.getEmailLog(20).then(setLog).catch(() => {});
  }, []);

  function formatTimeOnly(s) {
    return new Date(s.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">Historique des emails</h3>
      </div>
      {!log ? (
        <p className="page-subtitle">Loading…</p>
      ) : log.length === 0 ? (
        <EmptyState title="No emails sent" />
      ) : (
        <div className="activity-list">
          {log.map((e) => (
            <div className="activity-item" key={e.id}>
              <div className="act-icon spin">
                <svg viewBox="0 0 24 24" fill="none" stroke={e.status === 'error' ? '#EF4444' : '#2563EB'} strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </div>
              <div className="act-info">
                <div className="act-title">{e.label}</div>
                <div className="act-time">
                  {formatTimeOnly(e.created_at)} · → {e.recipient}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SLOT_COLORS = ['#2563EB','#10B981','#F59E0B','#9333EA','#E11D48','#15803D','#D97706','#4F46E5','#BE185D','#0D9488','#A16207','#7C3AED'];
const CHART_FILTERS = ['7D', '30D', '90D', 'All'];

function StatCard({ label, value, sub, accent, pct }) {
  const bar = pct !== undefined;
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value${accent ? ` accent-${accent}` : ''}`}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{sub}</div>}
      {bar && (
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{
            width: `${Math.min(100, pct)}%`,
            background: accent === 'blue' ? 'var(--blue)' : accent === 'green' ? 'var(--green)' : accent === 'orange' ? 'var(--orange)' : 'var(--text-light)',
          }} />
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#0F172A' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span><span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAdmin();
  const [data, setData] = useState(null);
  const [chart, setChart] = useState([]);
  const [topRewards, setTopRewards] = useState([]);
  const [chartFilter, setChartFilter] = useState('7D');
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch(e => setError(e.message));
    api.dashboardTopRewards().then(setTopRewards).catch(() => {});
  }, []);

  useEffect(() => {
    const days = chartFilter === 'All' ? 'all' : chartFilter.replace('D', '');
    api.dashboardChart(days).then(setChart).catch(() => {});
  }, [chartFilter]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="page-subtitle">Loading…</p>;

  const { kpi, rewards, recentActivity } = data;
  const campaign = kpi?.campaign;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{campaign ? `Welcome back · ${campaign.name}` : 'No active campaign'}</p>
        </div>
        {campaign && <Badge tone="green">Active</Badge>}
      </div>

      {/* 4 KPI cards */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Remaining gifts" value={kpi ? kpi.remaining.toLocaleString() : '—'}
          sub={kpi ? `${Math.round((kpi.remaining/kpi.planned)*100)}% of total` : undefined}
          accent="orange" pct={kpi ? Math.round((kpi.remaining/kpi.planned)*100) : 0} />
        <StatCard label="Gifts distributed" value={kpi ? kpi.distributed.toLocaleString() : '—'}
          sub={kpi ? `${kpi.progressPct}% of total` : undefined}
          accent="blue" pct={kpi?.progressPct} />
        <StatCard label="Campaign progress" value={kpi ? `${kpi.progressPct}%` : '—'}
          sub={kpi ? `${kpi.distributed} / ${kpi.planned} spins` : undefined}
          pct={kpi?.progressPct} />
      </div>

      {/* Chart + Campaign Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Distribution overview chart */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Distribution overview</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {CHART_FILTERS.map(f => (
                <button key={f} onClick={() => setChartFilter(f)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: chartFilter === f ? 'var(--navy, #0F1C3F)' : 'var(--border-light, #F1F5F9)',
                  color: chartFilter === f ? 'white' : 'var(--text-muted)',
                }}>{f}</button>
              ))}
            </div>
          </div>

          {chart.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No data yet — distributions will appear here after your first spins.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="planned" name="Planned" stroke="#CBD5E1"
                  strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="distributed" name="Distributed" stroke="#2563EB"
                  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="remaining" name="Remaining" stroke="#CBD5E1"
                  strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Campaign Summary */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Campaign summary</h3>
          </div>
          {!campaign ? (
            <EmptyState title="No active campaign" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['Campaign', campaign.name],
                  ['Status', <Badge tone="green">Active</Badge>],
                  ['Total spins', campaign.total_stock.toLocaleString()],
                  ['Spins completed', campaign.total_distributed.toLocaleString()],
                  ['Remaining spins', (campaign.total_stock - campaign.total_distributed).toLocaleString()],
                  ['Rewards sent', rewards.sent || 0],
                  ['Redeemed', rewards.used || 0],
                ].map(([label, value], i) => (
                  <tr key={i}>
                    <td style={{ padding: '7px 0', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>{label}</td>
                    <td style={{ padding: '7px 0', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {campaign && (
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <a href="/history" style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
                ↗ View full report
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Top Rewards + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Top Rewards */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Top rewards</h3>
            <a href="/campaigns" style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>View all rewards →</a>
          </div>
          {topRewards.length === 0 ? (
            <EmptyState title="No rewards yet" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reward</th>
                  <th style={{ textAlign: 'right' }}>Planned</th>
                  <th style={{ textAlign: 'right' }}>Distributed</th>
                  <th style={{ textAlign: 'right' }}>Remaining</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {topRewards.map((r, i) => (
                  <tr key={i}>
                    <td><GiftPill slotIndex={r.slotIndex} name={r.giftName} /></td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{r.planned}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.distributed}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{r.remaining}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MiniBar pct={r.pct} color={SLOT_COLORS[r.slotIndex % SLOT_COLORS.length]} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{r.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Recent activity</h3>
            <a href="/history" style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>View all</a>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <div className="activity-list">
              {recentActivity.slice(0, 6).map((row, i) => (
                <div className="activity-item" key={i}>
                  <div className="act-icon spin">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/>
                      <line x1="12" y1="3" x2="12" y2="7"/>
                    </svg>
                  </div>
                  <div className="act-info">
                    <div className="act-title">
                      Gift distributed: {row.gift_name || `Case ${row.slot_index + 1}`}
                    </div>
                    <div className="act-time">
                      {formatTime(row.created_at)}{row.room_number ? ` · Room ${row.room_number}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Admin-only: Brevo email monitoring */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
          <EmailQuotaCard />
          <EmailHistoryCard />
        </div>
      )}
    </div>
  );
}

function formatTime(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}