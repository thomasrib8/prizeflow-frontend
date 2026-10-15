import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState, GiftPill } from '../components/ui';
import ProspectCard from '../components/ProspectCard';
import EmailStatusBadge from '../components/EmailStatusBadge';
import FilterGroup from '../components/FilterGroup';
import FilterPanel from '../components/crm/FilterPanel';
import { SLOT_COLORS } from '../components/slotColors';
import { IconGift } from '../components/pwa/PwaIcons';
import { isPlaceholderEmail } from '../utils/placeholderEmail';
import './crm.css';

// 'no_gift' (a guest who skipped or cancelled) and 'manual' (a prospect a
// rep added by hand, never played) aren't real reward statuses — they're
// leads kept in the CRM anyway (see routes/history.js's GET /rewards).
// Every other value here is a genuine rewards.status.
const REWARD_TONE = { active: 'blue', redeemed: 'green', expired: 'orange', cancelled: 'red', voided: 'red', no_gift: 'neutral', manual: 'neutral' };
// 'voided' = a won gift a rep invalidated because no email was ever found for
// it (see ProspectCard's "Invalider le joueur") — distinct from 'cancelled',
// which is reverting an already-redeemed voucher (routes/redeem.js).
const STATUS_TKEY = { no_gift: 'rewardStatusNoGift', manual: 'rewardStatusManual', voided: 'rewardStatusVoided', active: 'rewardStatusActive', redeemed: 'rewardStatusRedeemed', expired: 'rewardStatusExpired', cancelled: 'rewardStatusCancelled' };
// Rows with no reward behind them, or a voided one: nothing to redeem/open.
const NO_REWARD_STATUSES = ['no_gift', 'manual', 'voided'];

// Left accent of a lead's card, by status; avatar colour from the name (Spark blues and a few warm accents)
const CRM_ACCENT = { redeemed: '#1AA864', active: '#0055F8', expired: '#F59E0B', cancelled: '#E24B4A', voided: '#E24B4A', no_gift: '#94A3B8', manual: '#94A3B8' };
const AVATARS = [['#0055F8', '#002881'], ['#00B0FF', '#0055F8'], ['#7AA8FF', '#0055F8'], ['#002881', '#0B1437'], ['#1AA864', '#0D9488'], ['#9333EA', '#4F46E5']];
function avatarGradient(seed) {
  let h = 0; for (const ch of String(seed || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = AVATARS[h % AVATARS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
const initials = (r) => `${(r.first_name || '').trim().charAt(0)}${(r.last_name || '').trim().charAt(0)}` || (r.email || '?').charAt(0);

const ratingKey = (r) => (r.lead_rating >= 1 && r.lead_rating <= 3 ? String(r.lead_rating) : 'none');
const countBy = (rows, fn) => { const m = new Map(); for (const r of rows) { const k = fn(r); if (k != null && k !== '') m.set(k, (m.get(k) || 0) + 1); } return m; };

// Distinct, non-empty values for a field across the CRM list, used to
// populate each filter's checkboxes — only ever shows values that actually
// occur in the data, never a stale hardcoded list.
function distinctValues(rows, key) {
  return [...new Set(rows.map((r) => r[key]).filter((v) => v != null && v !== ''))].sort();
}

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function formatDT(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export default function History() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [tab, setTab] = useState('rewards');
  const [distributions, setDistributions] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [error, setError] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [openNote, setOpenNote] = useState(null); // full note text being shown in the popup, or null
  const [prospectGuest, setProspectGuest] = useState(null); // { campaignId, email, firstName, lastName } | null — opens ProspectCard in view mode

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [filterCampaigns, setFilterCampaigns] = useState([]);
  const [filterGifts, setFilterGifts] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterSegments, setFilterSegments] = useState([]);
  const [filterNotes, setFilterNotes] = useState([]);
  const [filterRatings, setFilterRatings] = useState([]); // '3' | '2' | '1' | 'none'

  function reloadRewards() {
    api.rewards().then(setRewards).catch(e => setError(e.message));
  }

  useEffect(() => {
    api.distributions().then(setDistributions).catch(e => setError(e.message));
    reloadRewards();
  }, []);

  const campaignOptions = useMemo(() => distinctValues(rewards || [], 'campaign_name'), [rewards]);
  const giftOptions = useMemo(() => distinctValues(rewards || [], 'gift_name'), [rewards]);
  const statusOptions = useMemo(
    () => distinctValues(rewards || [], 'status').map((v) => ({ value: v, label: STATUS_TKEY[v] ? t(`history.${STATUS_TKEY[v]}`) : v })),
    [rewards, t]
  );
  const segmentOptions = useMemo(() => distinctValues(rewards || [], 'segment'), [rewards]);
  const noteOptions = useMemo(() => [
    { value: 'with', label: t('history.noteWithOption') },
    { value: 'without', label: t('history.noteWithoutOption') },
  ], [t]);

  const panelSections = useMemo(() => {
    const rows = rewards || [];
    const opts = (values, counts, labelOf = (v) => v) => values.map((v) => ({ value: v, label: labelOf(v), count: counts.get(v) || 0 }));
    const star = (n) => '★'.repeat(n);
    return [
      { key: 'status', title: t('history.tableStatus'), options: opts(statusOptions.map((o) => o.value), countBy(rows, (r) => r.status), (v) => (STATUS_TKEY[v] ? t(`history.${STATUS_TKEY[v]}`) : v)), selected: filterStatuses, onToggle: (v) => setFilterStatuses((x) => toggleValue(x, v)) },
      { key: 'rating', title: t('history.tablePotential'), options: opts(['3', '2', '1', 'none'], countBy(rows, ratingKey), (v) => (v === 'none' ? t('history.notRated') : star(Number(v)))), selected: filterRatings, onToggle: (v) => setFilterRatings((x) => toggleValue(x, v)) },
      { key: 'campaign', title: t('history.tableCampaign'), options: opts(campaignOptions, countBy(rows, (r) => r.campaign_name)), selected: filterCampaigns, onToggle: (v) => setFilterCampaigns((x) => toggleValue(x, v)) },
      { key: 'gift', title: t('common.gift'), options: opts(giftOptions, countBy(rows, (r) => r.gift_name)), selected: filterGifts, onToggle: (v) => setFilterGifts((x) => toggleValue(x, v)) },
      { key: 'segment', title: t('common.segment'), options: opts(segmentOptions, countBy(rows, (r) => r.segment)), selected: filterSegments, onToggle: (v) => setFilterSegments((x) => toggleValue(x, v)) },
      { key: 'note', title: t('common.noteLabel'), options: noteOptions.map((o) => ({ ...o, count: rows.filter((r) => (o.value === 'with' ? !!r.note : !r.note)).length })), selected: filterNotes, onToggle: (v) => setFilterNotes((x) => toggleValue(x, v)) },
    ];
  }, [rewards, t, statusOptions, campaignOptions, giftOptions, segmentOptions, noteOptions, filterStatuses, filterRatings, filterCampaigns, filterGifts, filterSegments, filterNotes]);

  // the removable chips under the search box: one per chosen value
  const activeChips = useMemo(() => {
    const labelOf = (key, v) => (panelSections.find((s) => s.key === key).options.find((o) => o.value === v) || { label: v }).label;
    return panelSections.flatMap((s) => s.selected.map((v) => ({ key: `${s.key}:${v}`, text: `${s.title} : ${labelOf(s.key, v)}`, remove: () => s.onToggle(v) })));
  }, [panelSections]);

  const activeFilterCount = filterCampaigns.length + filterGifts.length + filterStatuses.length + filterSegments.length + filterNotes.length + filterRatings.length;

  function clearFilters() {
    setFilterCampaigns([]); setFilterGifts([]); setFilterStatuses([]); setFilterSegments([]); setFilterNotes([]); setFilterRatings([]);
  }

  const filteredRewards = useMemo(() => {
    if (!rewards) return [];
    const q = search.trim().toLowerCase();
    return rewards.filter((r) => {
      if (filterCampaigns.length && !filterCampaigns.includes(r.campaign_name)) return false;
      if (filterGifts.length && !filterGifts.includes(r.gift_name)) return false;
      if (filterStatuses.length && !filterStatuses.includes(r.status)) return false;
      if (filterSegments.length && !filterSegments.includes(r.segment)) return false;
      if (filterRatings.length && !filterRatings.includes(ratingKey(r))) return false;
      if (filterNotes.length) {
        const matchesWith = filterNotes.includes('with') && !!r.note;
        const matchesWithout = filterNotes.includes('without') && !r.note;
        if (!matchesWith && !matchesWithout) return false;
      }
      if (q) {
        const haystack = [r.id, r.first_name, r.last_name, r.email, r.gift_name, r.campaign_name, r.segment, r.note]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rewards, search, filterCampaigns, filterGifts, filterStatuses, filterSegments, filterNotes, filterRatings]);

  async function handleExport(format) {
    setExportBusy(true);
    setError('');
    const params = {};
    if (exportFrom) params.from = exportFrom;
    if (exportTo) params.to = exportTo;
    // The CRM tab's export honors the same filters as the on-screen table
    // (set right here in this popup) — Distributions has no filter UI yet,
    // so only the date range applies there.
    if (tab === 'rewards') {
      if (filterCampaigns.length) params.campaigns = filterCampaigns;
      if (filterGifts.length) params.gifts = filterGifts;
      if (filterStatuses.length) params.statuses = filterStatuses;
      if (filterSegments.length) params.segments = filterSegments;
      if (filterNotes.length) params.note = filterNotes;
      if (filterRatings.length) params.ratings = filterRatings;
    }
    try {
      if (tab === 'distributions') {
        if (format === 'pdf') await api.exportDistributionsPdf(params);
        else if (format === 'json') await api.exportDistributionsJson(params);
        else await api.exportDistributionsCsv(params);
      } else {
        if (format === 'pdf') await api.exportRewardsPdf(params);
        else if (format === 'json') await api.exportRewardsJson(params);
        else await api.exportRewardsCsv(params);
      }
      setExportOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportBusy(false);
    }
  }

  // Manual fallback for when scanning the reward's QR code fails — looks up
  // the same signed redemption code by Reward ID and opens the normal
  // /redeem/:code page (works whether typed by hand or clicked from a row).
  async function openRedeemPage(rewardId) {
    setLookupBusy(true);
    setError('');
    try {
      const { code } = await api.getRewardRedeemCode(rewardId);
      navigate(`/redeem/${code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLookupBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('history.pageTitle')}</h1>
          <p className="page-subtitle">{t('history.pageSubtitle')}</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        <button className={`tab${tab === 'rewards' ? ' active' : ''}`} onClick={() => setTab('rewards')}>{t('history.tabCrm')}</button>
        <button className={`tab${tab === 'distributions' ? ' active' : ''}`} onClick={() => setTab('distributions')}>{t('history.tabDistributions')}</button>
      </div>

      <Card className="mt-card">
        <Button variant="secondary" onClick={() => setExportOpen(true)}>{t('history.exportBtn')}</Button>
      </Card>

      {tab === 'rewards' && (
        <Card className="mt-card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              placeholder={t('history.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
            />
            <Button variant="secondary" onClick={() => setFiltersOpen(true)} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              {t('pwa.filters')}{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </Button>
          </div>
          {rewards && rewards.length > 0 && (
            <div className="crm-quick" style={{ marginTop: 12 }}>
              <button type="button" className={`crm-qp${filterStatuses.length === 0 ? ' on' : ''}`} onClick={() => setFilterStatuses([])}>{t('history.filterAll')} <b>{rewards.length}</b></button>
              {panelSections[0].options.map((o) => (
                <button key={o.value} type="button" className={`crm-qp${filterStatuses.includes(o.value) ? ' on' : ''}`} onClick={() => panelSections[0].onToggle(o.value)}>{o.label} <b>{o.count}</b></button>
              ))}
            </div>
          )}
          {activeChips.length > 0 && (
            <div className="crm-chips">
              {activeChips.map((c) => <button key={c.key} type="button" className="crm-fchip" onClick={c.remove} title={t('history.removeFilter')}>{c.text}<i>×</i></button>)}
              <button type="button" className="crm-fclear" onClick={clearFilters}>{t('pwa.clearAll')}</button>
            </div>
          )}
        </Card>
      )}

      <Card className={tab === 'rewards' ? 'mt-card' : ''}>
        {tab === 'distributions' && (!distributions ? <p className="page-subtitle">{t('common.loading')}</p> :
          distributions.length === 0 ? <EmptyState title={t('history.noDistributionsYet')} /> : (
            <div className="crm-list">
              <div className="crm-head dist-grid">
                <span>{t('history.tableDate')}</span><span>{t('common.gift')}</span><span>{t('history.tableType')}</span><span>{t('history.tableOperator')}</span>
              </div>
              {distributions.map((d) => {
                const color = SLOT_COLORS[(d.slot_index || 0) % SLOT_COLORS.length];
                const when = new Date(d.created_at.replace(' ', 'T') + 'Z');
                const gift = d.gift_name || t('dashboard.caseLabel', { n: d.slot_index + 1 });
                return (
                  <div key={d.id} className="crm-row dist-grid" style={{ '--c': d.is_demo ? '#94A3B8' : '#1AA864' }}>
                    <div className="dist-date">
                      <b>{when.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}</b>
                      <span>{when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="dist-gift">
                      <span className="dist-icon" style={{ background: `${color}22`, color }} aria-hidden="true"><IconGift width="16" height="16" /></span>
                      <span className="crm-gift-name" title={gift}>{gift}</span>
                    </div>
                    <div className="dist-type"><Badge tone={d.is_demo ? 'neutral' : 'green'}>{d.is_demo ? t('history.demoBadge') : t('history.realBadge')}</Badge></div>
                    <div className="dist-op" title={d.operator_name || ''}>{d.operator_name || '—'}</div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === 'rewards' && (!rewards ? <p className="page-subtitle">{t('common.loading')}</p> :
          rewards.length === 0 ? <EmptyState title={t('history.noRewardsYet')} /> :
          filteredRewards.length === 0 ? <EmptyState title={t('history.noLeadsMatch')} /> : (
            <div className="crm-list">
              <div className="crm-head">
                <span>{t('history.tableName')}</span><span>{t('common.gift')}</span><span>{t('history.tablePotential')}</span><span>{t('history.tableStatus')}</span><span className="h-seg">{t('history.tableSegmentNote')}</span><span />
              </div>
              {filteredRewards.map((r) => {
                const full = `${r.first_name || ''} ${r.last_name || ''}`.trim();
                const open = r.campaign_id ? () => setProspectGuest({ campaignId: r.campaign_id, email: r.email, firstName: r.first_name, lastName: r.last_name }) : null;
                const stop = (e) => e.stopPropagation();
                return (
                  <div key={r.id} className={`crm-row${open ? ' click' : ''}`} style={{ '--c': CRM_ACCENT[r.status] || '#94A3B8' }} onClick={open || undefined} title={r.id}>
                    <div className="crm-who">
                      <div className="crm-av" style={{ background: avatarGradient(full || r.email) }} aria-hidden="true">{initials(r)}</div>
                      <div className="crm-who-text">
                        {open
                          ? <button type="button" className="crm-name" onClick={(e) => { stop(e); open(); }}>{full || '—'}</button>
                          : <span className="crm-name plain">{full || '—'}</span>}
                        <div className="crm-mail" onClick={stop}>
                          {isPlaceholderEmail(r.email) ? (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '1px 8px' }}>
                              {t('history.noEmailLabel')}{r.gift_on_hold ? t('history.giftOnHoldSuffix') : ''}
                            </span>
                          ) : (
                            <EmailStatusBadge email={r.email} status={r.email_status} isCatchAll={r.email_is_catch_all} isDisposable={r.email_is_disposable} isRoleAccount={r.email_is_role_account} />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="crm-gift">
                      {r.gift_name ? <div className="crm-gift-name" title={r.gift_name}>{r.gift_name}</div> : <div className="crm-gift-none">{t('pwa.noGift')}</div>}
                      <div className="crm-camp" title={r.campaign_name || ''}>{r.campaign_name || '—'}</div>
                    </div>
                    <div className="crm-stars" title={r.lead_rating ? `${r.lead_rating}/3` : ''}>
                      {r.lead_rating >= 1 && r.lead_rating <= 3 ? <>{'★'.repeat(r.lead_rating)}<i>{'★'.repeat(3 - r.lead_rating)}</i></> : <span className="none">—</span>}
                    </div>
                    <div className="crm-status"><Badge tone={REWARD_TONE[r.status] || 'neutral'}>{STATUS_TKEY[r.status] ? t(`history.${STATUS_TKEY[r.status]}`) : r.status}</Badge></div>
                    <div className="crm-seg">
                      {r.segment ? <span className="crm-chip" title={r.segment}>{r.segment}</span> : null}
                      {r.note ? <button type="button" className="crm-note" title={r.note} onClick={(e) => { stop(e); setOpenNote(r.note); }}>{r.note}</button> : (!r.segment ? <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span> : null)}
                    </div>
                    <div className="crm-act" onClick={stop}>
                      {!NO_REWARD_STATUSES.includes(r.status) && (
                        <button type="button" className="crm-act-btn" disabled={lookupBusy} onClick={() => openRedeemPage(r.id)} title={t('history.openLink')} aria-label={t('history.openLink')}>↗</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </Card>

      {filtersOpen && <FilterPanel sections={panelSections} resultCount={filteredRewards.length} activeCount={activeFilterCount} onClear={clearFilters} onClose={() => setFiltersOpen(false)} />}

      {exportOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>{tab === 'distributions' ? t('history.exportModalTitleDistributions') : t('history.exportModalTitleCrm')}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
              {tab === 'rewards' ? t('history.exportCrmDesc') : t('history.exportDistributionsDesc')}
            </p>

            {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

            {tab === 'rewards' && (
              <>
                <FilterGroup title={t('history.tableCampaign')} options={campaignOptions} selected={filterCampaigns}
                  onToggle={(v) => setFilterCampaigns(toggleValue(filterCampaigns, v))} />
                <FilterGroup title={t('common.gift')} options={giftOptions} selected={filterGifts}
                  onToggle={(v) => setFilterGifts(toggleValue(filterGifts, v))} />
                <FilterGroup title={t('history.tableStatus')} options={statusOptions} selected={filterStatuses}
                  onToggle={(v) => setFilterStatuses(toggleValue(filterStatuses, v))} />
                <FilterGroup title={t('common.segment')} options={segmentOptions} selected={filterSegments}
                  onToggle={(v) => setFilterSegments(toggleValue(filterSegments, v))} />
                <FilterGroup title={t('common.noteLabel')} options={noteOptions} selected={filterNotes}
                  onToggle={(v) => setFilterNotes(toggleValue(filterNotes, v))} />
                <FilterGroup title={t('history.tablePotential')} options={[{ value: '3', label: '★★★' }, { value: '2', label: '★★' }, { value: '1', label: '★' }, { value: 'none', label: t('history.notRated') }]} selected={filterRatings}
                  onToggle={(v) => setFilterRatings(toggleValue(filterRatings, v))} />
              </>
            )}

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>{t('history.dateRangeTitle')}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{t('history.fromLabel')}
                  <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{t('history.toLabel')}
                  <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </label>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>{t('history.formatTitle')}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <Button disabled={exportBusy} onClick={() => handleExport('csv')}>{exportBusy ? '…' : 'CSV'}</Button>
              <Button variant="secondary" disabled={exportBusy} onClick={() => handleExport('pdf')}>{exportBusy ? '…' : 'PDF'}</Button>
              <Button variant="secondary" disabled={exportBusy} onClick={() => handleExport('json')}>{exportBusy ? '…' : 'JSON'}</Button>
            </div>
            <Button variant="secondary" onClick={() => setExportOpen(false)} style={{ marginTop: 14 }}>{t('common.close')}</Button>
          </div>
        </div>
      )}

      {prospectGuest && (
        <ProspectCard
          campaignId={prospectGuest.campaignId}
          guest={prospectGuest}
          initialMode="view"
          onClose={() => setProspectGuest(null)}
          onSaved={reloadRewards}
        />
      )}

      {openNote && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>{t('common.noteLabel')}</h3>
            <p style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', margin: 0 }}>{openNote}</p>
            <Button size="sm" variant="secondary" onClick={() => setOpenNote(null)} style={{ marginTop: 18 }}>{t('common.close')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
