import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';
import { LIMITS, DEFAULTS, DEFAULT_FACTORS, simulate, simulateScenarios, alertsFor } from '../utils/spinSimulation';
import './admin-premium.css';
import './spin-simulator.css';

// Admin › Simulateur de lancers. Everything is computed here, on every slider move (utils/spinSimulation.js, tested): no call to the server
// except the optional PDF export.
const COLORS = { pessimistic: '#F59E0B', realistic: '#0055F8', optimistic: '#059669', demand: '#7C3AED', capacity: '#94A3B8' };
const SCENARIOS = ['pessimistic', 'realistic', 'optimistic'];

// Slider + numeric field kept in step. The field takes a free draft while typing and is pulled back inside the limits when left.
function Field({ id, value, onChange, color = COLORS.realistic, label, help, unit, step }) {
  const lim = LIMITS[id];
  const [draft, setDraft] = useState(null);
  const pct = ((value - lim.min) / (lim.max - lim.min)) * 100;
  const commit = (raw) => { const n = parseFloat(raw); if (Number.isFinite(n) && n >= lim.min && n <= lim.max) onChange(n); };
  return (
    <div className="ap-sl sp-field">
      <div className="ap-sl-top">
        <span>{label}</span>
        <span className="sp-input">
          <input type="number" inputMode="decimal" min={lim.min} max={lim.max} step={step || 1} aria-label={label}
            value={draft !== null ? draft : value}
            onChange={(e) => { setDraft(e.target.value); commit(e.target.value); }}
            onBlur={() => { const n = parseFloat(draft); if (draft !== null) onChange(Number.isFinite(n) ? Math.min(lim.max, Math.max(lim.min, n)) : value); setDraft(null); }} />
          <em>{unit}</em>
        </span>
      </div>
      <input type="range" min={lim.min} max={lim.max} step={lim.step} value={value} aria-label={label}
        style={{ '--p': `${pct}%`, '--c': color }} onChange={(e) => { setDraft(null); onChange(parseFloat(e.target.value)); }} />
      <small>{help}</small>
    </div>
  );
}

export default function SpinSimulator() {
  const { t, i18n } = useTranslation('admin');
  const [inputs, setInputs] = useState(DEFAULTS);
  const [factors, setFactors] = useState(DEFAULT_FACTORS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setInputs((p) => ({ ...p, [k]: v }));

  const sim = useMemo(() => simulate(inputs), [inputs]);
  const sc = useMemo(() => simulateScenarios(inputs, factors), [inputs, factors]);
  const alerts = alertsFor(sim);

  const loc = i18n.language || 'fr';
  const int = (v) => Math.round(v).toLocaleString(loc);
  const dec = (v, d = 1) => v.toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: d });
  const pc = (v) => `${dec(v * 100, 1)} %`;
  const hours = (v) => (v < 1 ? `${int(v * 60)} min` : `${dec(v, 1)} h`);
  const name = (k) => t(`spinSim.scenario.${k}`);

  const scenarioData = SCENARIOS.map((k) => ({ name: name(k), spins: sc[k].rounded.spins, key: k }));
  const dayData = Array.from({ length: sim.inputs.days }, (_, i) => {
    const row = { name: `${t('spinSim.charts.day')} ${i + 1}` };
    for (const k of SCENARIOS) row[k] = Math.round(sc[k].daily[i]);
    return row;
  });

  async function exportPdf() {
    setBusy(true); setError('');
    try {
      const i = sim.inputs;
      await api.downloadSpinSimulatorPdf({
        title: t('spinSim.pdf.title'),
        subtitle: t('spinSim.pdf.subtitle', { date: new Date().toLocaleDateString(loc) }),
        sections: [
          { title: t('spinSim.pdf.hypotheses'), rows: [
            [t('spinSim.params.visitors.label'), int(i.visitors)],
            [t('spinSim.params.days.label'), `${i.days}`], [t('spinSim.params.hoursPerDay.label'), `${i.hoursPerDay} h`],
            [t('spinSim.params.secondsPerSpin.label'), `${i.secondsPerSpin} s`], [t('spinSim.params.wheels.label'), `${i.wheels}`],
            [t('spinSim.params.utilization.label'), `${i.utilization} %`], [t('spinSim.params.spinsPerParticipant.label'), dec(i.spinsPerParticipant)],
          ] },
          { title: t('spinSim.pdf.scenarios'), head: ['', ...SCENARIOS.map(name)], rows: [
            [t('spinSim.params.utilization.label'), ...SCENARIOS.map((k) => `${dec(sc[k].inputs.utilization)} %`)],
            [t('spinSim.kpi.totalSpins'), ...SCENARIOS.map((k) => int(sc[k].spins))],
            [t('spinSim.kpi.participants'), ...SCENARIOS.map((k) => int(sc[k].participants))],
            [t('spinSim.kpi.spinsPerDay'), ...SCENARIOS.map((k) => int(sc[k].spinsPerDay))],
            [t('spinSim.kpi.spinsPerHour'), ...SCENARIOS.map((k) => int(sc[k].spinsPerHour))],
            [t('spinSim.kpi.shareVisitors'), ...SCENARIOS.map((k) => pc(sc[k].shareOfVisitors))],
          ] },
          ...(alerts.length ? [{ title: t('spinSim.pdf.alerts'), rows: alerts.map((a) => [t(`spinSim.alerts.${a}`)]) }] : []),
        ],
      });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const kpis = [
    ['participants', int(sim.participants)],
    ['spinsPerDay', int(sim.spinsPerDay)],
    ['spinsPerHour', int(sim.spinsPerHour)],
    ['hoursNeeded', hours(sim.activeHoursPerWheel)],
  ];

  return (
    <div className="ap sp">
      <div className="page-header">
        <div><h1 className="page-title">{t('spinSim.title')}</h1><p className="page-subtitle">{t('spinSim.subtitle')}</p></div>
        <div className="sp-actions">
          <Button variant="secondary" onClick={() => { setInputs(DEFAULTS); setFactors(DEFAULT_FACTORS); }}>{t('spinSim.reset')}</Button>
          <Button onClick={exportPdf} disabled={busy}>{busy ? t('spinSim.exporting') : t('spinSim.exportPdf')}</Button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

        <div className="sp-hero">
          <div className="sp-hero-main">
            <span>{t('spinSim.kpi.totalSpins')}</span>
            <b>{int(sim.spins)}</b>
            <em>{t('spinSim.heroHelp')}</em>
          </div>
          <div className="sp-hero-side"><span>{t('spinSim.res.opening')}</span><b>{hours(sim.openingHours)}</b></div>
          <div className="sp-hero-side"><span>{t('spinSim.res.theoretical')}</span><b>{int(sim.theoretical)}</b></div>
          <div className="sp-hero-side"><span>{t('spinSim.kpi.shareVisitors')}</span><b>{pc(sim.shareOfVisitors)}</b></div>
        </div>

        <div className="grid-stats sp-kpis">
          {kpis.map(([k, v, tone]) => (
            <div key={k} className="stat"><div className="stat-label">{t(`spinSim.kpi.${k}`).toUpperCase()}</div><div className={`stat-value ${tone || ''}`}>{v}</div><div className="ap-sub">{t(`spinSim.kpiHelp.${k}`)}</div></div>
          ))}
        </div>

      <Card title={t('spinSim.assumptions')} className="sp-params">
        <div className="sp-params-grid">
          <Field id="visitors" value={inputs.visitors} onChange={set('visitors')} label={t('spinSim.params.visitors.label')} help={t('spinSim.params.visitors.help')} unit={t('spinSim.unit.people')} />
          <Field id="days" value={inputs.days} onChange={set('days')} label={t('spinSim.params.days.label')} help={t('spinSim.params.days.help')} unit={t('spinSim.unit.days')} />
          <Field id="hoursPerDay" value={inputs.hoursPerDay} onChange={set('hoursPerDay')} label={t('spinSim.params.hoursPerDay.label')} help={t('spinSim.params.hoursPerDay.help')} unit="h" />
          <Field id="secondsPerSpin" value={inputs.secondsPerSpin} onChange={set('secondsPerSpin')} label={t('spinSim.params.secondsPerSpin.label')} help={t('spinSim.params.secondsPerSpin.help')} unit="s" />
          <Field id="wheels" value={inputs.wheels} onChange={set('wheels')} label={t('spinSim.params.wheels.label')} help={t('spinSim.params.wheels.help')} unit={t('spinSim.unit.wheels')} />
          <Field id="utilization" value={inputs.utilization} onChange={set('utilization')} label={t('spinSim.params.utilization.label')} help={t('spinSim.params.utilization.help')} unit="%" />
          <Field id="spinsPerParticipant" value={inputs.spinsPerParticipant} onChange={set('spinsPerParticipant')} step={0.1} label={t('spinSim.params.spinsPerParticipant.label')} help={t('spinSim.params.spinsPerParticipant.help')} unit="×" />
        </div>
      </Card>

        {alerts.length > 0 && (
          <div className="sp-alerts">
            {alerts.map((a) => <div key={a} className={`sp-alert ${a === 'slowSpin' ? 'info' : 'warn'}`}>{t(`spinSim.alerts.${a}`)}</div>)}
          </div>
        )}

      <Card title={t('spinSim.scenarios')} className="mt-card">
        <p className="ap-hint">{t('spinSim.scenariosHelp')}</p>
        <div className="sp-scen">
          {SCENARIOS.map((k) => (
            <div key={k} className={`sp-scen-card${k === 'realistic' ? ' main' : ''}`} style={{ '--c': COLORS[k] }}>
              <h4>{name(k)}</h4>
              <b>{int(sc[k].spins)}</b><span>{t('spinSim.kpi.totalSpins')}</span>
              <div className="sp-scen-row"><span>{t('spinSim.kpi.spinsPerDay')}</span><strong>{int(sc[k].spinsPerDay)}</strong></div>
              <div className="sp-scen-row"><span>{t('spinSim.kpi.participants')}</span><strong>{int(sc[k].participants)}</strong></div>
              <div className="sp-scen-row"><span>{t('spinSim.kpi.spinsPerHour')}</span><strong>{int(sc[k].spinsPerHour)}</strong></div>
              <div className="sp-scen-row"><span>{t('spinSim.kpi.shareVisitors')}</span><strong>{pc(sc[k].shareOfVisitors)}</strong></div>
              <div className="sp-scen-row"><span>{t('spinSim.kpi.hoursNeeded')}</span><strong>{hours(sc[k].activeHoursPerWheel)}</strong></div>
              <small>{t('spinSim.scenarioRates', { util: dec(sc[k].inputs.utilization) })}</small>
            </div>
          ))}
        </div>
        <details className="ap-fold">
          <summary>{t('spinSim.factorsTitle')}</summary>
          <div className="sp-factors">
            <p className="ap-hint">{t('spinSim.factorsHelp')}</p>
            {SCENARIOS.map((k) => (
              <label key={k}>{name(k)}
                <input type="number" min="0.1" max="3" step="0.05" value={factors[k]} onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n) && n >= 0.1 && n <= 3) setFactors((p) => ({ ...p, [k]: n })); }} />
              </label>
            ))}
          </div>
        </details>
      </Card>

      <div className="sp-charts">
        <Card title={t('spinSim.charts.scenarios')}>
          <div className="sp-chart"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={scenarioData} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3EAF8" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} width={56} tickFormatter={int} />
              <Tooltip formatter={(v) => int(v)} />
              <Bar dataKey="spins" name={t('spinSim.kpi.totalSpins')} radius={[8, 8, 0, 0]} fill={COLORS.realistic} shape={(p) => <rect x={p.x} y={p.y} width={p.width} height={p.height} rx="8" fill={COLORS[p.payload.key]} />}><LabelList dataKey="spins" position="top" formatter={int} className="sp-label" /></Bar>
            </BarChart>
          </ResponsiveContainer></div>
        </Card>
        <Card title={t('spinSim.charts.perDay')} className="sp-wide">
          <p className="ap-hint">{t('spinSim.charts.perDayHelp')}</p>
          <div className="sp-chart"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3EAF8" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} width={56} tickFormatter={int} />
              <Tooltip formatter={(v) => int(v)} /><Legend />
              {SCENARIOS.map((k) => <Bar key={k} dataKey={k} name={name(k)} fill={COLORS[k]} radius={[6, 6, 0, 0]}><LabelList dataKey={k} position="top" formatter={int} className="sp-label" /></Bar>)}
            </BarChart>
          </ResponsiveContainer></div>
        </Card>
      </div>
    </div>
  );
}
