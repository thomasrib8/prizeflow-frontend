import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Badge, GiftPill, MiniBar } from '../components/ui';

const STATUS_TONE = { draft: 'neutral', active: 'green', paused: 'orange', completed: 'blue', archived: 'neutral' };
const SLOT_COLORS = ['var(--blue)','var(--green)','var(--orange)','var(--purple)','#E11D48','#15803D','#D97706','#4F46E5','#BE185D','#0D9488','#A16207','#7C3AED'];

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.getCampaign(id).then(setCampaign).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);

  async function runAction(fn) {
    setBusy(true);
    setError('');
    try { await fn(); load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!campaign) return <p className="page-subtitle">{error || 'Loading…'}</p>;
  const total = campaign.total_stock || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{campaign.name}</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{campaign.id}</span>
            <Badge tone={STATUS_TONE[campaign.status] || 'neutral'}>{campaign.status}</Badge>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {campaign.status === 'draft' && <Button disabled={busy} onClick={() => runAction(() => api.startCampaign(campaign.id))}>Start campaign</Button>}
          {campaign.status === 'active' && <>
            <Button variant="secondary" disabled={busy} onClick={() => runAction(() => api.pauseCampaign(campaign.id))}>Pause</Button>
            <Button variant="danger" disabled={busy} onClick={() => runAction(() => api.endCampaign(campaign.id))}>End campaign</Button>
            <Button onClick={() => navigate('/launch')}>Go to Launch →</Button>
          </>}
          {campaign.status === 'paused' && <Button disabled={busy} onClick={() => runAction(() => api.startCampaign(campaign.id))}>Resume</Button>}
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <Card title="Gift distribution">
        <table className="data-table">
          <thead>
            <tr><th>Case</th><th>Gift</th><th>Stock</th><th>%</th><th>Remaining</th><th>Progress</th></tr>
          </thead>
          <tbody>
            {campaign.slots.map(s => {
              const pct = s.stock_initial ? Math.round(((s.stock_initial - s.stock_remaining) / s.stock_initial) * 100) : 0;
              return (
                <tr key={s.slot_index}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{s.slot_index}</td>
                  <td><GiftPill slotIndex={s.slot_index} name={s.gift_name} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.stock_initial}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{((s.stock_initial / total) * 100).toFixed(1)}%</td>
                  <td style={{ fontWeight: 600 }}>{s.stock_remaining}</td>
                  <td><MiniBar pct={pct} color={SLOT_COLORS[s.slot_index % SLOT_COLORS.length]} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
