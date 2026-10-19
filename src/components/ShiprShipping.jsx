import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';
import '../pages/admin-premium.css';
import '../pages/crm.css';

// Shipping of a pack through Shipr: one click creates the shipment draft there (international or special cases are finished in Shipr),
// and the delivery status comes back by itself as a small bubble.
const TONE = { DRAFT: ['#475569', '#F1F5F9'], READY: ['#0055F8', '#EAF1FF'], SCHEDULED: ['#B45309', '#FEF3C7'], PICKED_UP: ['#0369A1', '#E0F2FE'], IN_TRANSIT: ['#0055F8', '#DBEAFE'], CUSTOMS: ['#7C3AED', '#EDE9FE'], DELIVERED: ['#047857', '#D1FAE5'], CANCELLED: ['#B91C1C', '#FEE2E2'] };

export function ShippingBadge({ shipping, title }) {
  const { t } = useTranslation('admin');
  if (!shipping || !shipping.status) return null;
  const [fg, bg] = TONE[shipping.status] || TONE.DRAFT;
  return <span className="shipr-badge" style={{ color: fg, background: bg }} title={title || t('shipr.badgeTitle')}><i style={{ background: fg }} />{t(`shipr.status.${shipping.status}`)}</span>;
}

const EMPTY = { companyName: '', contactName: '', email: '', phone: '', address1: '', address2: '', postalCode: '', city: '', country: 'FR' };
const fmtAddr = (a) => (a ? [a.address1, [a.postalCode, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '');

function SendDialog({ wheelId, mode = 'out', sources, onClose, onSent }) {
  const { t } = useTranslation('admin');
  const [src, setSrc] = useState(sources[0][0]);
  const [f, setF] = useState({ ...EMPTY, ...sources[0][1] });
  const [pickup, setPickup] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = mode === 'return';
  const choose = (k) => { setSrc(k); setF({ ...EMPTY, ...sources.find(([x]) => x === k)[1] }); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api.sendWheelToShipr(wheelId, { [back ? 'sender' : 'consignee']: f, plannedPickupDate: pickup || undefined, notes: notes || undefined }, mode); onSent(); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  const field = (k, label, extra = {}) => <label className="ap-field">{label}<input value={f[k]} onChange={set(k)} {...extra} /></label>;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card ap" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ '--modal-w': '620px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{back ? t('shipr.returnDialogTitle') : t('shipr.dialogTitle')}</h3>
        <p className="ap-hint" style={{ marginTop: 0 }}>{back ? t('shipr.returnDialogHelp') : t('shipr.dialogHelp')}</p>
        <div className="crm-quick" style={{ marginBottom: 14 }}>
          {sources.map(([k]) => <button type="button" key={k} className={`crm-qp${src === k ? ' on' : ''}`} onClick={() => choose(k)}>{t(`shipr.src.${k}`)}</button>)}
        </div>
        <div className="ap-grid-form">
          {field('companyName', t('shipr.f.company'), { required: true })}
          {field('contactName', t('shipr.f.contact'))}
          {field('email', t('shipr.f.email'), { type: 'email' })}
          {field('phone', t('shipr.f.phone'))}
          {field('address1', t('shipr.f.address1'), { required: true })}
          {field('address2', t('shipr.f.address2'))}
          {field('postalCode', t('shipr.f.postalCode'), { required: true })}
          {field('city', t('shipr.f.city'), { required: true })}
          {field('country', t('shipr.f.country'), { required: true, maxLength: 20 })}
          <label className="ap-field">{t('shipr.f.pickup')}<input type="date" value={pickup} onChange={(e) => setPickup(e.target.value)} /></label>
        </div>
        <label className="ap-field" style={{ marginTop: 12 }}>{t('shipr.f.notes')}<input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} /></label>
        <p className="ap-hint">{t('shipr.intlHint')}</p>
        {error && <div className="error-banner">{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy ? t('shipr.sending') : back ? t('shipr.returnSendBtn') : t('shipr.sendBtn')}</Button>
        </div>
      </form>
    </div>
  );
}

const FLOW = ['DRAFT', 'READY', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
const MOVING = ['PICKED_UP', 'IN_TRANSIT', 'CUSTOMS'];

function Node({ kind, title, name, address, done }) {
  return (
    <div className={`jr-node${done ? ' done' : ''}`}>
      <div className="jr-ico" aria-hidden="true">
        {kind === 'depot'
          ? <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V21H3z" /><path d="M9 21v-6h6v6" /></svg>
          : <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>}
        {done && <i className="jr-check">✓</i>}
      </div>
      <div className="jr-kick">{title}</div>
      <div className="jr-name">{name || '—'}</div>
      <div className="jr-addr">{address || ''}</div>
    </div>
  );
}

// One journey: a node, an animated lane carrying the status, a node. `reverse` = the way back (the lane flows the other way).
function Journey({ title, reverse, left, right, shipping, onSend, sendLabel, canSend, onRefresh, busy }) {
  const { t } = useTranslation('admin');
  const st = shipping && shipping.status;
  const moving = !!st && MOVING.includes(st);
  const delivered = st === 'DELIVERED';
  const idx = st === 'CUSTOMS' ? FLOW.indexOf('IN_TRANSIT') : FLOW.indexOf(st);
  return (
    <section className={`jr-card${delivered ? ' delivered' : ''}`}>
      <div className="jr-title">{title}</div>
      <div className={`jr-row${reverse ? ' rev' : ''}`}>
        <Node {...left} done={delivered && reverse} />
        <div className={`jr-lane${moving ? ' moving' : ''}${delivered ? ' ok' : ''}${st ? '' : ' idle'}${reverse ? ' rev' : ''}`}>
          <div className="jr-track"><i /></div>
          {moving && <span className="jr-parcel" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg></span>}
          <div className="jr-status">
            {shipping ? <ShippingBadge shipping={shipping} /> : <button type="button" className="jr-send" disabled={!canSend} onClick={onSend}>{sendLabel}</button>}
          </div>
        </div>
        <Node {...right} done={delivered && !reverse} />
      </div>
      {shipping && (
        <>
          {st === 'CANCELLED'
            ? <div className="ap-warn" style={{ margin: '14px 0 0' }}>{t('shipr.cancelled')}</div>
            : <ol className="jr-steps">{FLOW.map((k, i) => <li key={k} className={i < idx ? 'past' : i === idx ? 'now' : ''}><i />{k === 'IN_TRANSIT' && st === 'CUSTOMS' ? t('shipr.status.CUSTOMS') : t(`shipr.status.${k}`)}</li>)}</ol>}
          <div className="jr-meta">
            <b>{shipping.reference}</b>
            {shipping.carrier && <span>{shipping.carrier}{shipping.tracking ? ` · ${shipping.tracking}` : ''}</span>}
            {shipping.eta && !delivered && <span>{t('shipr.eta', { date: shipping.eta })}</span>}
            {delivered && shipping.deliveredAt && <span>{t('shipr.deliveredOn', { date: new Date(shipping.deliveredAt).toLocaleDateString() })}</span>}
            <span style={{ flex: 1 }} />
            {shipping.url && <a className="btn btn-secondary btn-sm" href={shipping.url} target="_blank" rel="noopener noreferrer">{t('shipr.openBtn')}</a>}
            <Button size="sm" variant="secondary" disabled={busy} onClick={onRefresh}>{t('shipr.refreshBtn')}</Button>
          </div>
        </>
      )}
    </section>
  );
}

// The "Expédition" tab of a client: the pack's journey to the venue, and back to the depot.
export default function ShiprShipping({ userId }) {
  const { t } = useTranslation('admin');
  const [wheel, setWheel] = useState(null);
  const [info, setInfo] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dialog, setDialog] = useState(null); // 'out' | 'return'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const all = await api.listWheels();
      const mine = all.find((x) => x.owner && x.owner.id === userId) || null;
      setWheel(mine);
      setInfo(mine ? await api.getWheelShipping(mine.id) : null);
    } catch (e) { setError(e.message); } finally { setLoaded(true); }
  }, [userId]);
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, [load]);

  async function refresh(leg) {
    setBusy(true); setError('');
    try { await api.refreshWheelShipping(wheel.id, leg); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!loaded) return <p className="page-subtitle">{t('common.loading')}</p>;
  if (!wheel) return <div className="jr-empty ap">{t('shipr.noWheel')}</div>;
  if (info && info.viaReseller) return <div className="jr-empty ap">{t('shipr.viaReseller')}</div>;

  const dep = info && info.depot;
  const depotNode = { kind: 'depot', title: t('shipr.depot'), name: dep ? dep.name : t('shipr.noDepotName'), address: dep ? dep.address : t('shipr.noDepotHint') };
  const dest = info && info.destination;
  const o = info && info.options;
  const guess = dest || (o && (o.place || o.client)) || null;
  const venueNode = { kind: 'venue', title: t('shipr.venue'), name: guess ? (guess.label || guess.companyName) : '', address: fmtAddr(guess) };
  const sourcesOut = o ? [['client', o.client], ...(o.place ? [['place', o.place]] : []), ['free', EMPTY]] : [];
  const sourcesBack = o ? [...(dest ? [['dest', dest]] : []), ['client', o.client], ...(o.place ? [['place', o.place]] : []), ['free', EMPTY]] : [];
  const ready = info && info.configured;

  return (
    <div className="jr ap">
      <div className="jr-head">
        <img src="/shipr-logo.png" alt="Shipr" width="44" height="44" />
        <div>
          <h3>{t('shipr.panelTitle')}</h3>
          <p>{t('shipr.panelSub', { serial: wheel.serialNumber })}</p>
        </div>
      </div>
      {info && !info.configured && <div className="ap-warn">{t('shipr.notConfigured')}</div>}
      {error && <div className="error-banner">{error}</div>}

      <Journey title={t('shipr.journeyOut')} left={depotNode} right={venueNode} shipping={info && info.shipping} canSend={!!ready} sendLabel={t('shipr.sendBtn')} onSend={() => setDialog('out')} onRefresh={() => refresh('out')} busy={busy} />
      <Journey reverse title={t('shipr.journeyBack')} left={{ ...depotNode, title: t('shipr.depotBack') }} right={venueNode} shipping={info && info.returnShipping} canSend={!!ready && !!dep} sendLabel={t('shipr.returnSendBtn')} onSend={() => setDialog('return')} onRefresh={() => refresh('return')} busy={busy} />

      {dialog && o && <SendDialog wheelId={wheel.id} mode={dialog} sources={dialog === 'return' ? sourcesBack : sourcesOut} onClose={() => setDialog(null)} onSent={() => { setDialog(null); load(); }} />}
    </div>
  );
}
