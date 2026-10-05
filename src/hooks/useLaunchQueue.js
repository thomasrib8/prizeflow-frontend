import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';

const POLL_INTERVAL_MS = 2000;
// How often `watch` mode re-checks which campaign is active (see below).
const ACTIVE_CAMPAIGN_RECHECK_MS = 30000;

// Distinct, non-empty values for a field across the recent-players list, used
// to populate the filter popup's checkboxes — only ever shows values that
// actually occur in the data, never a stale hardcoded list.
export function distinctValues(rows, key) {
  return [...new Set(rows.map((r) => r[key]).filter((v) => v != null && v !== ''))].sort();
}

export function toggleValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/// Everything a "run the wheel live" screen needs: the currently active
/// campaign, its live queue, its last 20 players (with search/filter), and
/// the skip/cancel actions — shared by the full desktop Launch page
/// (LaunchCampaign.jsx, which also shows the QR code and kiosk spin button)
/// and the phone-only PWA app (pages/pwa/PwaLayout.jsx, which doesn't). Keeping this
/// one hook means both views poll and filter the exact same way instead of
/// two copies drifting apart.
///
/// `watch` (the mobile PWA): keep following which campaign is active. The
/// active campaign is chosen on the desktop app, so a phone left open at the
/// booth re-checks every 30 s and whenever the app comes back to the
/// foreground, and every section follows the switch on its own. Off by
/// default so the desktop Launch page behaves exactly as before.
export function useLaunchQueue({ watch = false } = {}) {
  const [campaign, setCampaign] = useState(undefined); // undefined while loading, null if none active
  const [error, setError] = useState('');
  const [queue, setQueue] = useState(null);
  const [recentPlayers, setRecentPlayers] = useState(null);
  const [queueActionBusy, setQueueActionBusy] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerFilterGifts, setPlayerFilterGifts] = useState([]);
  const [playerFilterSegments, setPlayerFilterSegments] = useState([]);

  useEffect(() => {
    api.getBadgeScanStatus().then((r) => setScanEnabled(!!r.enabled)).catch(() => {});
  }, []);

  const campaignIdRef = useRef(undefined);

  // `force` re-fetches the full campaign even when it's still the same one
  // (e.g. right after its settings were edited).
  const loadActiveCampaign = useCallback((force = false) => {
    return api.listCampaigns()
      .then((rows) => {
        const active = rows.find((c) => c.status === 'active') || null;
        if (!active) { campaignIdRef.current = null; setCampaign(null); return null; }
        if (!force && campaignIdRef.current === active.id) return null;
        // The list endpoint doesn't include segments (see routes/campaigns.js)
        // — fetch the full campaign once we know which one is active.
        return api.getCampaign(active.id).then((full) => { campaignIdRef.current = full.id; setCampaign(full); });
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { loadActiveCampaign(true); }, [loadActiveCampaign]);

  useEffect(() => {
    if (!watch) return undefined;
    const id = setInterval(() => loadActiveCampaign(false), ACTIVE_CAMPAIGN_RECHECK_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') loadActiveCampaign(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [watch, loadActiveCampaign]);

  function loadRecentPlayers(campaignId) {
    api.getRecentPlayers(campaignId).then(setRecentPlayers).catch(() => {});
  }

  useEffect(() => {
    // A different campaign is now active: drop the previous one's queue and
    // players straight away instead of showing them until the first poll.
    setQueue(null);
    setRecentPlayers(null);
    if (!campaign) return undefined;
    let cancelled = false;
    async function poll() {
      try {
        const res = await api.getGuestQueueSnapshot(campaign.id);
        if (!cancelled) setQueue(res);
      } catch {
        // transient network hiccup — just try again next tick
      }
      if (!cancelled) loadRecentPlayers(campaign.id);
    }
    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id]);

  async function handleCancelPlayer() {
    if (!campaign || queueActionBusy) return;
    setQueueActionBusy(true);
    try {
      await api.cancelActivePlayer(campaign.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setQueueActionBusy(false);
    }
  }

  async function handleSkipPlayer() {
    if (!campaign || queueActionBusy) return;
    setQueueActionBusy(true);
    try {
      await api.skipActivePlayer(campaign.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setQueueActionBusy(false);
    }
  }

  function handleNoteSaved() {
    if (campaign) loadRecentPlayers(campaign.id);
  }

  const playerGiftOptions = useMemo(() => distinctValues(recentPlayers || [], 'gift_name'), [recentPlayers]);
  const playerSegmentOptions = useMemo(() => distinctValues(recentPlayers || [], 'segment'), [recentPlayers]);
  const playerActiveFilterCount = playerFilterGifts.length + playerFilterSegments.length;

  const filteredRecentPlayers = useMemo(() => {
    if (!recentPlayers) return recentPlayers;
    const q = playerSearch.trim().toLowerCase();
    return recentPlayers.filter((p) => {
      if (playerFilterGifts.length && !playerFilterGifts.includes(p.gift_name)) return false;
      if (playerFilterSegments.length && !playerFilterSegments.includes(p.segment)) return false;
      if (!q) return true;
      const haystack = [p.first_name, p.last_name, p.email, p.gift_name, p.segment, p.note].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [recentPlayers, playerSearch, playerFilterGifts, playerFilterSegments]);

  return {
    campaign, reloadCampaign: () => loadActiveCampaign(true), error, setError, queue, recentPlayers, filteredRecentPlayers,
    queueActionBusy, handleCancelPlayer, handleSkipPlayer, handleNoteSaved, scanEnabled,
    playerSearch, setPlayerSearch, playerFilterGifts, setPlayerFilterGifts,
    playerFilterSegments, setPlayerFilterSegments, playerGiftOptions, playerSegmentOptions, playerActiveFilterCount,
  };
}
