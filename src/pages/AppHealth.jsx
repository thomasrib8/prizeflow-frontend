import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Stat, Badge, EmptyState } from '../components/ui';
import EmailQuotaTable from '../components/EmailQuotaTable';

function formatDT(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
}

const SERVICE_TONE = { operational: 'green', degraded: 'orange', outage: 'red', unknown: 'neutral' };
const SERVICE_LABEL = { operational: 'Operational', degraded: 'Degraded', outage: 'Outage', unknown: 'Unknown' };

// Thresholds requested for the quota alert: green under 70%, orange past 80%,
// red past 95% — mirrors emailStatus.js's quotaAlertTone computed server-side
// (kept here only for the icon/wording, the tone itself is authoritative
// from the backend).
const QUOTA_TONE_ICON = { green: '🟢', orange: '🟠', red: '🔴' };
const QUOTA_TONE_BADGE = { green: 'green', orange: 'orange', red: 'red' };

// Generic "State" + custom rows table for a quota-checked provider (Hunter,
// Bouncer) — same row-table look as EmailQuotaTable, but the two providers'
// data shapes differ too much to share that component directly. `hasData`
// tells apart "configured and the check succeeded" from "configured but the
// quota check itself failed" (bad key, network) — both are distinct from
// "not configured at all".
function ProviderQuotaTable({ status, hasData, rows }) {
  const connected = status?.configured && hasData(status);
  const state = !status
    ? { icon: '⚪', label: '—' }
    : !status.configured
    ? { icon: '⚪', label: 'Not configured' }
    : connected
    ? { icon: '🟢', label: 'Connected' }
    : { icon: '🟠', label: "Couldn't check" };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        <tr>
          <td style={{ padding: '7px 0', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>State</td>
          <td style={{ padding: '7px 0', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>
            {state.icon} {state.label}
          </td>
        </tr>
        {connected && rows(status).map(([label, value], i) => (
          <tr key={i}>
            <td style={{ padding: '7px 0', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>{label}</td>
            <td style={{ padding: '7px 0', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ServiceBadge({ name, status }) {
  const tone = SERVICE_TONE[status?.tone] || 'neutral';
  const label = SERVICE_LABEL[status?.tone] || 'Unknown';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
      <Badge tone={tone}>{label}</Badge>
      {status?.description && <span style={{ fontSize: 12, color: '#94A3B8' }}>{status.description}</span>}
    </div>
  );
}

export default function AppHealth() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAppHealth().then(setHealth).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">App Health</h1>
          <p className="page-subtitle">Usage, recent errors, and service status</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!health && !error && <p className="page-subtitle">Loading…</p>}

      {health && (
        <>
          <div className="grid-stats mt-card">
            <div className="card"><Stat label="Active today" value={health.activeUsers.today} accent="blue" /></div>
            <div className="card"><Stat label="Active over 7 days" value={health.activeUsers.last7Days} accent="blue" /></div>
            <div className="card"><Stat label="Active over 30 days" value={health.activeUsers.last30Days} accent="blue" /></div>
            <div className="card">
              <Stat
                label="Average response time"
                value={health.avgResponseTimeMs !== null ? `${health.avgResponseTimeMs} ms` : '—'}
                accent="green"
              />
            </div>
          </div>

          <Card title="Service status" className="mt-card">
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
              Read directly from Render's and Netlify's public status pages.
            </p>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', rowGap: 12 }}>
              <ServiceBadge name="Render" status={health.serviceStatus.render} />
              <ServiceBadge name="Netlify" status={health.serviceStatus.netlify} />
            </div>
          </Card>

          <Card title="Email quota" className="mt-card" action={<span style={{ fontSize: 11, color: '#94A3B8' }}>Brevo</span>}>
            <EmailQuotaTable status={health.emailStatus} />
          </Card>

          <Card title="Email finding quota" className="mt-card" action={<span style={{ fontSize: 11, color: '#94A3B8' }}>Hunter.io</span>}>
            <ProviderQuotaTable
              status={health.apiQuotaStatus?.hunter}
              hasData={(s) => !!(s.searches || s.credits || s.planName)}
              rows={(s) => [
                ['Plan', s.planName || '—'],
                s.searches
                  ? ['Searches', `${s.searches.used.toLocaleString()} / ${s.searches.available.toLocaleString()} (${s.searches.remaining.toLocaleString()} left)`]
                  : s.credits
                  ? ['Credits', `${s.credits.used.toLocaleString()} / ${s.credits.available.toLocaleString()} (${s.credits.remaining.toLocaleString()} left)`]
                  : ['Searches', '—'],
                ['Resets', s.resetDate || '—'],
              ]}
            />
          </Card>

          <Card title="Verification quota" className="mt-card" action={<span style={{ fontSize: 11, color: '#94A3B8' }}>Bouncer</span>}>
            <ProviderQuotaTable
              status={health.apiQuotaStatus?.bouncer}
              hasData={(s) => s.credits != null}
              rows={(s) => [
                ['Credits remaining', s.credits != null ? s.credits.toLocaleString() : '—'],
              ]}
            />
          </Card>

          {health.emailStatus?.quotaPercentUsed !== null && health.emailStatus?.quotaPercentUsed !== undefined && (
            <Card title="Brevo alerts" className="mt-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: health.emailStatus.quotaAlertTone !== 'green' ? 10 : 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {QUOTA_TONE_ICON[health.emailStatus.quotaAlertTone]} Email quota
                </span>
                <Badge tone={QUOTA_TONE_BADGE[health.emailStatus.quotaAlertTone] || 'neutral'}>
                  {health.emailStatus.quotaPercentUsed}% used
                </Badge>
              </div>
              {health.emailStatus.quotaAlertTone !== 'green' && (
                <p style={{
                  fontSize: 13, margin: 0, padding: '10px 14px', borderRadius: 8,
                  background: health.emailStatus.quotaAlertTone === 'red' ? '#FEF2F2' : '#FFFBEB',
                  color: health.emailStatus.quotaAlertTone === 'red' ? '#991B1B' : '#92400E',
                }}>
                  Warning: your Brevo quota is almost reached. The next emails may not be sent.
                </p>
              )}
            </Card>
          )}

          <Card title="Recent backend errors" className="mt-card">
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
              {health.sentryEnabled
                ? 'Sent to Sentry for persistent tracking (with alerts) — the list below stays a quick in-memory view since the last restart.'
                : "Captured in memory since the server's last restart — no external tool (e.g. Sentry) wired up yet."}
            </p>
            {health.recentErrors.length === 0 ? (
              <EmptyState title="No recent errors" />
            ) : (
              <table className="data-table">
                <thead><tr><th>Message</th><th>Route</th><th>Date</th></tr></thead>
                <tbody>
                  {health.recentErrors.map((e, i) => (
                    <tr key={i}>
                      <td>{e.message}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.method} {e.path}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDT(e.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
