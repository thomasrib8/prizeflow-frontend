import { useTranslation } from 'react-i18next';
import './dynamic-distribution.css';

// Reference probability (%) and "unlimited" option of one case, for the dynamic distribution method.
export default function DynamicCaseFields({ probability, unlimited, onProbability, onUnlimited, readOnly = false }) {
  const { t } = useTranslation('admin');
  return (
    <div className="dyn-case" title={t('dynamic.unlimitedHint')}>
      <label className="dyn-prob">{t('dynamic.probability')}
        <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={probability === 0 || probability === null || probability === undefined ? '' : probability}
          placeholder="0" disabled={readOnly} onChange={(e) => onProbability(e.target.value)} />
      </label>
      <label className="dyn-check">
        <input type="checkbox" checked={!!unlimited} disabled={readOnly} onChange={(e) => onUnlimited(e.target.checked)} />
        <span>{t('dynamic.unlimited')}</span>
      </label>
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
