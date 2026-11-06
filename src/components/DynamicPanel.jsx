import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, GiftPill } from './ui';
import './dynamic-distribution.css';

const pc = (v) => `${(Math.round(v * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} %`;
const pts = (v) => (Math.round(v * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Campaign page, dynamic distribution: per case the reference probability, the effective one (it moves when gifts run out), the stock, the wins
// and the weight received / transferred; alerts, restock, forecast and the timestamped history. Refreshes by itself while the campaign runs.
export default function DynamicPanel({ campaign, onChanged = () => {} }) {
  const { t } = useTranslation('admin');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [restock, setRestock] = useState(null); // { slotIndex, giftName, variants, variantId, add }
  const [busy, setBusy] = useState(false);
  const [participants, setParticipants] = useState('');
  const running = campaign.status === 'active' || campaign.status === 'paused';

  const load = useCallback(() => api.getDynamicState(campaign.id).then(setData).catch((e) => setError(e.message)), [campaign.id]);
  useEffect(() => { load(); }, [load, campaign.status]);
  useEffect(() => {
    if (campaign.status !== 'active') return undefined;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [campaign.status, load]);

  if (!data) return <p className="page-subtitle">{error || t('common.loading')}</p>;
  const cases = data.cases;
  const names = (idx) => idx.map((i) => (cases.find((c) => c.slotIndex === i) || {}).giftName).filter(Boolean).join(', ');
  const kindText = (m) => {
    const gift = m.giftName || t('dashboard.caseLabel', { n: (m.slotIndex ?? 0) + 1 });
    return t(`dynamic.kinds.${m.kind}`, { gift, delta: m.delta, stock: m.stockAfter });
  };
  const N = Number(participants) || 0;

  async function submitRestock(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.restockCampaign(campaign.id, { slotIndex: restock.slotIndex, add: Number(restock.add), ...(restock.variantId ? { variantId: restock.variantId } : {}) });
      setRestock(null);
      await load();
      onChanged();
    } catch (err) {
      setError(t(`dynamic.err.${err.code}`, { defaultValue: err.message, ...(err.free !== undefined ? {} : {}) }));
    } finally { setBusy(false); }
  }

  return (
    <div className="dyn-panel">
      {data.suspended && running && (
        <div className="dyn-alert stop"><b>{t('dynamic.suspendedTitle')}</b>{t('dynamic.suspendedBody')}</div>
      )}
      {!data.suspended && data.depleted.length > 0 && running && (
        <div className="dyn-alert warn"><b>{t('dynamic.depletedTitle')}</b>{t('dynamic.depletedBody', { names: names(data.depleted) })}</div>
      )}
      {error && <div className="error-banner">{error}</div>}

      <Card title={t('dynamic.title')}>
        <p className="ap-hint" style={{ marginTop: 0 }}>{t('dynamic.effectiveNote')}</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table dyn-table">
            <thead><tr>
              <th>{t('campaignDetail.tableCase')}</th><th>{t('common.gift')}</th>
              <th className="num">{t('dynamic.colRef')}</th><th className="num">{t('dynamic.colEffective')}</th>
              <th className="num">{t('dynamic.colStock')}</th><th className="num">{t('dynamic.colWins')}</th>
              <th>{t('dynamic.colWeights')}</th>{running && <th />}
            </tr></thead>
            <tbody>
              {cases.map((c) => {
                const moved = Math.abs(c.effectiveProbability - c.referenceProbability) > 1e-9;
                const up = c.effectiveProbability > c.referenceProbability + 1e-9;
                return (
                  <tr key={c.slotIndex} style={!c.available ? { opacity: 0.6 } : undefined}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{c.slotIndex + 1}</td>
                    <td><GiftPill slotIndex={c.slotIndex} name={c.giftName} /></td>
                    <td className="num">{pc(c.referenceProbability)}</td>
                    <td className={`num dyn-eff${moved ? (up ? ' up' : ' down') : ''}`}>{pc(c.effectiveProbability)}{moved ? (up ? ' ▲' : ' ▼') : ''}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{c.unlimited ? t('dynamic.unlimitedShort') : (c.stockRemaining === 0 ? <span className="dyn-short">0</span> : c.stockRemaining)}{!c.unlimited && <span style={{ color: '#94A3B8', fontWeight: 500 }}> / {c.stockInitial}</span>}</td>
                    <td className="num">{c.wins}</td>
                    <td>
                      {c.received > 0 && <div className="dyn-w in">{t('dynamic.received', { n: pts(c.received) })}</div>}
                      {c.transferred > 0 && <div className="dyn-w out">{t('dynamic.transferred', { n: pts(c.transferred) })}</div>}
                      {c.received <= 0 && c.transferred <= 0 && <span className="dyn-w">—</span>}
                    </td>
                    {running && (
                      <td>{!c.unlimited && (
                        <Button size="sm" variant="secondary" onClick={() => {
                          const slot = campaign.slots.find((s) => s.slot_index === c.slotIndex) || {};
                          const variants = slot.variants_enabled ? (slot.variants || []) : [];
                          setRestock({ slotIndex: c.slotIndex, giftName: c.giftName, variants, variantId: variants.length ? variants[0].id : '', add: '' });
                        }}>{t('dynamic.addStock')}</Button>
                      )}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="dyn-note">{t('dynamic.totalEffective', { n: pts(data.totalEffective) })}</p>
      </Card>

      <Card title={t('dynamic.forecastTitle')} className="mt-card">
        <div className="dyn-forecast">
          <label>{t('dynamic.forecastParticipants')} <input type="number" min="0" step="1" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="1000" /></label>
        </div>
        {N > 0 && (
          <table className="data-table">
            <thead><tr><th>{t('common.gift')}</th><th className="num">{t('dynamic.forecastExpected')}</th><th className="num">{t('dynamic.colStock')}</th><th /></tr></thead>
            <tbody>
              {cases.map((c) => {
                const expected = (N * c.referenceProbability) / 100;
                const short = !c.unlimited && expected > c.stockRemaining;
                return (
                  <tr key={c.slotIndex}>
                    <td><GiftPill slotIndex={c.slotIndex} name={c.giftName} /></td>
                    <td className="num">{Math.round(expected).toLocaleString()}</td>
                    <td className="num">{c.unlimited ? t('dynamic.unlimitedShort') : c.stockRemaining}</td>
                    <td>{c.unlimited ? '' : short ? <span className="dyn-short">{t('dynamic.forecastShort')}</span> : <span className="dyn-fine">{t('dynamic.forecastOk')}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="dyn-note">{t('dynamic.forecastNote')}</p>
      </Card>

      <Card title={t('dynamic.historyTitle')} className="mt-card">
        {data.movements.length === 0 ? <p className="ap-hint" style={{ margin: 0 }}>{t('dynamic.noHistory')}</p> : (
          <div className="dyn-hist">
            {data.movements.map((m) => (
              <div key={m.id} className="dyn-hist-row"><time>{String(m.createdAt).slice(0, 16)}</time><span>{kindText(m)}{m.actor ? ` · ${m.actor}` : ''}{m.source === 'box' ? ` · ${t('dynamic.fromBox')}` : ''}</span></div>
            ))}
          </div>
        )}
      </Card>

      {restock && (
        <div className="modal-overlay">
          <form className="modal-card" style={{ '--modal-w': '420px' }} onSubmit={submitRestock}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>{t('dynamic.addStockTitle', { gift: restock.giftName })}</h3>
            {restock.variants.length > 0 && (
              <div className="field"><label>{t('dynamic.variant')}</label>
                <select value={restock.variantId} onChange={(e) => setRestock({ ...restock, variantId: e.target.value })}>{restock.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
              </div>
            )}
            <div className="field"><label>{t('dynamic.quantity')}</label>
              <input type="number" min="1" step="1" autoFocus value={restock.add} onChange={(e) => setRestock({ ...restock, add: e.target.value })} required />
            </div>
            <p className="dyn-note" style={{ marginTop: 0 }}>{t('dynamic.addNote')}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setRestock(null)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={busy || !(Number(restock.add) >= 1)}>{busy ? t('common.saving') : t('dynamic.add')}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
