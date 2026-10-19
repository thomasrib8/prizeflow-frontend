import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';
import { useConfirm } from '../components/ConfirmDialog';

// Admin › Catalogue des salons: the validation queue of what clients typed, correction, merge of duplicates, coordinates.
const STATUS_TONE = { imported: 'neutral', proposed: 'orange', verified: 'green', rejected: 'red', merged: 'neutral' };
const TABS = ['proposed', 'all', 'verified', 'imported', 'rejected'];
const lbl = { fontSize: 12, color: '#64748B' };

function Editor({ id, onClose, onChanged }) {
  const { t } = useTranslation('admin');
  const [confirm, confirmDialog] = useConfirm();
  const [d, setD] = useState(null);
  const [f, setF] = useState({});
  const [mergeQ, setMergeQ] = useState('');
  const [mergeList, setMergeList] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(() => api.getCatalogEntry(id).then((x) => { setD(x); const e = x.entry; setF({ name: e.name || '', venue: e.venue || '', address: e.address || '', postalCode: e.postal_code || '', city: e.city || '', country: e.country || '', lat: e.lat ?? '', lng: e.lng ?? '' }); }).catch((e) => setError(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (mergeQ.trim().length < 2) { setMergeList([]); return undefined; }
    const h = setTimeout(() => api.listCatalog(`q=${encodeURIComponent(mergeQ)}&limit=8`).then((r) => setMergeList(r.entries.filter((x) => x.id !== id && ['imported', 'proposed', 'verified'].includes(x.status)))).catch(() => {}), 250);
    return () => clearTimeout(h);
  }, [mergeQ, id]);
  const run = async (fn, close) => { setError(''); try { await fn(); onChanged(); if (close) onClose(); else await load(); } catch (e) { setError(e.message); } };
  const place = () => ({ name: f.name, venue: f.venue, address: f.address, postalCode: f.postalCode, city: f.city, country: f.country });

  if (!d) return <div className="modal-overlay" style={{ zIndex: 330 }}><div className="modal-card">{error || t('common.loading')}</div></div>;
  const e = d.entry;
  return (
    <div className="modal-overlay" style={{ zIndex: 330 }}>
      {confirmDialog}
      <div className="modal-card" style={{ '--modal-w': '640px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{e.name}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>{t('profit.close')}</Button>
        </div>
        <div style={{ margin: '6px 0 12px' }}><Badge tone={STATUS_TONE[e.status]}>{t(`catalog.status.${e.status}`)}</Badge> <span style={{ ...lbl }}>{t('catalog.origin')} : {e.provenance || '—'}{e.shared ? ` · ${t('catalog.shared')}` : ''}</span></div>
        {error && <div className="error-banner">{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[['name', 'colName'], ['venue', 'colVenue'], ['address', 'address'], ['postalCode', 'postalCode'], ['city', 'colCity'], ['country', 'country']].map(([k, key]) => (
            <label key={k} style={lbl}>{t(`catalog.${key}`)}<input value={f[k]} onChange={(ev) => setF({ ...f, [k]: ev.target.value })} style={{ display: 'block', width: '100%' }} /></label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          <Button size="sm" onClick={() => run(() => api.editCatalogEntry(id, place()))}>{t('common.save')}</Button>
          {['proposed', 'imported'].includes(e.status) && <Button size="sm" onClick={() => run(() => api.verifyCatalogEntry(id, place()), true)}>{t('catalog.verify')}</Button>}
          {e.status === 'proposed' && <Button size="sm" variant="secondary" onClick={async () => { if (await confirm(t('catalog.confirmReject'), { danger: true, confirmLabel: t('catalog.reject') })) run(() => api.rejectCatalogEntry(id), true); }}>{t('catalog.reject')}</Button>}
        </div>

        <div className="sw-label">{t('catalog.coordinates')} <Badge tone={e.geocode_status === 'found' || e.geocode_status === 'manual' ? 'green' : e.geocode_status === 'ambiguous' ? 'orange' : 'neutral'}>{t(`catalog.geo.${e.geocode_status}`)}</Badge></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={lbl}>lat<input type="number" step="any" value={f.lat} onChange={(ev) => setF({ ...f, lat: ev.target.value })} style={{ display: 'block', width: 120 }} /></label>
          <label style={lbl}>lng<input type="number" step="any" value={f.lng} onChange={(ev) => setF({ ...f, lng: ev.target.value })} style={{ display: 'block', width: 120 }} /></label>
          <Button size="sm" variant="secondary" disabled={f.lat === '' || f.lng === ''} onClick={() => run(() => api.editCatalogEntry(id, { lat: Number(f.lat), lng: Number(f.lng) }))}>{t('catalog.setCoords')}</Button>
          <Button size="sm" variant="secondary" onClick={() => run(() => api.regeocodeCatalogEntry(id))}>{t('catalog.regeocode')}</Button>
        </div>
        {d.candidates.length > 0 && e.geocode_status === 'ambiguous' && (
          <div style={{ marginTop: 8 }}>
            <div style={lbl}>{t('catalog.candidates')}</div>
            {d.candidates.map((c, i) => <div key={i} style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}><span style={{ flex: 1 }}>{c.label} ({Math.round(c.score * 100)} %)</span><Button size="sm" variant="ghost" onClick={() => run(() => api.editCatalogEntry(id, { lat: c.lat, lng: c.lng }))}>{t('catalog.useThis')}</Button></div>)}
          </div>
        )}

        {['proposed', 'imported', 'verified'].includes(e.status) && (
          <>
            <div className="sw-label" style={{ marginTop: 14 }}>{t('catalog.mergeTitle')}</div>
            <input value={mergeQ} placeholder={t('catalog.mergePh')} onChange={(ev) => setMergeQ(ev.target.value)} style={{ width: '100%' }} />
            {mergeList.map((m) => (
              <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 13, borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ flex: 1 }}><b>{m.name}</b> <span style={{ color: '#64748B' }}>{[m.venue, m.city].filter(Boolean).join(' · ')}</span></span>
                <Button size="sm" variant="secondary" onClick={async () => { if (await confirm(t('catalog.confirmMerge', { from: e.name, into: m.name }), { confirmLabel: t('catalog.merge') })) run(() => api.mergeCatalogEntry(id, m.id), true); }}>{t('catalog.merge')}</Button>
              </div>
            ))}
          </>
        )}
        {d.history.length > 0 && (
          <>
            <div className="sw-label" style={{ marginTop: 14 }}>{t('catalog.historyTitle')}</div>
            {d.history.slice(0, 12).map((h) => <div key={h.id} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>{String(h.created_at).slice(0, 16)} · {h.action}{h.field ? ` · ${h.field}: ${h.old_value ?? '∅'} → ${h.new_value ?? '∅'}` : ''}</div>)}
          </>
        )}
      </div>
    </div>
  );
}

export default function Catalog() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('proposed');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const load = useCallback(() => {
    const p = new URLSearchParams(); if (tab !== 'all') p.set('status', tab); if (q.trim()) p.set('q', q.trim()); p.set('limit', '200');
    api.listCatalog(p.toString()).then(setData).catch((e) => setError(e.message));
  }, [tab, q]);
  useEffect(() => { const h = setTimeout(load, 200); return () => clearTimeout(h); }, [load]);
  const counts = data ? data.counts : {};

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('catalog.title')}</h1><p className="page-subtitle">{t('catalog.subtitle')}</p></div>
        <Button variant="secondary" onClick={async () => { try { const r = await api.importCatalog(); setMsg(t('catalog.imported', { added: r.added, total: r.total })); load(); } catch (e) { setError(e.message); } }}>{t('catalog.importBtn')}</Button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="error-banner" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>{msg}</div>}
      <div className="tabs">
        {TABS.map((x) => <button key={x} className={`tab${tab === x ? ' active' : ''}`} onClick={() => setTab(x)}>{t(`catalog.tab.${x}`)}{x !== 'all' && counts[x] !== undefined ? ` (${counts[x]})` : ''}</button>)}
      </div>
      <Card className="mt-card">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('catalog.searchPh')} style={{ width: '100%', maxWidth: 360, marginBottom: 12 }} />
        {!data ? <p className="page-subtitle">{t('common.loading')}</p> : data.entries.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('catalog.empty')}</p> : (
          <table className="data-table">
            <thead><tr><th>{t('catalog.colName')}</th><th>{t('catalog.colVenue')}</th><th>{t('catalog.colCity')}</th><th>{t('catalog.colStatus')}</th><th>{t('catalog.coordinates')}</th><th></th></tr></thead>
            <tbody>{data.entries.map((e) => (
              <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => setEdit(e.id)}>
                <td style={{ fontWeight: 600 }}>{e.name}</td><td>{e.venue || '—'}</td><td>{e.city || '—'}</td>
                <td><Badge tone={STATUS_TONE[e.status]}>{t(`catalog.status.${e.status}`)}</Badge>{e.status === 'proposed' && <div style={{ fontSize: 11, color: '#64748B' }}>{e.submissions} {t('catalog.accounts')}</div>}</td>
                <td>{t(`catalog.geo.${e.geocode_status}`)}</td>
                <td><Button size="sm" variant="secondary">{t('profit.edit')}</Button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {data && data.total > data.entries.length && <p style={{ fontSize: 12, color: '#64748B' }}>{t('catalog.truncated', { n: data.entries.length, total: data.total })}</p>}
      </Card>
      {edit && <Editor id={edit} onClose={() => setEdit(null)} onChanged={load} />}
    </div>
  );
}
