import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

const POLL_INTERVAL_MS = 2000;

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
/// and the phone-only PWA shell (LaunchPWA.jsx, which doesn't). Keeping this
/// one hook means both views poll and filter the exact same way instead of
/// two copies drifting apart.
export function useLaunchQueue() {
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

  useEffect(() => {
    api.listCampaigns()
      .then((rows) => {
        const active = rows.find((c) => c.status === 'active') || null;
        if (!active) { setCampaign(null); return; }
        // The list endpoint doesn't include segments (see routes/campaigns.js)
        // — fetch the full campaign once we know which one is active.
        return api.getCampaign(active.id).then(setCampaign);
      })
      .catch((e) => setError(e.message));
  }, []);

  function loadRecentPlayers(campaignId) {
    api.getRecentPlayers(campaignId).then(setRecentPlayers).catch(() => {});
  }

  useEffect(() => {
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
    campaign, error, setError, queue, recentPlayers, filteredRecentPlayers,
    queueActionBusy, handleCancelPlayer, handleSkipPlayer, handleNoteSaved, scanEnabled,
    playerSearch, setPlayerSearch, playerFilterGifts, setPlayerFilterGifts,
    playerFilterSegments, setPlayerFilterSegments, playerGiftOptions, playerSegmentOptions, playerActiveFilterCount,
  };
}
