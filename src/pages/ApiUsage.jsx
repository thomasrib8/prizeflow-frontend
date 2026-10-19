import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';
import ApiPricingModule from '../components/ApiPricingModule';
import './admin-premium.css';

// Admin › Consommation API. Three costs, never mixed: real (what providers charge), imputed (attributed to the accounts that caused it),
// unallocated (the rest). Contribution of a reseller = its income − its own API cost − the API cost of the clients under it.
const NAMES = { anthropic: 'Claude (Anthropic)', resend: 'Resend', hunter: 'Hunter', bouncer: 'Bouncer', apollo: 'Apollo', render: 'Render' };
const TABS = ['overview', 'providers', 'clients', 'pricing', 'alerts'];
const eur = (c, d = 0) => (c === null || c === undefined ? '—' : (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} %`);
const nameOf = (p) => NAMES[p] || p;
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const REC_TONE = { ok: 'green', gap: 'red', unavailable: 'orange', not_configured: 'neutral', no_comparison: 'neutral' };

function Delta({ cur, prev }) {
  const { t } = useTranslation('admin');
  if (prev === null || prev === undefined) return null;
  if (!prev) return <span style={{ fontSize: 12, color: '#94A3B8' }}>{t('apiUsage.na')}</span>;
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  return <span style={{ fontSize: 12, fontWeight: 600, color: d <= 0 ? '#047857' : '#B45309' }}>{d > 0 ? '▲ +' : '▼ '}{d.toLocaleString(undefined, { maximumFractionDigits: 0 })} %<span style={{ fontWeight: 400, color: '#94A3B8' }}> {t('apiUsage.vsPrev')}</span></span>;
}

function Bar100({ value }) {
  if (value === null || value === undefined) return null;
  const w = Math.max(0, Math.min(100, value));
  return <div className={`ap-progress${value >= 100 ? ' over' : value >= 80 ? ' warn' : ''}`}><i style={{ width: `${w}%` }} /></div>;
}

function Chart({ data }) {
  const { t } = useTranslation('admin');
  if (!data.length) return <p className="ap-hint" style={{ margin: 0 }}>{t('apiUsage.noData')}</p>;
  const rows = data.map((d) => ({ ...d, cost: d.costCents / 100 }));
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis yAxisId="l" tick={{ fontSize: 11 }} /><YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip /><Legend />
          <Bar yAxisId="l" dataKey="calls" name={t('apiUsage.calls')} fill="#BFD4FF" radius={[6, 6, 0, 0]} /><Line yAxisId="r" dataKey="cost" name={t('apiUsage.costEur')} stroke="#0055F8" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Reconciliations({ rows, onRun, busy }) {
  const { t } = useTranslation('admin');
  return (
    <Card title={t('apiUsage.reconTitle')} className="mt-card">
      <p className="ap-hint">{t('apiUsage.reconHelp')}</p>
      {rows.map((r) => {
        const l = r.last; const st = l ? l.status : null;
        return (
          <div key={r.provider} className="ap-line">
            <b style={{ minWidth: 130 }}>{nameOf(r.provider)}</b>
            {l ? <Badge tone={REC_TONE[st]}>{t(`apiUsage.recon.${st}`)}</Badge> : <Badge tone="neutral">{t('apiUsage.recon.never')}</Badge>}
            {l && l.our_quantity !== null && l.provider_quantity !== null && <span>{t('apiUsage.reconOurs')} {Math.round(l.our_quantity).toLocaleString()} · {t('apiUsage.reconTheirs')} {Math.round(l.provider_quantity).toLocaleString()}{l.gap_pct !== null ? ` · ${pct(l.gap_pct)}` : ''}</span>}
            {l && l.detail && l.detail.note && <span style={{ color: '#64748B' }}>{l.detail.note}</span>}
            {l && l.detail && l.detail.error && <span style={{ color: '#B45309' }}>{l.detail.error}</span>}
            {r.sync && r.sync.failures > 0 && <span style={{ color: '#B45309' }}>{t('apiUsage.syncFailures', { n: r.sync.failures })}</span>}
            {l && <span style={{ color: '#94A3B8', fontSize: 12 }}>{l.day}</span>}
          </div>
        );
      })}
      <div style={{ marginTop: 10 }}><Button size="sm" variant="secondary" disabled={busy} onClick={onRun}>{busy ? t('apiUsage.reconRunning') : t('apiUsage.reconRun')}</Button></div>
    </Card>
  );
}

function Overview({ d, onProvider, reload }) {
  const { t } = useTranslation('admin');
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { await api.runApiReconcile(); await reload(); } finally { setBusy(false); } };
  const tot = d.totals;
  return (
    <>
      <div className="grid-stats">
        <div className="stat"><div className="stat-label">{t('apiUsage.real')}</div><div className="stat-value">{eur(tot.realCents)}</div><Delta cur={tot.realCents} prev={tot.previousRealCents} /><div className="ap-sub">{t('apiUsage.realHelp')}</div></div>
        <div className="stat"><div className="stat-label">{t('apiUsage.imputed')}</div><div className="stat-value">{eur(tot.imputedCents)}</div><div className="ap-sub">{t('apiUsage.imputedHelp')}</div></div>
        <div className="stat"><div className="stat-label">{t('apiUsage.unallocated')}</div><div className="stat-value">{eur(tot.unallocatedCents)}</div><div className="ap-sub">{t('apiUsage.unallocatedHelp')}</div></div>
        <div className="stat"><div className="stat-label">{t('apiUsage.ratio')}</div><div className="stat-value">{pct(d.apiRatioPct)}</div><div className="ap-sub">{t('apiUsage.revenue')} {eur(d.revenueCents)}</div></div>
      </div>
      {(d.unlogged.withoutTariff > 0 || d.unlogged.withoutRate > 0 || d.fx.stale || !d.fx.known) && (
        <div className="ap-warn">
          {d.unlogged.withoutTariff > 0 && <div>{t('apiUsage.warnNoTariff', { n: d.unlogged.withoutTariff })}</div>}
          {d.unlogged.withoutRate > 0 && <div>{t('apiUsage.warnNoRate', { n: d.unlogged.withoutRate })}</div>}
          {(!d.fx.known || d.fx.stale) && <div>{t('apiUsage.warnFx')}</div>}
        </div>
      )}
      <Card title={t('apiUsage.byProvider')} className="mt-card">
        <table className="data-table">
          <thead><tr><th>{t('apiUsage.provider')}</th><th>{t('apiUsage.calls')}</th><th>{t('apiUsage.plan')}</th><th>{t('apiUsage.real')}</th><th>{t('apiUsage.imputed')}</th><th>{t('apiUsage.unallocated')}</th><th>{t('apiUsage.nature')}</th></tr></thead>
          <tbody>{d.providers.map((p) => (
            <tr key={p.provider} style={{ cursor: 'pointer' }} onClick={() => onProvider(p.provider)}>
              <td style={{ fontWeight: 600 }}>{nameOf(p.provider)}</td><td>{p.calls.toLocaleString()}</td>
              <td>{p.plan ? <><div style={{ fontSize: 12 }}>{p.plan.label}{p.plan.quota ? ` · ${p.plan.used.toLocaleString()} / ${p.plan.quota.toLocaleString()}` : ''}</div><Bar100 value={p.plan.usedPct} /></> : '—'}</td>
              <td>{eur(p.realCents, 2)}<div><Delta cur={p.realCents} prev={p.previousRealCents} /></div></td><td>{eur(p.imputedCents, 2)}</td><td>{eur(p.unallocatedCents, 2)}</td>
              <td>{p.nature.map((n) => <Badge key={n} tone={n === 'real' ? 'green' : n === 'computed' ? 'blue' : 'orange'}>{t(`apiUsage.natures.${n}`)}</Badge>)}{(p.incomplete.no_tariff > 0 || p.incomplete.no_rate > 0) && <Badge tone="red">{t('apiUsage.incomplete')}</Badge>}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      <Card title={t('apiUsage.dailyTitle')} className="mt-card"><Chart data={d.series} /></Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card title={t('apiUsage.topAccounts')} className="mt-card">
          {d.topAccounts.length === 0 ? <p className="ap-hint" style={{ margin: 0 }}>{t('apiUsage.noData')}</p> : d.topAccounts.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><Link to={`/users/${a.id}`}>{a.name}</Link><b>{eur(a.costCents, 2)}</b></div>
          ))}
        </Card>
        <Reconciliations rows={d.reconciliations} onRun={run} busy={busy} />
      </div>
    </>
  );
}

function ProviderSheet({ provider, month, setProvider, providers }) {
  const { t } = useTranslation('admin');
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setD(null); api.getApiProvider(provider, month).then(setD).catch((e) => setError(e.message)); }, [provider, month]);
  return (
    <>
      <Card className="mt-card">
        <label>{t('apiUsage.provider')}
          <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ display: 'block' }}>{providers.map((p) => <option key={p} value={p}>{nameOf(p)}</option>)}</select></label>
      </Card>
      {error && <div className="error-banner">{error}</div>}
      {!d ? <p className="page-subtitle">{t('common.loading')}</p> : (
        <>
          <div className="grid-stats" style={{ marginTop: 12 }}>
            <div className="stat"><div className="stat-label">{t('apiUsage.real')}</div><div className="stat-value">{d.summary ? eur(d.summary.realCents, 2) : '—'}</div></div>
            <div className="stat"><div className="stat-label">{t('apiUsage.imputed')}</div><div className="stat-value">{d.summary ? eur(d.summary.imputedCents, 2) : '—'}</div></div>
            <div className="stat"><div className="stat-label">{t('apiUsage.unallocated')}</div><div className="stat-value">{d.summary ? eur(d.summary.unallocatedCents, 2) : '—'}</div></div>
            <div className="stat"><div className="stat-label">{t('apiUsage.general')}</div><div className="stat-value">{eur(d.generalCostCents, 2)}</div><div className="ap-sub">{t('apiUsage.generalHelp')}</div></div>
          </div>
          {d.plan && <Card title={t('apiUsage.planTitle')} className="mt-card"><div style={{ fontSize: 13 }}>{d.plan.label} · {d.plan.used.toLocaleString()}{d.plan.quota ? ` / ${d.plan.quota.toLocaleString()} (${pct(d.plan.usedPct)})` : ''}</div><Bar100 value={d.plan.usedPct} /></Card>}
          <Card title={t('apiUsage.featuresTitle')} className="mt-card">
            {d.features.length === 0 ? <p className="ap-hint" style={{ margin: 0 }}>{t('apiUsage.noData')}</p> : (
              <table className="data-table"><thead><tr><th>{t('apiUsage.feature')}</th><th>{t('apiUsage.calls')}</th><th>{t('apiUsage.quantity')}</th>{provider === 'anthropic' && <th>{t('apiUsage.tokens')}</th>}<th>{t('apiUsage.costEur')}</th></tr></thead>
                <tbody>{d.features.map((f) => <tr key={`${f.feature}|${f.service}`}><td>{f.feature}{f.service ? <div style={{ fontSize: 11, color: '#64748B' }}>{f.service}</div> : null}</td><td>{f.calls}</td><td>{f.quantity}</td>{provider === 'anthropic' && <td>{f.inputTokens.toLocaleString()} / {f.outputTokens.toLocaleString()}</td>}<td>{eur(f.costCents, 2)}</td></tr>)}</tbody></table>
            )}
          </Card>
          <Card title={t('apiUsage.dailyTitle')} className="mt-card"><Chart data={d.series} /></Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <Card title={t('apiUsage.topAccounts')} className="mt-card">{d.topAccounts.length === 0 ? <p className="ap-hint" style={{ margin: 0 }}>{t('apiUsage.noData')}</p> : d.topAccounts.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><Link to={`/users/${a.id}`}>{a.name}</Link><span>{a.quantity} · <b>{eur(a.costCents, 2)}</b></span></div>)}</Card>
            <Card title={t('apiUsage.reconHistory')} className="mt-card">{d.reconciliations.length === 0 ? <p className="ap-hint" style={{ margin: 0 }}>{t('apiUsage.noData')}</p> : d.reconciliations.slice(0, 10).map((r) => <div key={r.id} style={{ fontSize: 12.5, padding: '3px 0' }}>{r.day} · <Badge tone={REC_TONE[r.status]}>{t(`apiUsage.recon.${r.status}`)}</Badge>{r.gap_pct !== null ? ` ${pct(r.gap_pct)}` : ''}</div>)}</Card>
          </div>
          {(d.packs.length > 0 || d.costLines.length > 0) && (
            <Card title={t('apiUsage.packsLines')} className="mt-card">
              {d.packs.map((p) => <div key={`p${p.id}`} style={{ fontSize: 13, padding: '3px 0' }}>{p.purchased_on} · {p.credits.toLocaleString()} {t('apiUsage.credits')} · {(p.price_micro / 1e6).toLocaleString()} {p.currency}{p.expires_on ? ` → ${p.expires_on}` : ''}</div>)}
              {d.costLines.map((l) => <div key={`l${l.id}`} style={{ fontSize: 13, padding: '3px 0' }}>{l.incurred_on} · {l.label} · {(l.amount_micro / 1e6).toLocaleString()} {l.currency}</div>)}
            </Card>
          )}
        </>
      )}
    </>
  );
}

function Clients({ month }) {
  const { t } = useTranslation('admin');
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setD(null); api.getApiClients(month).then(setD).catch((e) => setError(e.message)); }, [month]);
  if (error) return <div className="error-banner">{error}</div>;
  if (!d) return <p className="page-subtitle">{t('common.loading')}</p>;
  return (
    <Card title={t('apiUsage.clientsTitle')} className="mt-card">
      <p className="ap-hint">{t('apiUsage.clientsHelp')}</p>
      <div style={{ marginBottom: 10 }}><Button size="sm" variant="secondary" onClick={() => api.downloadApiClientsCsv(month)}>{t('apiUsage.exportCsv')}</Button></div>
      {d.accounts.length === 0 ? <p className="ap-hint" style={{ margin: 0 }}>{t('apiUsage.noData')}</p> : (
        <table className="data-table">
          <thead><tr><th>{t('apiUsage.account')}</th><th>{t('apiUsage.type')}</th><th>{t('apiUsage.calls')}</th><th>{t('apiUsage.ownCost')}</th><th>{t('apiUsage.subCost')}</th><th>{t('apiUsage.revenue')}</th><th>{t('apiUsage.contribution')}</th><th>{t('apiUsage.ratio')}</th></tr></thead>
          <tbody>{d.accounts.map((a) => (
            <tr key={a.id} style={a.type === 'reseller' ? { background: '#F8FAFF' } : undefined}>
              <td><Link to={`/users/${a.id}`}>{a.name}</Link>{a.parentResellerName && <div style={{ fontSize: 11, color: '#64748B' }}>{t('apiUsage.under')} {a.parentResellerName}</div>}</td>
              <td>{a.type ? t(`contract.types.${a.type}`) : '—'}</td><td>{a.calls}</td>
              <td>{eur(a.ownCostCents, 2)}{a.incomplete > 0 && <div style={{ fontSize: 11, color: '#B45309' }}>{t('apiUsage.incompleteN', { n: a.incomplete })}</div>}</td>
              <td>{a.consolidatedSubCostCents === null ? '—' : `${eur(a.consolidatedSubCostCents, 2)} (${a.subClients})`}</td>
              <td>{eur(a.revenueCents)}</td><td style={{ fontWeight: 600, color: a.contributionCents < 0 ? '#B91C1C' : undefined }}>{eur(a.contributionCents, 2)}</td><td>{pct(a.apiRatioPct)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <p style={{ fontSize: 12, color: '#64748B', margin: '10px 0 0' }}>{t('apiUsage.generalCost')} : {eur(d.generalCostCents, 2)}</p>
    </Card>
  );
}

function Alerts({ reload }) {
  const { t } = useTranslation('admin');
  const [list, setList] = useState(null);
  const load = useCallback(() => api.getAdminAlerts().then(setList).catch(() => setList([])), []);
  useEffect(() => { load(); }, [load]);
  return (
    <Card title={t('apiUsage.alertsTitle')} className="mt-card">
      <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 10px' }}>{t('apiUsage.alertsHelp')} <Link to="/settings">{t('apiUsage.alertsSettings')}</Link></p>
      {!list ? <p className="page-subtitle">{t('common.loading')}</p> : list.length === 0 ? <p className="ap-hint" style={{ margin: 0 }}>{t('settings.alerts.none')}</p> : list.map((a) => (
        <div key={a.id} className="ap-line" style={{ opacity: a.readAt ? 0.55 : 1 }}>
          <Badge tone={a.level === 'critical' ? 'red' : a.level === 'warning' ? 'orange' : 'neutral'}>{a.level}</Badge><span style={{ flex: 1 }}>{a.message}</span><span style={{ color: '#94A3B8', fontSize: 12 }}>{String(a.createdAt).slice(0, 10)}</span>
        </div>
      ))}
      {list && list.some((a) => !a.readAt) && <div style={{ marginTop: 12 }}><Button variant="secondary" onClick={async () => { await api.markAdminAlertsRead(); await load(); reload(); }}>{t('settings.alerts.markRead')}</Button></div>}
    </Card>
  );
}

export default function ApiUsage() {
  const { t } = useTranslation('admin');
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  const month = sp.get('month') || thisMonth();
  const provider = sp.get('provider') || '';
  const [ov, setOv] = useState(null);
  const [error, setError] = useState('');
  const setParam = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const load = useCallback(() => api.getApiOverview(month).then(setOv).catch((e) => setError(e.message)), [month]);
  useEffect(() => { setOv(null); load(); }, [load]);
  const providers = ov ? ov.providers.map((p) => p.provider) : [];

  return (
    <div className="ap">
      <div className="page-header">
        <div><h1 className="page-title">{t('apiUsage.title')}</h1><p className="page-subtitle">{t('apiUsage.subtitle')}</p></div>
        <label>{t('apiUsage.month')}<input type="month" value={month} onChange={(e) => setParam('month', e.target.value === thisMonth() ? '' : e.target.value)} style={{ display: 'block' }} /></label>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="tabs">{TABS.map((x) => <button key={x} className={`tab${tab === x ? ' active' : ''}`} onClick={() => setParam('tab', x === 'overview' ? '' : x)}>{t(`apiUsage.tabs.${x}`)}{x === 'alerts' && ov && ov.unreadAlerts > 0 ? ` (${ov.unreadAlerts})` : ''}</button>)}</div>
      {tab === 'overview' && (ov ? <Overview d={ov} reload={load} onProvider={(p) => { const n = new URLSearchParams(sp); n.set('tab', 'providers'); n.set('provider', p); setSp(n, { replace: true }); }} /> : <p className="page-subtitle">{t('common.loading')}</p>)}
      {tab === 'providers' && (ov ? (providers.length ? <ProviderSheet provider={provider || providers[0]} month={month} providers={providers} setProvider={(p) => setParam('provider', p)} /> : <p style={{ fontSize: 13, color: '#64748B' }}>{t('apiUsage.noData')}</p>) : <p className="page-subtitle">{t('common.loading')}</p>)}
      {tab === 'clients' && <Clients month={month} />}
      {tab === 'pricing' && <ApiPricingModule />}
      {tab === 'alerts' && <Alerts reload={load} />}
    </div>
  );
}
