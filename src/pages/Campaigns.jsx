import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';

const STATUS_TONE = { draft: 'neutral', active: 'green', paused: 'orange', completed: 'blue', archived: 'neutral' };
const STATUS_FILTERS = ['all', 'draft', 'active', 'paused', 'completed', 'archived'];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.listCampaigns().then(setCampaigns).catch(e => setError(e.message));
  }, []);

  const filtered = campaigns?.filter(c => statusFilter === 'all' || c.status === statusFilter) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Create and manage your promotional campaigns</p>
        </div>
        <Button onClick={() => navigate('/campaigns/new')}>+ New campaign</Button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {campaigns && campaigns.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              background: statusFilter === f ? '#0F1C3F' : '#F1F5F9',
              color: statusFilter === f ? 'white' : '#64748B',
            }}>{f}</button>
          ))}
        </div>
      )}

      <Card>
        {!campaigns ? (
          <p className="page-subtitle">Loading…</p>
        ) : campaigns.length === 0 ? (
          <EmptyState title="No campaigns yet" description="Create your first campaign to configure gifts and stock."
            action={<Button onClick={() => navigate('/campaigns/new')}>+ New campaign</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState title={`No ${statusFilter} campaigns`} description="Try a different filter." />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Status</th><th>Distributed / Total</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{c.id}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><Badge tone={STATUS_TONE[c.status] || 'neutral'}>{c.status}</Badge></td>
                  <td>{c.total_distributed} / {c.total_stock}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</td>
                  <td><Link to={`/campaigns/${c.id}`} className="btn btn-ghost btn-sm">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
