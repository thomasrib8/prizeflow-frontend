// "Event profitability": what the event cost (typed here), the budgets the reps note in the leads' cards (a number field on the sales
// side) added up as forecast revenue — optionally weighted by the lead's stars — and the ROI that follows. Always labelled "forecast".
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

const money = (n) => (n === null || n === undefined ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
const INPUT = { border: '1.5px solid #E3E9F7', borderRadius: 8, padding: '6px 9px', fontWeight: 700, fontFamily: 'inherit', fontSize: 13, textAlign: 'right', background: '#fff', color: '#03041A', boxSizing: 'border-box' };

export default function ProfitabilityCard({ campaignId, readOnly = false, bare = false }) {
  const { t } = useTranslation('admin');
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);
  const latest = useRef(null);

  useEffect(() => {
    let alive = true;
    setData(null); setFailed(false);
    api.dashboardProfitability(campaignId).then((d) => { if (alive) setData(d); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; clearTimeout(timer.current); };
  }, [campaignId]);

  // Changes are saved a moment after the last keystroke; the server answers with the recomputed figures.
  const change = useCallback((patch) => {
    setData((d) => {
      const settings = { ...d.settings, ...patch };
      latest.current = settings;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        api.saveProfitability(campaignId, latest.current).then((r) => { setData((x) => (x ? { ...x, result: r.result, settings: { ...x.settings, fields: r.settings.fields } } : r)); setSaved(true); setTimeout(() => setSaved(false), 1500); }).catch(() => {});
      }, 700);
      return { ...d, settings };
    });
  }, [campaignId]);

  async function createField() {
    try { setData(await api.createBudgetField(campaignId)); } catch { setFailed(true); }
  }

  const Frame = ({ children, head }) => (bare ? <>{head && <h2 className="pw-card-title" style={{ marginBottom: 12 }}>{t('dashboard.profitTitle')}</h2>}{children}</> : <div className="card">{head && <div className="card-head"><h3 className="card-title">{t('dashboard.profitTitle')}</h3>{saved && <span style={{ fontSize: 11, color: 'var(--green)' }}>{t('dashboard.profitSaved')}</span>}</div>}{children}</div>);
  if (failed) return <Frame><div className="dash-empty">{t('dashboard.moduleError')}</div></Frame>;
  if (!data) return <Frame><div className="dash-empty">{t('common.loading')}</div></Frame>;

  const { settings: st, result: r } = data;
  const costs = st.costs.length ? st.costs : [{ label: '', amount: 0 }];
  const setCost = (i, patch) => change({ costs: costs.map((c, k) => (k === i ? { ...c, ...patch } : c)) });
  const detailed = costs.length > 1 || !!costs[0].label;
  const roi = r.roiPct;

  const sum = (k) => costs.reduce((n, c) => n + (Number(c[k]) || 0), 0);
  return (
    <Frame head>
      {!st.budgetField ? (
        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 10px' }}>{t('dashboard.profitNoField')}</p>
          {!readOnly && <button type="button" className="btn btn-sm btn-primary" onClick={createField}>{t('dashboard.profitCreateField')}</button>}
        </div>
      ) : (
        <>
          {readOnly ? (
            <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>{t('dashboard.profitCost')}</span><b>{money(sum('amount'))}</b></div>
          ) : (
          <div style={{ fontSize: 12.5, display: 'grid', gap: 8 }}>
            {costs.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {detailed
                  ? <input value={c.label} placeholder={t('dashboard.profitCostLabel')} maxLength={60} onChange={(e) => setCost(i, { label: e.target.value })} style={{ ...INPUT, textAlign: 'left', flex: 1, fontWeight: 500 }} />
                  : <span style={{ flex: 1 }}>{t('dashboard.profitCost')}</span>}
                <input type="number" min="0" inputMode="decimal" value={c.amount || ''} placeholder="0" onChange={(e) => setCost(i, { amount: e.target.value === '' ? 0 : Number(e.target.value) })} style={{ ...INPUT, width: 96 }} />
                <span style={{ color: '#64748B' }}>€</span>
                {detailed && costs.length > 1 && <button type="button" aria-label={t('dashboard.removeModule')} onClick={() => change({ costs: costs.filter((_, k) => k !== i) })} style={{ border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 15 }}>×</button>}
              </div>
            ))}
            <button type="button" onClick={() => change({ costs: [...costs, { label: '', amount: 0 }] })} style={{ justifySelf: 'start', border: 'none', background: 'none', color: '#002881', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>{detailed ? t('dashboard.profitAddLine') : t('dashboard.profitDetail')}</button>
          </div>
          )}

          <div style={{ borderTop: '1px solid #EEF1F8', marginTop: 12, paddingTop: 10, fontSize: 12.5, display: 'grid', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{t('dashboard.profitBudgets', { n: r.withBudget })}{!readOnly && st.fields.length > 1 && (
                <select value={st.budgetField} onChange={(e) => change({ budgetField: e.target.value })} style={{ marginLeft: 6, border: '1px solid #E3E9F7', borderRadius: 6, fontSize: 11, padding: '2px 4px', fontFamily: 'inherit' }}>
                  {st.fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              )}</span>
              <b>{money(r.raw)}</b>
            </div>
            {readOnly ? (st.weighting.enabled && <div style={{ color: '#475569' }}>{t('dashboard.profitWeight')} : 3★ {st.weighting.pct[3]} % · 2★ {st.weighting.pct[2]} % · 1★ {st.weighting.pct[1]} %</div>) : <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
              <input type="checkbox" checked={st.weighting.enabled} onChange={(e) => change({ weighting: { ...st.weighting, enabled: e.target.checked } })} style={{ width: 'auto', margin: 0 }} />
              <span>{t('dashboard.profitWeight')}</span>
            </label>}
            {!readOnly && st.weighting.enabled && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: '#475569' }}>
                {[3, 2, 1].map((star) => (
                  <span key={star} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{star}★
                    <input type="number" min="0" max="100" value={st.weighting.pct[star]} onChange={(e) => change({ weighting: { ...st.weighting, pct: { ...st.weighting.pct, [star]: Number(e.target.value) } } })} style={{ ...INPUT, width: 54, padding: '4px 6px' }} />%
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <b>{t('dashboard.profitForecast')}</b><b style={{ color: '#0055F8', fontSize: 17 }}>{money(r.forecast)}</b>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: roi === null ? '#94A3B8' : roi >= 0 ? '#1AA864' : '#E24B4A' }}>{roi === null ? '—' : `${roi > 0 ? '+ ' : ''}${roi} %`}</span>
            <span style={{ fontSize: 11.5, color: '#64748B' }}>
              {roi === null ? t('dashboard.profitNeedCost') : t('dashboard.profitRoi')}
              {r.costPerLead !== null && ` · ${t('dashboard.profitPerLead', { amount: money(r.costPerLead) })}`}
              {r.costPerQualified !== null && ` · ${t('dashboard.profitPerQualified', { amount: money(r.costPerQualified) })}`}
            </span>
          </div>
          <div className="dash-chart-foot">{t('dashboard.profitFoot')}</div>
        </>
      )}
    </Frame>
  );
}
