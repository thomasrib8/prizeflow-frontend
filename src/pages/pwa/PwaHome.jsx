import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toggleValue } from '../../hooks/useLaunchQueue';
import FilterGroup from '../../components/FilterGroup';
import { Button } from '../../components/ui';
import { IconChevronRight, IconFilter, IconPlus, IconScan, IconSearch, IconUsers } from '../../components/pwa/PwaIcons';
import { CampaignLoading, NoCampaign, PersonCard, PersonSkeletons, Skel } from '../../components/pwa/PwaParts';
import { usePwa } from './PwaContext';

// Home: what is happening on the active campaign right now — the two
// primary actions, the live queue (with skip/cancel, same actions as the
// desktop Launch page) and the last 20 players. All data and actions come
// from useLaunchQueue, the same hook the desktop Launch page uses.
function LiveQueueCard() {
  const { t } = useTranslation('admin');
  const { q, openProspect } = usePwa();
  const { queue } = q;
  const active = queue?.active;

  return (
    <section className="pw-card pw-card-pad" aria-label={t('pwa.liveQueueTitle')}>
      <div className="pw-card-head" style={{ marginBottom: queue ? 12 : 0 }}>
        <h2 className="pw-card-title">{t('pwa.liveQueueTitle')}</h2>
        {queue
          ? <span className="pw-pill"><IconUsers />{t('pwaApp.waitingCount', { count: queue.waiting.length })}</span>
          : <Skel w={96} h={30} r={15} />}
      </div>

      {!queue && <Skel h={44} style={{ marginTop: 12 }} />}

      {queue && !active && (
        <div className="pw-queue-empty">
          <div className="pw-queue-empty-icon"><IconUsers /></div>
          <div>
            <strong>{t('pwaApp.noPlayerTitle')}</strong>
            <span>{t('pwa.nobodyRightNow')}</span>
          </div>
        </div>
      )}

      {queue && active && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pw-soft)', marginBottom: 6 }}>
            {t('pwa.currentlyPlaying')}
          </div>
          <div>
            <button type="button" className="pw-queue-name" onClick={() => openProspect({ email: active.email, first_name: active.firstName, last_name: active.lastName })}>
              {active.firstName}
            </button>
            <span className={`pw-queue-state${active.launched ? ' live' : ''}`}>
              {active.launched ? t('pwa.spinning') : t('pwa.waitingToSpin')}
            </span>
          </div>
          {active.giftName && <div className="pw-queue-win">{t('pwa.willWin')} <strong>{active.giftName}</strong></div>}
          {active.retryMessage && <div className="pw-queue-retry">{active.retryMessage}</div>}
          <div className="pw-queue-actions">
            <button type="button" className="pw-queue-btn skip" disabled={q.queueActionBusy} onClick={q.handleSkipPlayer}>{t('pwa.skipPlayer')}</button>
            <button type="button" className="pw-queue-btn cancel" disabled={q.queueActionBusy} onClick={q.handleCancelPlayer}>{t('pwa.cancelPlayer')}</button>
          </div>
        </div>
      )}

      {queue && queue.waiting.length > 0 && (
        <div className="pw-waiting">
          <b>{t('pwa.waitingLabel', { count: queue.waiting.length })}</b>{' · '}
          {queue.waiting.map((w) => w.firstName).join(', ')}
        </div>
      )}
    </section>
  );
}

export default function PwaHome() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { q, openScan, openNewProspect, openProspect } = usePwa();
  const [filtersOpen, setFiltersOpen] = useState(false);

  if (q.campaign === undefined) return <CampaignLoading />;
  if (q.campaign === null) return <NoCampaign />;

  const players = q.recentPlayers;
  const filtered = q.filteredRecentPlayers;

  return (
    <div className="pw-stack">
      <button type="button" className="pw-action primary" onClick={openScan}>
        <span className="pw-action-icon"><IconScan /></span>
        <span className="pw-action-text">
          <span className="pw-action-title" style={{ display: 'block' }}>{t('pwaApp.scanTitle')}</span>
          <span className="pw-action-sub" style={{ display: 'block' }}>{t('pwaApp.scanSub')}</span>
        </span>
        <IconChevronRight className="pw-action-chev" />
      </button>

      <button type="button" className="pw-action" onClick={openNewProspect}>
        <span className="pw-action-icon"><IconPlus /></span>
        <span className="pw-action-text">
          <span className="pw-action-title" style={{ display: 'block' }}>{t('pwaApp.newProspectTitle')}</span>
          <span className="pw-action-sub" style={{ display: 'block' }}>{t('pwaApp.newProspectSub')}</span>
        </span>
      </button>

      <LiveQueueCard />

      <section aria-label={t('pwa.last20PlayersTitle')}>
        <div className="pw-card-head" style={{ margin: '8px 2px 12px' }}>
          <h2 className="pw-card-title" style={{ fontSize: 19 }}>{t('pwa.last20PlayersTitle')}</h2>
          <button type="button" className="pw-link" onClick={() => navigate('/pwa/prospects')}>{t('pwaApp.seeAll')}</button>
        </div>

        {players && players.length > 0 && (
          <div className="pw-search-row">
            <label className="pw-search">
              <IconSearch />
              <input
                type="search"
                placeholder={t('pwa.searchPlaceholder')}
                value={q.playerSearch}
                onChange={(e) => q.setPlayerSearch(e.target.value)}
              />
            </label>
            <button type="button" className={`pw-filter-btn${q.playerActiveFilterCount > 0 ? ' active' : ''}`} onClick={() => setFiltersOpen(true)}>
              <IconFilter />
              {t('pwa.filters')}{q.playerActiveFilterCount > 0 ? ` (${q.playerActiveFilterCount})` : ''}
            </button>
          </div>
        )}

        {!players && <PersonSkeletons count={3} />}
        {players && players.length === 0 && (
          <div className="pw-card pw-card-pad" style={{ textAlign: 'center', color: 'var(--pw-muted)', fontSize: 14 }}>{t('pwa.noPlayersYet')}</div>
        )}
        {players && players.length > 0 && filtered.length === 0 && (
          <div className="pw-card pw-card-pad" style={{ textAlign: 'center', color: 'var(--pw-muted)', fontSize: 14 }}>{t('pwa.noPlayersMatch')}</div>
        )}
        {filtered && filtered.length > 0 && (
          <div className="pw-people">
            {filtered.map((p) => <PersonCard key={p.rewardId} p={p} onOpen={() => openProspect(p)} />)}
          </div>
        )}
      </section>

      {filtersOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t('pwa.filters')}</h3>
              {q.playerActiveFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { q.setPlayerFilterGifts([]); q.setPlayerFilterSegments([]); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--link)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >{t('pwa.clearAll')}</button>
              )}
            </div>
            <FilterGroup title={t('common.gift')} options={q.playerGiftOptions} selected={q.playerFilterGifts}
              onToggle={(v) => q.setPlayerFilterGifts(toggleValue(q.playerFilterGifts, v))} />
            <FilterGroup title={t('common.segment')} options={q.playerSegmentOptions} selected={q.playerFilterSegments}
              onToggle={(v) => q.setPlayerFilterSegments(toggleValue(q.playerFilterSegments, v))} />
            <Button onClick={() => setFiltersOpen(false)} style={{ width: '100%', minHeight: 48, marginTop: 4 }}>{t('common.done')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
