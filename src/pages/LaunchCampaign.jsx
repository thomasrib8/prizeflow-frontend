import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import ResultOverlay from '../components/ResultOverlay';

export default function LaunchCampaign() {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomNumber, setRoomNumber] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { distributionId, slotIndex, giftName, roomNumber, demo }
  const { agentConnected } = useWheelSocket();

  function loadActiveCampaign() {
    setLoading(true);
    api
      .listCampaigns()
      .then((all) => {
        const active = all.find((c) => c.status === 'active') || null;
        if (!active) {
          setCampaign(null);
          setLoading(false);
          return;
        }
        // Load full campaign detail to get slots
        return api.getCampaign(active.id).then(setCampaign);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadActiveCampaign, []);

  async function handleSpin() {
    setError('');
    setSpinning(true);
    try {
      const res = await api.spinCampaign(roomNumber.trim() || undefined);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSpinning(false);
    }
  }

  function handleCloseResult() {
    setResult(null);
    setRoomNumber('');
    loadActiveCampaign();
  }

  if (loading) return <p className="page-subtitle">Loading…</p>;

  if (!campaign) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Launch Campaign</h1>
            <p className="page-subtitle">Operate the wheel for the active campaign</p>
          </div>
        </div>
        <Card>
          <EmptyState
            title="No active campaign"
            description="Start a campaign from the Campaigns page before launching spins."
          />
        </Card>
      </div>
    );
  }

  const remaining = (campaign.slots || []).reduce((sum, s) => sum + s.stock_remaining, 0);
  const progressPct = campaign.total_stock
    ? Math.round((campaign.total_distributed / campaign.total_stock) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Launch Campaign</h1>
          <p className="page-subtitle">{campaign.name}</p>
        </div>
        <Badge tone={agentConnected ? 'green' : 'red'}>{agentConnected ? 'Wheel ready' : 'Wheel offline'}</Badge>
      </div>

      <div className="grid-stats">
        <Card><div className="stat"><div className="stat-label">Distributed</div><div className="stat-value accent-blue">{campaign.total_distributed}</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Remaining</div><div className="stat-value accent-orange">{remaining}</div></div></Card>
        <Card><div className="stat"><div className="stat-label">Progress</div><div className="stat-value accent-green">{progressPct}%</div></div></Card>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Card title="Spin the wheel" className="launch-card">
        <p className="launch-hint">
          Leave Room Number empty for a free demo spin (nothing is counted). Fill it in to attribute
          the next campaign gift to a guest.
        </p>
        <div className="launch-controls">
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Room Number (optional)</label>
            <input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 215"
              disabled={spinning}
            />
          </div>
          <Button onClick={handleSpin} disabled={spinning || !agentConnected}>
            {spinning ? 'Spinning…' : 'START SPIN'}
          </Button>
        </div>
      </Card>

      {result && <ResultOverlay result={result} onClose={handleCloseResult} />}
    </div>
  );
}
