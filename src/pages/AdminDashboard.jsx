import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';

// Admin › Dashboard Admin: the SPARK cockpit. Everything follows the chosen period; recognized revenue, forecast and contractual recurring
// revenue are never added together; every KPI says how reliable it is and can show its formula.
const PRESETS = ['today', '7d', '30d', 'month', 'prevMonth', 'quarter', '6m', 'year', 'launch', 'custom'];
const MODEL_COLORS = { rent: '#2E6BFF', short: '#10B981', reseller_rent: '#F59E0B', activation: '#8B5CF6' };
const RELIABILITY_TONE = { real: 'green', computed: 'blue', estimated: 'orange', incomplete: 'red' };

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const eur = (c, d = 0) => (c === null || c === undefined ? '—' : (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: d, minimumFractionDigits: d }));
const num = (v, suffix = '') => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`);

// period + explicit comparison for each preset (the month-to-date one compares with the same number of days of the previous month)
function rangeFor(preset, from, to) {
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  if (preset === 'today') return { from: iso(now), to: iso(now) };
  if (preset === '7d') return { from: iso(addDays(now, -6)), to: iso(now) };
  if (preset === '30d') return { from: iso(addDays(now, -29)), to: iso(now) };
  if (preset === 'month') {
    const pm = new Date(y, m - 1, 1); const last = new Date(y, m, 0).getDate();
    return { from: iso(new Date(y, m, 1)), to: iso(now), compareFrom: iso(pm), compareTo: iso(new Date(pm.getFullYear(), pm.getMonth(), Math.min(now.getDate(), last))) };
  }
  if (preset === 'prevMonth') return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)), compareFrom: iso(new Date(y, m - 2, 1)), compareTo: iso(new Date(y, m - 1, 0)) };
  if (preset === 'quarter') return { from: iso(new Date(y, Math.floor(m / 3) * 3, 1)), to: iso(now) };
  if (preset === '6m') return { from: iso(addDays(now, -182)), to: iso(now) };
  if (preset === 'year') return { from: `${y}-01-01`, to: iso(now), compareFrom: `${y - 1}-01-01`, compareTo: iso(new Date(y - 1, m, now.getDate())) };
  if (preset === 'launch') return { from: '2026-01-01', to: iso(now), none: true };
  return { from, to };
}

function Delta({ cur, prev, money }) {
  const { t } = useTranslation('admin');
  if (prev === null || prev === undefined) return null;
  if (!prev) return <span style={{ fontSize: 12, color: '#94A3B8' }}>{t('adminDash.na')}</span>;
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  const up = d >= 0;
  return <span style={{ fontSize: 12, fontWeight: 600, color: up ? '#047857' : '#B91C1C' }}>{up ? '▲' : '▼'} {up ? '+' : ''}{d.toLocaleString(undefined, { maximumFractionDigits: 0 })} % {money ? '' : ''}<span style={{ fontWeight: 400, color: '#94A3B8' }}> {t('adminDash.vsPrev')}</span></span>;
}

function Kpi({ id, label, value, sub, cur, prev, money, reliability }) {
  const { t } = useTranslation('admin');
  const [open, setOpen] = useState(false);
  return (
    <div className="stat" style={{ position: 'relative' }}>
      <div className="stat-label" style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {reliability && <Badge tone={RELIABILITY_TONE[reliability]}>{t(`adminDash.rel.${reliability}`)}</Badge>}
          <button type="button" className="link-button" aria-label={t('adminDash.formulaBtn')} title={t('adminDash.formulaBtn')} onClick={() => setOpen((v) => !v)}>ⓘ</button>
        </span>
      </div>
      <div className="stat-value">{value}</div>
      {cur !== undefined && <Delta cur={cur} prev={prev} money={money} />}
      {sub && <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{sub}</div>}
      {open && <div style={{ fontSize: 12, color: '#334155', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, marginTop: 8, lineHeight: 1.5 }}>{t(`adminDash.formula.${id}`)}</div>}
    </div>
  );
}

function Ranking({ title, rows, linkBase }) {
  const { t } = useTranslation('admin');
  const max = Math.max(1, ...rows.map((r) => r.cents));
  return (
    <Card title={title} className="mt-card">
      {rows.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('adminDash.noData')}</p> : rows.map((r) => (
        <div key={r.id} style={{ marginBottom: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {linkBase ? <Link to={`${linkBase}${r.id}`}>{r.label}</Link> : <span>{r.label}</span>}<b>{eur(r.cents)}</b>
          </div>
          <div style={{ height: 5, borderRadius: 4, background: '#E2E8F0', marginTop: 3 }}><div style={{ width: `${(r.cents / max) * 100}%`, height: '100%', borderRadius: 4, background: '#2E6BFF' }} /></div>
        </div>
      ))}
    </Card>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation('admin');
  const [sp, setSp] = useSearchParams();
  const preset = sp.get('p') || 'month';
  const model = sp.get('model') || '';
  const reseller = sp.get('reseller') || '';
  const cmp = sp.get('cmp') || 'prev';
  const range = useMemo(() => rangeFor(preset, sp.get('from') || iso(addDays(new Date(), -29)), sp.get('to') || iso(new Date())), [preset, sp]);
  const [data, setData] = useState(null);
  const [resellers, setResellers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setParam = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const query = useMemo(() => {
    const q = new URLSearchParams({ from: range.from, to: range.to });
    if (cmp === 'none' || range.none) q.set('compare', 'none');
    else if (range.compareFrom) { q.set('compareFrom', range.compareFrom); q.set('compareTo', range.compareTo); }
    if (model) q.set('model', model);
    if (reseller) q.set('reseller', reseller);
    return q.toString();
  }, [range, cmp, model, reseller]);

  useEffect(() => { api.getCommercialResellers().then(setResellers).catch(() => {}); }, []);
  useEffect(() => {
    let live = true; setError('');
    api.getAdminDashboard(query).then((d) => live && setData(d)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [query]);

  async function exportCsv() { setBusy(true); try { await api.downloadAdminDashboardCsv(query); } catch (e) { setError(e.message); } finally { setBusy(false); } }

  const c = data && data.current; const p = data && data.previous;
  const rel = data ? data.reliability : {};
  const pieData = c ? Object.keys(MODEL_COLORS).map((k) => ({ key: k, value: c.bySource[k] || 0 })).filter((x) => x.value > 0) : [];
  const chart = data ? data.series.points.map((x) => ({ ...x, rent: x.rent / 100, short: x.short / 100, reseller_rent: x.reseller_rent / 100, activation: x.activation / 100, total: x.total / 100, api: x.api / 100 })) : [];
  const days = data ? data.period.days : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('adminDash.title')}</h1>
          <p className="page-subtitle">{t('adminDash.subtitle')}</p>
        </div>
        <Button variant="secondary" disabled={busy || !data} onClick={exportCsv}>{t('adminDash.exportCsv')}</Button>
      </div>

      <Card className="mt-card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('adminDash.period')}
            <select value={preset} onChange={(e) => setParam('p', e.target.value)} style={{ display: 'block' }}>{PRESETS.map((x) => <option key={x} value={x}>{t(`adminDash.presets.${x}`)}</option>)}</select></label>
          {preset === 'custom' && <>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('adminDash.from')}<input type="date" value={sp.get('from') || range.from} onChange={(e) => setParam('from', e.target.value)} style={{ display: 'block' }} /></label>
            <label style={{ fontSize: 12, color: '#64748B' }}>{t('adminDash.to')}<input type="date" value={sp.get('to') || range.to} onChange={(e) => setParam('to', e.target.value)} style={{ display: 'block' }} /></label>
          </>}
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('adminDash.compare')}
            <select value={cmp} onChange={(e) => setParam('cmp', e.target.value === 'prev' ? '' : e.target.value)} style={{ display: 'block' }}>
              <option value="prev">{t('adminDash.comparePrev')}</option><option value="none">{t('adminDash.compareNone')}</option></select></label>
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('adminDash.model')}
            <select value={model} onChange={(e) => setParam('model', e.target.value)} style={{ display: 'block' }}>
              <option value="">{t('adminDash.all')}</option>{Object.keys(MODEL_COLORS).map((k) => <option key={k} value={k}>{t(`adminDash.models.${k}`)}</option>)}</select></label>
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('adminDash.reseller')}
            <select value={reseller} onChange={(e) => setParam('reseller', e.target.value)} style={{ display: 'block' }}>
              <option value="">{t('adminDash.all')}</option>{resellers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        </div>
        {data && <p style={{ fontSize: 12, color: '#64748B', margin: '10px 0 0' }}>{data.period.from} → {data.period.to} ({days} {t('adminDash.days')}){data.compare ? ` · ${t('adminDash.comparedTo')} ${data.compare.from} → ${data.compare.to}` : ''}</p>}
      </Card>

      {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
      {!data && !error && <p className="page-subtitle">{t('common.loading')}</p>}

      {data && (
        <>
          {data.toComplete.length > 0 && (
            <div className="error-banner" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E', marginTop: 12 }}>
              <b>{t('adminDash.toCompleteTitle', { n: data.toComplete.length })}</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {data.toComplete.map((i, k) => (
                  <li key={k}>
                    {i.kind === 'noTerms' && <>{t('adminDash.todo.noTerms')} <Link to={`/users/${i.id}`}>{i.label}</Link></>}
                    {i.kind === 'noLotCost' && <>{t('adminDash.todo.noLotCost')} <Link to="/park">{i.label}</Link></>}
                    {i.kind === 'attributionRequest' && <>{t('adminDash.todo.attributionRequest', { n: i.count })} <Link to={`/users/${i.id}`}>{i.label}</Link></>}
                    {i.kind === 'apiNoTariff' && <>{t('adminDash.todo.apiNoTariff', { n: i.count })}</>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid-stats" style={{ marginTop: 12 }}>
            <Kpi id="recognized" label={t('adminDash.kpi.recognized')} value={eur(c.recognized)} cur={c.recognized} prev={p && p.recognized} reliability={rel.recognized} />
            <Kpi id="forecast" label={t('adminDash.kpi.forecast')} value={eur(data.forecastCents)} sub={t('adminDash.kpi.forecastSub')} reliability={rel.forecast} />
            <Kpi id="mrr" label={t('adminDash.kpi.mrr')} value={eur(data.mrrCents)} cur={data.mrrCents} prev={data.mrrPreviousCents} reliability={rel.mrr} />
            <Kpi id="contribution" label={t('adminDash.kpi.contribution')} value={eur(c.contribution)} cur={c.contribution} prev={p && p.contribution}
              sub={`${t('adminDash.kpi.apiCosts')} ${eur(c.apiCents)}${c.apiMissing ? ` · ${t('adminDash.kpi.apiMissing', { n: c.apiMissing })}` : ''}`} reliability={rel.contribution} />
          </div>
          <div className="grid-stats" style={{ marginTop: 12 }}>
            <Kpi id="rentals" label={t('adminDash.kpi.rentals')} value={num(c.rentals)} cur={c.rentals} prev={p && p.rentals} reliability="real" />
            <Kpi id="active" label={t('adminDash.kpi.activeUpcoming')} value={`${c.activeRentals} / ${c.upcomingRentals}`} sub={t('adminDash.kpi.now')} reliability="real" />
            <Kpi id="utilization" label={t('adminDash.kpi.utilization')} value={num(c.park.utilization, ' %')} cur={c.park.utilization} prev={p && p.park.utilization}
              sub={`${t('adminDash.kpi.realUse')} ${num(c.park.realUtilization, ' %')}`} reliability={rel.utilization} />
            <Kpi id="clients" label={t('adminDash.kpi.clients')} value={`${c.clientsActive} / ${c.resellers}`} sub={`+${c.newClients} ${t('adminDash.kpi.newClients')} · ${c.underResellers} ${t('adminDash.kpi.underResellers')}`} reliability="computed" />
          </div>
          <div className="grid-stats" style={{ marginTop: 12 }}>
            <Kpi id="avgShort" label={t('adminDash.kpi.avgShort')} value={eur(c.avgPerShortRental)} reliability="computed" />
            <Kpi id="activations" label={t('adminDash.kpi.activations')} value={num(c.activationsCount)} sub={eur(c.activationsCents)} cur={c.activationsCount} prev={p && p.activationsCount} reliability="real" />
            <Kpi id="apiRatio" label={t('adminDash.kpi.apiRatio')} value={num(c.apiRatio, ' %')} sub={`${t('adminDash.kpi.apiPerRental')} ${eur(c.apiPerRental, 2)}`} reliability={rel.api} />
            <Kpi id="coverage" label={t('adminDash.kpi.coverage')} value={`${data.parkProfit.coveredWheels} / ${data.parkProfit.wheelsWithCost}`} sub={data.parkProfit.withoutCost ? t('adminDash.kpi.noLotCost', { n: data.parkProfit.withoutCost }) : `${t('adminDash.kpi.initialCost')} ${eur(data.parkProfit.initialCostCents)}`} reliability={data.parkProfit.withoutCost ? 'incomplete' : 'computed'} />
          </div>

          <Card title={t('adminDash.chartRevenue')} className="mt-card">
            {chart.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('adminDash.noData')}</p> : (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 420px', height: 280, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bucket" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => `${Number(v).toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}`} /><Legend formatter={(k) => t(`adminDash.models.${k}`)} />
                      {Object.keys(MODEL_COLORS).map((k) => <Bar key={k} dataKey={k} stackId="rev" fill={MODEL_COLORS[k]} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: '1 1 220px', height: 280, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={pieData} dataKey="value" nameKey="key" innerRadius={50} outerRadius={90}>{pieData.map((x) => <Cell key={x.key} fill={MODEL_COLORS[x.key]} />)}</Pie>
                      <Tooltip formatter={(v, n) => [eur(v), t(`adminDash.models.${n}`)]} /></PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Ranking title={t('adminDash.topClients')} rows={data.rankings.clients} linkBase="/users/" />
            <Ranking title={t('adminDash.topResellers')} rows={data.rankings.resellers} linkBase="/users/" />
            <Ranking title={t('adminDash.topWheels')} rows={data.rankings.wheels} />
          </div>

          <Card title={t('adminDash.chartApi')} className="mt-card">
            {chart.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('adminDash.noData')}</p> : (
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bucket" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => Number(v).toLocaleString(undefined, { style: 'currency', currency: 'EUR' })} /><Legend />
                    <Bar dataKey="total" name={t('adminDash.kpi.recognized')} fill="#2E6BFF" /><Line dataKey="api" name={t('adminDash.kpi.apiCosts')} stroke="#EF4444" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card title={t('adminDash.parkTitle', { n: c.park.total })} className="mt-card">
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
              <span>{t('adminDash.parkRented')} <b>{c.park.rented}</b></span><span>{t('adminDash.parkAvailable')} <b>{c.park.available}</b></span>
              <span>{t('adminDash.parkMaintenance')} <b>{c.park.maintenance}</b></span><span>{t('adminDash.parkResellers')} <b>{c.park.atResellers}</b></span>
              <span>{t('adminDash.parkRentedDays')} <b>{c.park.rentedDays}</b></span><span>{t('adminDash.parkAvgDays')} <b>{num(c.park.avgDaysPerWheel)}</b></span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
