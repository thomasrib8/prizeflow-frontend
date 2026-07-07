import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Stat, Badge, EmptyState } from '../components/ui';

function formatDT(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
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
          <h1 className="page-title">Santé de l'application</h1>
          <p className="page-subtitle">Utilisation, erreurs récentes et état des services</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!health && !error && <p className="page-subtitle">Loading…</p>}

      {health && (
        <>
          <div className="grid-stats mt-card">
            <div className="card"><Stat label="Actifs aujourd'hui" value={health.activeUsers.today} accent="blue" /></div>
            <div className="card"><Stat label="Actifs sur 7 jours" value={health.activeUsers.last7Days} accent="blue" /></div>
            <div className="card"><Stat label="Actifs sur 30 jours" value={health.activeUsers.last30Days} accent="blue" /></div>
            <div className="card">
              <Stat
                label="Temps de réponse moyen"
                value={health.avgResponseTimeMs !== null ? `${health.avgResponseTimeMs} ms` : '—'}
                accent="green"
              />
            </div>
          </div>

          <Card title="Statut des services" className="mt-card">
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>{health.serviceStatus.note}</p>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Render</span>
                <Badge tone="neutral">{health.serviceStatus.render}</Badge>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Netlify</span>
                <Badge tone="neutral">{health.serviceStatus.netlify}</Badge>
              </div>
            </div>
          </Card>

          <Card title="Erreurs backend récentes" className="mt-card">
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
              Capturées en mémoire depuis le dernier redémarrage du serveur — pas encore d'outil externe (type Sentry) branché.
            </p>
            {health.recentErrors.length === 0 ? (
              <EmptyState title="Aucune erreur récente" />
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
