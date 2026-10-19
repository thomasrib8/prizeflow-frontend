import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Badge } from './ui';
import { useConfirm } from './ConfirmDialog';
import '../pages/admin-premium.css';

// Admin, client page › "Contrat & revenus": the commercial conditions (versioned), the wheels held when the account is a reseller,
// planned rentals, and the revenue ledger of the account. Amounts are typed in euros and stored in cents.
const TYPES = ['long', 'short', 'reseller', 'sub'];
const eur = (cents) => (cents === null || cents === undefined ? '—' : (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' }));
const toCents = (v) => (v === '' || v === null || v === undefined ? null : Math.round(Number(v) * 100));
const today = () => new Date().toISOString().slice(0, 10);
const label = { fontSize: 12, color: '#64748B' };

export default function ContractTab({ userId }) {
  const { t } = useTranslation('admin');
  const [confirm, confirmDialog] = useConfirm();
  const [data, setData] = useState(null);
  const [resellers, setResellers] = useState([]);
  const [wheels, setWheels] = useState([]);
  const [error, setError] = useState('');
  const [f, setF] = useState({ type: 'long', rent: '', price: '', activation: '', parent: '', validFrom: today(), contractStart: '', contractEnd: '' });
  const [hold, setHold] = useState({ wheelId: '', startedOn: today() });
  const [requests, setRequests] = useState([]);

  const load = useCallback(() => {
    api.getCommercialUser(userId).then((d) => {
      setData(d);
      if (d.inForce) setF((p) => ({ ...p, type: d.inForce.type, rent: d.inForce.rent_cents !== null ? String(d.inForce.rent_cents / 100) : '', price: d.inForce.event_price_cents !== null ? String(d.inForce.event_price_cents / 100) : '',
        activation: d.inForce.activation_cents !== null ? String(d.inForce.activation_cents / 100) : '', parent: d.inForce.parent_reseller_id || '' }));
    }).catch((e) => setError(e.message));
  }, [userId]);
  useEffect(() => { load(); api.getCommercialResellers().then(setResellers).catch(() => {}); api.listWheels().then(setWheels).catch(() => {}); api.getAttributionRequests().then((r) => setRequests(r.filter((x) => x.resellerId === userId))).catch(() => {}); }, [load, userId]);

  const run = async (fn) => { setError(''); try { await fn(); load(); } catch (e) { setError(e.message); } };

  if (!data) return error ? <div className="error-banner">{error}</div> : <p className="page-subtitle">{t('common.loading')}</p>;

  const saveTerms = (e) => {
    e.preventDefault();
    const body = { type: f.type, validFrom: f.validFrom, contractStart: f.contractStart || undefined, contractEnd: f.contractEnd || undefined };
    if (f.type === 'long') body.rentCents = toCents(f.rent);
    if (f.type === 'short') body.eventPriceCents = toCents(f.price);
    if (f.type === 'reseller') { body.rentCents = toCents(f.rent); body.activationCents = toCents(f.activation); }
    if (f.type === 'sub') body.parentResellerId = f.parent;
    run(() => api.addCommercialTerms(userId, body));
  };
  const free = wheels.filter((w) => !(data.holdings || []).some((h) => h.wheel_id === w.id && !h.ended_on));
  const cur = data.inForce;

  return (
    <div className="ap">
      {confirmDialog}
      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

      <Card title={t('contract.typeTitle')} className="mt-card">
        <p className="ap-hint">{t('contract.intro')}</p>
        {cur ? (
          <div style={{ marginBottom: 12, fontSize: 14 }}>
            <Badge tone="blue">{t(`contract.types.${cur.type}`)}</Badge>{' '}
            {cur.type === 'long' && <b>{eur(cur.rent_cents)} {t('contract.perMonth')}</b>}
            {cur.type === 'short' && <b>{eur(cur.event_price_cents)} {t('contract.perEvent')}</b>}
            {cur.type === 'reseller' && <b>{eur(cur.rent_cents)} {t('contract.perWheelMonth')} · {t('contract.activation')} {eur(cur.activation_cents)}</b>}
            {cur.type === 'sub' && <b>{t('contract.under')} {data.parent ? <Link to={`/users/${data.parent.id}`}>{data.parent.name}</Link> : '—'}</b>}
            <span style={{ color: '#94A3B8', fontSize: 12 }}> · {t('contract.since')} {cur.valid_from}</span>
          </div>
        ) : <p style={{ fontSize: 13, color: '#B45309' }}>{t('contract.none')}</p>}

        <form onSubmit={saveTerms} className="ap-bar">
          <label>{t('contract.type')}
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} style={{ display: 'block' }}>{TYPES.map((x) => <option key={x} value={x}>{t(`contract.types.${x}`)}</option>)}</select></label>
          {(f.type === 'long' || f.type === 'reseller') && <label>{f.type === 'long' ? t('contract.rent') : t('contract.rentPerWheel')} (€)
            <input type="number" min="0" step="0.01" required value={f.rent} onChange={(e) => setF({ ...f, rent: e.target.value })} style={{ display: 'block', width: 120 }} /></label>}
          {f.type === 'short' && <label>{t('contract.eventPrice')} (€)
            <input type="number" min="0" step="0.01" required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} style={{ display: 'block', width: 120 }} /></label>}
          {f.type === 'reseller' && <label>{t('contract.activation')} (€)
            <input type="number" min="0" step="0.01" required value={f.activation} onChange={(e) => setF({ ...f, activation: e.target.value })} style={{ display: 'block', width: 120 }} /></label>}
          {f.type === 'sub' && <label>{t('contract.parent')}
            <select required value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })} style={{ display: 'block' }}>
              <option value="">—</option>{resellers.filter((r) => r.id !== userId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
          <label>{t('contract.validFrom')}<input type="date" required value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} style={{ display: 'block' }} /></label>
          {f.type === 'long' && <>
            <label>{t('contract.contractStart')}<input type="date" value={f.contractStart} onChange={(e) => setF({ ...f, contractStart: e.target.value })} style={{ display: 'block' }} /></label>
            <label>{t('contract.contractEnd')}<input type="date" value={f.contractEnd} onChange={(e) => setF({ ...f, contractEnd: e.target.value })} style={{ display: 'block' }} /></label>
          </>}
          <Button type="submit" size="sm">{t('contract.saveTerms')}</Button>
        </form>
        <p className="ap-hint" style={{ marginTop: 8 }}>{t(`contract.help.${f.type}`)} {t('contract.versionHint')}</p>

        {data.history.length > 1 && (
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead><tr><th>{t('contract.validFrom')}</th><th>{t('contract.type')}</th><th>{t('contract.conditions')}</th></tr></thead>
            <tbody>{data.history.map((h) => (
              <tr key={h.id}><td>{h.valid_from}</td><td>{t(`contract.types.${h.type}`)}</td>
                <td>{[h.rent_cents !== null && eur(h.rent_cents), h.event_price_cents !== null && eur(h.event_price_cents), h.activation_cents !== null && `${t('contract.activation')} ${eur(h.activation_cents)}`].filter(Boolean).join(' · ') || '—'}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      {cur && cur.type === 'reseller' && (
        <Card title={t('contract.holdingsTitle')} className="mt-card">
          <p className="ap-hint">{t('contract.holdingsDesc')}</p>
          <form onSubmit={(e) => { e.preventDefault(); run(() => api.startHolding({ wheelId: hold.wheelId, resellerId: userId, startedOn: hold.startedOn })); }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label>{t('contract.wheel')}<select required value={hold.wheelId} onChange={(e) => setHold({ ...hold, wheelId: e.target.value })} style={{ display: 'block' }}>
              <option value="">—</option>{free.map((w) => <option key={w.id} value={w.id}>{w.serialNumber}</option>)}</select></label>
            <label>{t('contract.startedOn')}<input type="date" required value={hold.startedOn} onChange={(e) => setHold({ ...hold, startedOn: e.target.value })} style={{ display: 'block' }} /></label>
            <Button type="submit" size="sm">{t('contract.addHolding')}</Button>
          </form>
          {data.holdings.map((h) => (
            <div key={h.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
              <b>{h.serial_number}</b><span>{h.started_on} → {h.ended_on || t('contract.open')}</span><span style={{ flex: 1 }} />
              {!h.ended_on && <Button size="sm" variant="secondary" onClick={async () => { if (await confirm(t('contract.confirmEndHolding'), { confirmLabel: t('contract.endHolding') })) run(() => api.endHolding(h.id, today())); }}>{t('contract.endHolding')}</Button>}
            </div>
          ))}
          {requests.length > 0 && (
            <div className="ap-warn" style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 6 }}>{t('contract.requestsTitle')}</div>
              {requests.map((r) => (
                <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, padding: '4px 0' }}>
                  <span>{[r.wheel, r.client, r.wantedOn, r.note].filter(Boolean).join(' · ') || '—'}</span><span style={{ flex: 1 }} />
                  <Button size="sm" onClick={() => run(async () => { await api.resolveAttributionRequest(r.id, 'done'); setRequests((x) => x.filter((y) => y.id !== r.id)); })}>{t('contract.requestDone')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => run(async () => { await api.resolveAttributionRequest(r.id, 'cancelled'); setRequests((x) => x.filter((y) => y.id !== r.id)); })}>{t('contract.requestDismiss')}</Button>
                </div>
              ))}
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>{t('contract.requestsHint')}</div>
            </div>
          )}
          <div className="sw-label" style={{ marginTop: 14 }}>{t('contract.subClientsTitle')}</div>
          {data.subClients.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('contract.noSubClients')}</p>
            : data.subClients.map((c) => <div key={c.id} style={{ fontSize: 13, padding: '4px 0' }}><Link to={`/users/${c.id}`}>{c.name}</Link></div>)}
        </Card>
      )}

      <Card title={t('contract.revenueTitle')} className="mt-card">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 10, fontSize: 14 }}>
          <div>{t('contract.recognized')} <b>{eur(data.totals.recognizedCents)}</b></div>
          <div>{t('contract.forecast')} <b>{eur(data.totals.forecastCents)}</b></div>
        </div>
        {data.entries.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('contract.noEntries')}</p> : (
          <table className="data-table">
            <thead><tr><th>{t('contract.date')}</th><th>{t('contract.source')}</th><th>{t('contract.client')}</th><th>{t('contract.amount')}</th><th></th></tr></thead>
            <tbody>{data.entries.map((e) => (
              <tr key={e.id} style={{ opacity: e.status === 'forecast' ? 0.65 : 1 }}>
                <td>{e.recognized_on}{e.status === 'forecast' && <> <Badge tone="neutral">{t('contract.forecastTag')}</Badge></>}</td>
                <td>{t(`contract.sources.${e.source}`)}{e.period_no ? ` #${e.period_no}` : ''}{e.reverses_entry_id ? ` · ${t('contract.reversalTag')}` : ''}</td>
                <td>{e.clientName || '—'}</td>
                <td style={{ fontWeight: 600, color: e.amount_cents < 0 ? '#B91C1C' : undefined }}>{eur(e.amount_cents)}</td>
                <td>{e.status === 'recognized' && !e.reverses_entry_id && !data.entries.some((x) => x.reverses_entry_id === e.id) && (
                  <Button size="sm" variant="ghost" onClick={async () => { if (await confirm(t('contract.confirmReverse'), { danger: true, confirmLabel: t('contract.reverse') })) run(() => api.reverseRevenueEntry(e.id)); }}>{t('contract.reverse')}</Button>)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
