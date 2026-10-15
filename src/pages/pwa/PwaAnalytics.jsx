import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import { SLOT_COLORS } from '../../components/slotColors';
import { IconGift, IconStar, IconUsers } from '../../components/pwa/PwaIcons';
import { CampaignLoading, ErrorBlock, NoCampaign, Skel } from '../../components/pwa/PwaParts';
import ChartModule from '../../components/dashboard/ChartModule';
import ProfitabilityCard from '../../components/dashboard/ProfitabilityCard';
import { usePwa } from './PwaContext';

const CHART_FILTERS = ['7D', '30D', 'All'];
const STAR_COLORS = { 3: '#10B981', 2: '#F59E0B', 1: '#94A3B8' };

function Kpi({ icon: Icon, tone, value, label, sub }) {
  return (
    <div className="pw-card pw-kpi">
      <div className="pw-kpi-icon" style={{ background: tone.bg, color: tone.fg }}><Icon /></div>
      <div>
        <div className="pw-kpi-value">{value}</div>
        <div className="pw-kpi-label">{label}</div>
        {sub && <div className="pw-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

// Analytics: the desktop Dashboard's numbers for the active campaign, just
// laid out for a phone. Nothing is recomputed here — it reads the same
// /dashboard, /dashboard/chart and /dashboard/top-rewards endpoints the
// desktop Dashboard does, scoped to the active campaign.
export default function PwaAnalytics() {
  const { t } = useTranslation('admin');
  const { q, dataVersion } = usePwa();
  const campaignId = q.campaign?.id;
  const [data, setData] = useState(null);
  const [topRewards, setTopRewards] = useState(null);
  const [chart, setChart] = useState(null);
  const [chartFilter, setChartFilter] = useState('7D');
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [info, setInfo] = useState(undefined); // the campaign's custom dashboard: undefined = loading, null = not available (the fixed view is shown)

  useEffect(() => {
    if (!campaignId) return undefined;
    let cancelled = false;
    setData(null);
    setTopRewards(null);
    setFailed(false);
    api.dashboard(campaignId).then((d) => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setFailed(true); });
    api.dashboardTopRewards(campaignId).then((r) => { if (!cancelled) setTopRewards(r); }).catch(() => { if (!cancelled) setTopRewards([]); });
    return () => { cancelled = true; };
  }, [campaignId, dataVersion, retry]);

  // Same modules as the desktop dashboard (chosen per campaign). A cloud or box that does not have them yet: the fixed view below.
  useEffect(() => {
    if (!campaignId) return undefined;
    let cancelled = false;
    api.dashboardLayout(campaignId).then((d) => { if (!cancelled) setInfo(d); }).catch(() => { if (!cancelled) setInfo(null); });
    return () => { cancelled = true; };
  }, [campaignId, dataVersion, retry]);

  useEffect(() => {
    if (!campaignId) return undefined;
    let cancelled = false;
    setChart(null);
    const days = chartFilter === 'All' ? 'all' : chartFilter.replace('D', '');
    api.dashboardChart(days, campaignId).then((c) => { if (!cancelled) setChart(c); }).catch(() => { if (!cancelled) setChart([]); });
    return () => { cancelled = true; };
  }, [campaignId, chartFilter, dataVersion, retry]);

  if (q.campaign === undefined) return <CampaignLoading />;
  if (q.campaign === null) return <NoCampaign />;
  if (failed) return <ErrorBlock onRetry={() => setRetry((n) => n + 1)} />;

  const leads = data?.leads;
  const kpi = data?.kpi;
  const qualifiedPct = leads?.captured ? Math.round((leads.qualified / leads.captured) * 100) : 0;
  const rating = leads?.ratingBreakdown || { 3: 0, 2: 0, 1: 0 };
  const ratedTotal = rating[3] + rating[2] + rating[1];
  const num = (v) => (v == null ? '–' : Number(v).toLocaleString());

  // Donut geometry: circumference of r=42, so dash lengths are proportional.
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = [3, 2, 1].map((n) => {
    const len = ratedTotal ? (rating[n] / ratedTotal) * C : 0;
    const arc = { n, len, offset };
    offset += len;
    return arc;
  });

  const kpiOf = (metric) => {
    const pct = leads?.captured ? Math.round((leads.qualified / leads.captured) * 100) : 0;
    const segPct = leads?.captured ? Math.round((leads.segmented / leads.captured) * 100) : 0;
    if (metric === 'leads') return <Kpi icon={IconUsers} tone={{ bg: '#E6F0FF', fg: '#0055F8' }} value={num(leads?.captured)} label={t('dashboard.leadsCapturedLabel')} />;
    if (metric === 'qualified') return <Kpi icon={IconStar} tone={{ bg: '#E3F6EC', fg: '#15803D' }} value={num(leads?.qualified)} label={t('dashboard.qualifiedLeadsLabel')} sub={leads ? `${pct}%` : undefined} />;
    if (metric === 'segmented') return <Kpi icon={IconUsers} tone={{ bg: '#FFF1DC', fg: '#D97706' }} value={num(leads?.segmented)} label={t('dashboard.segmentedLeadsLabel')} sub={leads ? `${segPct}%` : undefined} />;
    if (metric === 'gifts_remaining') return <Kpi icon={IconGift} tone={{ bg: '#F1E9FF', fg: '#7C3AED' }} value={num(kpi?.remaining)} label={t('dashboard.remainingGiftsLabel')} />;
    return <Kpi icon={IconGift} tone={{ bg: '#FFF1DC', fg: '#D97706' }} value={num(kpi?.distributed)} label={t('dashboard.giftsDistributedLabel')} sub={kpi ? `${kpi.progressPct}%` : undefined} />;
  };
  const distributionSection = (key) => (
    <section key={key} className="pw-card pw-card-pad">
      <div className="pw-card-head" style={{ marginBottom: 12 }}>
        <h2 className="pw-card-title">{t('dashboard.distributionOverviewTitle')}</h2>
        <div className="pw-period" role="tablist">
          {CHART_FILTERS.map((f) => <button key={f} type="button" role="tab" aria-selected={chartFilter === f} className={chartFilter === f ? 'on' : ''} onClick={() => setChartFilter(f)}>{f}</button>)}
        </div>
      </div>
      {!chart && <Skel h={170} r={14} />}
      {chart && chart.length === 0 && <div className="pw-chart-empty">{t('dashboard.noChartData')}</div>}
      {chart && chart.length > 0 && (
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={chart} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="planned" name={t('dashboard.chartPlannedLegend')} stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="distributed" name={t('dashboard.chartDistributedLegend')} stroke="#0055F8" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
  const giftsSection = (key) => (
    <section key={key} className="pw-card pw-card-pad">
      <h2 className="pw-card-title" style={{ marginBottom: 14 }}>{t('pwaApp.giftsTitle')}</h2>
      {!topRewards && <Skel h={120} r={14} />}
      {topRewards && topRewards.length === 0 && <div className="pw-chart-empty" style={{ height: 90 }}>{t('dashboard.noRewardsYet')}</div>}
      {topRewards && topRewards.map((r, i) => (
        <div key={i} className="pw-gift-row">
          <div className="pw-gift-icon"><IconGift /></div>
          <div className="pw-gift-main">
            <div className="pw-gift-name">{r.giftName || t('dashboard.caseLabel', { n: r.slotIndex + 1 })}</div>
            <div className="pw-bar" style={{ marginTop: 6 }}><div style={{ width: `${r.pct}%`, background: SLOT_COLORS[r.slotIndex % SLOT_COLORS.length] }} /></div>
          </div>
          <div className="pw-gift-right">{r.distributed}/{r.planned}<small>{t('pwaApp.giftsLeft', { count: r.remaining })}</small></div>
        </div>
      ))}
    </section>
  );

  if (info) {
    // The campaign's own dashboard on the phone: the same modules in the same order, one per row (key figures two by two).
    const blocks = [];
    let run = [];
    const flush = () => { if (run.length) { blocks.push(<div key={`k${blocks.length}`} className="pw-kpis">{run}</div>); run = []; } };
    info.layout.forEach((w) => {
      if (w.type === 'kpi') { run.push(<div key={w.id} style={{ display: 'contents' }}>{kpiOf(w.config.metric)}</div>); return; }
      flush();
      if (w.type === 'chart') blocks.push(<section key={w.id} className="pw-card pw-card-pad"><ChartModule bare campaignId={campaignId} config={w.config} dimensions={info.dimensions} /></section>);
      else if (w.type === 'profitability') blocks.push(<section key={w.id} className="pw-card pw-card-pad"><ProfitabilityCard bare readOnly campaignId={campaignId} /></section>);
      else if (w.type === 'progress') blocks.push(
        <section key={w.id} className="pw-card pw-card-pad">
          <h2 className="pw-card-title" style={{ marginBottom: 10 }}>{t('dashboard.campaignProgressLabel')}</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><b style={{ fontSize: 26 }}>{kpi ? `${kpi.progressPct}%` : '–'}</b><span style={{ fontSize: 12, color: '#64748B' }}>{kpi ? t('dashboard.campaignProgressSub', { distributed: kpi.distributed, planned: kpi.planned }) : ''}</span></div>
          <div className="pw-bar" style={{ marginTop: 10 }}><div style={{ width: `${kpi?.progressPct || 0}%`, background: '#0055F8' }} /></div>
        </section>,
      );
      else if (w.type === 'distribution') blocks.push(distributionSection(w.id));
      else if (w.type === 'topRewards') blocks.push(giftsSection(w.id));
    });
    flush();
    return (
      <div className="pw-stack">
        <h1 className="pw-page-title" style={{ marginBottom: 0 }}>{t('pwaApp.analyticsTitle')}</h1>
        {blocks}
      </div>
    );
  }
  if (info === undefined) return <div className="pw-stack"><h1 className="pw-page-title" style={{ marginBottom: 0 }}>{t('pwaApp.analyticsTitle')}</h1><Skel h={120} r={16} /><Skel h={200} r={16} /></div>;

  return (
    <div className="pw-stack">
      <h1 className="pw-page-title" style={{ marginBottom: 0 }}>{t('pwaApp.analyticsTitle')}</h1>

      <div className="pw-kpis">
        <Kpi icon={IconUsers} tone={{ bg: '#E6F0FF', fg: '#0055F8' }} value={num(leads?.captured)} label={t('dashboard.leadsCapturedLabel')} />
        <Kpi icon={IconStar} tone={{ bg: '#E3F6EC', fg: '#15803D' }} value={num(leads?.qualified)} label={t('dashboard.qualifiedLeadsLabel')} sub={leads ? `${qualifiedPct}%` : undefined} />
        <Kpi icon={IconGift} tone={{ bg: '#FFF1DC', fg: '#D97706' }} value={num(kpi?.distributed)} label={t('dashboard.giftsDistributedLabel')} sub={kpi ? `${kpi.progressPct}%` : undefined} />
        <Kpi icon={IconGift} tone={{ bg: '#F1E9FF', fg: '#7C3AED' }} value={num(kpi?.remaining)} label={t('dashboard.remainingGiftsLabel')} />
      </div>

      <section className="pw-card pw-card-pad">
        <div className="pw-card-head" style={{ marginBottom: 12 }}>
          <h2 className="pw-card-title">{t('dashboard.distributionOverviewTitle')}</h2>
          <div className="pw-period" role="tablist">
            {CHART_FILTERS.map((f) => (
              <button key={f} type="button" role="tab" aria-selected={chartFilter === f} className={chartFilter === f ? 'on' : ''} onClick={() => setChartFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
        {!chart && <Skel h={170} r={14} />}
        {chart && chart.length === 0 && <div className="pw-chart-empty">{t('dashboard.noChartData')}</div>}
        {chart && chart.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={chart} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="planned" name={t('dashboard.chartPlannedLegend')} stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="distributed" name={t('dashboard.chartDistributedLegend')} stroke="#0055F8" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="pw-legend">
              <span><i style={{ background: '#0055F8' }} />{t('dashboard.chartDistributedLegend')}</span>
              <span><i style={{ background: '#CBD5E1' }} />{t('dashboard.chartPlannedLegend')}</span>
            </div>
          </>
        )}
      </section>

      <section className="pw-card pw-card-pad">
        <div className="pw-card-head" style={{ marginBottom: 14 }}>
          <h2 className="pw-card-title">{t('pwaApp.leadQualityTitle')}</h2>
          {leads && <span className="pw-pill">{t('pwaApp.leadsCount', { count: ratedTotal })}</span>}
        </div>
        {!leads && <Skel h={132} r={16} />}
        {leads && ratedTotal === 0 && <div className="pw-chart-empty" style={{ height: 90 }}>{t('pwaApp.noLeadsYet')}</div>}
        {leads && ratedTotal > 0 && (
          <div className="pw-donut-wrap">
            <div className="pw-donut">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r={R} fill="none" stroke="#EEF2F7" strokeWidth="13" />
                {arcs.filter((a) => a.len > 0).map((a) => (
                  <circle key={a.n} cx="50" cy="50" r={R} fill="none" stroke={STAR_COLORS[a.n]} strokeWidth="13"
                    strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={-a.offset} />
                ))}
              </svg>
              <div className="pw-donut-center"><b>{ratedTotal}</b><span>{t('pwaApp.navProspects')}</span></div>
            </div>
            <div className="pw-donut-legend">
              {[3, 2, 1].map((n) => (
                <div key={n} className="pw-donut-row">
                  <i style={{ background: STAR_COLORS[n] }} />
                  <span className="pw-stars" style={{ color: '#F59E0B', display: 'inline-flex', marginLeft: 0 }}>
                    {Array.from({ length: n }, (_, i) => <IconStar key={i} filled />)}
                  </span>
                  <span>{rating[n]}<small>{Math.round((rating[n] / ratedTotal) * 100)}%</small></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {leads && leads.segmentBreakdown.length > 0 && (
        <section className="pw-card pw-card-pad">
          <h2 className="pw-card-title" style={{ marginBottom: 14 }}>{t('dashboard.leadsBySegmentTitle')}</h2>
          {leads.segmentBreakdown.map((s, i) => {
            const pct = leads.segmented ? Math.round((s.count / leads.segmented) * 100) : 0;
            return (
              <div key={s.segment} className="pw-bar-row">
                <div className="pw-bar-top"><span>{s.segment}</span><b>{s.count} · {pct}%</b></div>
                <div className="pw-bar"><div style={{ width: `${pct}%`, background: SLOT_COLORS[i % SLOT_COLORS.length] }} /></div>
              </div>
            );
          })}
        </section>
      )}

      <section className="pw-card pw-card-pad">
        <h2 className="pw-card-title" style={{ marginBottom: 14 }}>{t('pwaApp.giftsTitle')}</h2>
        {!topRewards && <Skel h={120} r={14} />}
        {topRewards && topRewards.length === 0 && <div className="pw-chart-empty" style={{ height: 90 }}>{t('dashboard.noRewardsYet')}</div>}
        {topRewards && topRewards.map((r, i) => (
          <div key={i} className="pw-gift-row">
            <div className="pw-gift-icon"><IconGift /></div>
            <div className="pw-gift-main">
              <div className="pw-gift-name">{r.giftName || t('dashboard.caseLabel', { n: r.slotIndex + 1 })}</div>
              <div className="pw-bar" style={{ marginTop: 6 }}><div style={{ width: `${r.pct}%`, background: SLOT_COLORS[r.slotIndex % SLOT_COLORS.length] }} /></div>
            </div>
            <div className="pw-gift-right">{r.distributed}/{r.planned}<small>{t('pwaApp.giftsLeft', { count: r.remaining })}</small></div>
          </div>
        ))}
      </section>
    </div>
  );
}
