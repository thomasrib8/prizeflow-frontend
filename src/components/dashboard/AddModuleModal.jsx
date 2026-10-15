// "Add a module" to the campaign's dashboard: a key figure, a chart on one of the campaign's own data, or one of the ready-made cards.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { api } from '../../api/client';
import { allowedViz, recommendViz } from './recommend';
import { BUILTIN } from './ChartModule';
import './dashboard.css';

const chartableFind = (dims, key) => (dims || []).find((d) => d.key === key) || null;
const KPIS = [
  ['leads', 'leadsCapturedLabel'], ['qualified', 'qualifiedLeadsLabel'], ['segmented', 'segmentedLeadsLabel'],
  ['gifts_remaining', 'remainingGiftsLabel'], ['gifts_distributed', 'giftsDistributedLabel'],
];
const CARDS = [
  ['progress', 'campaignProgressLabel', 4], ['distribution', 'distributionOverviewTitle', 2], ['summary', 'campaignSummaryTitle', 2],
  ['profitability', 'profitTitle', 2], ['topRewards', 'topRewardsTitle', 2], ['activity', 'recentActivityTitle', 2], ['emails', 'emailHistoryTitle', 4],
];

export default function AddModuleModal({ campaignId, dimensions, isAdmin, onAdd, onClose }) {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('chart');
  const [source, setSource] = useState('');
  const [viz, setViz] = useState('bar');
  const [reco, setReco] = useState(null);
  const dim = chartableFind(dimensions, source);

  // Once a data source is picked: look at its numbers, suggest the best representation and preselect it
  useEffect(() => {
    if (!source) return undefined;
    let alive = true;
    setReco(null); setViz(allowedViz(dim)[0]);
    api.dashboardModuleData(campaignId, source).then((res) => {
      if (!alive) return;
      const r = recommendViz(dim, res);
      setReco(r); if (r) setViz(r.viz);
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const add = (w) => { onAdd(w); onClose(); };
  const chartable = (dimensions || []);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '520px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#03041A' }}>{t('dashboard.addTitle')}</h3>
        <div className="dash-tabs">
          {[['chart', 'addChart'], ['kpi', 'addKpi'], ['card', 'addCard']].map(([k, l]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t(`dashboard.${l}`)}</button>)}
        </div>

        {tab === 'chart' && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>{t('dashboard.pickSource')}</div>
            <div className="dash-pick" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {chartable.map((d) => <button key={d.key} type="button" className={source === d.key ? 'on' : ''} onClick={() => setSource(d.key)}>
                {BUILTIN[d.key] ? t(`dashboard.${BUILTIN[d.key]}`) : d.label}
                <span style={{ color: '#94A3B8', fontSize: 11 }}> · {BUILTIN[d.key] ? t('dashboard.srcBuiltin') : d.kind === 'segment' ? t('dashboard.srcSegment') : d.kind === 'sales' ? t('dashboard.srcSales') : t('dashboard.srcGuest')}</span>
              </button>)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '14px 0 6px' }}>{t('dashboard.pickViz')}</div>
            <div className="dash-tabs">
              {(source ? allowedViz(dim) : []).map((v) => <button key={v} type="button" className={viz === v ? 'on' : ''} onClick={() => setViz(v)}>{t(`dashboard.viz_${v}`)}{reco && reco.viz === v ? ' ✦' : ''}</button>)}
            </div>
            {reco && <div style={{ fontSize: 12, color: '#002881', background: '#EAF1FF', borderRadius: 8, padding: '7px 10px' }}>✦ {t('dashboard.recoPrefix')} {t(`dashboard.viz_${reco.viz}`)} — {t(`dashboard.${reco.reason}`, { n: reco.n })}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button variant="ghost" onClick={onClose}>{t('dashboard.cancelBtn')}</Button>
              <Button disabled={!source} onClick={() => add({ type: 'chart', w: source === 'day' || viz === 'map' ? 4 : 2, config: { source, viz } })}>{t('dashboard.addBtn')}</Button>
            </div>
          </>
        )}

        {tab === 'kpi' && (
          <div className="dash-pick">
            {KPIS.map(([m, l]) => <button key={m} type="button" onClick={() => add({ type: 'kpi', w: 1, config: { metric: m } })}>{t(`dashboard.${l}`)}</button>)}
          </div>
        )}

        {tab === 'card' && (
          <div className="dash-pick">
            {CARDS.filter(([c]) => c !== 'emails' || isAdmin).map(([c, l, w]) => <button key={c} type="button" onClick={() => add({ type: c, w })}>{t(`dashboard.${l}`)}</button>)}
          </div>
        )}
        {tab !== 'chart' && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><Button variant="ghost" onClick={onClose}>{t('dashboard.cancelBtn')}</Button></div>}
      </div>
    </div>
  );
}
