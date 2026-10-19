import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge } from './ui';

// Admin only — the tariffs of the external services and the plan chosen for each. A tariff in force is never edited: a new version starts on a
// date (the past keeps its price). A prepared plan that has never been in force can be corrected directly.
const PROVIDER_NAMES = { anthropic: 'Claude (Anthropic)', resend: 'Resend', hunter: 'Hunter', bouncer: 'Bouncer', apollo: 'Apollo', render: 'Render' };
const PLAN_KINDS = ['subscription', 'free', 'prepaid'];
const units = (micro) => (micro === null || micro === undefined ? '' : String(Math.round(micro) / 1e6));
const micro = (v) => (v === '' || v === null || v === undefined ? null : Math.round(Number(v) * 1e6));
const today = () => new Date().toISOString().slice(0, 10);

function TariffRow({ row, onSaved, setError }) {
  const { t } = useTranslation('admin');
  const prepared = !row.active;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({});
  const [from, setFrom] = useState(today());
  const [busy, setBusy] = useState(false);

  const fields = [];
  if (row.unit_price_micro !== null) fields.push(['unitPrice', 'unit_price_micro']);
  if (row.subscription_micro !== null) fields.push(['subscription', 'subscription_micro']);
  if (row.quota !== null) fields.push(['quota', 'quota', true]);
  if (row.overage_unit_price_micro !== null) fields.push(['overage', 'overage_unit_price_micro']);

  const start = () => {
    setF(Object.fromEntries(fields.map(([k, col, plain]) => [k, plain ? String(row[col]) : units(row[col])])));
    setOpen(true);
  };

  async function save() {
    setBusy(true); setError('');
    try {
      const body = {
        unitPriceMicro: f.unitPrice !== undefined ? micro(f.unitPrice) : row.unit_price_micro,
        subscriptionMicro: f.subscription !== undefined ? micro(f.subscription) : row.subscription_micro,
        quota: f.quota !== undefined ? (f.quota === '' ? null : Number(f.quota)) : row.quota,
        overageUnitPriceMicro: f.overage !== undefined ? micro(f.overage) : row.overage_unit_price_micro,
      };
      if (prepared) await api.editPreparedApiPrice(row.id, body);
      else {
        await api.addApiPrice({ provider: row.provider, service: row.service, planLabel: row.plan_label, kind: row.kind, unit: row.unit, perUnits: row.per_units, currency: row.currency,
          billingPeriod: row.billing_period, quotaPeriod: row.quota_period, quotaDaily: row.quota_daily, overagePerUnits: row.overage_per_units, validFrom: from, note: row.note, ...body });
      }
      setOpen(false); onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const show = (col, label, plain) => row[col] !== null && row[col] !== undefined && (
    <span style={{ marginRight: 14 }}>{label} <b>{plain ? row[col].toLocaleString() : `${units(row[col])} ${row.currency}`}</b></span>
  );

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <b>{row.plan_label}</b>
        {row.service !== '*' && <span style={{ color: '#64748B' }}>{row.service}</span>}
        {row.unit && <span style={{ color: '#64748B' }}>({row.unit}{row.per_units > 1 ? ` / ${row.per_units.toLocaleString()}` : ''})</span>}
        <Badge tone={prepared ? 'neutral' : 'green'}>{prepared ? t('settings.pricing.prepared') : t('settings.pricing.inForce')}</Badge>
        <span style={{ color: '#94A3B8', fontSize: 12 }}>{t('settings.pricing.since')} {row.valid_from}</span>
        <span style={{ flex: 1 }} />
        {!open && row.kind !== 'free' && <Button variant="secondary" size="sm" onClick={start}>{t('settings.pricing.edit')}</Button>}
      </div>
      <div style={{ marginTop: 4, color: '#334155' }}>
        {show('unit_price_micro', t('settings.pricing.unitPrice'))}
        {show('subscription_micro', t('settings.pricing.subscription'))}
        {show('quota', t('settings.pricing.quota'), true)}
        {show('overage_unit_price_micro', t('settings.pricing.overage'))}
      </div>
      {open && (
        <div style={{ marginTop: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {fields.map(([k]) => (
              <label key={k} style={{ fontSize: 12, color: '#64748B' }}>{t(`settings.pricing.${k === 'unitPrice' ? 'unitPrice' : k}`)} {k !== 'quota' && `(${row.currency})`}
                <input type="number" min="0" step="any" value={f[k] ?? ''} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} style={{ display: 'block', width: 130 }} />
              </label>
            ))}
            {!prepared && (
              <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.startsOn')}
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ display: 'block' }} />
              </label>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0' }}>{prepared ? t('settings.pricing.preparedHint') : t('settings.pricing.versionHint')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={save} disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>{t('settings.pricing.cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderCard({ provider, rows, reload, setError }) {
  const { t } = useTranslation('admin');
  const plans = useMemo(() => {
    const seen = new Map();
    for (const r of rows.filter((x) => PLAN_KINDS.includes(x.kind))) if (!seen.has(r.plan_label) || r.id > seen.get(r.plan_label).id) seen.set(r.plan_label, r);
    return [...seen.values()];
  }, [rows]);
  const current = rows.find((r) => PLAN_KINDS.includes(r.kind) && r.active && !r.valid_to);
  const [target, setTarget] = useState('');
  const [date, setDate] = useState(today());
  const shown = rows.filter((r) => r.active ? !r.valid_to : true).sort((a, b) => Number(b.active) - Number(a.active) || a.id - b.id);

  async function change() {
    setError('');
    try { await api.switchApiPlan({ provider, planLabel: target, validFrom: date }); setTarget(''); reload(); } catch (e) { setError(e.message); }
  }

  return (
    <Card title={PROVIDER_NAMES[provider] || provider} className="mt-card">
      {plans.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ fontSize: 13 }}>{t('settings.pricing.currentPlan')} <b>{current ? current.plan_label : '—'}</b></div>
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.switchTo')}
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ display: 'block' }}>
              <option value="">—</option>
              {plans.filter((p) => !current || p.plan_label !== current.plan_label).map((p) => <option key={p.id} value={p.plan_label}>{p.plan_label}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.startsOn')}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ display: 'block' }} />
          </label>
          <Button size="sm" onClick={change} disabled={!target}>{t('settings.pricing.switch')}</Button>
        </div>
      )}
      {shown.map((r) => <TariffRow key={r.id} row={r} onSaved={reload} setError={setError} />)}
    </Card>
  );
}

function PacksCard({ providers, setError }) {
  const { t } = useTranslation('admin');
  const [packs, setPacks] = useState([]);
  const [f, setF] = useState({ provider: 'hunter', credits: '', price: '', currency: 'EUR', purchasedOn: today(), expiresOn: '' });
  const load = () => api.getApiPacks().then(setPacks).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e) {
    e.preventDefault(); setError('');
    try {
      await api.addApiPack({ provider: f.provider, credits: Number(f.credits), priceMicro: micro(f.price), currency: f.currency, purchasedOn: f.purchasedOn, expiresOn: f.expiresOn || undefined });
      setF((p) => ({ ...p, credits: '', price: '', expiresOn: '' })); load();
    } catch (err) { setError(err.message); }
  }

  return (
    <Card title={t('settings.pricing.packsTitle')} className="mt-card">
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px', lineHeight: 1.6 }}>{t('settings.pricing.packsDesc')}</p>
      <form onSubmit={add} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.provider')}
          <select value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} style={{ display: 'block' }}>
            {providers.map((p) => <option key={p} value={p}>{PROVIDER_NAMES[p] || p}</option>)}
          </select></label>
        <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.credits')}<input type="number" min="1" required value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} style={{ display: 'block', width: 110 }} /></label>
        <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.price')}<input type="number" min="0" step="any" required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} style={{ display: 'block', width: 110 }} /></label>
        <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.currency')}
          <select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} style={{ display: 'block' }}><option>EUR</option><option>USD</option></select></label>
        <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.purchasedOn')}<input type="date" required value={f.purchasedOn} onChange={(e) => setF({ ...f, purchasedOn: e.target.value })} style={{ display: 'block' }} /></label>
        <label style={{ fontSize: 12, color: '#64748B' }}>{t('settings.pricing.expiresOn')}<input type="date" value={f.expiresOn} onChange={(e) => setF({ ...f, expiresOn: e.target.value })} style={{ display: 'block' }} /></label>
        <Button type="submit" size="sm">{t('settings.pricing.addPack')}</Button>
      </form>
      {packs.map((p) => (
        <div key={p.id} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
          <b>{PROVIDER_NAMES[p.provider] || p.provider}</b> — {p.credits.toLocaleString()} {t('settings.pricing.credits').toLowerCase()} · {units(p.price_micro)} {p.currency} · {p.purchased_on}{p.expires_on ? ` → ${p.expires_on}` : ''} · {p.consumed.toLocaleString()} {t('settings.pricing.used')}
        </div>
      ))}
    </Card>
  );
}

export default function ApiPricingModule() {
  const { t } = useTranslation('admin');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const reload = () => api.getApiPrices().then(setRows).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []);
  if (!rows) return error ? <div className="error-banner">{error}</div> : null;
  const byProvider = rows.reduce((m, r) => { (m[r.provider] = m[r.provider] || []).push(r); return m; }, {});
  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      <p style={{ fontSize: 13, color: '#64748B', margin: '12px 0 0', lineHeight: 1.6 }}>{t('settings.pricing.intro')}</p>
      {Object.keys(byProvider).sort().map((p) => <ProviderCard key={p} provider={p} rows={byProvider[p]} reload={reload} setError={setError} />)}
      <PacksCard providers={Object.keys(byProvider).sort()} setError={setError} />
    </>
  );
}
