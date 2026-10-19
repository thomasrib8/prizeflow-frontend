import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

// "Nom de l'événement" with autocomplete over the shared catalogue (plus the account's own proposals). Choosing a suggestion pre-fills the
// place, which stays editable; free typing is never blocked. The place is saved with the campaign (copied: the catalogue can change later).
export const EMPTY_PLACE = { catalogId: null, venue: '', address: '', postalCode: '', city: '', country: 'France', status: null };

export function placeFromCampaign(c) {
  return { catalogId: c.event_catalog_id || null, venue: c.event_venue || '', address: c.event_address || '', postalCode: c.event_postal_code || '', city: c.event_city || '', country: c.event_country || 'France', status: c.event_address_status || null };
}
export function placePayload(p) { return { catalogId: p.catalogId || undefined, venue: p.venue, address: p.address, postalCode: p.postalCode, city: p.city, country: p.country }; }

const TO_CONFIRM = new Set(['lieu_habituel_a_confirmer', 'a_verifier', 'to_confirm', 'declared']);

export default function EventNameField({ value, onChange, place, onPlace }) {
  const { t } = useTranslation('admin');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [showPlace, setShowPlace] = useState(!!(place && (place.city || place.venue || place.address)));
  const seq = useRef(0);
  const box = useRef(null);

  useEffect(() => {
    const q = (value || '').trim();
    if (!open || q.length < 2) { setResults([]); return undefined; }
    const my = ++seq.current;
    const timer = setTimeout(() => {
      api.searchEvents(q).then((r) => { if (my === seq.current) setResults(Array.isArray(r) ? r : []); }).catch(() => { if (my === seq.current) setResults([]); });
    }, 220);
    return () => clearTimeout(timer);
  }, [value, open]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function pick(r) {
    onChange(r.name);
    onPlace({ catalogId: r.id, venue: r.venue || '', address: r.address || '', postalCode: r.postalCode || '', city: r.city || '', country: r.country || 'France', status: r.addressStatus });
    setShowPlace(true); setOpen(false); setResults([]);
  }
  const set = (k, v) => onPlace({ ...place, [k]: v, status: 'declared' });
  const unconfirmed = place && place.catalogId && TO_CONFIRM.has(place.status);

  return (
    <div ref={box}>
      <div className="field" style={{ position: 'relative' }}>
        <label>{t('newCampaign.eventNameLabel')}</label>
        <input value={value} autoComplete="off" onFocus={() => setOpen(true)}
          onChange={(e) => { onChange(e.target.value); setOpen(true); if (place && place.catalogId) onPlace({ ...place, catalogId: null, status: null }); }}
          placeholder={t('newCampaign.eventNamePlaceholder')} />
        {open && results.length > 0 && (
          <div role="listbox" style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 12px 30px -12px rgba(11,20,55,.35)', maxHeight: 300, overflowY: 'auto' }}>
            {results.map((r) => (
              <button key={r.id} type="button" role="option" onClick={() => pick(r)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 0, borderBottom: '1px solid #F1F5F9', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}{r.own && <span style={{ marginLeft: 8, fontSize: 11, color: '#B45309' }}>{t('eventField.ownProposal')}</span>}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{[r.venue, r.city].filter(Boolean).join(' · ')}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="link-button" style={{ fontSize: 12, marginBottom: 8 }} onClick={() => setShowPlace((v) => !v)}>
        {showPlace ? t('eventField.hidePlace') : t('eventField.showPlace')}
      </button>
      {showPlace && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          {unconfirmed && <div style={{ fontSize: 12, color: '#B45309', marginBottom: 8 }}>{t('eventField.toConfirm')}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('eventField.venue')}<input value={place.venue} onChange={(e) => set('venue', e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('eventField.address')}<input value={place.address} onChange={(e) => set('address', e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('eventField.postalCode')}<input value={place.postalCode} onChange={(e) => set('postalCode', e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('eventField.city')}<input value={place.city} onChange={(e) => set('city', e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('eventField.country')}<input value={place.country} onChange={(e) => set('country', e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>{t('eventField.help')}</div>
        </div>
      )}
    </div>
  );
}
