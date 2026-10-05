import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { distinctValues, toggleValue } from '../../hooks/useLaunchQueue';
import FilterGroup from '../../components/FilterGroup';
import { Button } from '../../components/ui';
import { IconFilter, IconPlus, IconProspects, IconSearch, IconStar } from '../../components/pwa/PwaIcons';
import { CampaignLoading, EmptyBlock, ErrorBlock, NoCampaign, PersonCard, PersonSkeletons } from '../../components/pwa/PwaParts';
import { usePwa } from './PwaContext';

const REFRESH_MS = 30000;
const RATING_FILTERS = [3, 2, 1];

// Prospects: the CRM for the active campaign, mobile edition. The rows are
// the desktop CRM's own (GET /rewards — the same endpoint History.jsx reads —
// asked for just this campaign); tapping one opens the same ProspectCard the
// desktop uses, so every edit goes through the existing mutations. The quick
// filters are the lead temperature (★), the one status every prospect has in
// SPARK — there is no separate pipeline status to filter on.
export default function PwaProspects() {
  const { t } = useTranslation('admin');
  const { q, dataVersion, openProspect, openNewProspect } = usePwa();
  const campaignId = q.campaign?.id;
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('all'); // 'all' | 1 | 2 | 3
  const [filterGifts, setFilterGifts] = useState([]);
  const [filterSegments, setFilterSegments] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(() => {
    if (!campaignId) return Promise.resolve();
    return api.rewards({ campaignId, limit: 500 })
      .then((res) => { setRows(res); setFailed(false); })
      .catch(() => setFailed(true));
  }, [campaignId]);

  useEffect(() => {
    setRows(null);
    setFailed(false);
    load();
  }, [load, dataVersion]);

  useEffect(() => {
    if (!campaignId) return undefined;
    const id = setInterval(load, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [campaignId, load]);

  const giftOptions = useMemo(() => distinctValues(rows || [], 'gift_name'), [rows]);
  const segmentOptions = useMemo(() => distinctValues(rows || [], 'segment'), [rows]);
  const activeFilterCount = filterGifts.length + filterSegments.length;
  const ratingCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    (rows || []).forEach((r) => { if (counts[r.lead_rating] !== undefined) counts[r.lead_rating] += 1; });
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return rows;
    const needle = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (rating !== 'all' && p.lead_rating !== rating) return false;
      if (filterGifts.length && !filterGifts.includes(p.gift_name)) return false;
      if (filterSegments.length && !filterSegments.includes(p.segment)) return false;
      if (!needle) return true;
      return [p.first_name, p.last_name, p.email, p.gift_name, p.segment, p.note].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [rows, search, rating, filterGifts, filterSegments]);

  if (q.campaign === undefined) return <CampaignLoading />;
  if (q.campaign === null) return <NoCampaign />;

  return (
    <div>
      <h1 className="pw-page-title">{t('pwaApp.prospectsTitle')}</h1>

      <div className="pw-search-row">
        <label className="pw-search">
          <IconSearch />
          <input type="search" placeholder={t('pwaApp.searchProspect')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button
          type="button"
          className={`pw-filter-btn icon-only${activeFilterCount > 0 ? ' active' : ''}`}
          aria-label={t('pwa.filters')}
          onClick={() => setFiltersOpen(true)}
        >
          <IconFilter />
        </button>
      </div>

      <div className="pw-chips-row" role="tablist">
        <button type="button" role="tab" aria-selected={rating === 'all'} className={`pw-tab-chip${rating === 'all' ? ' on' : ''}`} onClick={() => setRating('all')}>
          {t('pwaApp.filterAll')}<em>{rows ? rows.length : '–'}</em>
        </button>
        {RATING_FILTERS.map((n) => (
          <button key={n} type="button" role="tab" aria-selected={rating === n} className={`pw-tab-chip${rating === n ? ' on' : ''}`} onClick={() => setRating(rating === n ? 'all' : n)}>
            <span className="pw-stars">{Array.from({ length: n }, (_, i) => <IconStar key={i} filled style={{ width: 14, height: 14 }} />)}</span>
            <em>{ratingCounts[n]}</em>
          </button>
        ))}
      </div>

      {failed && !rows && <ErrorBlock onRetry={load} />}
      {!failed && !rows && <PersonSkeletons count={5} />}

      {rows && rows.length === 0 && (
        <EmptyBlock
          icon={IconProspects}
          title={t('pwaApp.noProspectsTitle')}
          description={t('pwaApp.noProspectsDesc')}
          action={<button type="button" className="pw-retry" onClick={openNewProspect}><IconPlus style={{ width: 16, height: 16, verticalAlign: -3, marginRight: 6 }} />{t('pwaApp.newProspectTitle')}</button>}
        />
      )}
      {rows && rows.length > 0 && filtered.length === 0 && (
        <div className="pw-card pw-card-pad" style={{ textAlign: 'center', color: 'var(--pw-muted)', fontSize: 14 }}>{t('pwa.noPlayersMatch')}</div>
      )}
      {filtered && filtered.length > 0 && (
        <div className="pw-people">
          {filtered.map((p) => <PersonCard key={p.id} p={p} onOpen={() => openProspect(p)} />)}
        </div>
      )}

      {filtersOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t('pwa.filters')}</h3>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setFilterGifts([]); setFilterSegments([]); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--link)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >{t('pwa.clearAll')}</button>
              )}
            </div>
            <FilterGroup title={t('common.gift')} options={giftOptions} selected={filterGifts} onToggle={(v) => setFilterGifts(toggleValue(filterGifts, v))} />
            <FilterGroup title={t('common.segment')} options={segmentOptions} selected={filterSegments} onToggle={(v) => setFilterSegments(toggleValue(filterSegments, v))} />
            <Button onClick={() => setFiltersOpen(false)} style={{ width: '100%', minHeight: 48, marginTop: 4 }}>{t('common.done')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
