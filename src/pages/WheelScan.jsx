// Page opened by scanning the QR code stuck on a wheel (admins only; signed-out visitors go through /login and come back).
// Built for the phone at the depot: who has the wheel, "end of rental" (with the return inspection) and "reassign".
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import ReturnForm from '../components/wheel/ReturnForm';
import InspectionList from '../components/wheel/InspectionList';
import WheelLabel from '../components/wheel/WheelLabel';
import '../components/wheel/wheel.css';

const parseDT = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z') : null);
const fmt = (s) => { const d = parseDT(s); return d ? d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'; };
const STATUS_KEY = { available: 'statusAvailable', rented: 'statusRented', maintenance: 'statusMaintenance' };

export default function WheelScan() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const location = useLocation();
  const { t } = useTranslation('admin');
  const [w, setW] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('view'); // view | return | assign
  const [result, setResult] = useState(null);
  const [users, setUsers] = useState([]);
  const [clientId, setClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState(false);

  const load = () => api.getWheel(id).then(setW).catch((e) => setError(e.message));
  useEffect(() => { if (user && isAdmin) load(); }, [id, user, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mode === 'assign' && users.length === 0) api.listUsers().then((rows) => setUsers(rows.filter((u) => u.status === 'approved'))).catch(() => {});
  }, [mode, users.length]);

  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const clientName = (o) => (o ? o.company || o.name || o.email : '');
  async function assign() {
    setBusy(true); setError('');
    try { await api.assignWheel(id, clientId); setClientId(''); setMode('view'); await load(); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <div className="wh-page">
      <div className="wh-hero">
        <div className="wh-hero-in">
          <small>{mode === 'return' ? `${t('wheelOps.returnTitle')} · ${t('wheelOps.returnSub')}` : t('nav.park')}</small>
          <h1>{w ? w.serialNumber : '…'}</h1>
          {w && <div>{w.modelNumber}{w.box ? ` · ${w.box.name}` : ''}</div>}
        </div>
      </div>
      <div className="wh-body">
        {error && <div className="wh-card wh-err" style={{ marginTop: 0 }}>{error}</div>}

        {result && (
          <div className="wh-card">
            <div style={{ fontWeight: 800, fontSize: 16 }}>{t('wheelOps.doneTitle')}</div>
            <p style={{ fontSize: 13.5, color: '#5B6788', margin: '8px 0 0' }}>{result.maintenance ? t('wheelOps.doneMaintenance') : t('wheelOps.doneAvailable')}</p>
            {result.boxReset && result.boxReset.state === 'pending' && <p style={{ fontSize: 13, color: '#5B6788', margin: '6px 0 0' }}>{t('wheelOps.doneBoxReset')}</p>}
            <button type="button" className="wh-btn primary" onClick={() => setResult(null)}>{t('wheelOps.backToWheel')}</button>
          </div>
        )}

        {w && !result && mode === 'view' && (
          <>
            <div className="wh-card">
              <span className={`wh-tag ${w.status}`}>{t(`park.${STATUS_KEY[w.status]}`)}</span>
              {w.owner ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 9 }}>{clientName(w.owner)}</div>
                  <div style={{ fontSize: 12.5, color: '#5B6788' }}>{t('wheelOps.since', { date: fmt(w.assignedAt) })}</div>
                </>
              ) : <div style={{ fontSize: 13.5, color: '#5B6788', marginTop: 9 }}>{t('park.atDepot')}</div>}
            </div>
            {w.owner && <button type="button" className="wh-btn danger" onClick={() => setMode('return')}>{t('wheelOps.endRentalBtn')}</button>}
            {w.status !== 'maintenance' && <button type="button" className="wh-btn out" onClick={() => setMode('assign')}>{w.owner ? t('wheelOps.reassignBtn') : t('wheelOps.assignBtn')}</button>}
            {!w.owner && w.status === 'maintenance' && (
              <button type="button" className="wh-btn out" onClick={() => api.updateWheel(id, { status: 'available' }).then(load).catch((e) => setError(e.message))}>{t('park.backInServiceBtn')}</button>
            )}
            <button type="button" className="wh-btn out" onClick={() => setLabel(true)}>{t('wheelOps.labelBtn')}</button>

            <div className="wh-lb" style={{ marginTop: 22 }}>{t('wheelOps.inspections')}</div>
            <div className="wh-card"><InspectionList items={w.inspections} /></div>
            <div className="wh-lb">{t('wheelOps.history')}</div>
            <div className="wh-card">
              {w.history.length === 0 ? <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{t('park.noHistory')}</p> : w.history.map((h) => (
                <div key={h.id} className="wh-tl"><i /><span><b style={{ color: '#03041A' }}>{h.company || h.name || h.email}</b><br />{h.released_at ? t('park.historyRange', { from: fmt(h.assigned_at), to: fmt(h.released_at) }) : t('park.historySince', { date: fmt(h.assigned_at) })}</span></div>
              ))}
            </div>
            <p className="wh-note"><Link to="/park" style={{ color: '#0055F8' }}>{t('wheelOps.backToPark')}</Link></p>
          </>
        )}

        {w && !result && mode === 'return' && (
          <>
            <ReturnForm wheel={w} onCancel={() => setMode('view')} onDone={(r) => { setResult(r); setMode('view'); load(); }} />
          </>
        )}

        {w && !result && mode === 'assign' && (
          <div className="wh-card">
            <div className="wh-lb">{t('park.assignTitle')}</div>
            {w.owner && <p style={{ fontSize: 12.5, color: '#9A5B00', margin: '0 0 8px' }}>{t('park.wheelWithOther', { client: clientName(w.owner) })}</p>}
            <select className="wh-sel" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">{t('park.chooseClient')}</option>
              {users.filter((u) => !w.owner || u.id !== w.owner.id).map((u) => <option key={u.id} value={u.id}>{[u.company, u.name, u.email].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</option>)}
            </select>
            <button type="button" className="wh-btn primary" disabled={busy || !clientId} onClick={assign}>{w.owner ? t('wheelOps.reassignBtn') : t('wheelOps.assignBtn')}</button>
            <button type="button" className="wh-btn out" disabled={busy} onClick={() => setMode('view')}>{t('wheelOps.cancel')}</button>
          </div>
        )}
      </div>
      {label && w && <WheelLabel wheel={w} onClose={() => setLabel(false)} />}
    </div>
  );
}
