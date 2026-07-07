import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';

const STATUS_TONE = { pending: 'orange', approved: 'green', deactivated: 'red' };

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [notes, setNotes] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

      <Card title="Client profile" className="mt-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
          <div><span style={{ color: '#94A3B8' }}>Adresse</span><div>{detail.address || '—'}</div></div>
          <div><span style={{ color: '#94A3B8' }}>Téléphone</span><div>{detail.phone || '—'}</div></div>
          <div><span style={{ color: '#94A3B8' }}>Secteur d'activité</span><div>{detail.industry_sector || '—'}</div></div>
          <div><span style={{ color: '#94A3B8' }}>Compte créé le</span><div>{formatDT(detail.created_at)}</div></div>
        </div>
      </Card>

      {/* A. Operational overview — no guest personal data, ever. */}
      <Card title="Vue d'ensemble opérationnelle" className="mt-card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>État de la roue :</span>
          {overview ? (
            <Badge tone={overview.wheel.connected ? 'green' : 'red'}>
              {overview.wheel.connected ? 'En ligne' : 'Hors ligne'}
            </Badge>
          ) : <span style={{ fontSize: 13, color: '#94A3B8' }}>…</span>}
          {overview?.wheel.shared && (
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              (roue partagée pour le moment — sera isolée par compte quand le multi-roues sera en place)
            </span>
          )}
        </div>

        {!overview && <p className="page-subtitle">Loading…</p>}
        {overview && overview.campaigns.length === 0 && <EmptyState title="Aucune campagne pour ce compte" />}
        {overview && overview.campaigns.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Campagne</th><th>Statut</th><th>Stock</th><th>Progression</th></tr></thead>
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

      {/* B. Activity log — metadata only, never the content of what was configured. */}
      <Card title="Journal d'activité" className="mt-card">
        {!activity && <p className="page-subtitle">Loading…</p>}
        {activity && activity.length === 0 && <EmptyState title="Aucune activité enregistrée" />}
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

      {/* C. Actions on the account */}
      <Card title="Actions sur le compte" className="mt-card">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {detail.status === 'deactivated' ? (
            <Button disabled={busy} onClick={() => handleStatus('approved')}>Activer le compte</Button>
          ) : (
            <Button variant="ghost" disabled={busy} onClick={() => handleStatus('deactivated')}>Désactiver le compte</Button>
          )}
          <Button variant="ghost" disabled={busy} onClick={handleResetPassword}>Réinitialiser le mot de passe</Button>
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
            Supprimer le compte (RGPD)
          </Button>
        </div>

        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>Notes internes (visibles admin uniquement)</h4>
        <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Ajouter une note…"
            style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
          />
          <Button type="submit" disabled={busy || !newNote.trim()}>Ajouter</Button>
        </form>
        {notes && notes.length === 0 && <p className="page-subtitle">Aucune note pour ce compte.</p>}
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
    </div>
  );
}
