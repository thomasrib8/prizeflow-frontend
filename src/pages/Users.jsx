import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';

const STATUS_TONE = { pending: 'orange', approved: 'green', deactivated: 'red' };

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Users() {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState(null);
  const [wheels, setWheels] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.listUsers().then(setUsers).catch((e) => setError(e.message));
    api.getWheelIdentities().then(setWheels).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function setStatus(id, status) {
    setBusyId(id);
    setError('');
    try {
      await api.setUserStatus(id, status);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function setRole(id, role) {
    setBusyId(id);
    setError('');
    try {
      await api.setUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const pending = users?.filter((u) => u.status === 'pending') || [];
  const others = users?.filter((u) => u.status !== 'pending') || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Approve new accounts, manage roles, and deactivate access</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {!users && <p className="page-subtitle">Loading…</p>}

      {users && pending.length > 0 && (
        <Card title="Pending approval" className="mt-card">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>
                    <button className="link-button" onClick={() => navigate(`/users/${u.id}`)}>{u.name || '—'}</button>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.created_at}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Button size="sm" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'deactivated')}>Reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {users && (
        <Card title="All accounts" className="mt-card">
          {others.length === 0 ? <EmptyState title="No accounts yet" /> : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {others.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>
                        <button className="link-button" onClick={() => navigate(`/users/${u.id}`)}>{u.name || '—'}</button>
                        {isSelf ? ' (you)' : ''}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          disabled={busyId === u.id || isSelf}
                          onChange={(e) => setRole(u.id, e.target.value)}
                          style={{ padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13 }}
                        >
                          <option value="operator">Operator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td><Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge></td>
                      <td>
                        {!isSelf && (
                          u.status === 'deactivated' ? (
                            <Button size="sm" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'approved')}>Reactivate</Button>
                          ) : (
                            <Button size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'deactivated')}>Deactivate</Button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {wheels && (
        <Card title="Wheels in service" className="mt-card">
          {wheels.length === 0 ? <EmptyState title="No wheels in service yet" /> : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Model Number</th><th>Serial Number</th><th>Security Key</th><th>Put into service</th></tr></thead>
              <tbody>
                {wheels.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 500 }}>
                      <button className="link-button" onClick={() => navigate(`/users/${w.id}`)}>{w.name || w.email}</button>
                    </td>
                    <td>{w.wheel_model_number}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{w.wheel_serial_number}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{w.wheel_security_key}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDT(w.wheel_first_connected_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
