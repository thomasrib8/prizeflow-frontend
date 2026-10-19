// Admin, on a client's page ("Attribution du matériel"): give this client a pack that was prepared once in the Parc hardware,
// and follow it. Nothing is configured on the hardware here: the pack follows its client by itself as soon as it is on and online.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';
import { useConfirm } from './ConfirmDialog';
import { Row, Check } from './wizardParts';
import HandoverSheet from './HandoverSheet';
import EventNameField, { EMPTY_PLACE, placePayload } from './EventNameField';
import './setup-wizard.css';

const clientName = (w) => (w.owner ? (w.owner.company || w.owner.name || w.owner.email) : '');
const declaredPayload = (name, place) => (name.trim() ? { name: name.trim(), ...placePayload(place) } : null);
const euroToCents = (v) => (v === '' || v === null || v === undefined ? null : Math.round(Number(v) * 100));
const fmtDay = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString([], { dateStyle: 'medium' }) : '');

export default function PackAssignment({ userId, clientLabel, onChanged, onEndRental }) {
  const { t } = useTranslation('admin');
  const [confirm, confirmDialog] = useConfirm();
  const [wheels, setWheels] = useState(null);
  const [overview, setOverview] = useState(null);
  const [box, setBox] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [changing, setChanging] = useState(false);
  const [pick, setPick] = useState('');
  const [note, setNote] = useState('');
  const [back, setBack] = useState('');
  const [price, setPrice] = useState(''); // own amount of this rental, in euros (optional)
  const [plannedId, setPlannedId] = useState('');
  const [placeName, setPlaceName] = useState(''); // place of a rental WITHOUT campaign (declared by the admin): feeds Locations Live
  const [place, setPlace] = useState(EMPTY_PLACE);
  const [planned, setPlanned] = useState([]);
  const [sheet, setSheet] = useState(null); // { password } once loaded
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    try {
      const [w, o] = await Promise.all([api.listWheels(), api.getUserOverview(userId)]);
      if (!alive.current) return;
      setWheels(w); setOverview(o);
      const mine = w.find((x) => x.owner && x.owner.id === userId);
      if (mine) { try { const b = await api.getBoxActivation(userId); if (alive.current) setBox(b.box); } catch { /* shown next time */ } }
    } catch (e) { if (alive.current) setError(e.message); }
  }, [userId]);

  useEffect(() => {
    load();
    api.listPlannedRentals().then((l) => alive.current && setPlanned(l.filter((p) => p.user_id === userId))).catch(() => {});
    api.getProfile().then((p) => alive.current && setMe(p && p.user ? p.user : p)).catch(() => {});
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const current = wheels ? wheels.find((w) => w.owner && w.owner.id === userId) || null : null;
  // keep the editable parameters in step with the saved ones when the pack changes
  useEffect(() => { setNote(current && current.assignment ? current.assignment.note || '' : ''); setBack(current && current.assignment ? current.assignment.expectedReturnAt || '' : ''); setPrice(current && current.assignment && current.assignment.priceOverrideCents !== null && current.assignment.priceOverrideCents !== undefined ? String(current.assignment.priceOverrideCents / 100) : ''); const dp = current && current.assignment && current.assignment.declaredPlace; setPlaceName(dp ? dp.name || '' : ''); setPlace(dp ? { catalogId: dp.catalogId || null, venue: dp.venue || '', address: dp.address || '', postalCode: dp.postalCode || '', city: dp.city || '', country: dp.country || 'France', status: null } : EMPTY_PLACE); }, [current && current.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const candidates = wheels ? wheels.filter((w) => !(w.owner && w.owner.id === userId)) : [];
  const pending = (w) => !w.owner && w.boxReset && w.boxReset.state === 'pending'; // its box has not confirmed the erase of the previous client
  const isReady = (w) => w.packReady && w.status === 'available' && !pending(w);
  const ready = candidates.filter(isReady);
  const others = candidates.filter((w) => !isReady(w));
  const reason = (w) => (w.status === 'maintenance' ? t('packAssign.reasonMaintenance') : w.owner ? t('packAssign.reasonRented', { client: clientName(w) }) : w.boxReset && w.boxReset.state === 'pending' ? t('packAssign.reasonWipe') : t('packAssign.reasonNotReady'));

  async function assign() {
    const w = wheels.find((x) => x.id === pick);
    if (!w) return;
    if (current && !(await confirm(t('packAssign.confirmChange', { from: current.serialNumber }), { danger: true, confirmLabel: t('packAssign.confirmChangeBtn') }))) return;
    setBusy(true); setError(''); setMsg('');
    try {
      await api.assignWheel(pick, userId, { note, expectedReturnAt: back, priceOverrideCents: euroToCents(price), plannedRentalId: plannedId || undefined, declaredPlace: declaredPayload(placeName, place) || undefined });
      setPick(''); setChanging(false); setMsg(t('packAssign.assignedMsg'));
      await load(); onChanged && onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function saveParams() {
    setBusy(true); setError(''); setMsg('');
    try { await api.updateWheelAssignment(current.id, { note, expectedReturnAt: back, priceOverrideCents: euroToCents(price), declaredPlace: declaredPayload(placeName, place) }); setMsg(t('packAssign.savedMsg')); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function showSheet() {
    if (sheet) { setSheet(null); return; }
    setError('');
    try { const r = await api.getPackWifi(current.id); setSheet({ password: r.password || '' }); } catch (e) { setError(e.message); }
  }

  const wheelConnected = !!(overview && overview.wheel && overview.wheel.connected);
  const hasActive = !!(overview && (overview.campaigns || []).some((c) => c.status === 'active'));
  const dirty = current && current.assignment && (note !== (current.assignment.note || '') || back !== (current.assignment.expectedReturnAt || '') || euroToCents(price) !== (current.assignment.priceOverrideCents ?? null) || placeName !== ((current.assignment.declaredPlace && current.assignment.declaredPlace.name) || ''));
  const showPicker = wheels && (!current || changing);

  return (
    <>
      {confirmDialog}
      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
      {!wheels && !error && <p className="page-subtitle">{t('common.loading')}</p>}

      {wheels && current && (
        <div className="ud-hw-hero">
          <div>
            <div className="ud-hw-kicker">{t('userDetail.hwKicker')}</div>
            <div className="ud-hw-serial">{current.serialNumber}</div>
            <div className="ud-hw-sub">{current.modelNumber}{current.box ? ` · ${current.box.name}` : ''}</div>
            {current.assignment && current.assignment.expectedReturnAt && <div className="ud-hw-sub">{t('packAssign.returnPlanned', { date: fmtDay(current.assignment.expectedReturnAt) })}</div>}
          </div>
          <div className="ud-hw-actions">
            <span className={`ud-hw-pill ${wheelConnected ? 'on' : ''}`}>{wheelConnected ? t('userDetail.onlineLabel') : t('userDetail.offlineLabel')}</span>
            <button type="button" className="ud-hw-btn" onClick={() => setChanging((v) => !v)}>{t('packAssign.changeBtn')}</button>
            <button type="button" className="ud-hw-btn danger" onClick={onEndRental}>{t('userDetail.endRentalBtn')}</button>
          </div>
        </div>
      )}

      {wheels && !current && (
        <div className="ud-hw-hero">
          <div>
            <div className="ud-hw-kicker">{t('userDetail.hwKicker')}</div>
            <div className="ud-hw-serial" style={{ fontSize: 18 }}>{t('userDetail.noWheelAssigned')}</div>
            <div className="ud-hw-sub">{t('packAssign.noneHint')}</div>
          </div>
        </div>
      )}

      {wheels && current && !changing && (
        <div className="sw-card sw-card-inline" style={{ marginTop: 14 }}>
          <div className="sw-title" style={{ marginBottom: 4 }}>{t('packAssign.statusTitle')}</div>
          <div className="sw-sub" style={{ marginBottom: 8 }}>{t('packAssign.statusIntro')}</div>
          <Check ok label={t('packAssign.checkAssigned', { serial: current.serialNumber })} />
          <Check ok={wheelConnected} label={t('setupWizard.checkWheel')} note={t('packAssign.waitPower')} />
          <Check ok={!!(box && box.seen)} label={t('packAssign.checkBox', { name: current.box ? current.box.name : '—' })} note={t('packAssign.waitPower')} />
          <Check ok={!!(box && box.inSync)} label={t('setupWizard.checkSync')} note={hasActive ? t('packAssign.waitSync') : t('setupWizard.syncPending')} />

          <div className="sw-label" style={{ marginTop: 16 }}>{t('packAssign.paramsTitle')}</div>
          <div className="sw-two">
            <div>
              <div className="sw-sub">{t('packAssign.noteLabel')}</div>
              <input className="sw-input" value={note} maxLength={300} placeholder={t('packAssign.notePh')} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div>
              <div className="sw-sub">{t('packAssign.returnLabel')}</div>
              <input className="sw-input" type="date" value={back} onChange={(e) => setBack(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="sw-sub">{t('packAssign.priceLabel')}</div>
            <input className="sw-input" type="number" min="0" step="0.01" value={price} placeholder={t('packAssign.pricePh')} onChange={(e) => setPrice(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="sw-sub">{t('packAssign.placeLabel')}</div>
            <EventNameField value={placeName} onChange={setPlaceName} place={place} onPlace={setPlace} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <Button size="sm" disabled={busy || !dirty} onClick={saveParams}>{t('packAssign.saveBtn')}</Button>
            <Button size="sm" variant="secondary" onClick={showSheet}>{sheet ? t('packAssign.hideSheetBtn') : t('packAssign.sheetBtn')}</Button>
            {msg && <span className="sw-sub" style={{ color: 'var(--green)' }}>{msg}</span>}
          </div>
          {sheet && (
            <>
              <div className="sw-label" style={{ marginTop: 16 }}>{t('setupWizard.sheetTitle')}</div>
              <HandoverSheet clientLabel={clientLabel} serial={current.serialNumber} boxName={current.box ? current.box.name : ''} password={sheet.password} phone={me && me.phone} />
            </>
          )}
        </div>
      )}

      {showPicker && (
        <div className="sw-card sw-card-inline" style={{ marginTop: 14 }}>
          <div className="sw-title" style={{ marginBottom: 4 }}>{current ? t('packAssign.changeTitle') : t('packAssign.pickTitle')}</div>
          {current && <div className="sw-warn" style={{ marginBottom: 8 }}>{t('packAssign.changeWarn', { serial: current.serialNumber })}</div>}
          {ready.length === 0 && <p className="sw-sub">{t('packAssign.noneReady')} <Link to="/park" style={{ color: '#002881' }}>{t('packAssign.goPark')}</Link></p>}
          {ready.map((w) => (
            <Row key={w.id} selected={pick === w.id} onClick={() => setPick(w.id)}>
              <div className="sw-mono">{w.serialNumber}</div>
              <div className="sw-sub">{t('packAssign.packLine', { name: w.box ? w.box.name : '—' })}</div>
            </Row>
          ))}
          {others.length > 0 && <div className="sw-label">{t('packAssign.unavailable')}</div>}
          {others.map((w) => (
            <div key={w.id} className="sw-row" style={{ opacity: 0.6, cursor: 'default' }}>
              <span className="sw-radio" aria-hidden="true">○</span>
              <div style={{ flex: 1 }}>
                <div className="sw-mono">{w.serialNumber}</div>
                <div className="sw-sub">{reason(w)}</div>
              </div>
            </div>
          ))}
          <div className="sw-label" style={{ marginTop: 14 }}>{t('packAssign.paramsTitle')}</div>
          <div className="sw-two">
            <div>
              <div className="sw-sub">{t('packAssign.noteLabel')}</div>
              <input className="sw-input" value={note} maxLength={300} placeholder={t('packAssign.notePh')} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div>
              <div className="sw-sub">{t('packAssign.returnLabel')}</div>
              <input className="sw-input" type="date" value={back} onChange={(e) => setBack(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="sw-sub">{t('packAssign.priceLabel')}</div>
            <input className="sw-input" type="number" min="0" step="0.01" value={price} placeholder={t('packAssign.pricePh')} onChange={(e) => setPrice(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
          {planned.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="sw-sub">{t('packAssign.plannedLabel')}</div>
              <select className="sw-input" value={plannedId} onChange={(e) => setPlannedId(e.target.value)} style={{ maxWidth: 320 }}>
                <option value="">—</option>
                {planned.map((pl) => <option key={pl.id} value={pl.id}>{fmtDay(pl.starts_on)}{pl.ends_on ? ` → ${fmtDay(pl.ends_on)}` : ''}</option>)}
              </select>
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <div className="sw-sub">{t('packAssign.placeLabel')}</div>
            <EventNameField value={placeName} onChange={setPlaceName} place={place} onPlace={setPlace} />
          </div>
          <div className="sw-foot">
            {current ? <Button variant="ghost" type="button" onClick={() => { setChanging(false); setPick(''); }}>{t('packAssign.cancelBtn')}</Button> : <span />}
            <Button type="button" disabled={busy || !pick} onClick={assign}>{t('packAssign.assignBtn')}</Button>
          </div>
          <div className="sw-sub">{t('packAssign.afterHint')}</div>
        </div>
      )}
    </>
  );
}
