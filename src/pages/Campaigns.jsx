import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';

const STATUS_TONE = { draft: 'neutral', active: 'green', paused: 'orange', completed: 'blue', archived: 'neutral' };

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.listCampaigns().then(setCampaigns).catch(e => setError(e.message));
  }, []);

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
      <Card>
        {!campaigns ? (
          <p className="page-subtitle">Loading…</p>
        ) : campaigns.length === 0 ? (
          <EmptyState title="No campaigns yet" description="Create your first campaign to configure gifts and stock."
            action={<Button onClick={() => navigate('/campaigns/new')}>+ New campaign</Button>} />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Status</th><th>Distributed / Total</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
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
