// A "chart" module: how the leads of the campaign spread over one data source (a segment, a form answer, the stars, the gifts, the days).
// Only aggregates come back from the server. The visualisation is the owner's choice (bars, donut, line).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { api } from '../../api/client';
import { CHART_COLORS } from './colors';
import FranceMap from './FranceMap';
import { recommendViz, allowedViz } from './recommend';

const clip = (v, n) => { const t = String(v); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
// Long labels (a gift's whole description) are cut with an ellipsis; the full text stays in the hover tooltip
const Tick = (n) => function TruncTick({ x, y, payload }) {
  return <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#334155"><title>{payload.value}</title>{clip(payload.value, n)}</text>;
};
const BarTick = Tick(26);
// % next to each slice of the donut; skipped on a thin slice (the hover tooltip always gives it)
const sliceLabel = (cx, cy, midAngle, outerRadius, percent) => {
  const RAD = Math.PI / 180; const r = outerRadius + 16;
  const x = cx + r * Math.cos(-midAngle * RAD); const y = cy + r * Math.sin(-midAngle * RAD);
  return <text x={x} y={y} fill="#334155" fontSize={12} fontWeight={700} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">{`${Math.round(percent * 100)}%`}</text>;
};

export const BUILTIN = { rating: 'dimRating', gift: 'dimGift', day: 'dimDay' };

export function sourceTitle(source, dimensions, t) {
  if (BUILTIN[source]) return t(`dashboard.${BUILTIN[source]}`);
  const d = (dimensions || []).find((x) => x.key === source);
  return d ? d.label : source.split(':').slice(1).join(':');
}

export default function ChartModule({ campaignId, config, dimensions, title, editing, onViz, bare }) {
  const { t } = useTranslation('admin');
  const [res, setRes] = useState(null);
  const [failed, setFailed] = useState(false);
  const { source, viz } = config;

  useEffect(() => {
    let alive = true;
    setRes(null); setFailed(false);
    api.dashboardModuleData(campaignId, source).then((r) => { if (alive) setRes(r); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [campaignId, source]);

  const heading = config.title || title || sourceTitle(source, dimensions, t);
  const rows = res ? (res.series || res.buckets || []) : [];
  const dim = (dimensions || []).find((d) => d.key === source) || (source.startsWith('segment:') ? { key: source, kind: 'segment', type: 'choice' } : { key: source, type: 'choice' });
  const allowed = allowedViz(dim);
  const kind = allowed.includes(viz) ? viz : allowed[0];
  const reco = res ? recommendViz(dim, res) : null;

  let body;
  if (failed) body = <div className="dash-empty">{t('dashboard.moduleError')}</div>;
  else if (!res) body = <div className="dash-empty">{t('common.loading')}</div>;
  else if (rows.length === 0 || rows.every((r) => !r.count)) body = <div className="dash-empty">{t('dashboard.noModuleData')}</div>;
  else if (kind === 'map') {
    body = <FranceMap buckets={res.buckets} answered={res.answered} level={dim.fieldType === 'fr_region' ? 'region' : 'department'} />;
  } else if (kind === 'column') {
    body = (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={rows} margin={{ top: 16, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(v) => clip(v, 12)} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: '#F4F7FD' }} />
          <Bar dataKey="count" fill="#0055F8" radius={[6, 6, 0, 0]} maxBarSize={44} label={{ position: 'top', fontSize: 11, fill: '#334155' }} />
        </BarChart>
      </ResponsiveContainer>
    );
  } else if (kind === 'donut') {
    const tot = rows.reduce((q, r) => q + r.count, 0);
    const few = rows.length <= 6; // too many slices: the % only shows when hovering a slice
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={2} stroke="none"
                labelLine={false} label={few ? ({ cx, cy, midAngle, outerRadius, percent }) => (percent >= 0.04 ? sliceLabel(cx, cy, midAngle, outerRadius, percent) : null) : false}>
                {rows.map((r, i) => <Cell key={r.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [`${v} · ${tot ? Math.round((v / tot) * 100) : 0}%`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 16px', fontSize: 12, marginTop: 2 }}>
          {rows.map((r, i) => (
            <span key={r.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={r.label}>
              <i style={{ width: 9, height: 9, borderRadius: 3, background: CHART_COLORS[i % CHART_COLORS.length], flex: 'none' }} />{clip(r.label, 26)}
            </span>
          ))}
        </div>
      </div>
    );
  } else if (kind === 'line') {
    body = (
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={rows} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F8" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => String(v).slice(5)} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#0055F8" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  } else {
    body = (
      <ResponsiveContainer width="100%" height={Math.max(150, rows.length * 30 + 24)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={170} tick={<BarTick />} tickLine={false} axisLine={false} interval={0} />
          <Tooltip cursor={{ fill: '#F4F7FD' }} />
          <Bar dataKey="count" fill="#0055F8" radius={[0, 6, 6, 0]} barSize={14} label={{ position: 'right', fontSize: 11, fill: '#334155' }} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const inner = (
    <>
      {editing && reco && reco.viz !== kind && onViz && (
        <div style={{ fontSize: 11.5, color: '#002881', background: '#EAF1FF', borderRadius: 8, padding: '5px 9px', marginBottom: 8 }}>
          ✦ {t('dashboard.recoPrefix')} {t(`dashboard.viz_${reco.viz}`)} — {t(`dashboard.${reco.reason}`, { n: reco.n })}{' '}
          <button type="button" onClick={() => onViz(reco.viz)} style={{ border: 'none', background: 'none', color: '#0055F8', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 11.5 }}>{t('dashboard.recoApply')}</button>
        </div>
      )}
      {body}
      {res && res.total > 0 && source !== 'day' && <div className="dash-chart-foot">{t('dashboard.answersOf', { answered: res.answered, total: res.total })}</div>}
    </>
  );
  // bare: inside another card (the phone app's Analytics), which brings its own frame and title style
  if (bare) return <><h2 className="pw-card-title" style={{ marginBottom: 14 }}>{heading}</h2>{inner}</>;
  return (
    <div className="card">
      <div className="card-head"><h3 className="card-title">{heading}</h3></div>
      {inner}
    </div>
  );
}
