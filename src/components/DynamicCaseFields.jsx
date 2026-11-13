import { useTranslation } from 'react-i18next';
import './dynamic-distribution.css';

const clamp = (n) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));

// Reference probability (%) and "unlimited" option of one case, for the dynamic distribution method.
// A large figure you can type in, a slider for quick adjustments, and a switch for "unlimited".
export default function DynamicCaseFields({ probability, unlimited, onProbability, onUnlimited, readOnly = false, color = '#0055F8' }) {
  const { t } = useTranslation('admin');
  const value = clamp(Number(probability));
  const shown = probability === 0 || probability === null || probability === undefined ? '' : probability;
  return (
    <div className={`dyn-case${readOnly ? ' ro' : ''}`} style={{ '--c': color, '--p': `${value}%` }}>
      <div className="dyn-prob-block">
        <div className="dyn-prob-head">
          <span className="dyn-dot" aria-hidden="true" />
          <span className="dyn-prob-label">{t('dynamic.probability')}</span>
        </div>
        <div className="dyn-prob-main">
          <label className="dyn-big">
            <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={shown} placeholder="0" disabled={readOnly}
              aria-label={t('dynamic.probability')} onChange={(e) => onProbability(e.target.value)} />
            <span aria-hidden="true">%</span>
          </label>
          <input className="dyn-range" type="range" min="0" max="100" step="0.5" value={value} disabled={readOnly}
            aria-label={t('dynamic.probability')} onChange={(e) => onProbability(String(e.target.value))} />
        </div>
      </div>
      <button type="button" role="switch" aria-checked={!!unlimited} disabled={readOnly} className={`dyn-switch${unlimited ? ' on' : ''}`}
        title={t('dynamic.unlimitedHint')} onClick={() => onUnlimited(!unlimited)}>
        <span className="dyn-switch-knob" aria-hidden="true" />
        <span>{t('dynamic.unlimited')}</span>
      </button>
    </div>
  );
}

// One stacked bar for the whole wheel: every case with its colour and share, what is still to give out, or the overflow.
// items: [{ key, label, color, value }]
export function DistributionBar({ items }) {
  const { t } = useTranslation('admin');
  const rows = items.map((i) => ({ ...i, v: Math.max(0, Number(i.value) || 0) })).filter((i) => i.v > 0);
  const units = items.reduce((a, i) => a + Math.round((Number(i.value) || 0) * 100), 0);
  const total = units / 100;
  const over = units > 10000;
  const free = Math.max(0, 10000 - units) / 100;
  const scale = over ? total : 100; // when over 100 the segments are shown relative to the real total
  const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <div className="dyn-dist" role="group" aria-label={t('dynamic.distributionTitle')}>
      <div className={`dyn-dist-bar${over ? ' over' : ''}`}>
        {rows.map((r) => (
          <span key={r.key} className="dyn-dist-seg" style={{ width: `${(r.v / scale) * 100}%`, background: r.color }} title={`${r.label} · ${fmt(r.v)} %`} />
        ))}
        {!over && free > 0 && <span className="dyn-dist-free" style={{ width: `${(free / 100) * 100}%` }} title={`${t('dynamic.unassigned')} · ${fmt(free)} %`} />}
      </div>
      <ul className="dyn-dist-legend">
        {rows.map((r) => (
          <li key={r.key}><i style={{ background: r.color }} /><span className="n">{r.label}</span><b>{fmt(r.v)} %</b></li>
        ))}
        {!over && free > 0 && <li className="free"><i /><span className="n">{t('dynamic.unassigned')}</span><b>{fmt(free)} %</b></li>}
        {over && <li className="bad"><span className="n">{t('dynamic.over', { diff: fmt(total - 100) })}</span></li>}
      </ul>
    </div>
  );
}

// Total of the reference probabilities, exact to the hundredth of a percent: green only at exactly 100.
export function ProbabilityTotal({ values }) {
  const { t } = useTranslation('admin');
  const units = values.reduce((a, v) => a + Math.round((Number(v) || 0) * 100), 0);
  const total = units / 100;
  const ok = units === 10000;
  const diff = Math.abs(10000 - units) / 100;
  return (
    <span className={`dyn-total${ok ? ' ok' : ''}`} title={t('dynamic.total')}>
      {t('dynamic.total')} : {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} %
      {' · '}{ok ? t('dynamic.totalOk') : units < 10000 ? t('dynamic.totalMissing', { diff }) : t('dynamic.totalOver', { diff })}
    </span>
  );
}

// Same rule as the server: probabilities adding up to exactly 100 %, two decimals at most. Returns '' or a message.
export function probabilityProblem(items, t) {
  for (const it of items) {
    const p = Number(it.probability) || 0;
    if (p < 0 || p > 100 || Math.abs(p * 100 - Math.round(p * 100)) > 1e-6) return t('dynamic.probabilityError', { n: it.n });
  }
  const units = items.reduce((a, it) => a + Math.round((Number(it.probability) || 0) * 100), 0);
  return units === 10000 ? '' : t('dynamic.sumError', { total: units / 100 });
}

// Heads-up when the MOST probable case is limited: its share will move down to the next level when it runs out.
export function TopCaseWarning({ items }) {
  const { t } = useTranslation('admin');
  const used = items.filter((i) => i.used);
  const top = used.reduce((m, i) => Math.max(m, Number(i.probability) || 0), 0);
  const limitedTop = top > 0 && used.some((i) => (Number(i.probability) || 0) === top && !i.unlimited) && !used.some((i) => (Number(i.probability) || 0) === top && i.unlimited);
  if (!limitedTop) return null;
  return <p className="dyn-help" style={{ background: '#FFF7E6', borderColor: '#FCD9A0', color: '#8A5200' }}>{t('dynamic.topCaseWarning', { p: top })}</p>;
}
