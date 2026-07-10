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
///
/// Two modules: Library (pick a saved sequence and run it) and Settings
/// (build/delete sequences). Activating opens a live-progress popup mirroring
/// Calibration.jsx's modal — wheel + cleat, a row of step bubbles that fill
/// in as the sequence advances, and the currently-forced case highlighted on
/// the wheel the same way Magic.jsx does. It closes on its own once the
/// sequence finishes (or gets stopped) and the wheel is back to Free.

function StepBubbles({ steps, position, active }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
      {steps.map((caseIndex, i) => {
        const done = i < position;
        const current = active && i === position;
        return (
          <div key={i} style={{
            width: 34, height: 34, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, transition: 'all 0.3s',
            background: done ? '#0F1C3F' : current ? '#FFFBEB' : 'white',
            color: done ? 'white' : current ? '#F59E0B' : '#94A3B8',
            border: current ? '2px solid #F59E0B' : '2px solid #CBD5E1',
          }}>
            {caseIndex + 1}
          </div>
        );
      })}
    </div>
  );
}

function SequenceRunModal({ sequence, wheelStatus, agentConnected, status, busyId, onStop, onClose }) {
  const posAngle = posToAngle(wheelStatus?.currentPos ?? 0);
  const isRunningThis = !!status?.active && status.sequenceId === sequence.id;
  const steps = isRunningThis ? status.steps : sequence.steps;
  const position = isRunningThis ? status.position : steps.length;
  const targetIndex = isRunningThis && position < steps.length ? steps[position] : null;

  // Auto-close once this sequence is no longer the active one (natural
  // completion, or stopped from elsewhere) — brief pause so the operator
  // sees the final checked-off bubble before landing back on the library.
  useEffect(() => {
    if (isRunningThis) return undefined;
    const t = setTimeout(onClose, 900);
    return () => clearTimeout(t);
  }, [isRunningThis]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '32px 40px', width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.3)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sequence</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0', color: '#0F172A' }}>{sequence.name}</h2>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#94A3B8', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {!agentConnected && (
          <div className="error-banner" style={{ margin: '10px 0' }}>Wheel agent is not connected.</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0' }}>
          <WheelSVG positionAngle={posAngle} size={220} highlightSection={targetIndex} />
        </div>

        {isRunningThis ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 18 }}>
            ⟳ Forcing Case {targetIndex + 1} — spin the wheel now ({position + 1}/{steps.length})
          </div>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 18 }}>
            ✓ Sequence complete — wheel is free
          </div>
        )}

        <StepBubbles steps={steps} position={position} active={isRunningThis} />

        <div style={{ marginTop: 26 }}>
          <Button variant="ghost" disabled={!isRunningThis || busyId === 'stop'} onClick={onStop} style={{ color: '#EF4444' }}>
            {busyId === 'stop' ? 'Stopping…' : 'Stop sequence'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LibraryModule({ sequences, status, agentConnected, busyId, onActivate, onStop, onView }) {
  if (!sequences) return <p className="page-subtitle">Loading…</p>;
  if (sequences.length === 0) {
    return <EmptyState title="No sequences yet" description="Build one in the Settings tab first." />;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginTop: 20 }}>
      {sequences.map((seq) => {
        const isActive = status?.active && status.sequenceId === seq.id;
        return (
          <Card key={seq.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: seq.description ? 6 : 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0F172A' }}>{seq.name}</h3>
              {isActive
                ? <Badge tone="orange">Running ({status.position}/{status.steps.length})</Badge>
                : <Badge tone="neutral">Ready</Badge>}
            </div>
            {seq.description && (
              <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px', lineHeight: 1.5 }}>{seq.description}</p>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {seq.steps.map((s, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {s + 1}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isActive ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => onView(seq)}>View</Button>
                  <Button size="sm" variant="ghost" disabled={busyId === 'stop'} onClick={onStop} style={{ color: '#EF4444' }}>
                    {busyId === 'stop' ? 'Stopping…' : 'Stop'}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="success"
                  disabled={busyId === seq.id || !agentConnected || status?.active}
                  onClick={() => onActivate(seq)}
                >
                  {busyId === seq.id ? 'Activating…' : 'Activate'}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function SettingsModule({ wheelStatus, agentConnected, sequences, busyId, saving, isSeqActive, onSave, onDelete }) {
  const [steps, setSteps] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const posAngle = posToAngle(wheelStatus?.currentPos ?? 0);
  const currentCase = Math.floor((((posAngle % 360) + 360) % 360) / 30); // 0-11

  function handleAddStep() {
    setSteps((prev) => [...prev, currentCase]);
  }

  function handleRemoveStep(index) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim() || steps.length === 0) return;
    await onSave(name.trim(), steps, description.trim());
    setName('');
    setDescription('');
    setSteps([]);
  }

  return (
    <>
      <Card title="Build a new sequence" className="mt-card">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <WheelSVG positionAngle={posAngle} size={200} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 10px' }}>
              Spin the wheel by hand, then click Add to append whichever case the cleat lands on.
            </p>
            <Button variant="success" onClick={handleAddStep} disabled={!agentConnected}>
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

        <div style={{ marginTop: 18 }}>
          <input
            placeholder="Sequence name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <Button onClick={handleSave} disabled={saving || !name.trim() || steps.length === 0}>
            {saving ? 'Saving…' : 'Save sequence'}
          </Button>
        </div>
      </Card>

      <Card title="Manage sequences" className="mt-card">
        {!sequences ? (
          <p className="page-subtitle">Loading…</p>
        ) : sequences.length === 0 ? (
          <EmptyState title="No sequences saved yet" />
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Steps</th><th></th></tr></thead>
            <tbody>
              {sequences.map((seq) => (
                <tr key={seq.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{seq.name}</div>
                    {seq.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{seq.description}</div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{seq.steps.map((s) => s + 1).join(', ')}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === seq.id || isSeqActive(seq.id)}
                      onClick={() => onDelete(seq.id)}
                      style={{ color: '#EF4444' }}
                    >
                      {busyId === seq.id ? 'Deleting…' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

export default function SequenceBuilder() {
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [module, setModule] = useState('library');
  const [sequences, setSequences] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // { id, name, steps } being viewed/run

  function loadSequences() {
    api.listAdminSequences().then(setSequences).catch((e) => setError(e.message));
  }
  function loadStatus() {
    api.getAdminSequenceStatus().then(setStatus).catch(() => {});
  }

  useEffect(() => {
    loadSequences();
    // If a sequence is still active from a previous session (page reload
    // while running), reopen its live-progress popup automatically.
    api.getAdminSequenceStatus().then((s) => {
      setStatus(s);
      if (s.active) setActiveModal({ id: s.sequenceId, name: s.name, steps: s.steps });
    }).catch(() => {});
    const id = setInterval(loadStatus, 1500);
    return () => clearInterval(id);
  }, []);

  async function handleActivate(seq) {
    setBusyId(seq.id);
    setError('');
    try {
      await api.activateAdminSequence(seq.id);
      loadStatus();
      setActiveModal(seq);
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

  async function handleSave(name, steps, description) {
    setSaving(true);
    setError('');
    try {
      await api.createAdminSequence(name, steps, description);
      loadSequences();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
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

  function handleModalClose() {
    setActiveModal(null);
    loadSequences();
    loadStatus();
  }

  const isForced = !!status?.active;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sequence</h1>
          <p className="page-subtitle">Build a custom run order by hand, then activate it on the wheel</p>
        </div>
        <Badge tone={isForced ? 'orange' : 'green'}>{isForced ? 'FORCE' : 'FREE'}</Badge>
      </div>

      {!agentConnected && (
        <div className="error-banner" style={{ marginBottom: 12 }}>Wheel agent is not connected.</div>
      )}
      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="tabs">
        <button className={`tab${module === 'library' ? ' active' : ''}`} onClick={() => setModule('library')}>Library</button>
        <button className={`tab${module === 'settings' ? ' active' : ''}`} onClick={() => setModule('settings')}>Settings</button>
      </div>

      {module === 'library' && (
        <LibraryModule
          sequences={sequences}
          status={status}
          agentConnected={agentConnected}
          busyId={busyId}
          onActivate={handleActivate}
          onStop={handleStop}
          onView={(seq) => setActiveModal(seq)}
        />
      )}

      {module === 'settings' && (
        <SettingsModule
          wheelStatus={wheelStatus}
          agentConnected={agentConnected}
          sequences={sequences}
          busyId={busyId}
          saving={saving}
          isSeqActive={(id) => status?.active && status.sequenceId === id}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {activeModal && (
        <SequenceRunModal
          sequence={activeModal}
          wheelStatus={wheelStatus}
          agentConnected={agentConnected}
          status={status}
          busyId={busyId}
          onStop={handleStop}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
