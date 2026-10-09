import { useEffect, useState } from 'react';
import LinkedInAdminCard from '../components/LinkedInAdminCard';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import WheelDiagnosticsRows from '../components/WheelDiagnosticsRows';

const STATUS_TONE = { pending: 'orange', approved: 'green', deactivated: 'red' };
const STATUS_TKEY = { pending: 'userStatusPending', approved: 'userStatusApproved', deactivated: 'userStatusDeactivated' };

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function UserDetail() {
  const { t } = useTranslation('admin');
  const { id } = useParams();
  const navigate = useNavigate();
  const MODULES = [
    { key: 'overview', label: t('userDetail.tabOverview') },
    { key: 'profile', label: t('userDetail.tabProfile') },
    { key: 'activity', label: t('userDetail.tabActivity') },
    { key: 'linkedin', label: t('linkedin.tabLabel') },
    { key: 'actions', label: t('userDetail.tabActions') },
    { key: 'notes', label: t('userDetail.tabNotes') },
  ];
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
      alert(t('userDetail.resetEmailSentAlert'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t('userDetail.deleteConfirmMessage'))) return;
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
        <p className="page-subtitle">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/users" style={{ fontSize: 13, color: '#64748B' }}>{t('userDetail.backToUsers')}</Link>
          <h1 className="page-title" style={{ marginTop: 6 }}>{detail.name || detail.email}</h1>
          <p className="page-subtitle">{detail.company || t('userDetail.noCompanyOnFile')} · {detail.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge tone={STATUS_TONE[detail.status]}>{t(`users.${STATUS_TKEY[detail.status]}`)}</Badge>
          <Badge tone={detail.role === 'admin' ? 'blue' : 'neutral'}>{detail.role === 'admin' ? t('users.roleAdmin') : t('users.roleOperator')}</Badge>
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
          <Card title={t('userDetail.clientProfileTitle')} className="mt-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
              <div><span style={{ color: '#94A3B8' }}>{t('userDetail.addressLabel')}</span><div>{detail.address || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>{t('userDetail.phoneLabel')}</span><div>{detail.phone || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>{t('userDetail.industryLabel')}</span><div>{detail.industry_sector || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>{t('userDetail.createdLabel')}</span><div>{formatDT(detail.created_at)}</div></div>
            </div>
          </Card>

          <Card title={t('userDetail.wheelTokenTitle')} className="mt-card">
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
              {t('userDetail.wheelTokenDesc')}{' '}
              <button
                type="button"
                onClick={() => setShowSetupHelp(true)}
                style={{ background: 'none', border: 'none', padding: 0, color: '#002881', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
              >
                {t('userDetail.setupHelpLink')}
              </button>
            </p>
            {detail.agent_token ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <code style={{
                  flex: 1, padding: '9px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: 8, fontSize: 13, wordBreak: 'break-all',
                }}>{detail.agent_token}</code>
                <Button variant="ghost" onClick={handleCopyAgentToken}>{tokenCopied ? t('userDetail.copiedLabel') : t('userDetail.copyLabel')}</Button>
              </div>
            ) : (
              <p className="page-subtitle">{t('userDetail.tokenNotGenerated')}</p>
            )}
          </Card>

          <Card title={t('userDetail.wheelIdentityTitle')} className="mt-card">
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
              {t('userDetail.wheelIdentityDesc')}
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: detail.wheel_serial_number ? 16 : 0 }}>
              <label style={{ fontSize: 13, color: '#64748B' }}>{t('userDetail.seriesLabel')}
                <input
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  style={{ marginLeft: 8, width: 60, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                />
              </label>
              <Button variant="ghost" disabled={wheelBusy || !series.trim()} onClick={handleGenerateWheelIdentity}>
                {wheelBusy ? t('userDetail.generatingLabel') : detail.wheel_serial_number ? t('userDetail.regenerateLabel') : t('userDetail.generateLabel')}
              </Button>
            </div>

            {!showManualWheelEntry ? (
              <button
                type="button"
                onClick={() => setShowManualWheelEntry(true)}
                style={{ background: 'none', border: 'none', padding: 0, marginBottom: detail.wheel_serial_number ? 16 : 0, color: '#002881', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
              >
                {t('userDetail.manualEntryLink')}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16, padding: '12px', background: '#F8FAFC', borderRadius: 8 }}>
                <label style={{ fontSize: 12, color: '#64748B' }}>{t('userDetail.modelNumberLabel')}
                  <input
                    value={manualModelNumber}
                    onChange={(e) => setManualModelNumber(e.target.value)}
                    placeholder="PF-ALPHA-V1"
                    style={{ display: 'block', marginTop: 4, width: 130, padding: '7px 9px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: '#64748B' }}>{t('userDetail.serialNumberLabel')}
                  <input
                    value={manualSerialNumber}
                    onChange={(e) => setManualSerialNumber(e.target.value)}
                    placeholder="PF260000152"
                    style={{ display: 'block', marginTop: 4, width: 130, padding: '7px 9px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: '#64748B' }}>{t('userDetail.securityKeyLabel')}
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
                  {wheelBusy ? t('common.saving') : t('common.save')}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowManualWheelEntry(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', padding: '8px 0' }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}

            {detail.wheel_serial_number && (
              <div style={{ fontSize: 13, color: '#03041A', lineHeight: 1.9 }}>
                <div>{t('userDetail.modelNumberDisplay')}<strong>{detail.wheel_model_number}</strong></div>
                <div>{t('userDetail.serialNumberDisplay')}<strong>{detail.wheel_serial_number}</strong></div>
                <div>{t('userDetail.securityKeyDisplay')}<strong>{detail.wheel_security_key}</strong></div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>{t('userDetail.generatedLabel')}{formatDT(detail.wheel_identity_generated_at)}</div>
                <div style={{ fontSize: 12, marginTop: 4, color: detail.wheel_first_connected_at ? '#10B981' : '#F59E0B' }}>
                  {detail.wheel_first_connected_at
                    ? `${t('userDetail.confirmedInServicePrefix')}${formatDT(detail.wheel_first_connected_at)}`
                    : t('userDetail.notConfirmedYet')}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {showSetupHelp && (
        <div
          onClick={() => setShowSetupHelp(false)}
          className="modal-overlay"
          style={{ zIndex: 300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#03041A' }}>{t('userDetail.setupHelpTitle')}</h3>
              <button onClick={() => setShowSetupHelp(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#03041A', margin: '0 0 6px' }}>{t('userDetail.setupHelpStep1Title')}</h4>
              <p>{t('userDetail.setupHelpStep1Line1')}</p>
              <pre style={{ background: '#03041A', color: '#E2E8F0', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
{`ssh pi@<pi-address>
nano /home/pi/wheel-agent/.env`}
              </pre>
              <p>
                {t('userDetail.setupHelpStep1Line2Part1')}<code>AGENT_SECRET=...</code>{t('userDetail.setupHelpStep1Line2Part2')}<code>=</code>{t('userDetail.setupHelpStep1Line2Part3')}<code>Ctrl+O</code>{t('userDetail.setupHelpStep1Line2Part4')}<code>Enter</code>{t('userDetail.setupHelpStep1Line2Part5')}<code>Ctrl+X</code>{t('userDetail.setupHelpStep1Line2Part6')}
              </p>
              <pre style={{ background: '#03041A', color: '#E2E8F0', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>sudo systemctl restart wheel-agent</pre>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#03041A', margin: '16px 0 6px' }}>{t('userDetail.setupHelpStep2Title')}</h4>
              <p>{t('userDetail.setupHelpStep2Line1')}</p>
              <pre style={{ background: '#03041A', color: '#E2E8F0', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
{`WHEEL_MODEL_NUMBER=...
WHEEL_SERIAL_NUMBER=...
WHEEL_SECURITY_KEY=...`}
              </pre>
              <p>{t('userDetail.setupHelpStep2Line2')}</p>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#03041A', margin: '16px 0 6px' }}>{t('userDetail.setupHelpStep3Title')}</h4>
              <p>{t('userDetail.setupHelpStep3Desc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* A. Operational overview — no guest personal data, ever. */}
      {module === 'overview' && (
        <Card title={t('userDetail.overviewTitle')} className="mt-card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>{t('userDetail.wheelStatusLabel')}</span>
            {overview ? (
              <Badge tone={overview.wheel.connected ? 'green' : 'red'}>
                {overview.wheel.connected ? t('userDetail.onlineLabel') : t('userDetail.offlineLabel')}
              </Badge>
            ) : <span style={{ fontSize: 13, color: '#94A3B8' }}>…</span>}
          </div>

          {overview?.wheel.diagnostics && (
            <div style={{ marginBottom: 16 }}>
              <WheelDiagnosticsRows diagnostics={overview.wheel.diagnostics} />
            </div>
          )}

          {!overview && <p className="page-subtitle">{t('common.loading')}</p>}
          {overview && overview.campaigns.length === 0 && <EmptyState title={t('userDetail.noCampaignsTitle')} />}
          {overview && overview.campaigns.length > 0 && (
            <table className="data-table">
              <thead><tr><th>{t('history.tableCampaign')}</th><th>{t('history.tableStatus')}</th><th>{t('userDetail.tableStock')}</th><th>{t('userDetail.tableProgress')}</th></tr></thead>
              <tbody>
                {overview.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}{c.is_test ? t('userDetail.testSuffix') : ''}</td>
                    <td><Badge tone={c.status === 'active' ? 'green' : 'neutral'}>{t(`common.status${c.status.charAt(0).toUpperCase()}${c.status.slice(1)}`)}</Badge></td>
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
      {module === 'linkedin' && <LinkedInAdminCard userId={id} />}

      {module === 'activity' && (
        <Card title={t('userDetail.activityTitle')} className="mt-card">
          {!activity && <p className="page-subtitle">{t('common.loading')}</p>}
          {activity && activity.length === 0 && <EmptyState title={t('userDetail.noActivity')} />}
          {activity && activity.length > 0 && (
            <table className="data-table">
              <thead><tr><th>{t('userDetail.tableAction')}</th><th>{t('history.tableDate')}</th></tr></thead>
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
        <Card title={t('userDetail.actionsTitle')} className="mt-card">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {detail.status === 'deactivated' ? (
              <Button disabled={busy} onClick={() => handleStatus('approved')}>{t('userDetail.activateBtn')}</Button>
            ) : (
              <Button variant="ghost" disabled={busy} onClick={() => handleStatus('deactivated')}>{t('users.deactivateBtn')}</Button>
            )}
            <Button variant="ghost" disabled={busy} onClick={handleResetPassword}>{t('userDetail.resetPasswordBtn')}</Button>
            <select
              value={detail.role}
              disabled={busy}
              onChange={(e) => handleRole(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
            >
              <option value="operator">{t('users.roleOperator')}</option>
              <option value="admin">{t('users.roleAdmin')}</option>
            </select>
            <Button variant="ghost" disabled={busy} onClick={handleDelete} style={{ color: '#EF4444' }}>
              {t('userDetail.deleteAccountBtn')}
            </Button>
          </div>
        </Card>
      )}

      {/* Internal notes — admin-only visibility, enforced server-side. */}
      {module === 'notes' && (
        <Card title={t('userDetail.notesTitle')} className="mt-card">
          <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t('userDetail.addNotePlaceholder')}
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
            />
            <Button type="submit" disabled={busy || !newNote.trim()}>{t('userDetail.addBtn')}</Button>
          </form>
          {notes && notes.length === 0 && <p className="page-subtitle">{t('userDetail.noNotesYet')}</p>}
          {notes && notes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 8, fontSize: 13 }}>
                  <div>{n.body}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    {n.author_name || t('userDetail.adminFallback')} · {formatDT(n.created_at)}
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
