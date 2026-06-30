import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.getCampaign(id).then(setCampaign).catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  async function runAction(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !campaign) return <div className="error-banner">{error}</div>;
  if (!campaign) return <p className="page-subtitle">Loading…</p>;

  const total = campaign.total_stock || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{campaign.name}</h1>
          <p className="page-subtitle">
            {campaign.id} · <Badge tone="blue">{campaign.status}</Badge>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {campaign.status === 'draft' && (
            <Button disabled={busy} onClick={() => runAction(() => api.startCampaign(campaign.id))}>
              Start campaign
            </Button>
          )}
          {campaign.status === 'active' && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => runAction(() => api.pauseCampaign(campaign.id))}>
                Pause
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => runAction(() => api.endCampaign(campaign.id))}>
                End campaign
              </Button>
            </>
          )}
          {campaign.status === 'paused' && (
            <Button disabled={busy} onClick={() => runAction(() => api.startCampaign(campaign.id))}>
              Resume
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button onClick={() => navigate('/launch')}>Go to Launch →</Button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Card title="Gift distribution">
        <table className="data-table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Gift</th>
              <th>Stock</th>
              <th>%</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {campaign.slots.map((s) => (
              <tr key={s.slot_index}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{s.slot_index}</td>
                <td style={{ fontWeight: 600 }}>{s.gift_name}</td>
                <td>{s.stock_initial}</td>
                <td>{((s.stock_initial / total) * 100).toFixed(1)}%</td>
                <td>{s.stock_remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
