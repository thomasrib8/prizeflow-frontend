import { useEffect, useState } from 'react';
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

function SendDialog({ wheelId, options, onClose, onSent }) {
  const { t } = useTranslation('admin');
  const sources = [['client', options.client], ...(options.place ? [['place', options.place]] : []), ['free', EMPTY]];
  const [src, setSrc] = useState('client');
  const [f, setF] = useState({ ...EMPTY, ...options.client });
  const [pickup, setPickup] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = (k) => { setSrc(k); const s = sources.find(([x]) => x === k)[1]; setF({ ...EMPTY, ...s }); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api.sendWheelToShipr(wheelId, { consignee: f, plannedPickupDate: pickup || undefined, notes: notes || undefined }); onSent(); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  const field = (k, label, extra = {}) => <label className="ap-field">{label}<input value={f[k]} onChange={set(k)} {...extra} /></label>;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card ap" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ '--modal-w': '620px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{t('shipr.dialogTitle')}</h3>
        <p className="ap-hint" style={{ marginTop: 0 }}>{t('shipr.dialogHelp')}</p>
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
          <Button type="submit" disabled={busy}>{busy ? t('shipr.sending') : t('shipr.sendBtn')}</Button>
        </div>
      </form>
    </div>
  );
}

export default function ShiprShipping({ wheel, onChanged = () => {} }) {
  const { t } = useTranslation('admin');
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const shipping = wheel.assignment && wheel.assignment.shipping;
  useEffect(() => { api.getWheelShipping(wheel.id).then(setInfo).catch(() => setInfo(null)); }, [wheel.id, shipping && shipping.status]);
  if (!wheel.assignment || wheel.assignment.viaReseller) return null;
  async function refresh() {
    setBusy(true); setError('');
    try { await api.refreshWheelShipping(wheel.id); onChanged(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="shipr-card ap">
      <div className="shipr-head">
        <div>
          <div className="ud-hw-kicker" style={{ color: '#64748B' }}>{t('shipr.kicker')}</div>
          {shipping ? (
            <div className="shipr-line">
              <ShippingBadge shipping={shipping} />
              <b>{shipping.reference}</b>
              {shipping.carrier && <span>{shipping.carrier}{shipping.tracking ? ` · ${shipping.tracking}` : ''}</span>}
              {shipping.eta && <span>{t('shipr.eta', { date: shipping.eta })}</span>}
            </div>
          ) : (
            <div className="ap-sub">{info && !info.configured ? t('shipr.notConfigured') : t('shipr.notSent')}</div>
          )}
        </div>
        <div className="shipr-actions">
          {shipping ? (
            <>
              {shipping.url && <a className="btn btn-secondary btn-sm" href={shipping.url} target="_blank" rel="noopener noreferrer">{t('shipr.openBtn')}</a>}
              <Button size="sm" variant="secondary" disabled={busy} onClick={refresh}>{t('shipr.refreshBtn')}</Button>
            </>
          ) : (
            <Button size="sm" disabled={!info || !info.configured} onClick={() => setOpen(true)}>{t('shipr.sendBtn')}</Button>
          )}
        </div>
      </div>
      {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
      {open && info && info.options && <SendDialog wheelId={wheel.id} options={info.options} onClose={() => setOpen(false)} onSent={() => { setOpen(false); onChanged(); }} />}
    </div>
  );
}
