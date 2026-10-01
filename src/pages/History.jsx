import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState, GiftPill } from '../components/ui';
import ProspectCard from '../components/ProspectCard';
import EmailStatusBadge from '../components/EmailStatusBadge';
import FilterGroup from '../components/FilterGroup';
import { isPlaceholderEmail } from '../utils/placeholderEmail';

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

  const activeFilterCount = filterCampaigns.length + filterGifts.length + filterStatuses.length + filterSegments.length + filterNotes.length;

  function clearFilters() {
    setFilterCampaigns([]); setFilterGifts([]); setFilterStatuses([]); setFilterSegments([]); setFilterNotes([]);
  }

  const filteredRewards = useMemo(() => {
    if (!rewards) return [];
    const q = search.trim().toLowerCase();
    return rewards.filter((r) => {
      if (filterCampaigns.length && !filterCampaigns.includes(r.campaign_name)) return false;
      if (filterGifts.length && !filterGifts.includes(r.gift_name)) return false;
      if (filterStatuses.length && !filterStatuses.includes(r.status)) return false;
      if (filterSegments.length && !filterSegments.includes(r.segment)) return false;
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
  }, [rewards, search, filterCampaigns, filterGifts, filterStatuses, filterSegments, filterNotes]);

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
              {t('pwa.filters')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
          </div>
        </Card>
      )}

      <Card className={tab === 'rewards' ? 'mt-card' : ''}>
        {tab === 'distributions' && (!distributions ? <p className="page-subtitle">{t('common.loading')}</p> :
          distributions.length === 0 ? <EmptyState title={t('history.noDistributionsYet')} /> : (
            <table className="data-table">
              <thead>
                <tr><th>{t('history.tableDate')}</th><th>{t('common.gift')}</th><th>{t('history.tableType')}</th><th>{t('history.tableOperator')}</th></tr>
              </thead>
              <tbody>
                {distributions.map(d => (
                  <tr key={d.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDT(d.created_at)}</td>
                    <td><GiftPill slotIndex={d.slot_index} name={d.gift_name || t('dashboard.caseLabel', { n: d.slot_index + 1 })} /></td>
                    <td><Badge tone={d.is_demo ? 'neutral' : 'green'}>{d.is_demo ? t('history.demoBadge') : t('history.realBadge')}</Badge></td>
                    <td style={{ color: 'var(--text-muted)' }}>{d.operator_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'rewards' && (!rewards ? <p className="page-subtitle">{t('common.loading')}</p> :
          rewards.length === 0 ? <EmptyState title={t('history.noRewardsYet')} /> :
          filteredRewards.length === 0 ? <EmptyState title={t('history.noLeadsMatch')} /> : (
            <table className="data-table">
              <thead>
                <tr><th>{t('history.tableRewardId')}</th><th>{t('history.tableName')}</th><th>{t('history.tableEmail')}</th><th>{t('common.gift')}</th><th>{t('history.tableCampaign')}</th><th>{t('history.tableStatus')}</th><th>{t('common.segment')}</th><th>{t('common.noteLabel')}</th><th></th></tr>
              </thead>
              <tbody>
                {filteredRewards.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{r.id}</td>
                    <td>
                      {r.campaign_id ? (
                        <button
                          onClick={() => setProspectGuest({ campaignId: r.campaign_id, email: r.email, firstName: r.first_name, lastName: r.last_name })}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--link)', textDecoration: 'underline' }}
                        >{r.first_name} {r.last_name}</button>
                      ) : (
                        <span style={{ fontWeight: 500 }}>{r.first_name} {r.last_name}</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {isPlaceholderEmail(r.email) ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '1px 8px' }}>
                          {t('history.noEmailLabel')}{r.gift_on_hold ? t('history.giftOnHoldSuffix') : ''}
                        </span>
                      ) : (
                        <EmailStatusBadge email={r.email} status={r.email_status} isCatchAll={r.email_is_catch_all} isDisposable={r.email_is_disposable} isRoleAccount={r.email_is_role_account} />
                      )}
                    </td>
                    <td>{r.gift_name ? <GiftPill slotIndex={0} name={r.gift_name} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('pwa.noGift')}</span>}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.campaign_name || '—'}</td>
                    <td><Badge tone={REWARD_TONE[r.status] || 'neutral'}>{STATUS_TKEY[r.status] ? t(`history.${STATUS_TKEY[r.status]}`) : r.status}</Badge></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.segment || '—'}</td>
                    <td style={{ maxWidth: 180 }}>
                      {r.note ? (
                        <button
                          onClick={() => setOpenNote(r.note)}
                          style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: 12, color: '#334155', textAlign: 'left',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', width: '100%',
                          }}
                        >{r.note}</button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      {!NO_REWARD_STATUSES.includes(r.status) && (
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={lookupBusy}
                          onClick={() => openRedeemPage(r.id)}
                        >{t('history.openLink')}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </Card>

      {filtersOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t('pwa.filters')}</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--link)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >{t('pwa.clearAll')}</button>
              )}
            </div>

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

            <Button onClick={() => setFiltersOpen(false)} style={{ marginTop: 4 }}>{t('common.done')}</Button>
          </div>
        </div>
      )}

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
