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
const KINDS = ['transport', 'repair', 'parts', 'other'];
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

function CostEditor({ row, onClose, onChanged }) {
  const { t } = useTranslation('admin');
  const [d, setD] = useState(null);
  const [cost, setCost] = useState('');
  const [acq, setAcq] = useState('');
  const [dc, setDc] = useState({ kind: 'transport', amount: '', incurredOn: today(), note: '' });
  const [error, setError] = useState('');
  const load = useCallback(() => api.getWheelProfitability(row.wheelId).then((x) => { setD(x); setCost(x.costCents === null ? '' : String(x.costCents / 100)); setAcq(x.acquiredOn || ''); }).catch((e) => setError(e.message)), [row.wheelId]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn) => { setError(''); try { await fn(); await load(); onChanged(); } catch (e) { setError(e.message); } };

  return (
    <div className="modal-overlay" style={{ zIndex: 330 }}>
      <div className="modal-card" style={{ '--modal-w': '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{row.serialNumber}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>{t('profit.close')}</Button>
        </div>
        {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
        {d && (
          <>
            <div className="sw-label">{t('profit.lotCost')}</div>
            <p className="ap-hint">{t('profit.lotHelp')}</p>
            <form onSubmit={(e) => { e.preventDefault(); run(() => api.setWheelCost(row.wheelId, { costCents: toCents(cost), acquiredOn: acq || undefined })); }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label>{t('profit.lotCostEur')}<input type="number" min="0" step="0.01" required value={cost} onChange={(e) => setCost(e.target.value)} style={{ display: 'block', width: 130 }} /></label>
              <label>{t('profit.acquiredOn')}<input type="date" value={acq} onChange={(e) => setAcq(e.target.value)} style={{ display: 'block' }} /></label>
              <Button type="submit" size="sm">{t('common.save')}</Button>
            </form>
            {d.costHistory.length > 1 && <p style={{ ...lbl, margin: '8px 0 0' }}>{t('profit.history')} : {d.costHistory.map((h) => `${eur(h.cost_cents)} (${h.valid_from})`).join(' · ')}</p>}

            <div className="sw-label" style={{ marginTop: 16 }}>{t('profit.directTitle')}</div>
            <form onSubmit={(e) => { e.preventDefault(); run(() => api.addWheelDirectCost(row.wheelId, { kind: dc.kind, amountCents: toCents(dc.amount), incurredOn: dc.incurredOn, note: dc.note || undefined }).then(() => setDc({ ...dc, amount: '', note: '' }))); }}
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label>{t('profit.kind')}<select value={dc.kind} onChange={(e) => setDc({ ...dc, kind: e.target.value })} style={{ display: 'block' }}>{KINDS.map((k) => <option key={k} value={k}>{t(`profit.kinds.${k}`)}</option>)}</select></label>
              <label>{t('profit.amountEur')}<input type="number" min="0.01" step="0.01" required value={dc.amount} onChange={(e) => setDc({ ...dc, amount: e.target.value })} style={{ display: 'block', width: 100 }} /></label>
              <label>{t('profit.date')}<input type="date" required value={dc.incurredOn} onChange={(e) => setDc({ ...dc, incurredOn: e.target.value })} style={{ display: 'block' }} /></label>
              <label>{t('profit.note')}<input value={dc.note} maxLength={200} onChange={(e) => setDc({ ...dc, note: e.target.value })} style={{ display: 'block', width: 150 }} /></label>
              <Button type="submit" size="sm">{t('profit.add')}</Button>
            </form>
            {d.directCosts.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                <span>{c.incurred_on}</span><b>{t(`profit.kinds.${c.kind}`)}</b><span>{eur(c.amount_cents)}</span><span style={{ color: '#64748B', flex: 1 }}>{c.note || ''}</span>
                <Button variant="ghost" size="sm" onClick={() => run(() => api.deleteWheelDirectCost(row.wheelId, c.id))}>{t('profit.remove')}</Button>
              </div>
            ))}
          </>
        )}
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
          <thead><tr><th>{t('park.colSerial')}</th><th>{t('profit.colCost')}</th><th>{t('profit.colRevenue')}</th><th>{t('profit.colApi')}</th><th>{t('profit.colDirect')}</th><th>{t('profit.colContribution')}</th><th>{t('profit.colCoverage')}</th><th>{t('profit.colDays')}</th><th></th></tr></thead>
          <tbody>{data.wheels.map((w) => (
            <tr key={w.wheelId}>
              <td style={{ fontWeight: 600 }}>{w.serialNumber}</td>
              <td>{w.costCents === null ? <Badge tone="orange">{t('profit.toFill')}</Badge> : eur(w.costCents)}</td>
              <td>{eur(w.revenueCents)}{w.forecastCents > 0 && <div style={{ ...lbl }}>+ {eur(w.forecastCents)} {t('profit.forecast')}</div>}</td>
              <td>{eur(w.apiCostCents)}{w.incomplete.apiWithoutCost > 0 && <div style={{ ...lbl, color: '#B45309' }}>{t('profit.apiIncomplete', { n: w.incomplete.apiWithoutCost })}</div>}</td>
              <td>{eur(w.directCostCents)}</td>
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
