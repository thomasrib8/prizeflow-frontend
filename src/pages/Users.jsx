import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import './admin-premium.css';

const AVATARS = [['#0055F8', '#002881'], ['#00B0FF', '#0055F8'], ['#7AA8FF', '#0055F8'], ['#002881', '#0B1437'], ['#1AA864', '#0D9488'], ['#9333EA', '#4F46E5']];
const avatarGradient = (seed) => { let h = 0; for (const ch of String(seed || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const [a, b] = AVATARS[h % AVATARS.length]; return `linear-gradient(135deg, ${a}, ${b})`; };
const initialsOf = (n, e) => { const w = String(n || e || '?').trim().split(/\s+/); return ((w[0] || '?').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase(); };
function Who({ name, email, children }) { return <span className="ap-who"><span className="ap-av" style={{ background: avatarGradient(email || name) }} aria-hidden="true">{initialsOf(name, email)}</span>{children}</span>; }

const STATUS_TONE = { pending: 'orange', approved: 'green', deactivated: 'red' };
const STATUS_TKEY = { pending: 'userStatusPending', approved: 'userStatusApproved', deactivated: 'userStatusDeactivated' };

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Users() {
  const { t } = useTranslation('admin');
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState(null);
  const [wheels, setWheels] = useState(null);
  const [types, setTypes] = useState({});
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.listUsers().then(setUsers).catch((e) => setError(e.message));
    api.getWheelIdentities().then(setWheels).catch((e) => setError(e.message));
    api.getCommercialTypes().then(setTypes).catch(() => {});
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
    <div className="ap">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.users')}</h1>
          <p className="page-subtitle">{t('users.pageSubtitle')}</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {!users && <p className="page-subtitle">{t('common.loading')}</p>}

      {users && pending.length > 0 && (
        <Card title={t('users.pendingApprovalTitle')} className="mt-card">
          <table className="data-table ap-rows">
            <thead><tr><th>{t('history.tableName')}</th><th>{t('history.tableEmail')}</th><th>{t('users.tableRequested')}</th><th></th></tr></thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>
                    <Who name={u.name} email={u.email}><button className="link-button" onClick={() => navigate(`/users/${u.id}`)}>{u.name || '—'}</button></Who>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.created_at}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Button size="sm" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'approved')}>{t('users.approveBtn')}</Button>
                    <Button size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'deactivated')}>{t('users.rejectBtn')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {users && (
        <Card title={t('users.allAccountsTitle')} className="mt-card">
          {others.length === 0 ? <EmptyState title={t('users.noAccountsYet')} /> : (
            <table className="data-table ap-rows">
              <thead><tr><th>{t('history.tableName')}</th><th>{t('history.tableEmail')}</th><th>{t('users.tableRole')}</th><th>{t('contract.colType')}</th><th>{t('contract.colReseller')}</th><th>{t('history.tableStatus')}</th><th></th></tr></thead>
              <tbody>
                {others.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>
                        <Who name={u.name} email={u.email}><button className="link-button" onClick={() => navigate(`/users/${u.id}`)}>{u.name || '—'}</button>
                        {isSelf ? t('users.youSuffix') : ''}</Who>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          disabled={busyId === u.id || isSelf}
                          onChange={(e) => setRole(u.id, e.target.value)}
                          className="ap-select"
                        >
                          <option value="operator">{t('users.roleOperator')}</option>
                          <option value="admin">{t('users.roleAdmin')}</option>
                        </select>
                      </td>
                      <td>{types[u.id] ? t(`contract.types.${types[u.id].type}`) : <span style={{ color: '#94A3B8' }}>—</span>}</td>
                      <td>{types[u.id] && types[u.id].parentResellerName ? types[u.id].parentResellerName : <span style={{ color: '#94A3B8' }}>—</span>}</td>
                      <td><Badge tone={STATUS_TONE[u.status]}>{t(`users.${STATUS_TKEY[u.status]}`)}</Badge></td>
                      <td>
                        {!isSelf && (
                          u.status === 'deactivated' ? (
                            <Button size="sm" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'approved')}>{t('rewardCard.reactivateBtn')}</Button>
                          ) : (
                            <Button size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'deactivated')}>{t('users.deactivateBtn')}</Button>
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
        <Card title={t('users.wheelsInServiceTitle')} className="mt-card">
          {wheels.length === 0 ? <EmptyState title={t('users.noWheelsYet')} /> : (
            <table className="data-table ap-rows">
              <thead><tr><th>{t('history.tableName')}</th><th>{t('users.tableModelNumber')}</th><th>{t('users.tableSerialNumber')}</th><th>{t('users.tableSecurityKey')}</th><th>{t('users.tablePutIntoService')}</th></tr></thead>
              <tbody>
                {wheels.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 500 }}>
                      <Who name={w.name} email={w.email}><button className="link-button" onClick={() => navigate(`/users/${w.id}`)}>{w.name || w.email}</button></Who>
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
