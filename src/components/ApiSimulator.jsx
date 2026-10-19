import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Badge } from './ui';

// Admin › Consommation API › Simulateur: what would N wheel spins cost in external services? A what-if, nothing is stored.
const money = (v, d = 2) => (v === null || v === undefined ? '—' : v.toLocaleString(undefined, { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: v !== 0 && Math.abs(v) < 0.01 ? 5 : d }));
const NAMES = { anthropic: 'Claude', resend: 'Resend', hunter: 'Hunter', bouncer: 'Bouncer' };

export default function ApiSimulator() {
  const { t } = useTranslation('admin');
  const [opt, setOpt] = useState(null);
  const [f, setF] = useState({ spins: 1000, bouncerPct: 100, hunterPct: 20, emailsPerSpin: 1, aiCallsPerSpin: 1, aiInTokens: 1500, aiOutTokens: 300, notePct: 30, noteInTokens: 1500, noteOutTokens: 400 });
  const [plans, setPlans] = useState({});
  const [res, setRes] = useState(null);
  useEffect(() => { api.getApiSimulatorOptions().then(setOpt).catch(() => setOpt({ providers: {}, tokens: {} })); }, []);
  useEffect(() => {
    const h = setTimeout(() => { api.runApiSimulator({ ...f, plans }).then(setRes).catch(() => {}); }, 250);
    return () => clearTimeout(h);
  }, [f, plans, opt]);
  const num = (k, max) => (e) => setF({ ...f, [k]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) });
  const field = (k, label, max, step = 1, hint) => (
    <label className="ap-field">{label}<input type="number" min="0" max={max} step={step} value={f[k]} onChange={num(k, max)} />{hint && <small>{hint}</small>}</label>
  );
  return (
    <div className="ap">
      <p className="ap-info">{t('apiUsage.sim.intro')}</p>
      <Card title={t('apiUsage.sim.scenario')} className="mt-card">
        <div className="ap-grid-form">
          {field('spins', t('apiUsage.sim.spins'), 100000000)}
          {field('bouncerPct', t('apiUsage.sim.bouncerPct'), 100, 1, t('apiUsage.sim.bouncerHint'))}
          {field('hunterPct', t('apiUsage.sim.hunterPct'), 100, 1, t('apiUsage.sim.hunterHint'))}
          {field('emailsPerSpin', t('apiUsage.sim.emails'), 20, 0.1)}
          {field('aiCallsPerSpin', t('apiUsage.sim.aiCalls'), 20, 0.1)}
          {field('aiInTokens', t('apiUsage.sim.aiIn'), 1000000, 100)}
          {field('aiOutTokens', t('apiUsage.sim.aiOut'), 1000000, 50)}
          {field('notePct', t('apiUsage.sim.notePct'), 100, 1, t('apiUsage.sim.noteHint'))}
          {field('noteInTokens', t('apiUsage.sim.noteIn'), 1000000, 100)}
          {field('noteOutTokens', t('apiUsage.sim.noteOut'), 1000000, 50)}
        </div>
        {opt && (
          <div className="ap-grid-form" style={{ marginTop: 14 }}>
            {['hunter', 'bouncer', 'resend'].map((p) => (opt.providers[p] || []).length > 1 && (
              <label key={p} className="ap-field">{t('apiUsage.sim.planOf', { provider: NAMES[p] })}
                <select value={plans[p] || ''} onChange={(e) => setPlans({ ...plans, [p]: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">{t('apiUsage.sim.planCurrent')}</option>
                  {opt.providers[p].map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
      </Card>
      {res && (
        <Card title={t('apiUsage.sim.result')} className="mt-card">
          <div className="ap-sim-total">
            <div><span>{t('apiUsage.sim.total')}</span><b>{money(res.totalEur)}</b></div>
            <div><span>{t('apiUsage.sim.perSpin')}</span><b>{money(res.perSpinEur, 4)}</b></div>
            <div><span>{t('apiUsage.sim.per1000')}</span><b>{money(res.per1000Eur)}</b></div>
          </div>
          {res.incomplete.length > 0 && <p className="ap-warn">{t('apiUsage.sim.incomplete', { list: res.incomplete.map((p) => NAMES[p] || p).join(', ') })}</p>}
          <table className="ap-table" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', color: '#64748B' }}><th>{t('apiUsage.sim.service')}</th><th>{t('apiUsage.sim.quantity')}</th><th>{t('apiUsage.sim.unitPrice')}</th><th style={{ textAlign: 'right' }}>{t('apiUsage.sim.cost')}</th></tr></thead>
            <tbody>
              {res.lines.map((l) => (
                <tr key={l.id || l.provider} style={{ borderTop: '1px solid #EEF2FA' }}>
                  <td style={{ padding: '8px 0' }}>{l.label}{l.planLabel && <Badge tone="neutral">{l.planLabel}</Badge>}
                    {l.free && l.free.exceeded && <div className="ap-sub" style={{ color: '#B45309' }}>{t('apiUsage.sim.overFree', { quota: l.free.quota })}</div>}</td>
                  <td>{Math.round(l.quantity).toLocaleString()}</td>
                  <td>{money(l.unitEur, 4)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(l.costEur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ap-hint" style={{ marginBottom: 0 }}>{t('apiUsage.sim.note')}</p>
        </Card>
      )}
    </div>
  );
}
