import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState, Stat } from '../components/ui';
import { useConfirm } from '../components/ConfirmDialog';
import ReturnForm from '../components/wheel/ReturnForm';
import InspectionList from '../components/wheel/InspectionList';
import WheelLabel from '../components/wheel/WheelLabel';

const STATUS_TONE = { available: 'blue', rented: 'green', maintenance: 'orange' };
const STATUS_TKEY = { available: 'statusAvailable', rented: 'statusRented', maintenance: 'statusMaintenance' };
const MONO = { fontFamily: 'var(--font-mono)', fontSize: 12 };

function parseDT(s) { return s ? new Date(s.replace(' ', 'T') + 'Z') : null; }
function formatDT(s) {
  const d = parseDT(s);
  return d ? d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

function Dot({ on }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6, background: on ? 'var(--green)' : '#CBD5E1' }} />;
}

// What the box column says for a wheel: the lot's box name, and where it stands for the client who has the wheel.
function BoxCell({ wheel }) {
  const { t } = useTranslation('admin');
  const b = wheel.box;
  if (!b) return <span style={{ color: 'var(--text-light)' }}>{t('park.boxNone')}</span>;
  let state;
  if (!wheel.owner) state = wheel.boxReset && wheel.boxReset.state === 'pending'
    ? <Badge tone="orange">{t('park.boxResetPending')}</Badge>
    : <Badge tone="neutral">{t('park.boxFree')}</Badge>;
  else if (!b.activated) state = <Badge tone="orange">{t('park.boxNotActivated')}</Badge>;
  else state = <Badge tone={b.seen ? 'green' : 'neutral'}>{b.seen ? t('park.boxOnline') : t('park.boxOffline')}</Badge>;
  return (
    <div>
      <div style={MONO}>{b.name}</div>
      <div style={{ marginTop: 3 }}>{state}</div>
    </div>
  );
}

function AddWheelModal({ onClose, onCreated }) {
  const { t } = useTranslation('admin');
  const [mode, setMode] = useState('generate');
  const [series, setSeries] = useState('1');
  const [model, setModel] = useState('PF-ALPHA-V1');
  const [serial, setSerial] = useState('');
  const [key, setKey] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const payload = mode === 'generate'
        ? { series, notes }
        : { modelNumber: model, serialNumber: serial, securityKey: key, notes };
      const w = await api.createWheel(payload);
      onCreated(w);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const input = { width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
  const label = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', margin: '12px 0 4px' };
  const tab = (active) => ({ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--blue)' : '#E2E8F0'), background: active ? 'var(--blue-pale)' : '#fff', color: active ? 'var(--blue)' : '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#03041A' }}>{t('park.addTitle')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={tab(mode === 'generate')} onClick={() => setMode('generate')}>{t('park.addGenerate')}</button>
          <button type="button" style={tab(mode === 'typed')} onClick={() => setMode('typed')}>{t('park.addTyped')}</button>
        </div>
        {mode === 'generate' ? (
          <>
            <label style={label}>{t('park.seriesLabel')}</label>
            <input style={input} value={series} onChange={(e) => setSeries(e.target.value)} inputMode="numeric" />
            <p style={{ fontSize: 12, color: '#64748B', margin: '6px 0 0' }}>{t('park.seriesHelp')}</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#64748B', margin: '10px 0 0' }}>{t('park.typedHelp')}</p>
            <label style={label}>{t('park.modelLabel')}</label>
            <input style={input} value={model} onChange={(e) => setModel(e.target.value)} />
            <label style={label}>{t('park.serialLabel')}</label>
            <input style={{ ...input, ...MONO }} value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="PF260000152" />
            <label style={label}>{t('park.keyLabel')}</label>
            <input style={{ ...input, ...MONO }} value={key} onChange={(e) => setKey(e.target.value)} placeholder="K8Q7F3" />
          </>
        )}
        <label style={label}>{t('park.notesLabel')}</label>
        <input style={input} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose}>{t('park.cancelBtn')}</Button>
          <Button disabled={busy} onClick={submit}>{t('park.createBtn')}</Button>
        </div>
      </div>
    </div>
  );
}

function WheelDetailModal({ wheelId, wheels, onClose, onChanged }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [confirm, confirmDialog] = useConfirm();
  const [w, setW] = useState(null);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState([]);
  const [clientId, setClientId] = useState('');

  useEffect(() => { api.listUsers().then((rows) => setUsers(rows.filter((u) => u.status === 'approved'))).catch(() => {}); }, []);

  function load() {
    api.getWheel(wheelId).then((x) => { setW(x); setNotes(x.notes || ''); }).catch((e) => setError(e.message));
  }
  useEffect(load, [wheelId]);

  async function patch(payload) {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api.updateWheel(wheelId, payload);
      setMsg(t('park.savedMsg'));
      load();
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // The client's other wheel, if any (one wheel per account: it would go back to the depot).
  const clientCurrent = clientId ? (wheels || []).find((x) => x.owner && x.owner.id === clientId && x.id !== wheelId) : null;
  const clientLabel = (u) => [u.company, u.name, u.email].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');

  async function assign() {
    const text = w.owner ? t('park.confirmReassign', { from: w.owner.company || w.owner.name || w.owner.email }) : null;
    if (text && !(await confirm(text, { danger: true, confirmLabel: t('park.reassignBtn') }))) return;
    setBusy(true); setError(''); setMsg('');
    try {
      await api.assignWheel(wheelId, clientId);
      setClientId('');
      setMsg(t('park.assignedMsg'));
      load(); onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const [returning, setReturning] = useState(false);
  const [label, setLabel] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#03041A' }}>{t('park.detailTitle', { serial: w?.serialNumber || '' })}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {!w && !error && <p className="page-subtitle">{t('common.loading')}</p>}
        {w && (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <Badge tone={STATUS_TONE[w.status]}>{t(`park.${STATUS_TKEY[w.status]}`)}</Badge>
              {w.owner
                ? <button className="link-button" onClick={() => navigate(`/users/${w.owner.id}`)}>{w.owner.company || w.owner.name || w.owner.email}</button>
                : <span style={{ fontSize: 13, color: '#64748B' }}>{t('park.atDepot')}</span>}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: '#03041A', margin: '14px 0 6px' }}>{t('park.identityTitle')}</div>
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.8 }}>
              <div>{t('park.modelLabel')} : <strong style={{ color: '#03041A' }}>{w.modelNumber}</strong></div>
              <div>{t('park.serialLabel')} : <strong style={{ color: '#03041A', ...MONO }}>{w.serialNumber}</strong></div>
              <div>{t('park.keyLabel')} : <strong style={{ color: '#03041A', ...MONO }}>{w.securityKey}</strong></div>
              {w.box && <div>{t('park.colBox')} : <strong style={{ color: '#03041A', ...MONO }}>{w.box.name}</strong></div>}
            </div>

            {w.boxReset && (
              <p style={{ fontSize: 12, margin: '8px 0 0', color: w.boxReset.state === 'pending' ? '#B45309' : 'var(--green)' }}>
                {w.boxReset.state === 'pending'
                  ? t('park.boxResetPendingText', { date: formatDT(w.boxReset.createdAt) })
                  : t('park.boxResetDoneText', { date: formatDT(w.boxReset.confirmedAt) })}
              </p>
            )}

            <div style={{ fontSize: 12, fontWeight: 700, color: '#03041A', margin: '16px 0 6px' }}>{t('park.notesLabel')}</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <Button size="sm" disabled={busy || notes === (w.notes || '')} onClick={() => patch({ notes })}>{t('park.saveNotesBtn')}</Button>
              {!w.owner && w.status === 'available' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ status: 'maintenance' })}>{t('park.toMaintenanceBtn')}</Button>}
              {!w.owner && w.status === 'maintenance' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ status: 'available' })}>{t('park.backInServiceBtn')}</Button>}
              {msg && <span style={{ fontSize: 12, color: 'var(--green)' }}>{msg}</span>}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: '#03041A', margin: '18px 0 6px' }}>{t('park.assignTitle')}</div>
            {w.status === 'maintenance' ? (
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{t('park.maintenanceNoAssign')}</p>
            ) : (
              <>
                {w.owner && <p style={{ fontSize: 12, color: '#B45309', margin: '0 0 6px' }}>{t('park.wheelWithOther', { client: w.owner.company || w.owner.name || w.owner.email })}</p>}
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                >
                  <option value="">{t('park.chooseClient')}</option>
                  {users.filter((u) => !w.owner || u.id !== w.owner.id).map((u) => <option key={u.id} value={u.id}>{clientLabel(u)}</option>)}
                </select>
                {clientCurrent && <p style={{ fontSize: 12, color: '#B45309', margin: '6px 0 0' }}>{t('park.clientHasWheel', { serial: clientCurrent.serialNumber })}</p>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" disabled={busy || !clientId} onClick={assign}>{w.owner ? t('park.reassignBtn') : t('park.assignBtn')}</Button>
                  {w.owner && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setReturning(true)}>{t('park.releaseBtn')}</Button>}
                </div>
                <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0 0' }}>{t('park.afterAssignHint')}</p>
              </>
            )}

            <div style={{ fontSize: 12, fontWeight: 700, color: '#03041A', margin: '18px 0 6px' }}>{t('wheelOps.inspections')}</div>
            <InspectionList items={w.inspections} />

            <div style={{ fontSize: 12, fontWeight: 700, color: '#03041A', margin: '18px 0 6px' }}>{t('park.historyTitle')}</div>
            {w.history.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{t('park.noHistory')}</p>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {w.history.map((h) => (
                  <div key={h.id} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}>
                    <button className="link-button" onClick={() => navigate(`/users/${h.owner_id}`)}>{h.company || h.name || h.email || h.owner_id}</button>
                    <span style={{ color: '#64748B', fontSize: 12, textAlign: 'right' }}>
                      {h.released_at
                        ? t('park.historyRange', { from: formatDT(h.assigned_at), to: formatDT(h.released_at) })
                        : `${t('park.historySince', { date: formatDT(h.assigned_at) })} · ${t('park.historyCurrent')}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          {w && <Button variant="ghost" onClick={() => setLabel(true)}>{t('wheelOps.labelBtn')}</Button>}
          <Button variant="ghost" onClick={onClose}>{t('park.closeBtn')}</Button>
        </div>
      </div>
      {confirmDialog}
      {label && w && <WheelLabel wheel={w} onClose={() => setLabel(false)} />}
      {returning && w && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()} style={{ zIndex: 330 }}>
          <div className="modal-card" style={{ '--modal-w': '480px', background: '#F4F7FD' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#03041A' }}>{t('wheelOps.returnTitle')} · {w.serialNumber}</h3>
            <ReturnForm
              wheel={w}
              onCancel={() => setReturning(false)}
              onDone={(r) => { setReturning(false); setMsg(r.maintenance ? t('wheelOps.doneMaintenance') : t('park.releasedMsg')); load(); onChanged(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Park() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [wheels, setWheels] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [labelOf, setLabelOf] = useState(null);

  function load() { api.listWheels().then(setWheels).catch((e) => setError(e.message)); }
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000); // connection / box state stays fresh
    return () => clearInterval(timer);
  }, []);

  const count = (s) => (wheels || []).filter((w) => w.status === s).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.park')}</h1>
          <p className="page-subtitle">{t('park.pageSubtitle')}</p>
        </div>
        <Button onClick={() => setAdding(true)}>{t('park.addBtn')}</Button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!wheels && !error && <p className="page-subtitle">{t('common.loading')}</p>}

      {wheels && (
        <div className="grid-stats">
          <Stat label={t('park.statTotal')} value={wheels.length} />
          <Stat label={t('park.statAvailable')} value={count('available')} accent="blue" />
          <Stat label={t('park.statRented')} value={count('rented')} accent="green" />
          <Stat label={t('park.statMaintenance')} value={count('maintenance')} accent="orange" />
        </div>
      )}

      {wheels && (
        <Card className="mt-card">
          {wheels.length === 0 ? (
            <EmptyState title={t('park.empty')} description={t('park.emptyDesc')} action={<Button onClick={() => setAdding(true)}>{t('park.addBtn')}</Button>} />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('park.colSerial')}</th><th>{t('park.colModel')}</th><th>{t('park.colStatus')}</th>
                  <th>{t('park.colClient')}</th><th>{t('park.colConnection')}</th><th>{t('park.colBox')}</th>
                </tr>
              </thead>
              <tbody>
                {wheels.map((w) => (
                  <tr key={w.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(w.id)}>
                    <td style={{ fontWeight: 600, ...MONO }}>{w.serialNumber}</td>
                    <td>{w.modelNumber}</td>
                    <td><Badge tone={STATUS_TONE[w.status]}>{t(`park.${STATUS_TKEY[w.status]}`)}</Badge></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {w.owner
                        ? <button className="link-button" onClick={() => navigate(`/users/${w.owner.id}`)}>{w.owner.company || w.owner.name || w.owner.email}</button>
                        : <span style={{ color: 'var(--text-light)' }}>{t('park.atDepot')}</span>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div><Dot on={w.connected} />{w.connected ? t('park.connected') : t('park.notConnected')}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                        {w.lastSeenAt ? t('park.lastSeen', { date: formatDT(w.lastSeenAt) }) : t('park.neverSeen')}
                      </div>
                    </td>
                    <td><BoxCell wheel={w} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {adding && <AddWheelModal onClose={() => setAdding(false)} onCreated={(w) => { setAdding(false); setLabelOf(w); load(); }} />}
      {labelOf && <WheelLabel wheel={labelOf} onClose={() => setLabelOf(null)} />}
      {openId && <WheelDetailModal wheelId={openId} wheels={wheels} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}
