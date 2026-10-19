import { useEffect, useState } from 'react';
import LinkedInAdminCard from '../components/LinkedInAdminCard';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import WheelDiagnosticsRows from '../components/WheelDiagnosticsRows';
import { useConfirm } from '../components/ConfirmDialog';
import PackAssignment from '../components/PackAssignment';
import ReturnForm from '../components/wheel/ReturnForm';
import InspectionList from '../components/wheel/InspectionList';
import ContractTab from '../components/ContractTab';

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
    { key: 'contract', label: t('contract.tab') },
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
  const [inspections, setInspections] = useState([]);
  const [returnWheel, setReturnWheel] = useState(null);

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

      {module === 'contract' && <ContractTab userId={id} />}

      {module === 'profile' && (
        <>
          {/* Hardware assignment: what this client has right now, the step-by-step commissioning (inline, resumes where things stand),
              the returns history, and the technical details folded away. */}
          <PackAssignment userId={id} clientLabel={detail.company || detail.name || detail.email} onChanged={load} onEndRental={handleEndRental} />

          <Card title={t('wheelOps.inspections')} className="mt-card">
            <InspectionList items={inspections} showWheel />
          </Card>

          <details className="ud-adv">
            <summary>{t('userDetail.hwAdvanced')}</summary>
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
