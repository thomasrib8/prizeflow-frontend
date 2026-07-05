import { useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';

const ACTIONS = [
  { command: 'Cal', label: 'Start calibration' },
  { command: 'CalIndex0', label: 'Confirm index 0' },
  { command: 'CalIndex1', label: 'Confirm index 1' },
  { command: 'Free', label: 'Freewheel / stop' },
];

export default function Calibration() {
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);

  async function send(command) {
    setError('');
    setPending(command);
    try { await api.wheelCommand(command); } catch (e) { setError(e.message); } finally { setPending(null); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calibration</h1>
          <p className="page-subtitle">Same calibration routine as the existing wheel app</p>
        </div>
        <Badge tone={agentConnected ? 'green' : 'red'}>{agentConnected ? 'Wheel connected' : 'Wheel offline'}</Badge>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <Card title="Wheel status">
        <table className="data-table">
          <tbody>
            <tr><td style={{ color: 'var(--text-muted)', width: 160 }}>State</td><td>{wheelStatus?.state || '—'}</td></tr>
            <tr><td style={{ color: 'var(--text-muted)' }}>Calibration state</td><td>{wheelStatus?.calState || '—'}</td></tr>
            <tr><td style={{ color: 'var(--text-muted)' }}>Current index</td><td>{wheelStatus?.currentIndex ?? '—'}</td></tr>
            <tr><td style={{ color: 'var(--text-muted)' }}>Target index</td><td>{wheelStatus?.targetIndex ?? '—'}</td></tr>
            <tr><td style={{ color: 'var(--text-muted)' }}>Position</td><td>{wheelStatus?.currentPos ?? '—'}</td></tr>
          </tbody>
        </table>
      </Card>

      <Card title="Calibration actions" className="mt-card">
        <div className="cal-actions">
          {ACTIONS.map(a => (
            <Button key={a.command} variant="secondary" disabled={!agentConnected || pending === a.command}
              onClick={() => send(a.command)}>
              {pending === a.command ? '…' : a.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card title="Test rotation" className="mt-card">
        <p className="launch-hint">Force the wheel to a specific case to verify rotation and stop accuracy.</p>
        <div className="cal-actions">
          {Array.from({ length: 12 }, (_, i) => (
            <Button key={i} variant="secondary" disabled={!agentConnected || pending === `Run;${i}`}
              onClick={() => send(`Run;${i}`)}>
              {pending === `Run;${i}` ? '…' : `Case ${i}`}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
