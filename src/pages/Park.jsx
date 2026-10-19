import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState, Stat } from '../components/ui';
import { useConfirm } from '../components/ConfirmDialog';
import ReturnForm from '../components/wheel/ReturnForm';
import InspectionList from '../components/wheel/InspectionList';
import WheelLabel from '../components/wheel/WheelLabel';
import PackWizard from '../components/PackWizard';
import ProfitabilityPanel, { WheelCostForm } from '../components/ProfitabilityPanel';
import './admin-premium.css';

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

const REASON_KEY = { 'end of rental': 'reasonEnd', reassigned: 'reasonReassigned', 'replaced by another wheel': 'reasonReplaced', 'account deleted': 'reasonDeleted' };

// Machine history: every rental of the wheel, newest first — who had it, for how long, how it ended and the return inspection
// filled in when it came back (stars, hardware, pack, photos) — then the day the wheel joined the park.
function WheelHistory({ wheel, navigate }) {
  const { t } = useTranslation('admin');
  const rentals = wheel.history || [];
  const inspections = wheel.inspections || [];
  const toMs = (v) => (parseDT(v) ? parseDT(v).getTime() : null);
  const inspectionOf = (h) => {
    if (!h.released_at) return null;
    const from = toMs(h.assigned_at); const to = toMs(h.released_at) + 60000;
    return inspections.find((i) => i.owner && i.owner.id === h.owner_id && toMs(i.createdAt) >= from - 1000 && toMs(i.createdAt) <= to) || null;
  };
  const used = new Set();
  const rows = rentals.map((h) => { const insp = inspectionOf(h); if (insp) used.add(insp.id); return { h, insp }; });
  const loose = inspections.filter((i) => !used.has(i.id)); // inspections that match no rental (should not happen)
  const rated = inspections.filter((i) => Number.isInteger(i.visualRating));
  const avg = rated.length ? (rated.reduce((n, i) => n + i.visualRating, 0) / rated.length).toFixed(1) : null;
  const days = (h) => { const a = toMs(h.assigned_at); const b = h.released_at ? toMs(h.released_at) : Date.now(); return Math.max(1, Math.round((b - a) / 86400000)); };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {[[t('wheelOps.statRentals'), rentals.length], [t('wheelOps.statReturns'), inspections.length], [t('wheelOps.statAvg'), avg ? `${avg} / 3` : '—']].map(([k, v]) => (
          <div key={k} style={{ flex: '1 1 120px', background: '#F4F7FD', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0055F8', marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 && <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{t('park.noHistory')}</p>}
      {rows.map(({ h, insp }) => (
        <div key={h.id} style={{ border: '1px solid #E3E9F7', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <button className="link-button" style={{ fontWeight: 800, fontSize: 14 }} onClick={() => navigate(`/users/${h.owner_id}`)}>{h.company || h.name || h.email || h.owner_id}</button>
            {h.released_at ? <Badge tone="neutral">{t(`wheelOps.${REASON_KEY[h.released_reason] || 'reasonEnd'}`)}</Badge> : <Badge tone="green">{t('park.historyCurrent')}</Badge>}
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3 }}>
            {h.released_at ? t('park.historyRange', { from: formatDT(h.assigned_at), to: formatDT(h.released_at) }) : t('park.historySince', { date: formatDT(h.assigned_at) })}
            {' · '}{t('wheelOps.durationDays', { count: days(h) })}
          </div>
          {h.released_at && (
            <div style={{ marginTop: 10, borderTop: '1px solid #EEF1F8', paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#002881', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('wheelOps.returnReport')}</div>
              {insp ? <InspectionList items={[insp]} /> : <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{t('wheelOps.noReturnReport')}</p>}
            </div>
          )}
        </div>
      ))}

      {loose.length > 0 && (
        <div style={{ border: '1px solid #E3E9F7', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#002881', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('wheelOps.otherReports')}</div>
          <InspectionList items={loose} />
        </div>
      )}

      <div style={{ fontSize: 12.5, color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>{t('wheelOps.addedToPark', { date: formatDT(wheel.createdAt) })}</div>
    </div>
  );
}

function WheelDetailModal({ wheelId, wheels, onClose, onChanged, onPrepare }) {
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
  const [tab, setTab] = useState('details');

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
      try {
        await api.assignWheel(wheelId, clientId);
      } catch (e) {
        // the pack's box has not confirmed the erase of the previous client: the admin may insist (the new client's data still waits for the erase)
        if (e.code !== 'WIPE_PENDING' || !(await confirm(t('park.forceConfirm'), { danger: true, confirmLabel: t('park.forceBtn') }))) throw e;
        await api.assignWheel(wheelId, clientId, { force: true });
      }
      setClientId('');
      setMsg(t('park.assignedMsg'));
      load(); onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const [returning, setReturning] = useState(false);
  const [label, setLabel] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '620px' }}>
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

            <div className="tabs" style={{ marginBottom: 4 }}>
              <button type="button" className={`tab${tab === 'details' ? ' active' : ''}`} onClick={() => setTab('details')}>{t('wheelOps.tabDetails')}</button>
              <button type="button" className={`tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>{t('wheelOps.tabHistory')}</button>
              <button type="button" className={`tab${tab === 'profit' ? ' active' : ''}`} onClick={() => setTab('profit')}>{t('profit.tabProfit')}</button>
            </div>

            {tab === 'details' && (
              <>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '12px 0 0' }}>
              <Badge tone={w.packReady ? 'green' : 'orange'}>{w.packReady ? t('park.packReady') : t('park.packToPrepare')}</Badge>
              <Button size="sm" variant={w.packReady ? 'ghost' : 'secondary'} onClick={() => onPrepare(w.id)}>{w.packReady ? t('park.packReviewBtn') : t('park.packPrepareBtn')}</Button>
            </div>

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

              </>
            )}

            {tab === 'history' && <WheelHistory wheel={w} navigate={navigate} />}
            {tab === 'profit' && <WheelCostForm wheelId={w.id} onChanged={onChanged} />}
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
  const [wizard, setWizard] = useState(null); // null | { wheelId: string | null }
  const [openId, setOpenId] = useState(null);
  const [tab, setTab] = useState('park'); // 'park' | 'profit'
  const [profit, setProfit] = useState({}); // wheelId -> { costCents, coveragePct }
  const [labelOf, setLabelOf] = useState(null);
  const [guideBusy, setGuideBusy] = useState(false);
  async function downloadGuide() { setGuideBusy(true); setError(''); try { await api.downloadCommissioningGuide(); } catch (e) { setError(e.message); } finally { setGuideBusy(false); } }

  function load() {
    api.listWheels().then(setWheels).catch((e) => setError(e.message));
    api.getParkProfitability().then((p) => setProfit(Object.fromEntries(p.wheels.map((w) => [w.wheelId, w])))).catch(() => {});
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000); // connection / box state stays fresh
    return () => clearInterval(timer);
  }, []);

  const count = (s) => (wheels || []).filter((w) => w.status === s).length;

  return (
    <div className="ap">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.park')}</h1>
          <p className="page-subtitle">{t('park.pageSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" disabled={guideBusy} onClick={downloadGuide}>{t('park.guideBtn')}</Button>
          <Button onClick={() => setWizard({ wheelId: null })}>{t('park.addBtn')}</Button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="tabs ap-tabs">
        <button className={`tab${tab === 'park' ? ' active' : ''}`} onClick={() => setTab('park')}>{t('profit.tabPark')}</button>
        <button className={`tab${tab === 'profit' ? ' active' : ''}`} onClick={() => setTab('profit')}>{t('profit.tabProfit')}</button>
      </div>
      {tab === 'profit' && <ProfitabilityPanel />}
      {!wheels && !error && <p className="page-subtitle">{t('common.loading')}</p>}

      {tab === 'park' && wheels && (
        <div className="grid-stats">
          <Stat label={t('park.statTotal')} value={wheels.length} />
          <Stat label={t('park.statAvailable')} value={count('available')} accent="blue" />
          <Stat label={t('park.statRented')} value={count('rented')} accent="green" />
          <Stat label={t('park.statMaintenance')} value={count('maintenance')} accent="orange" />
        </div>
      )}

      {tab === 'park' && wheels && (
        <Card className="mt-card">
          {wheels.length === 0 ? (
            <EmptyState title={t('park.empty')} description={t('park.emptyDesc')} action={<Button onClick={() => setWizard({ wheelId: null })}>{t('park.addBtn')}</Button>} />
          ) : (
            <table className="data-table ap-rows">
              <thead>
                <tr>
                  <th>{t('park.colSerial')}</th><th>{t('park.colModel')}</th><th>{t('park.colStatus')}</th>
                  <th>{t('park.colClient')}</th><th>{t('park.colConnection')}</th><th>{t('park.colBox')}</th><th>{t('profit.colCost')}</th><th>{t('profit.colCoverage')}</th><th>{t('wheelOps.labelColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {wheels.map((w) => (
                  <tr key={w.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(w.id)}>
                    <td style={{ fontWeight: 600, ...MONO }}>
                      {w.serialNumber}
                      {!w.packReady && <div style={{ marginTop: 3, fontFamily: 'inherit' }}><Badge tone="orange">{t('park.packToPrepare')}</Badge></div>}
                    </td>
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
                    <td>{profit[w.id] ? (profit[w.id].costCents === null ? <Badge tone="orange">{t('profit.toFill')}</Badge> : (profit[w.id].costCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' })) : '—'}</td>
                    <td>{profit[w.id] && profit[w.id].coveragePct !== null ? `${profit[w.id].coveragePct.toLocaleString(undefined, { maximumFractionDigits: 1 })} %` : '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}><Button size="sm" variant="secondary" onClick={() => setLabelOf(w)}>{t('wheelOps.labelShowBtn')}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {wizard && <PackWizard wheelId={wizard.wheelId} onClose={() => { setWizard(null); load(); }} onChanged={load} onLabel={(w) => setLabelOf(w)} />}
      {labelOf && <WheelLabel wheel={labelOf} onClose={() => setLabelOf(null)} />}
      {openId && <WheelDetailModal wheelId={openId} wheels={wheels} onClose={() => setOpenId(null)} onChanged={load} onPrepare={(id) => { setOpenId(null); setWizard({ wheelId: id }); }} />}
    </div>
  );
}
