import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

/// Admin-only "Sequence" tool reviving the old standalone webapp's feature:
/// build a custom run order by hand (spin the real wheel, click Add for
/// whichever case the live cleat lands on, repeat), save it, then activate
/// whichever saved sequence should run on the wheel. Fully independent from
/// campaigns/guestQueue.js — this never touches guest data, distributions,
/// or rewards; see adminSequence.js for the runner.
export default function SequenceBuilder() {
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [steps, setSteps] = useState([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [sequences, setSequences] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const posAngle = posToAngle(wheelStatus?.currentPos ?? 0);
  const currentCase = Math.floor((((posAngle % 360) + 360) % 360) / 30); // 0-11

  function loadSequences() {
    api.listAdminSequences().then(setSequences).catch((e) => setError(e.message));
  }
  function loadStatus() {
    api.getAdminSequenceStatus().then(setStatus).catch(() => {});
  }

  useEffect(() => {
    loadSequences();
    loadStatus();
    const id = setInterval(loadStatus, 4000);
    return () => clearInterval(id);
  }, []);

  function handleAddStep() {
    setSteps((prev) => [...prev, currentCase]);
  }

  function handleRemoveStep(index) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim() || steps.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await api.createAdminSequence(name.trim(), steps);
      setName('');
      setSteps([]);
      loadSequences();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id) {
    setBusyId(id);
    setError('');
    try {
      await api.activateAdminSequence(id);
      loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleStop() {
    setBusyId('stop');
    setError('');
    try {
      await api.stopAdminSequence();
      loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    setBusyId(id);
    setError('');
    try {
      await api.deleteAdminSequence(id);
      loadSequences();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sequence</h1>
          <p className="page-subtitle">Build a custom run order by hand, then activate it on the wheel</p>
        </div>
        {status?.active ? (
          <Badge tone="orange">Running: {status.name} ({status.position}/{status.steps.length})</Badge>
        ) : (
          <Badge tone="neutral">Idle</Badge>
        )}
      </div>

      {!agentConnected && (
        <div className="error-banner" style={{ marginBottom: 12 }}>Wheel agent is not connected.</div>
      )}
      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

      <Card title="Build a new sequence" className="mt-card">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <WheelSVG positionAngle={posAngle} size={200} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 10px' }}>
              Spin the wheel by hand, then click Add to append whichever case the cleat lands on.
            </p>
            <Button variant="ghost" onClick={handleAddStep} disabled={!agentConnected}>
              Add Case {currentCase + 1}
            </Button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Steps ({steps.length})
          </div>
          {steps.length === 0 ? (
            <p className="page-subtitle" style={{ margin: 0 }}>No steps added yet.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {steps.map((s, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF', color: '#2563EB',
                  fontWeight: 700, fontSize: 13, padding: '5px 6px 5px 12px', borderRadius: 20,
                }}>
                  {s + 1}
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(i)}
                    style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Sequence name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: 0, padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
          />
          <Button onClick={handleSave} disabled={saving || !name.trim() || steps.length === 0}>
            {saving ? 'Saving…' : 'Save sequence'}
          </Button>
        </div>
      </Card>

      <Card title="Saved sequences" className="mt-card">
        {!sequences ? (
          <p className="page-subtitle">Loading…</p>
        ) : sequences.length === 0 ? (
          <EmptyState title="No sequences saved yet" />
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Steps</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {sequences.map((seq) => {
                const isActive = status?.active && status.sequenceId === seq.id;
                return (
                  <tr key={seq.id}>
                    <td style={{ fontWeight: 500 }}>{seq.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{seq.steps.map((s) => s + 1).join(', ')}</td>
                    <td>
                      {isActive
                        ? <Badge tone="orange">Running ({status.position}/{status.steps.length})</Badge>
                        : <Badge tone="neutral">Idle</Badge>}
                    </td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      {isActive ? (
                        <Button size="sm" variant="ghost" disabled={busyId === 'stop'} onClick={handleStop}>
                          {busyId === 'stop' ? 'Stopping…' : 'Stop'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === seq.id || !agentConnected || status?.active}
                          onClick={() => handleActivate(seq.id)}
                        >
                          {busyId === seq.id ? 'Activating…' : 'Activate'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === seq.id || isActive}
                        onClick={() => handleDelete(seq.id)}
                        style={{ color: '#EF4444' }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
