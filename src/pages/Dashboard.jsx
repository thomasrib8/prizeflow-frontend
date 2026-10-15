import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Badge, Button, EmptyState, GiftPill, MiniBar } from '../components/ui';
import DownloadAppModal from '../components/DownloadAppModal';
import ChartModule from '../components/dashboard/ChartModule';
import { useConfirm } from '../components/ConfirmDialog';
import ProfitabilityCard from '../components/dashboard/ProfitabilityCard';
import AddModuleModal from '../components/dashboard/AddModuleModal';
import { allowedViz } from '../components/dashboard/recommend';
import '../components/dashboard/dashboard.css';
import { useAdmin } from '../hooks/useAdmin';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

function EmailHistoryCard() {
  const { t } = useTranslation('admin');
  const [log, setLog] = useState(null);

  useEffect(() => {
    api.getEmailLog(20).then(setLog).catch(() => {});
  }, []);

  function formatTimeOnly(s) {
    return new Date(s.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="card mt-card">
      <div className="card-head">
        <h3 className="card-title">{t('dashboard.emailHistoryTitle')}</h3>
      </div>
      {!log ? (
        <p className="page-subtitle">{t('common.loading')}</p>
      ) : log.length === 0 ? (
        <EmptyState title={t('dashboard.noEmailsSent')} />
      ) : (
        <div className="activity-list">
          {log.map((e) => (
            <div className="activity-item" key={e.id}>
              <div className="act-icon spin">
                <svg viewBox="0 0 24 24" fill="none" stroke={e.status === 'error' ? '#EF4444' : '#09B2FD'} strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </div>
              <div className="act-info">
                <div className="act-title">{e.label}</div>
                <div className="act-time">
                  {formatTimeOnly(e.created_at)} · → {e.recipient}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SLOT_COLORS = ['#09B2FD','#10B981','#F59E0B','#9333EA','#E11D48','#15803D','#D97706','#4F46E5','#BE185D','#0D9488','#A16207','#7C3AED'];
const CHART_FILTERS = ['7D', '30D', '90D', 'All'];
const CAMPAIGN_STATUS_TONE = { draft: 'neutral', active: 'green', paused: 'orange', completed: 'blue', archived: 'neutral' };
const STATUS_TKEY = { draft: 'statusDraft', active: 'statusActive', paused: 'statusPaused', completed: 'statusCompleted', archived: 'statusArchived' };

function StatCard({ label, value, sub, accent, pct }) {
  const bar = pct !== undefined;
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value${accent ? ` accent-${accent}` : ''}`}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{sub}</div>}
      {bar && (
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{
            width: `${Math.min(100, pct)}%`,
            background: accent === 'blue' ? 'var(--blue)' : accent === 'green' ? 'var(--green)' : accent === 'orange' ? 'var(--orange)' : 'var(--text-light)',
          }} />
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#03041A' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span><span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// What "All campaigns" shows (nothing to customise there): the standard modules, no chart on a single campaign's data.
const ALL_LAYOUT = [
  { id: 'a1', type: 'kpi', w: 1, config: { metric: 'leads' } }, { id: 'a2', type: 'kpi', w: 1, config: { metric: 'qualified' } },
  { id: 'a3', type: 'kpi', w: 1, config: { metric: 'gifts_remaining' } }, { id: 'a4', type: 'kpi', w: 1, config: { metric: 'gifts_distributed' } },
  { id: 'a5', type: 'progress', w: 4 }, { id: 'a6', type: 'distribution', w: 2 }, { id: 'a7', type: 'summary', w: 2 },
  { id: 'a8', type: 'topRewards', w: 2 }, { id: 'a9', type: 'activity', w: 2 }, { id: 'a10', type: 'emails', w: 4 },
];
const TEMPLATE_KEYS = { standard: 'tplStandard', b2b: 'tplB2b', consumer: 'tplConsumer', blank: 'tplBlank' };
const newWidgetId = () => `w_${Math.random().toString(36).slice(2, 8)}`;

export default function Dashboard() {
  const { t } = useTranslation('admin');
  const { isAdmin } = useAdmin();
  const [confirm, confirmDialog] = useConfirm();
  const [data, setData] = useState(null);
  const [chart, setChart] = useState([]);
  const [topRewards, setTopRewards] = useState([]);
  const [chartFilter, setChartFilter] = useState('7D');
  const [campaigns, setCampaigns] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [showDownloadApp, setShowDownloadApp] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null); // { layout, saved, dimensions, templates } of the selected campaign
  const [draft, setDraft] = useState(null); // layout being edited (null = not editing)
  const [adding, setAdding] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiNotes, setAiNotes] = useState({}); // module id -> why the AI proposed it
  const [aiSummary, setAiSummary] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Draft campaigns never launched (nothing to report yet) and test campaigns are excluded from reporting everywhere else
    // in the app. The dashboard opens on the active campaign (else the latest one); "All campaigns" stays in the list.
    api.listCampaigns()
      .then((rows) => {
        const list = rows.filter((c) => c.status !== 'draft' && !c.is_test);
        setCampaigns(list);
        const active = list.find((c) => c.status === 'active');
        setCampaignId((active || list[0] || { id: 'all' }).id);
      })
      .catch(() => { setCampaigns([]); setCampaignId('all'); });
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    setData(null); setInfo(null); setDraft(null); setMsg(''); setAiNotes({}); setAiSummary('');
    api.dashboard(campaignId).then(setData).catch((e) => setError(e.message));
    api.dashboardTopRewards(campaignId).then(setTopRewards).catch(() => {});
    if (campaignId !== 'all') api.dashboardLayout(campaignId).then(setInfo).catch(() => setInfo({ layout: ALL_LAYOUT, saved: false, dimensions: [], templates: [] }));
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    const days = chartFilter === 'All' ? 'all' : chartFilter.replace('D', '');
    api.dashboardChart(days, campaignId).then(setChart).catch(() => {});
  }, [chartFilter, campaignId]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data || !campaignId || (campaignId !== 'all' && !info)) return <p className="page-subtitle">{t('common.loading')}</p>;

  const { kpi, rewards, leads, recentActivity } = data;
  const campaign = kpi?.campaign;
  const statusLabel = (s) => t(`common.${STATUS_TKEY[s] || 'statusDraft'}`);
  const editable = campaignId !== 'all' && !!info;
  const editing = draft !== null;
  const layout = editing ? draft : (campaignId === 'all' ? ALL_LAYOUT : info.layout);
  const dimensions = info ? info.dimensions : [];

  const update = (fn) => setDraft((d) => fn([...d]));
  const move = (from, to) => update((d) => { if (from === to || from == null || to == null) return d; const [w] = d.splice(from, 1); d.splice(to, 0, w); return d; });
  const resize = (i, delta) => update((d) => { d[i] = { ...d[i], w: Math.min(4, Math.max(1, (d[i].w || 1) + delta)) }; return d; });
  const remove = (i) => update((d) => { d.splice(i, 1); return d; });
  const setViz = (i, viz) => update((d) => { d[i] = { ...d[i], config: { ...d[i].config, viz } }; return d; });

  async function save() {
    setBusy(true); setMsg('');
    try { const r = await api.saveDashboardLayout(campaignId, draft); setInfo((x) => ({ ...x, layout: r.layout, saved: true })); setDraft(null); setAiNotes({}); setAiSummary(''); setMsg(t('dashboard.savedMsg')); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function runSuggest() {
    setAiBusy(true); setAiError('');
    try {
      const r = await api.suggestDashboard(campaignId, aiGoal);
      setDraft(r.layout); setAiNotes(r.notes || {}); setAiSummary(r.summary || ''); setAiOpen(false);
    } catch (e) { setAiError(e.message); } finally { setAiBusy(false); }
  }
  async function applyTemplate(name) {
    if (!name) return;
    if (!(await confirm(t('dashboard.tplConfirm'), { confirmLabel: t('dashboard.tplConfirmBtn') }))) return;
    try { const r = await api.dashboardTemplate(campaignId, name); setDraft(r.layout); } catch (e) { setMsg(e.message); }
  }
  async function resetStandard() {
    if (!(await confirm(t('dashboard.resetConfirm'), { danger: true, confirmLabel: t('dashboard.resetBtn') }))) return;
    setBusy(true);
    try { const r = await api.resetDashboardLayout(campaignId); setInfo((x) => ({ ...x, layout: r.layout, saved: false })); setDraft(null); setMsg(t('dashboard.savedMsg')); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  const qualifiedPct = leads?.captured ? Math.round((leads.qualified / leads.captured) * 100) : 0;
  const segmentedPct = leads?.captured ? Math.round((leads.segmented / leads.captured) * 100) : 0;
  const remainingPct = kpi && kpi.planned ? Math.round((kpi.remaining / kpi.planned) * 100) : 0;

  function renderKpi(metric) {
    if (metric === 'leads') return <StatCard label={t('dashboard.leadsCapturedLabel')} value={leads ? leads.captured.toLocaleString() : '—'} sub={t('dashboard.leadsCapturedSub')} accent="blue" />;
    if (metric === 'qualified') return <StatCard label={t('dashboard.qualifiedLeadsLabel')} value={leads ? leads.qualified.toLocaleString() : '—'} sub={leads ? t('dashboard.qualifiedLeadsSub', { pct: qualifiedPct }) : undefined} accent="green" pct={qualifiedPct} />;
    if (metric === 'segmented') return <StatCard label={t('dashboard.segmentedLeadsLabel')} value={leads ? leads.segmented.toLocaleString() : '—'} sub={leads ? t('dashboard.segmentedLeadsSub', { pct: segmentedPct }) : undefined} accent="orange" pct={segmentedPct} />;
    if (metric === 'gifts_remaining') return <StatCard label={t('dashboard.remainingGiftsLabel')} value={kpi ? kpi.remaining.toLocaleString() : '—'} sub={kpi ? t('dashboard.remainingGiftsSub', { pct: remainingPct }) : undefined} accent="orange" pct={remainingPct} />;
    return <StatCard label={t('dashboard.giftsDistributedLabel')} value={kpi ? kpi.distributed.toLocaleString() : '—'} sub={kpi ? t('dashboard.giftsDistributedSub', { pct: kpi.progressPct }) : undefined} accent="blue" pct={kpi?.progressPct} />;
  }

  function renderWidget(w) {
    switch (w.type) {
      case 'kpi': return renderKpi(w.config.metric);
      case 'progress': return <StatCard label={t('dashboard.campaignProgressLabel')} value={kpi ? `${kpi.progressPct}%` : '—'} sub={kpi ? t('dashboard.campaignProgressSub', { distributed: kpi.distributed, planned: kpi.planned }) : undefined} pct={kpi?.progressPct} />;
      case 'chart': return campaignId === 'all' ? null : <ChartModule campaignId={campaignId} config={w.config} dimensions={dimensions} editing={editing} onViz={(v) => setViz(layout.indexOf(w), v)} />;
      case 'distribution': return (
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">{t('dashboard.distributionOverviewTitle')}</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {CHART_FILTERS.map((f) => (
                <button key={f} onClick={() => setChartFilter(f)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: chartFilter === f ? 'var(--blue, #09B2FD)' : 'var(--border-light, #F1F5F9)', color: chartFilter === f ? '#03041A' : 'var(--text-muted)' }}>{f}</button>
              ))}
            </div>
          </div>
          {chart.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('dashboard.noChartData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="planned" name={t('dashboard.chartPlannedLegend')} stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="distributed" name={t('dashboard.chartDistributedLegend')} stroke="#0055F8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="remaining" name={t('dashboard.chartRemainingLegend')} stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      );
      case 'summary': return (
        <div className="card">
          <div className="card-head"><h3 className="card-title">{t('dashboard.campaignSummaryTitle')}</h3></div>
          {!campaign ? <EmptyState title={t('dashboard.noActiveCampaign')} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  [t('dashboard.summaryFieldCampaign'), campaign.name],
                  [t('dashboard.summaryFieldStatus'), <Badge tone={CAMPAIGN_STATUS_TONE[campaign.status] || 'neutral'}>{statusLabel(campaign.status)}</Badge>],
                  [t('dashboard.summaryFieldTotalSpins'), campaign.total_stock.toLocaleString()],
                  [t('dashboard.summaryFieldSpinsCompleted'), campaign.total_distributed.toLocaleString()],
                  [t('dashboard.summaryFieldRemainingSpins'), (campaign.total_stock - campaign.total_distributed).toLocaleString()],
                  [t('dashboard.summaryFieldRewardsSent'), rewards.sent || 0],
                  [t('dashboard.summaryFieldRedeemed'), rewards.used || 0],
                ].map(([label, value], i) => (
                  <tr key={i}>
                    <td style={{ padding: '7px 0', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>{label}</td>
                    <td style={{ padding: '7px 0', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {campaign && <div style={{ marginTop: 14, textAlign: 'center' }}><a href="/history" style={{ fontSize: 12, color: 'var(--link)', fontWeight: 600, textDecoration: 'none' }}>{t('dashboard.viewFullReportLink')}</a></div>}
        </div>
      );
      case 'topRewards': return (
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">{t('dashboard.topRewardsTitle')}</h3>
            <a href="/campaigns" style={{ fontSize: 12, color: 'var(--link)', fontWeight: 600, textDecoration: 'none' }}>{t('dashboard.viewAllRewardsLink')}</a>
          </div>
          {topRewards.length === 0 ? <EmptyState title={t('dashboard.noRewardsYet')} /> : (
            <table className="data-table">
              <thead><tr><th>{t('dashboard.rewardColHeader')}</th><th style={{ textAlign: 'right' }}>{t('dashboard.plannedColHeader')}</th><th style={{ textAlign: 'right' }}>{t('dashboard.distributedColHeader')}</th><th style={{ textAlign: 'right' }}>{t('dashboard.remainingColHeader')}</th><th>{t('dashboard.progressColHeader')}</th></tr></thead>
              <tbody>
                {topRewards.map((r, i) => (
                  <tr key={i}>
                    <td><GiftPill slotIndex={r.slotIndex} name={r.giftName} /></td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{r.planned}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.distributed}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{r.remaining}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MiniBar pct={r.pct} color={SLOT_COLORS[r.slotIndex % SLOT_COLORS.length]} /><span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{r.pct}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
      case 'activity': return (
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">{t('dashboard.recentActivityTitle')}</h3>
            <a href="/history" style={{ fontSize: 12, color: 'var(--link)', fontWeight: 600, textDecoration: 'none' }}>{t('dashboard.viewAllLink')}</a>
          </div>
          {recentActivity.length === 0 ? <EmptyState title={t('dashboard.noActivityYet')} /> : (
            <div className="activity-list">
              {recentActivity.slice(0, 6).map((row, i) => (
                <div className="activity-item" key={i}>
                  <div className="act-icon spin"><svg viewBox="0 0 24 24" fill="none" stroke="#09B2FD" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="1.5" /><line x1="12" y1="3" x2="12" y2="7" /></svg></div>
                  <div className="act-info">
                    <div className="act-title">{t('dashboard.giftDistributedActivity', { name: row.gift_name || t('dashboard.caseLabel', { n: row.slot_index + 1 }) })}</div>
                    <div className="act-time">{formatTime(row.created_at)}{row.room_number ? t('dashboard.roomLabel', { room: row.room_number }) : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
      case 'profitability': return campaignId === 'all' ? null : <ProfitabilityCard campaignId={campaignId} />;
      case 'emails': return isAdmin ? <EmailHistoryCard /> : null;
      default: return null;
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.pageTitle')}</h1>
          <p className="page-subtitle">
            {campaignId === 'all'
              ? (campaign ? t('dashboard.welcomeBack', { name: campaign.name }) : t('dashboard.noActiveCampaign'))
              : (campaign ? campaign.name : t('dashboard.campaignNotFound'))}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setShowDownloadApp(true)}>{t('dashboard.downloadAppBtn')}</Button>
          {editable && !editing && <Button variant="secondary" disabled={pdfBusy} onClick={async () => { setPdfBusy(true); try { await api.downloadDashboardPdf(campaignId); } catch (e) { setMsg(e.message); } finally { setPdfBusy(false); } }}>{pdfBusy ? t('dashboard.exportingPdf') : t('dashboard.exportPdf')}</Button>}
          {editable && !editing && <Button variant="secondary" onClick={() => { setDraft(info.layout.map((w) => ({ ...w }))); setMsg(''); }}>{t('dashboard.editBtn')}</Button>}
          <select value={campaignId} disabled={editing} onChange={(e) => setCampaignId(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)' }}>
            {(campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.status === 'active' ? ` · ${t('common.statusActive')}` : ''}</option>)}
            <option value="all">{t('dashboard.allCampaignsOption')}</option>
          </select>
          {campaign && <Badge tone={CAMPAIGN_STATUS_TONE[campaign.status] || 'neutral'}>{statusLabel(campaign.status)}</Badge>}
        </div>
      </div>

      {confirmDialog}
      {showDownloadApp && <DownloadAppModal onClose={() => setShowDownloadApp(false)} />}
      {adding && <AddModuleModal campaignId={campaignId} dimensions={dimensions} onDimensions={(d) => setInfo((x) => (x ? { ...x, dimensions: d } : x))} isAdmin={isAdmin} onClose={() => setAdding(false)} onAdd={(w) => setDraft((d) => [...d, { ...w, id: newWidgetId() }])} />}

      {editing && (
        <div className="dash-bar">
          <Button size="sm" onClick={() => setAdding(true)}>{t('dashboard.addModuleBtn')}</Button>
          {info.ai && <Button size="sm" variant="secondary" onClick={() => { setAiOpen(true); setAiError(''); }}>✦ {t('dashboard.aiProposeBtn')}</Button>}
          <select defaultValue="" onChange={(e) => { applyTemplate(e.target.value); e.target.value = ''; }} style={{ padding: '7px 10px', border: '1px solid #D4DEF5', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', background: '#fff' }}>
            <option value="">{t('dashboard.templatesBtn')}</option>
            {(info.templates || []).map((k) => <option key={k} value={k}>{t(`dashboard.${TEMPLATE_KEYS[k]}`)}</option>)}
          </select>
          {info.saved && <Button size="sm" variant="ghost" disabled={busy} onClick={resetStandard}>{t('dashboard.resetBtn')}</Button>}
          <span className="grow" />
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setDraft(null); setMsg(''); setAiNotes({}); setAiSummary(''); }}>{t('dashboard.cancelBtn')}</Button>
          <Button size="sm" disabled={busy} onClick={save}>{t('dashboard.doneBtn')}</Button>
        </div>
      )}
      {editing && aiSummary && (
        <div className="dash-ai-banner">
          <b>✦ {t('dashboard.aiSummaryTitle')}</b> {aiSummary}
          <button type="button" onClick={() => setAiSummary('')} aria-label={t('dashboard.aiClose')}>×</button>
        </div>
      )}
      {aiOpen && (
        <div className="modal-overlay" onClick={() => !aiBusy && setAiOpen(false)} style={{ zIndex: 300 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '480px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#03041A' }}>✦ {t('dashboard.aiProposeBtn')}</h3>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px', lineHeight: 1.55 }}>{t('dashboard.aiIntro')}</p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>{t('dashboard.aiGoalLabel')}</label>
            <textarea value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} rows={3} maxLength={300} placeholder={t('dashboard.aiGoalPlaceholder')}
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1.5px solid #E3E9F7', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }} />
            <p style={{ fontSize: 11.5, color: '#64748B', margin: '8px 0 0' }}>{t('dashboard.aiPrivacy')}</p>
            {aiError && <div className="error-banner" style={{ marginTop: 10 }}>{aiError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button variant="ghost" disabled={aiBusy} onClick={() => setAiOpen(false)}>{t('dashboard.cancelBtn')}</Button>
              <Button disabled={aiBusy} onClick={runSuggest}>{aiBusy ? t('dashboard.aiRunning') : t('dashboard.aiRun')}</Button>
            </div>
          </div>
        </div>
      )}
      {msg && !editing && <p style={{ fontSize: 12, color: 'var(--green)', margin: '0 0 10px' }}>{msg}</p>}
      {msg && editing && <p className="error-banner" style={{ margin: '0 0 10px' }}>{msg}</p>}

      {layout.length === 0 && <EmptyState title={t('dashboard.noModules')} action={editing ? <Button onClick={() => setAdding(true)}>{t('dashboard.addModuleBtn')}</Button> : null} />}

      <div className="dash-grid">
        {layout.map((w, i) => {
          const content = renderWidget(w);
          if (!content) return null;
          return (
            <div key={w.id || i}
              className={`dm span-${w.w || 1}${editing ? ' editing' : ''}${dragIdx === i ? ' dragging' : ''}${overIdx === i && dragIdx !== null && dragIdx !== i ? ' over' : ''}`}
              onDragOver={editing ? (e) => { e.preventDefault(); setOverIdx(i); } : undefined}
              onDrop={editing ? (e) => { e.preventDefault(); move(dragIdx, i); setDragIdx(null); setOverIdx(null); } : undefined}>
              {editing && (
                <div className="dm-tools">
                  <button type="button" className="grab" draggable aria-label={t('dashboard.dragHandle')} title={t('dashboard.dragHandle')}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragIdx(i); }} onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}>⋮⋮</button>
                  <button type="button" aria-label={t('dashboard.narrower')} title={t('dashboard.narrower')} disabled={(w.w || 1) <= 1} onClick={() => resize(i, -1)}>−</button>
                  <button type="button" aria-label={t('dashboard.wider')} title={t('dashboard.wider')} disabled={(w.w || 1) >= 4} onClick={() => resize(i, 1)}>+</button>
                  {w.type === 'chart' && (() => {
                    const opts = allowedViz(dimensions.find((d) => d.key === w.config.source) || { key: w.config.source, type: 'choice' });
                    return opts.length > 1 ? (
                      <select value={opts.includes(w.config.viz) ? w.config.viz : opts[0]} onChange={(e) => setViz(i, e.target.value)} aria-label={t('dashboard.pickViz')}>
                        {opts.map((v) => <option key={v} value={v}>{t(`dashboard.viz_${v}`)}</option>)}
                      </select>
                    ) : null;
                  })()}
                  <button type="button" className="rm" aria-label={t('dashboard.removeModule')} title={t('dashboard.removeModule')} onClick={() => remove(i)}>✕</button>
                </div>
              )}
              {content}
              {editing && w.id && aiNotes[w.id] && <div className="dm-note">✦ {aiNotes[w.id]}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}