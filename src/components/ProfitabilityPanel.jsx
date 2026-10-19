import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, Stat } from './ui';
import '../pages/admin-premium.css';

// Admin › Parc hardware › Rentabilité. Contribution is PARTIAL (revenue − API costs of the rentals − direct costs), never a net margin;
// a cost of the lot that was not entered is "à renseigner" (never 0). Amounts typed in euros, stored in cents.
const eur = (c) => (c === null || c === undefined ? '—' : (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' }));
const toCents = (v) => (v === '' || v === null || v === undefined ? null : Math.round(Number(v) * 100));
const today = () => new Date().toISOString().slice(0, 10);
const lbl = { fontSize: 12, color: '#64748B' };

function Coverage({ pct }) {
  const { t } = useTranslation('admin');
  if (pct === null || pct === undefined) return <Badge tone="orange">{t('profit.toFill')}</Badge>;
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ minWidth: 110 }}>
      <div className={`ap-progress${pct >= 100 ? '' : ''}`}><i style={{ width: `${w}%`, background: pct >= 100 ? 'linear-gradient(90deg,#10B981,#34D399)' : undefined }} /></div>
      <div className="ap-sub" style={{ marginTop: 3, color: pct < 0 ? '#B91C1C' : undefined }}>{pct.toLocaleString(undefined, { maximumFractionDigits: 1 })} %</div>
    </div>
  );
}

// The financial sheet of ONE wheel: cost of the lot (versioned) and what it has earned so far. Used in the wheel record and in the profitability table.
export function WheelCostForm({ wheelId, onChanged = () => {} }) {
  const { t } = useTranslation('admin');
  const [d, setD] = useState(null);
  const [cost, setCost] = useState('');
  const [acq, setAcq] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const load = useCallback(() => api.getWheelProfitability(wheelId).then((x) => { setD(x); setCost(x.costCents === null ? '' : String(x.costCents / 100)); setAcq(x.acquiredOn || ''); }).catch((e) => setError(e.message)), [wheelId]);
  useEffect(() => { load(); }, [load]);
  async function save(e) {
    e.preventDefault(); setError(''); setSaved(false);
    try { await api.setWheelCost(wheelId, { costCents: toCents(cost), acquiredOn: acq || undefined }); setSaved(true); await load(); onChanged(); setTimeout(() => setSaved(false), 2000); } catch (err) { setError(err.message); }
  }
  if (!d) return error ? <div className="error-banner">{error}</div> : <p className="page-subtitle">{t('common.loading')}</p>;
  return (
    <div className="ap">
      {error && <div className="error-banner">{error}</div>}
      <div className="ap-section-title" style={{ marginTop: 4 }}>{t('profit.lotCost')}</div>
      <p className="ap-hint">{t('profit.lotHelp')}</p>
      <form onSubmit={save} className="ap-bar" style={{ marginBottom: 6 }}>
        <label>{t('profit.lotCostEur')}<input type="number" min="0" step="0.01" required value={cost} onChange={(e) => setCost(e.target.value)} style={{ display: 'block', width: 140 }} /></label>
        <label>{t('profit.acquiredOn')}<input type="date" value={acq} onChange={(e) => setAcq(e.target.value)} style={{ display: 'block' }} /></label>
        <Button type="submit" size="sm">{t('common.save')}</Button>
        {saved && <span style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>{t('common.saved')}</span>}
      </form>
      {d.costHistory.length > 1 && <p className="ap-hint">{t('profit.history')} : {d.costHistory.map((h) => `${eur(h.cost_cents)} (${h.valid_from})`).join(' · ')}</p>}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 12 }}>
        <div className="stat"><div className="stat-label">{t('profit.colRevenue')}</div><div className="stat-value">{eur(d.revenueCents)}</div>{d.forecastCents > 0 && <div className="ap-sub">+ {eur(d.forecastCents)} {t('profit.forecast')}</div>}</div>
        <div className="stat"><div className="stat-label">{t('profit.colApi')}</div><div className="stat-value">{eur(d.apiCostCents)}</div>{d.incomplete.apiWithoutCost > 0 && <div className="ap-sub" style={{ color: '#B45309' }}>{t('profit.apiIncomplete', { n: d.incomplete.apiWithoutCost })}</div>}</div>
        <div className="stat"><div className="stat-label">{t('profit.colContribution')}</div><div className="stat-value" style={{ color: d.contributionCents < 0 ? '#B91C1C' : undefined }}>{eur(d.contributionCents)}</div></div>
        <div className="stat"><div className="stat-label">{t('profit.colCoverage')}</div><div style={{ marginTop: 4 }}><Coverage pct={d.coveragePct} /></div><div className="ap-sub">{d.rentedDays} {t('profit.colDays').toLowerCase()}</div></div>
      </div>
    </div>
  );
}

function CostEditor({ row, onClose, onChanged }) {
  const { t } = useTranslation('admin');
  return (
    <div className="modal-overlay" style={{ zIndex: 330 }}>
      <div className="modal-card" style={{ '--modal-w': '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{row.serialNumber}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>{t('profit.close')}</Button>
        </div>
        <WheelCostForm wheelId={row.wheelId} onChanged={onChanged} />
      </div>
    </div>
  );
}

export default function ProfitabilityPanel() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => api.getParkProfitability().then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  if (!data) return error ? <div className="error-banner">{error}</div> : <p className="page-subtitle">{t('common.loading')}</p>;
  const tot = data.totals;
  return (
    <>
      <div className="ap">
      <div className="grid-stats">
        <Stat label={t('profit.statCost')} value={eur(tot.initialCostCents)} />
        <Stat label={t('profit.statRevenue')} value={eur(tot.revenueCents)} accent="blue" />
        <Stat label={t('profit.statContribution')} value={eur(tot.contributionCents)} accent="green" />
        <Stat label={t('profit.statCovered')} value={`${tot.coveredWheels} / ${tot.wheels - tot.withoutCost}`} accent="orange" />
      </div>
      {tot.withoutCost > 0 && <div className="ap-warn">{t('profit.missingCosts', { n: tot.withoutCost })}</div>}
      <Card className="mt-card">
        <p className="ap-hint">{t('profit.disclaimer')}</p>
        <table className="data-table">
          <thead><tr><th>{t('park.colSerial')}</th><th>{t('profit.colCost')}</th><th>{t('profit.colRevenue')}</th><th>{t('profit.colApi')}</th><th>{t('profit.colContribution')}</th><th>{t('profit.colCoverage')}</th><th>{t('profit.colDays')}</th><th></th></tr></thead>
          <tbody>{data.wheels.map((w) => (
            <tr key={w.wheelId}>
              <td style={{ fontWeight: 600 }}>{w.serialNumber}</td>
              <td>{w.costCents === null ? <Badge tone="orange">{t('profit.toFill')}</Badge> : eur(w.costCents)}</td>
              <td>{eur(w.revenueCents)}{w.forecastCents > 0 && <div style={{ ...lbl }}>+ {eur(w.forecastCents)} {t('profit.forecast')}</div>}</td>
              <td>{eur(w.apiCostCents)}{w.incomplete.apiWithoutCost > 0 && <div style={{ ...lbl, color: '#B45309' }}>{t('profit.apiIncomplete', { n: w.incomplete.apiWithoutCost })}</div>}</td>
              <td style={{ fontWeight: 600, color: w.contributionCents < 0 ? '#B91C1C' : undefined }}>{eur(w.contributionCents)}</td>
              <td><Coverage pct={w.coveragePct} /></td>
              <td>{w.rentedDays}</td>
              <td><Button size="sm" variant="secondary" onClick={() => setEdit(w)}>{t('profit.edit')}</Button></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      {edit && <CostEditor row={edit} onClose={() => setEdit(null)} onChanged={load} />}
      </div>
    </>
  );
}
