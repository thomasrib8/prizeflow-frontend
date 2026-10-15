import { useEffect, useState } from 'react';
import BoxActivationCard from '../components/BoxActivationCard';
import LinkedInAdminCard from '../components/LinkedInAdminCard';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import WheelDiagnosticsRows from '../components/WheelDiagnosticsRows';
import { useConfirm } from '../components/ConfirmDialog';
import SetupWizard from '../components/SetupWizard';
import ReturnForm from '../components/wheel/ReturnForm';
import InspectionList from '../components/wheel/InspectionList';

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
  const [confirm, confirmDialog] = useConfirm();
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
  const [inspections, setInspections] = useState([]);
  const [returnWheel, setReturnWheel] = useState(null);
  const boxNameOf = (serial) => (/(\d{6})$/.test(serial || '') ? `spark-box-${/(\d{6})$/.exec(serial)[1]}` : '');
  const [guideBusy, setGuideBusy] = useState(false);

  function load() {
    api.getUserDetail(id).then(setDetail).catch((e) => setError(e.message));
    api.getUserOverview(id).then(setOverview).catch((e) => setError(e.message));
    api.getUserActivity(id).then(setActivity).catch((e) => setError(e.message));
    api.getUserNotes(id).then(setNotes).catch((e) => setError(e.message));
    api.wheelInspections(id).then(setInspections).catch(() => {});
  }

  useEffect(load, [id]);

  // End of rental from the client's page: same effect as in the wheel park (wheel back to the depot, box ordered to erase itself).
  async function handleEndRental() {
    setBusy(true);
    setError('');
    try {
      const all = await api.listWheels();
      const w = all.find((x) => x.owner && x.owner.id === id);
      if (!w) throw new Error(t('userDetail.noWheelAssigned'));
      setReturnWheel(w); // the return inspection ends the rental (see components/wheel/ReturnForm)
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
    if (!(await confirm(t('userDetail.deleteConfirmMessage'), { danger: true }))) return;
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

  async function handleDownloadGuide() {
    setGuideBusy(true); setError('');
    try { await api.downloadCommissioningGuide(); } catch (e) { setError(e.message); } finally { setGuideBusy(false); }
  }

  async function handleCopyAgentToken() {
    if (!detail.agent_token) return;
    await navigator.clipboard.writeText(detail.agent_token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button onClick={() => { setModule('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('userDetail.setupWizardBtn')}</Button>
          <Badge tone={STATUS_TONE[detail.status]}>{t(`users.${STATUS_TKEY[detail.status]}`)}</Badge>
          <Badge tone={detail.role === 'admin' ? 'blue' : 'neutral'}>{detail.role === 'admin' ? t('users.roleAdmin') : t('users.roleOperator')}</Badge>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {confirmDialog}
      {returnWheel && (
        <div className="modal-overlay" style={{ zIndex: 330 }}>
          <div className="modal-card" style={{ '--modal-w': '480px', background: '#F4F7FD' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#03041A' }}>{t('wheelOps.returnTitle')} · {returnWheel.serialNumber}</h3>
            <ReturnForm wheel={returnWheel} onCancel={() => setReturnWheel(null)} onDone={() => { setReturnWheel(null); load(); }} />
          </div>
        </div>
      )}

      <div className="tabs">
        {MODULES.map((m) => (
          <button key={m.key} className={`tab${module === m.key ? ' active' : ''}`} onClick={() => setModule(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {module === 'profile' && (
        <>
          {/* Hardware assignment: what this client has right now, the step-by-step commissioning (inline, resumes where things stand),
              the returns history, and the technical details folded away. */}
          <div className="ud-guide">
            <div className="ud-guide-icon" aria-hidden="true">📄</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="ud-guide-title">{t('userDetail.guideTitle')}</div>
              <div className="ud-guide-desc">{t('userDetail.guideDesc')}</div>
            </div>
            <Button disabled={guideBusy} onClick={handleDownloadGuide}>{guideBusy ? t('userDetail.guideDownloading') : t('userDetail.guideBtn')}</Button>
          </div>

          <div className="ud-hw-hero">
            <div>
              <div className="ud-hw-kicker">{t('userDetail.hwKicker')}</div>
              {detail.wheel_serial_number ? (
                <>
                  <div className="ud-hw-serial">{detail.wheel_serial_number}</div>
                  <div className="ud-hw-sub">{detail.wheel_model_number}{boxNameOf(detail.wheel_serial_number) ? ` · ${boxNameOf(detail.wheel_serial_number)}` : ''}</div>
                </>
              ) : (
                <>
                  <div className="ud-hw-serial" style={{ fontSize: 18 }}>{t('userDetail.noWheelAssigned')}</div>
                  <div className="ud-hw-sub">{t('userDetail.hwNoneHint')}</div>
                </>
              )}
            </div>
            <div className="ud-hw-actions">
              {overview && detail.wheel_serial_number && (
                <span className={`ud-hw-pill ${overview.wheel.connected ? 'on' : ''}`}>{overview.wheel.connected ? t('userDetail.onlineLabel') : t('userDetail.offlineLabel')}</span>
              )}
              {detail.wheel_serial_number && <button type="button" className="ud-hw-btn danger" disabled={busy} onClick={handleEndRental}>{t('userDetail.endRentalBtn')}</button>}
            </div>
          </div>

          <SetupWizard inline userId={id} onClose={load} onChanged={load} />

          <Card title={t('wheelOps.inspections')} className="mt-card">
            <InspectionList items={inspections} showWheel />
          </Card>

          <details className="ud-adv">
            <summary>{t('userDetail.hwAdvanced')}</summary>
          <div className="ud-token-row">
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

          </div>

          <BoxActivationCard userId={id} />

          <Card title={t('userDetail.wheelIdentityTitle')} className="mt-card">
            {detail.wheel_serial_number ? (
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
            ) : <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('userDetail.noWheelAssigned')}</p>}
          </Card>
          </details>
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
              <p>{t('userDetail.setupHelpStep1Desc')}</p>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#03041A', margin: '16px 0 6px' }}>{t('userDetail.setupHelpStep2Title')}</h4>
              <p>{t('userDetail.setupHelpStep2Line1')}</p>
              <pre style={{ background: '#03041A', color: '#E2E8F0', padding: '10px 12px', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>pbpaste | ssh pi@&lt;adresse-du-pi&gt; 'bash -s'</pre>
              <p>{t('userDetail.setupHelpStep2Line2')}</p>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#03041A', margin: '16px 0 6px' }}>{t('userDetail.setupHelpStep3Title')}</h4>
              <p>{t('userDetail.setupHelpStep3Line1')}</p>
              <p>{t('userDetail.setupHelpStep3Line2')}</p>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#03041A', margin: '16px 0 6px' }}>{t('userDetail.setupHelpStep4Title')}</h4>
              <p>{t('userDetail.setupHelpStep4Desc')}</p>

              <p style={{ marginTop: 16 }}>
                <button type="button" onClick={handleDownloadGuide} disabled={guideBusy} style={{ background: 'none', border: 'none', padding: 0, color: '#002881', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  {t('userDetail.setupHelpGuideLink')}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* A. Operational overview — no guest personal data, ever. */}
      {module === 'overview' && (
        <>
          <Card title={t('userDetail.clientProfileTitle')} className="mt-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
              <div><span style={{ color: '#94A3B8' }}>{t('userDetail.addressLabel')}</span><div>{detail.address || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>{t('userDetail.phoneLabel')}</span><div>{detail.phone || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>{t('userDetail.industryLabel')}</span><div>{detail.industry_sector || '—'}</div></div>
              <div><span style={{ color: '#94A3B8' }}>{t('userDetail.createdLabel')}</span><div>{formatDT(detail.created_at)}</div></div>
            </div>
          </Card>

        </>
      )}

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
