import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';

// Admin › Locations Live. Positions are DECLARED (event of the client's campaign, place typed on the rental, last known event, address of the
// reseller holding the wheel): never a GPS. Marker shape says how sure we are (filled = event in progress, hollow = last known position).
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs'); // published by vite.config.js (the worker is two files that must stay side by side)
const STATUS_COLORS = { event: '#2E6BFF', rented: '#0EA5E9', upcoming: '#F59E0B', reseller: '#8B5CF6', depot: '#64748B', maintenance: '#EF4444' };
const STATUSES = ['event', 'rented', 'upcoming', 'reseller', 'depot', 'maintenance'];
const eur = (c) => (c === null || c === undefined ? '—' : (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' }));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString([], { dateStyle: 'medium' }) : '—');

function fc(features) { return { type: 'FeatureCollection', features }; }

export default function Live() {
  const { t } = useTranslation('admin');
  const [sp, setSp] = useSearchParams();
  const mode = sp.get('mode') || 'live';
  const status = sp.get('status') || '';
  const reseller = sp.get('reseller') || '';
  const country = sp.get('country') || '';
  const q = sp.get('q') || '';
  const period = sp.get('period') || 'month';
  const histWheel = sp.get('wheel') || '';
  const setParam = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  const [data, setData] = useState(null);
  const [hist, setHist] = useState(null);
  const [resellers, setResellers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [styleInput, setStyleInput] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const box = useRef(null);
  const map = useRef(null);
  const didFit = useRef(false);

  const range = useMemo(() => {
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
    if (period === 'year') return { from: `${y}-01-01`, to: `${y}-12-31` };
    if (period === 'prevMonth') return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    if (period === 'all') return { from: '2026-01-01', to: iso(new Date(y + 1, 11, 31)) };
    return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
  }, [period]);

  const load = useCallback(() => {
    const p = new URLSearchParams(); if (status) p.set('status', status); if (reseller) p.set('reseller', reseller); if (country) p.set('country', country); if (q) p.set('q', q);
    api.getLive(p.toString()).then(setData).catch((e) => setError(e.message));
  }, [status, reseller, country, q]);
  useEffect(() => { load(); const h = setInterval(load, 60000); return () => clearInterval(h); }, [load]);
  useEffect(() => { api.getCommercialResellers().then(setResellers).catch(() => {}); }, []);
  useEffect(() => {
    if (mode !== 'history') { setHist(null); return; }
    const p = new URLSearchParams({ from: range.from, to: range.to }); if (histWheel) p.set('wheelId', histWheel); if (reseller) p.set('reseller', reseller);
    api.getLiveHistory(p.toString()).then(setHist).catch((e) => setError(e.message));
  }, [mode, range, histWheel, reseller]);
  useEffect(() => { if (!selected) { setDetail(null); return; } api.getLiveWheel(selected).then(setDetail).catch(() => setDetail(null)); }, [selected]);

  // ── map ──
  useEffect(() => {
    if (!data || map.current || !box.current) return undefined;
    setStyleInput(data.styleUrl || '');
    const m = new maplibregl.Map({ container: box.current, style: data.styleUrl, center: [2.5, 46.5], zoom: 4.2, attributionControl: { compact: true } });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('error', (e) => { if (e && e.error && /style|tile|fetch|Failed/i.test(String(e.error.message || e.error))) setMapError(t('live.mapError')); });
    m.on('load', () => {
      m.addSource('wheels', { type: 'geojson', data: fc([]), cluster: true, clusterRadius: 45, clusterMaxZoom: 12 });
      m.addSource('events', { type: 'geojson', data: fc([]), cluster: true, clusterRadius: 40, clusterMaxZoom: 12 });
      m.addSource('route', { type: 'geojson', data: fc([]) });
      const colorExpr = ['match', ['get', 'status'], ...Object.entries(STATUS_COLORS).flat(), '#64748B'];
      for (const src of ['wheels', 'events']) {
        m.addLayer({ id: `${src}-clusters`, type: 'circle', source: src, filter: ['has', 'point_count'], paint: { 'circle-color': src === 'wheels' ? '#1E40AF' : '#7C3AED', 'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 20, 26], 'circle-opacity': 0.88, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        m.addLayer({ id: `${src}-count`, type: 'symbol', source: src, filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#fff' } });
      }
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#7C3AED', 'line-width': 3, 'line-dasharray': [2, 1.5] } });
      m.addLayer({ id: 'events-points', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#7C3AED', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
      m.addLayer({ id: 'wheels-hollow', type: 'circle', source: 'wheels', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'level'], 2]], paint: { 'circle-color': '#ffffff', 'circle-radius': 8, 'circle-stroke-width': 3, 'circle-stroke-color': colorExpr } });
      m.addLayer({ id: 'wheels-filled', type: 'circle', source: 'wheels', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'level'], 1]], paint: { 'circle-color': colorExpr, 'circle-radius': 9, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
      m.addLayer({ id: 'wheels-selected', type: 'circle', source: 'wheels', filter: ['==', ['get', 'id'], ''], paint: { 'circle-color': 'rgba(0,0,0,0)', 'circle-radius': 14, 'circle-stroke-width': 3, 'circle-stroke-color': '#03041A' } });
      for (const src of ['wheels', 'events']) {
        m.on('click', `${src}-clusters`, (e) => {
          const f = m.queryRenderedFeatures(e.point, { layers: [`${src}-clusters`] })[0];
          m.getSource(src).getClusterExpansionZoom(f.properties.cluster_id).then((z) => m.easeTo({ center: f.geometry.coordinates, zoom: z })).catch(() => {});
        });
        m.on('mouseenter', `${src}-clusters`, () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', `${src}-clusters`, () => { m.getCanvas().style.cursor = ''; });
      }
      for (const layer of ['wheels-filled', 'wheels-hollow']) {
        m.on('click', layer, (e) => { const f = e.features && e.features[0]; if (f) setSelected(f.properties.id); });
        m.on('mouseenter', layer, () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', layer, () => { m.getCanvas().style.cursor = ''; });
      }
      setMapReady(true);
    });
    return undefined;
  }, [data, t]);
  useEffect(() => () => { if (map.current) { map.current.remove(); map.current = null; } }, []);

  // feed the map
  useEffect(() => {
    const m = map.current; if (!m || !mapReady || !data) return;
    const feats = data.wheels.filter((w) => w.position.level < 3).map((w) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [w.position.lng, w.position.lat] }, properties: { id: w.id, serial: w.serial, status: w.status, level: w.position.level } }));
    m.getSource('wheels').setData(fc(mode === 'history' ? [] : feats));
    if (!didFit.current && feats.length && mode !== 'history') {
      const b = new maplibregl.LngLatBounds(); feats.forEach((f) => b.extend(f.geometry.coordinates)); m.fitBounds(b, { padding: 60, maxZoom: 8, duration: 0 }); didFit.current = true;
    }
  }, [data, mapReady, mode]);
  useEffect(() => {
    const m = map.current; if (!m || !mapReady) return;
    const evs = hist ? hist.events.filter((e) => e.positioned).map((e) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lng, e.lat] }, properties: { name: e.name } })) : [];
    m.getSource('events').setData(fc(evs));
    m.getSource('route').setData(hist && hist.route.length > 1 ? fc([{ type: 'Feature', geometry: { type: 'LineString', coordinates: hist.route }, properties: {} }]) : fc([]));
    if (hist && evs.length) { const b = new maplibregl.LngLatBounds(); evs.forEach((f) => b.extend(f.geometry.coordinates)); m.fitBounds(b, { padding: 60, maxZoom: 9, duration: 600 }); }
  }, [hist, mapReady]);
  useEffect(() => {
    const m = map.current; if (!m || !mapReady) return;
    m.setFilter('wheels-selected', ['==', ['get', 'id'], selected || '']);
    const w = data && data.wheels.find((x) => x.id === selected);
    if (w && w.position.level < 3) m.flyTo({ center: [w.position.lng, w.position.lat], zoom: Math.max(m.getZoom(), 7), duration: 700 });
  }, [selected, mapReady, data]);

  async function saveStyle() { setError(''); try { await api.setLiveStyle(styleInput.trim()); window.location.reload(); } catch (e) { setError(e.message); } }

  const levelLabel = (p) => (p.level === 1 ? t('live.level1') : p.level === 2 ? t('live.level2') : t('live.level3'));
  const wheels = data ? data.wheels : [];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('live.title')}</h1><p className="page-subtitle">{t('live.subtitle')}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant={mode === 'live' ? 'primary' : 'secondary'} onClick={() => setParam('mode', '')}>{t('live.modeLive')}</Button>
          <Button variant={mode === 'history' ? 'primary' : 'secondary'} onClick={() => setParam('mode', 'history')}>{t('live.modeHistory')}</Button>
        </div>
      </div>
      <div className="error-banner" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>{t('live.notGps')}</div>
      {error && <div className="error-banner">{error}</div>}

      <Card className="mt-card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`tab${!status ? ' active' : ''}`} onClick={() => setParam('status', '')}>{t('live.all')}{data ? ` (${data.total})` : ''}</button>
          {STATUSES.map((s) => (
            <button key={s} className={`tab${status === s ? ' active' : ''}`} onClick={() => setParam('status', s)}>
              <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: STATUS_COLORS[s], marginRight: 6 }} />{t(`live.status.${s}`)}{data && data.counts[s] !== undefined && !status ? ` (${data.counts[s]})` : ''}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('live.reseller')}
            <select value={reseller} onChange={(e) => setParam('reseller', e.target.value)} style={{ display: 'block' }}><option value="">{t('live.allM')}</option>{resellers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('live.country')}<input value={country} onChange={(e) => setParam('country', e.target.value)} placeholder="France" style={{ display: 'block', width: 120 }} /></label>
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('live.search')}<input value={q} onChange={(e) => setParam('q', e.target.value)} placeholder={t('live.searchPh')} style={{ display: 'block', width: 200 }} /></label>
          {mode === 'history' && <>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('live.period')}
              <select value={period} onChange={(e) => setParam('period', e.target.value)} style={{ display: 'block' }}>
                <option value="month">{t('live.periodMonth')}</option><option value="prevMonth">{t('live.periodPrevMonth')}</option><option value="year">{t('live.periodYear')}</option><option value="all">{t('live.periodAll')}</option></select></label>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('live.route')}
              <select value={histWheel} onChange={(e) => setParam('wheel', e.target.value)} style={{ display: 'block' }}><option value="">{t('live.routeNone')}</option>{wheels.map((w) => <option key={w.id} value={w.id}>{w.serial}</option>)}</select></label>
          </>}
        </div>
      </Card>

      <div className="live-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 16, marginTop: 16 }}>
        <div style={{ position: 'relative', minHeight: 460 }}>
          <div ref={box} style={{ position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0', background: '#EEF3FF' }} />
          {mapError && <div style={{ position: 'absolute', left: 12, right: 12, top: 12, background: '#FEF3C7', color: '#92400E', borderRadius: 8, padding: 8, fontSize: 12 }}>{mapError}</div>}
          <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(255,255,255,.94)', borderRadius: 10, padding: '8px 10px', fontSize: 11.5, lineHeight: 1.7, boxShadow: '0 4px 14px rgba(11,20,55,.15)' }}>
            <div><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: '#2E6BFF', marginRight: 6 }} />{t('live.legendFilled')}</div>
            <div><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', border: '3px solid #2E6BFF', background: '#fff', boxSizing: 'border-box', marginRight: 6 }} />{t('live.legendHollow')}</div>
            {mode === 'history' && <div><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: '#7C3AED', marginRight: 6 }} />{t('live.legendEvent')}</div>}
          </div>
        </div>

        <div>
          {selected && detail ? (
            <Card title={detail.serial} className="mt-card" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge tone="blue">{t(`live.status.${detail.status}`)}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>{t('profit.close')}</Button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.8, marginTop: 8 }}>
                <div>{t('live.position')} : <b>{levelLabel(detail.position)}</b>{detail.position.label ? ` — ${detail.position.label}` : ''}{detail.position.asOf ? ` (${fmt(detail.position.asOf)})` : ''}</div>
                {detail.client && <div>{t('live.client')} : <Link to={`/users/${detail.client.id}`}>{detail.client.name}</Link></div>}
                {detail.holder && <div>{t('live.holder')} : <Link to={`/users/${detail.holder.id}`}>{detail.holder.name}</Link></div>}
                {detail.event && <div>{t('live.event')} : {detail.event.name}{detail.event.city ? ` · ${detail.event.city}` : ''}{detail.event.addressStatus && detail.event.addressStatus !== 'confirmed' ? <> <Badge tone="orange">{t('live.toConfirm')}</Badge></> : null}</div>}
                {detail.since && <div>{t('live.since')} {fmt(detail.since)}{detail.expectedReturn ? ` · ${t('live.returnPlanned')} ${fmt(detail.expectedReturn)}` : ''}</div>}
                {detail.upcoming && <div>{t('live.upcoming')} : {fmt(detail.upcoming.startsOn)} — {detail.upcoming.clientName}</div>}
                <div>{t('live.rentedDays')} : <b>{detail.rentedDays}</b> · {t('live.revenue')} : <b>{eur(detail.recognizedCents)}</b> · {t('live.apiCosts')} : {eur(detail.apiCostCents)}</div>
              </div>
              <p style={{ margin: '8px 0 0' }}><Link to="/park" onClick={() => {}}>{t('live.seeProfit')}</Link></p>
              {detail.events.length > 0 && (<>
                <div className="sw-label" style={{ marginTop: 12 }}>{t('live.events')}</div>
                {detail.events.slice(0, 8).map((e, i) => <div key={i} style={{ fontSize: 12.5, padding: '3px 0', color: '#334155' }}>{fmt(e.from)}{e.to ? ` → ${fmt(e.to)}` : ` → ${t('live.ongoing')}`} · {e.name}{e.city ? ` (${e.city})` : ''}{e.lat === null || e.lat === undefined ? ` · ${t('live.noPosition')}` : ''}</div>)}
              </>)}
            </Card>
          ) : null}

          {mode === 'history' && hist && (
            <Card title={t('live.zones')} className="mt-card">
              {hist.zones.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('live.noEvents')}</p> : hist.zones.map((z, i) => <div key={i} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span>{z.city || '—'}</span><b>{z.events} · {z.days} {t('live.days')}</b></div>)}
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>{hist.events.length} {t('live.eventsInPeriod')}{hist.noPosition ? ` · ${hist.noPosition} ${t('live.withoutPosition')}` : ''}</div>
            </Card>
          )}

          <Card title={`${t('live.wheels')}${data ? ` (${data.shown})` : ''}`} className="mt-card" style={!selected ? { marginTop: 0 } : undefined}>
            <button type="button" className="link-button live-drawer-toggle" style={{ display: 'none', marginBottom: 8 }} onClick={() => setListOpen((v) => !v)}>{listOpen ? t('live.hideList') : t('live.showList')}</button>
            <div className={`live-list${listOpen ? ' open' : ''}`} style={{ maxHeight: 520, overflowY: 'auto' }}>
              {!data ? <p className="page-subtitle">{t('common.loading')}</p> : wheels.length === 0 ? <p style={{ fontSize: 13, color: '#64748B' }}>{t('live.empty')}</p> : wheels.map((w) => (
                <button key={w.id} type="button" onClick={() => setSelected(w.id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: selected === w.id ? '#EEF3FF' : 'none', border: 0, borderBottom: '1px solid #F1F5F9', padding: '9px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: w.position.level === 2 ? '#fff' : STATUS_COLORS[w.status], border: `3px solid ${STATUS_COLORS[w.status]}`, boxSizing: 'border-box', flexShrink: 0 }} />
                    <b style={{ fontSize: 13 }}>{w.serial}</b><span style={{ fontSize: 12, color: '#64748B' }}>{t(`live.status.${w.status}`)}</span>
                    {w.position.level === 3 && <Badge tone="neutral">{t('live.noPosition')}</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginLeft: 18 }}>
                    {[w.client && w.client.name, w.holder && !w.client ? w.holder.name : null, (w.event && w.event.name) || (w.position.level === 2 && w.position.label)].filter(Boolean).join(' · ') || '—'}
                    {(w.event ? w.event.city : w.position.city) ? ` · ${w.event ? w.event.city : w.position.city}` : ''}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card title={t('live.mapSettings')} className="mt-card">
        <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 8px' }}>{t('live.styleHelp')}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={styleInput} onChange={(e) => setStyleInput(e.target.value)} placeholder="https://tiles.openfreemap.org/styles/liberty" style={{ flex: '1 1 320px' }} />
          <Button size="sm" variant="secondary" onClick={saveStyle}>{t('common.save')}</Button>
        </div>
      </Card>
      <style>{`@media (max-width: 900px) { .live-grid { grid-template-columns: 1fr !important; } .live-drawer-toggle { display: inline-block !important; } .live-list { display: none; } .live-list.open { display: block; } }`}</style>
    </div>
  );
}
