import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import WheelDiagnosticsRows from '../components/WheelDiagnosticsRows';

const STATUS_TONE = { pending: 'orange', approved: 'green', deactivated: 'red' };
const MODULES = [
  { key: 'overview', label: 'Overview' },
  { key: 'profile', label: 'Client profile' },
  { key: 'activity', label: 'Activity log' },
  { key: 'actions', label: 'Account actions' },
  { key: 'notes', label: 'Internal notes' },
];

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState('overview');
  const [detail, setDetail] = useState(null);
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [notes, setNotes] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [showSetupHelp, setShowSetupHelp] = useState(false);
  const [series, setSeries] = useState('1');
  const [wheelBusy, setWheelBusy] = useState(false);
  const [showManualWheelEntry, setShowManualWheelEntry] = useState(false);
  const [manualModelNumber, setManualModelNumber] = useState('');
  const [manualSerialNumber, setManualSerialNumber] = useState('');
  const [manualSecurityKey, setManualSecurityKey] = useState('');

  function load() {
    api.getUserDetail(id).then(setDetail).catch((e) => setError(e.message));
    api.getUserOverview(id).then(setOverview).catch((e) => setError(e.message));
    api.getUserActivity(id).then(setActivity).catch((e) => setError(e.message));
    api.getUserNotes(id).then(setNotes).catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  async function handleStatus(status) {
    setBusy(true);
    setError('');
    try {
      await api.setUserStatus(id, status);
      setDetail((prev) => ({ ...prev, status }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRole(role) {
    setBusy(true);
    setError('');
    try {
      await api.setUserRole(id, role);
      setDetail((prev) => ({ ...prev, role }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    setBusy(true);
    setError('');
    try {
      await api.adminResetUserPassword(id);
      alert('Reset email sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this account? This scrubs their personal info permanently (GDPR) and can't be undone.")) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteUser(id);
      navigate('/users');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleCopyAgentToken() {
    if (!detail.agent_token) return;
    await navigator.clipboard.writeText(detail.agent_token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  async function handleGenerateWheelIdentity() {
    if (!series.trim()) return;
    setWheelBusy(true);
    setError('');
    try {
      const identity = await api.generateWheelIdentity(id, series.trim());
      setDetail((prev) => ({
        ...prev,
        wheel_model_number: identity.wheel_model_number,
        wheel_serial_number: identity.wheel_serial_number,
        wheel_security_key: identity.wheel_security_key,
        wheel_identity_generated_at: identity.wheel_identity_generated_at,
        wheel_first_connected_at: identity.wheel_first_connected_at,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setWheelBusy(false);
    }
  }

  async function handleRecordManualWheelIdentity() {
    if (!manualModelNumber.trim() || !manualSerialNumber.trim() || !manualSecurityKey.trim()) return;
    setWheelBusy(true);
    setError('');
    try {
      const identity = await api.recordWheelIdentity(
        id,
        manualModelNumber.trim(),
        manualSerialNumber.trim(),
        manualSecurityKey.trim()
      );
      setDetail((prev) => ({
        ...prev,
        wheel_model_number: identity.wheel_model_number,
        wheel_serial_number: identity.wheel_serial_number,
        wheel_security_key: identity.wheel_security_key,
        wheel_identity_generated_at: identity.wheel_identity_generated_at,
        wheel_first_connected_at: identity.wheel_first_connected_at,
      }));
      setShowManualWheelEntry(false);
      setManualModelNumber('');
      setManualSerialNumber('');
      setManualSecurityKey('');
    } catch (err) {
      setError(err.message);
    } finally {
      setWheelBusy(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.addUserNote(id, newNote.trim());
      setNewNote('');
      api.getUserNotes(id).then(setNotes);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <div>
        {error && <div className="error-banner">{error}</div>}
        <p className="page-subtitle">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/users" style={{ fontSize: 13, color: '#64748B' }}>← Back to Users</Link>
          <h1 className="page-title" style={{ marginTop: 6 }}>{detail.name || detail.email}</h1>
          <p className="page-subtitle">{detail.company || 'No company on file'} · {detail.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge tone={STATUS_TONE[detail.status]}>{detail.status}</Badge>
          <Badge tone={detail.role === 'admin' ? 'blue' : 'neutral'}>{detail.role}</Badge>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        {MODULES.map((m) => (
          <button key={m.key} className={`tab${module === m.key ? ' active' : ''}`} onClick={() => setModule(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {module === 'profile' && (
        <>
          <Card title="Client profile" className="mt-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
              <div><span style={{ color: '#94A3B8' }}>Address</span><div>{detail.address || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>Phone</span><div>{detail.phone || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>Industry sector</span><div>{detail.industry_sector || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>Account created on</span><div>{formatDT(detail.created_at)}</div></div>
            </div>
          </Card>

          <Card title="Wheel token (agent)" className="mt-card">
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
              Paste this into this client's Raspberry Pi <code>.env</code> (<code>AGENT_SECRET</code> variable) once their physical wheel is put into service.{' '}
              <button
                type="button"
                onClick={() => setShowSetupHelp(true)}
                style={{ background: 'none', border: 'none', padding: 0, color: '#2563EB', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
              >
                How do I set this up?
              </button>
            </p>
            {detail.agent_token ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <code style={{
                  flex: 1, padding: '9px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: 8, fontSize: 13, wordBreak: 'break-all',
                }}>{detail.agent_token}</code>
                <Button variant="ghost" onClick={handleCopyAgentToken}>{tokenCopied ? 'Copied ✓' : 'Copy'}</Button>
              </div>
            ) : (
              <p className="page-subtitle">Not generated yet — available once the account is approved.</p>
            )}
          </Card>

          <Card title="Wheel Identity" className="mt-card">
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
              Model Number / Serial Number / Security Key to copy into this client's Raspberry Pi <code>.env</code>{' '}
              (<code>WHEEL_MODEL_NUMBER</code> / <code>WHEEL_SERIAL_NUMBER</code> / <code>WHEEL_SECURITY_KEY</code>).
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: detail.wheel_serial_number ? 16 : 0 }}>
              <label style={{ fontSize: 13, color: '#64748B' }}>Series
                <input
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  style={{ marginLeft: 8, width: 60, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                />
              </label>
              <Button variant="ghost" disabled={wheelBusy || !series.trim()} onClick={handleGenerateWheelIdentity}>
                {wheelBusy ? 'Generating…' : detail.wheel_serial_number ? 'Regenerate' : 'Generate'}
              </Button>
            </div>

            {!showManualWheelEntry ? (
              <button
                type="button"
                onClick={() => setShowManualWheelEntry(true)}
                style={{ background: 'none', border: 'none', padding: 0, marginBottom: detail.wheel_serial_number ? 16 : 0, color: '#2563EB', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
              >
                Already set on the Pi manually? Record the existing values instead
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16, padding: '12px', background: '#F8FAFC', borderRadius: 8 }}>
                <label style={{ fontSize: 12, color: '#64748B' }}>Model Number
                  <input
                    value={manualModelNumber}
                    onChange={(e) => setManualModelNumber(e.target.value)}
                    placeholder="PF-ALPHA-V1"
                    style={{ display: 'block', marginTop: 4, width: 130, padding: '7px 9px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: '#64748B' }}>Serial Number
                  <input
                    value={manualSerialNumber}
                    onChange={(e) => setManualSerialNumber(e.target.value)}
                    placeholder="PF260000152"
                    style={{ display: 'block', marginTop: 4, width: 130, padding: '7px 9px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: '#64748B' }}>Security Key
                  <input
                    value={manualSecurityKey}
                    onChange={(e) => setManualSecurityKey(e.target.value)}
                    placeholder="K8Q7F3"
                    style={{ display: 'block', marginTop: 4, width: 100, padding: '7px 9px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                  />
                </label>
                <Button
                  variant="ghost"
                  disabled={wheelBusy || !manualModelNumber.trim() || !manualSerialNumber.trim() || !manualSecurityKey.trim()}
                  onClick={handleRecordManualWheelIdentity}
                >
                  {wheelBusy ? 'Saving…' : 'Save'}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowManualWheelEntry(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', padding: '8px 0' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {detail.wheel_serial_number && (
              <div style={{ fontSize: 13, color: '#0F172A', lineHeight: 1.9 }}>
                <div>Model Number: <strong>{detail.wheel_model_number}</strong></div>
                <div>Serial Number: <strong>{detail.wheel_serial_number}</strong></div>
                <div>Security Key: <strong>{detail.wheel_security_key}</strong></div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Generated: {formatDT(detail.wheel_identity_generated_at)}</div>
                <div style={{ fontSize: 12, marginTop: 4, color: detail.wheel_first_connected_at ? '#10B981' : '#F59E0B' }}>
                  {detail.wheel_first_connected_at
                    ? `Confirmed in service: ${formatDT(detail.wheel_first_connected_at)}`
                    : 'Not yet confirmed — waiting for the wheel to connect with this identity'}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {showSetupHelp && (
        <div
          onClick={() => setShowSetupHelp(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, padding: '24px 28px', width: 560, maxWidth: '92vw',
              maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Setting up a new wheel</h3>
              <button onClick={() => setShowSetupHelp(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>1. Wheel token (AGENT_SECRET)</h4>
              <p>Copy the token above, then on the client's Raspberry Pi:</p>
              <pre style={{ background: '#0F172A', color: '#E2E8F0', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
{`ssh pi@<pi-address>
nano /home/pi/wheel-agent/.env`}
              </pre>
              <p>Find the <code>AGENT_SECRET=...</code> line and replace the value after the <code>=</code> with the copied token (exactly, no spaces). Save with <code>Ctrl+O</code>, <code>Enter</code>, <code>Ctrl+X</code>, then restart the agent:</p>
              <pre style={{ background: '#0F172A', color: '#E2E8F0', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>sudo systemctl restart wheel-agent</pre>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '16px 0 6px' }}>2. Wheel identity (Model / Serial / Security Key)</h4>
              <p>Generate the identity above (pick a series number), then in the same <code>.env</code> file find these 3 lines (or add them at the end if they don't exist yet):</p>
              <pre style={{ background: '#0F172A', color: '#E2E8F0', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
{`WHEEL_MODEL_NUMBER=...
WHEEL_SERIAL_NUMBER=...
WHEEL_SECURITY_KEY=...`}
              </pre>
              <p>Replace the values with what was just generated, save the same way, and restart the agent again (same command as above).</p>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '16px 0 6px' }}>3. Verify it worked</h4>
              <p>In the client's own app, clicking the "Wheel connected" / "Wheel offline" badge in the sidebar opens a diagnostics popup showing a "Wheel identity" section — the Model Number, Serial Number and Security Key shown there should match what you just entered. The same values are also visible here, under this client's "Overview" tab.</p>
            </div>
          </div>
        </div>
      )}

      {/* A. Operational overview — no guest personal data, ever. */}
      {module === 'overview' && (
        <Card title="Operational overview" className="mt-card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>Wheel status:</span>
            {overview ? (
              <Badge tone={overview.wheel.connected ? 'green' : 'red'}>
                {overview.wheel.connected ? 'Online' : 'Offline'}
              </Badge>
            ) : <span style={{ fontSize: 13, color: '#94A3B8' }}>…</span>}
          </div>

          {overview?.wheel.diagnostics && (
            <div style={{ marginBottom: 16 }}>
              <WheelDiagnosticsRows diagnostics={overview.wheel.diagnostics} />
            </div>
          )}

          {!overview && <p className="page-subtitle">Loading…</p>}
          {overview && overview.campaigns.length === 0 && <EmptyState title="No campaigns for this account" />}
          {overview && overview.campaigns.length > 0 && (
            <table className="data-table">
              <thead><tr><th>Campaign</th><th>Status</th><th>Stock</th><th>Progress</th></tr></thead>
              <tbody>
                {overview.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}{c.is_test ? ' (test)' : ''}</td>
                    <td><Badge tone={c.status === 'active' ? 'green' : 'neutral'}>{c.status}</Badge></td>
                    <td>{c.total_distributed} / {c.total_stock}</td>
                    <td>{c.progressPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* B. Activity log — metadata only, never the content of what was configured. */}
      {module === 'activity' && (
        <Card title="Activity log" className="mt-card">
          {!activity && <p className="page-subtitle">Loading…</p>}
          {activity && activity.length === 0 && <EmptyState title="No activity recorded" />}
          {activity && activity.length > 0 && (
            <table className="data-table">
              <thead><tr><th>Action</th><th>Date</th></tr></thead>
              <tbody>
                {activity.map((a, i) => (
                  <tr key={i}>
                    <td>{a.label}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDT(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* C. Actions on the account */}
      {module === 'actions' && (
        <Card title="Account actions" className="mt-card">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {detail.status === 'deactivated' ? (
              <Button disabled={busy} onClick={() => handleStatus('approved')}>Activate account</Button>
            ) : (
              <Button variant="ghost" disabled={busy} onClick={() => handleStatus('deactivated')}>Deactivate account</Button>
            )}
            <Button variant="ghost" disabled={busy} onClick={handleResetPassword}>Reset password</Button>
            <select
              value={detail.role}
              disabled={busy}
              onChange={(e) => handleRole(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
            >
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
            <Button variant="ghost" disabled={busy} onClick={handleDelete} style={{ color: '#EF4444' }}>
              Delete account (GDPR)
            </Button>
          </div>
        </Card>
      )}

      {/* Internal notes — admin-only visibility, enforced server-side. */}
      {module === 'notes' && (
        <Card title="Internal notes (admin-only visibility)" className="mt-card">
          <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note…"
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
            />
            <Button type="submit" disabled={busy || !newNote.trim()}>Add</Button>
          </form>
          {notes && notes.length === 0 && <p className="page-subtitle">No notes for this account.</p>}
          {notes && notes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 8, fontSize: 13 }}>
                  <div>{n.body}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    {n.author_name || 'Admin'} · {formatDT(n.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
