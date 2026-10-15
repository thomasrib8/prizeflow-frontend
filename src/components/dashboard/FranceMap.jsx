// Map of France coloured by the share of leads from each département (or région): the darker, the more leads come from there.
// A "Département" answer colours its département, a "Région" answer colours all the départements of that région.
// The overseas départements, too small for the map, are shown as tiles underneath.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import MAP from '../../data/frMap.json';
import { DEPARTMENTS, deptCodeOf } from '../../data/frGeo';

const DOM = ['971', '972', '973', '974', '976'];
const LOW = [234, 241, 255]; const HIGH = [0, 40, 129]; const MID = [0, 85, 248];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
// 0 -> very light blue, 1 -> deep Spark navy through Spark blue
export function shade(t) {
  const c = t < 0.5 ? mix(LOW, MID, t * 2) : mix(MID, HIGH, (t - 0.5) * 2);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// buckets [{label, count}] -> { byDept: {code: count}, byRegion: {name: count}, total }
export function geoCounts(buckets, level) {
  const byDept = {}; const byRegion = {};
  for (const b of buckets) {
    if (b.label === '…') continue;
    if (level === 'region') { byRegion[b.label] = (byRegion[b.label] || 0) + b.count; continue; }
    const code = deptCodeOf(b.label);
    const d = DEPARTMENTS.find((x) => x.code === code);
    if (!d) continue;
    byDept[code] = (byDept[code] || 0) + b.count;
    byRegion[d.region] = (byRegion[d.region] || 0) + b.count;
  }
  return { byDept, byRegion };
}

export default function FranceMap({ buckets, level = 'department', answered }) {
  const { t } = useTranslation('admin');
  const { byDept, byRegion } = useMemo(() => geoCounts(buckets, level), [buckets, level]);
  const total = answered || Object.values(level === 'region' ? byRegion : byDept).reduce((s, n) => s + n, 0);
  const valueOf = (code) => {
    const d = DEPARTMENTS.find((x) => x.code === code);
    if (!d) return 0;
    return level === 'region' ? (byRegion[d.region] || 0) : (byDept[code] || 0);
  };
  const values = Object.values(level === 'region' ? byRegion : byDept);
  const max = Math.max(1, ...values);
  const ranking = (level === 'region'
    ? Object.entries(byRegion).map(([name, n]) => ({ name, n }))
    : Object.entries(byDept).map(([code, n]) => { const d = DEPARTMENTS.find((x) => x.code === code); return { name: `${d.name} (${code})`, n }; }))
    .sort((a, b) => b.n - a.n).slice(0, 5);
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const labelOf = (code) => { const d = DEPARTMENTS.find((x) => x.code === code); return d ? (level === 'region' ? d.region : `${d.name} (${code})`) : code; };

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 220px', maxWidth: 440 }}>
        <svg viewBox={`0 0 ${MAP.width} ${MAP.height + 62}`} role="img" aria-label={t('dashboard.mapAria')} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {Object.entries(MAP.paths).map(([code, d]) => {
            const n = valueOf(code);
            return (
              <path key={code} d={d} fill={n ? shade(n / max) : '#F1F4FA'} stroke="#fff" strokeWidth="0.8" strokeLinejoin="round">
                <title>{`${labelOf(code)} · ${n} (${pct(n)} %)`}</title>
              </path>
            );
          })}
          {DOM.map((code, i) => {
            const n = valueOf(code);
            return (
              <g key={code} transform={`translate(${8 + i * 74},${MAP.height + 10})`}>
                <rect width="66" height="42" rx="9" fill={n ? shade(n / max) : '#F1F4FA'} stroke="#D4DEF5" strokeWidth="0.8"><title>{`${labelOf(code)} · ${n} (${pct(n)} %)`}</title></rect>
                <text x="33" y="27" textAnchor="middle" fontSize="17" fontWeight="700" fill={n && n / max > 0.45 ? '#fff' : '#334155'}>{code}</text>
              </g>
            );
          })}
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10.5, color: '#64748B' }}>
          <span>0</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${shade(0)}, ${shade(0.5)}, ${shade(1)})` }} />
          <span>{pct(max)} %</span>
        </div>
      </div>
      <div style={{ flex: '1 1 140px', minWidth: 140, fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: '#002881', marginBottom: 6 }}>{t('dashboard.mapTop')}</div>
        {ranking.length === 0 ? <div style={{ color: '#94A3B8' }}>{t('dashboard.noModuleData')}</div> : ranking.map((r, i) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F1F5F9' }}>
            <b style={{ width: 14, color: '#94A3B8' }}>{i + 1}</b><span style={{ flex: 1 }}>{r.name}</span><b>{pct(r.n)} %</b>
          </div>
        ))}
      </div>
    </div>
  );
}
