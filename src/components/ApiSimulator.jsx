import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

// Admin › Consommation API › Simulateur: drag the sliders, see the monthly bill move. A what-if, nothing is stored.
const NAMES = { anthropic: 'Claude', resend: 'Resend', hunter: 'Hunter', bouncer: 'Bouncer' };
const COLORS = { bouncer: '#0055F8', hunter: '#7C3AED', resend: '#059669', ai: '#F59E0B', notes: '#EC4899' };
const money = (v, d = 2) => (v === null || v === undefined ? '—' : v.toLocaleString(undefined, { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: v !== 0 && Math.abs(v) < 0.01 ? 4 : d }));
const SPIN_STOPS = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
// Same arithmetic as the server's services/apiUsage/simulator.js, done here so the price follows the slider instantly.
function compute(opt, spins, f, plans) {
  const pick = (p) => { const list = (opt.providers && opt.providers[p]) || []; return list.find((x) => x.id === plans[p]) || list.find((x) => x.current) || list[0] || null; };
  const lines = []; const missing = [];
  const add = (id, provider, label, quantity, plan) => {
    const u = plan ? plan.eur : null;
    if (u === null || u === undefined) { missing.push(provider); lines.push({ id, provider, label, quantity, planLabel: plan ? plan.label : null, unitEur: null, costEur: null }); return; }
    lines.push({ id, provider, label, quantity, planLabel: plan.label, unitEur: u, costEur: quantity * u, free: plan.free ? { quota: plan.free, exceeded: quantity > plan.free } : null });
  };
  add('bouncer', 'bouncer', 'Vérification e-mail (Bouncer)', spins * f.bouncerPct / 100, pick('bouncer'));
  add('hunter', 'hunter', 'Recherche d’e-mail (Hunter)', spins * f.hunterPct / 100, pick('hunter'));
  add('resend', 'resend', 'E-mails envoyés (Resend)', spins * f.emailsPerSpin, pick('resend'));
  const tk = opt.tokens || {};
  const ai = (id, label, quantity, tin, tout) => {
    if (tk.inEur == null || tk.outEur == null) { missing.push('anthropic'); lines.push({ id, provider: 'anthropic', label, quantity, planLabel: null, unitEur: null, costEur: null }); return; }
    const unit = tin * tk.inEur + tout * tk.outEur;
    lines.push({ id, provider: 'anthropic', label, quantity, planLabel: 'Sonnet 5', unitEur: unit, costEur: quantity * unit });
  };
  ai('ai', 'IA (Claude)', spins * f.aiCallsPerSpin, f.aiInTokens, f.aiOutTokens);
  ai('notes', 'Assistant IA de notes (Claude)', spins * f.notePct / 100, f.noteInTokens, f.noteOutTokens);
  const totalEur = lines.reduce((a, l) => a + (l.costEur || 0), 0);
  return { lines, totalEur, perSpinEur: totalEur / spins, per1000Eur: (totalEur / spins) * 1000, incomplete: [...new Set(missing)] };
}
const idOf = (l) => l.id || l.provider;

function Slider({ label, hint, value, min = 0, max, step = 1, unit = '', onChange, color, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="ap-sl">
      <div className="ap-sl-top"><span>{label}</span><b style={{ color }}>{format ? format(value) : value.toLocaleString()}{unit}</b></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--p': `${pct}%`, '--c': color || '#0055F8' }} aria-label={label} />
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Group({ icon, title, color, children }) {
  return (
    <div className="ap-sim-group" style={{ '--c': color }}>
      <div className="ap-sim-gh"><span className="ap-sim-dot">{icon}</span><b>{title}</b></div>
      {children}
    </div>
  );
}

export default function ApiSimulator() {
  const { t } = useTranslation('admin');
  const [opt, setOpt] = useState(null);
  const [spinIdx, setSpinIdx] = useState(2);
  const [f, setF] = useState({ bouncerPct: 100, hunterPct: 20, emailsPerSpin: 1, aiCallsPerSpin: 1, aiInTokens: 1500, aiOutTokens: 300, notePct: 30, noteInTokens: 1500, noteOutTokens: 400 });
  const [plans, setPlans] = useState({});
  const spins = SPIN_STOPS[spinIdx];
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => { api.getApiSimulatorOptions().then(setOpt).catch(() => setOpt({ providers: {}, tokens: {} })); }, []);
  const res = opt && opt.providers ? compute(opt, spins, f, plans) : null;
  const total = res ? res.totalEur : 0;
  const colorOf = (l) => COLORS[l.id || l.provider === 'anthropic' ? (l.id === 'notes' ? 'notes' : 'ai') : l.provider] || '#94A3B8';
  return (
    <div className="ap ap-sim">
      <div className="ap-sim-hero">
        <div className="ap-sim-big">
          <span>{t('apiUsage.sim.total')}</span>
          <b>{res ? money(total) : '…'}</b>
          <em>{t('apiUsage.sim.forSpins', { n: spins.toLocaleString() })}</em>
        </div>
        <div className="ap-sim-mini"><span>{t('apiUsage.sim.perSpin')}</span><b>{res ? money(res.perSpinEur, 4) : '…'}</b></div>
        <div className="ap-sim-mini"><span>{t('apiUsage.sim.per1000')}</span><b>{res ? money(res.per1000Eur) : '…'}</b></div>
        {res && total > 0 && (
          <div className="ap-sim-bar" aria-hidden="true">
            {res.lines.filter((l) => l.costEur > 0).map((l) => <i key={idOf(l)} style={{ width: `${(l.costEur / total) * 100}%`, background: colorOf(l) }} title={`${l.label} · ${money(l.costEur)}`} />)}
          </div>
        )}
        {res && res.incomplete.length > 0 && <p className="ap-warn" style={{ gridColumn: '1 / -1', margin: 0 }}>{t('apiUsage.sim.incomplete', { list: res.incomplete.map((p) => NAMES[p] || p).join(', ') })}</p>}
      </div>

      <div className="ap-sim-spins">
        <Slider label={t('apiUsage.sim.spins')} value={spinIdx} min={0} max={SPIN_STOPS.length - 1} onChange={setSpinIdx} format={() => spins.toLocaleString()} color="#002881" />
        <div className="ap-sim-chips">{[1000, 5000, 25000, 100000].map((n) => <button key={n} type="button" className={spins === n ? 'on' : ''} onClick={() => setSpinIdx(SPIN_STOPS.indexOf(n))}>{n.toLocaleString()}</button>)}</div>
      </div>

      <div className="ap-sim-cols">
        <Group icon="✓" title="Bouncer" color={COLORS.bouncer}>
          <Slider label={t('apiUsage.sim.bouncerPct')} hint={t('apiUsage.sim.bouncerHint')} value={f.bouncerPct} max={100} unit=" %" color={COLORS.bouncer} onChange={set('bouncerPct')} />
        </Group>
        <Group icon="⌕" title="Hunter" color={COLORS.hunter}>
          <Slider label={t('apiUsage.sim.hunterPct')} hint={t('apiUsage.sim.hunterHint')} value={f.hunterPct} max={100} unit=" %" color={COLORS.hunter} onChange={set('hunterPct')} />
        </Group>
        <Group icon="✉" title="Resend" color={COLORS.resend}>
          <Slider label={t('apiUsage.sim.emails')} value={f.emailsPerSpin} max={5} step={0.5} color={COLORS.resend} onChange={set('emailsPerSpin')} />
        </Group>
        <Group icon="✦" title={t('apiUsage.sim.aiGroup')} color={COLORS.ai}>
          <Slider label={t('apiUsage.sim.aiCalls')} value={f.aiCallsPerSpin} max={5} step={0.5} color={COLORS.ai} onChange={set('aiCallsPerSpin')} />
          <Slider label={t('apiUsage.sim.aiIn')} value={f.aiInTokens} max={10000} step={100} color={COLORS.ai} onChange={set('aiInTokens')} />
          <Slider label={t('apiUsage.sim.aiOut')} value={f.aiOutTokens} max={4000} step={50} color={COLORS.ai} onChange={set('aiOutTokens')} />
        </Group>
        <Group icon="✎" title={t('apiUsage.sim.noteGroup')} color={COLORS.notes}>
          <Slider label={t('apiUsage.sim.notePct')} hint={t('apiUsage.sim.noteHint')} value={f.notePct} max={100} unit=" %" color={COLORS.notes} onChange={set('notePct')} />
          <Slider label={t('apiUsage.sim.noteIn')} value={f.noteInTokens} max={10000} step={100} color={COLORS.notes} onChange={set('noteInTokens')} />
          <Slider label={t('apiUsage.sim.noteOut')} value={f.noteOutTokens} max={4000} step={50} color={COLORS.notes} onChange={set('noteOutTokens')} />
        </Group>
        {opt && ['hunter', 'bouncer', 'resend'].some((p) => (opt.providers[p] || []).length > 1) && (
          <Group icon="€" title={t('apiUsage.sim.plansGroup')} color="#002881">
            {['hunter', 'bouncer', 'resend'].map((p) => (opt.providers[p] || []).length > 1 && (
              <label key={p} className="ap-field">{t('apiUsage.sim.planOf', { provider: NAMES[p] })}
                <select value={plans[p] || ''} onChange={(e) => setPlans({ ...plans, [p]: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">{t('apiUsage.sim.planCurrent')}</option>
                  {opt.providers[p].map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
              </label>
            ))}
          </Group>
        )}
      </div>

      {res && (
        <div className="ap-sim-lines">
          {res.lines.map((l) => (
            <div key={idOf(l)} className="ap-sim-line">
              <span className="ap-sim-swatch" style={{ background: colorOf(l) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{l.label}</b>{l.planLabel && <span className="ap-pill" style={{ marginLeft: 8 }}>{l.planLabel}</span>}
                <div className="ap-sub">{Math.round(l.quantity).toLocaleString()} × {money(l.unitEur, 4)}</div>
                {l.free && l.free.exceeded && <div className="ap-sub" style={{ color: '#B45309' }}>{t('apiUsage.sim.overFree', { quota: l.free.quota })}</div>}
              </div>
              <b className="ap-sim-cost">{money(l.costEur)}</b>
            </div>
          ))}
          <p className="ap-hint" style={{ margin: '4px 0 0' }}>{t('apiUsage.sim.note')}</p>
        </div>
      )}
    </div>
  );
}
