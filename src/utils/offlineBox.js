// Where the offline "event box" lives on the local network, for the staff
// tablet's one-tap "Switch to local mode" (see LaunchCampaign.jsx's kiosk
// overlay). The box has a fixed address on both Wi-Fi networks it can be on
// (the TP-Link, or its own hotspot). Default comes from
// the build (VITE_OFFLINE_BOX_URL) and can be changed per tablet — kept in that
// tablet's own localStorage, typed once while there is still internet.
const KEY = 'spark_offline_box_url';
const DEFAULT_URL = import.meta.env.VITE_OFFLINE_BOX_URL || 'http://192.168.0.250:3001';

export function getBoxUrl() {
  try { return localStorage.getItem(KEY) || DEFAULT_URL; } catch { return DEFAULT_URL; }
}

export function setBoxUrl(value) {
  const clean = String(value || '').trim().replace(/\/+$/, '');
  try {
    if (clean) localStorage.setItem(KEY, clean); else localStorage.removeItem(KEY);
  } catch { /* storage unavailable: the default is used */ }
}

export const boxKioskUrl = (token) => `${getBoxUrl()}/kiosk/${encodeURIComponent(token)}`;

// The box also runs its own Wi-Fi ("PrizeFlow-Local") for when the TP-Link is
// gone; on that network it has another, fixed address.
const HOTSPOT_URL = import.meta.env.VITE_OFFLINE_BOX_HOTSPOT_URL || 'http://10.42.0.1:3001';
export const boxHotspotKioskUrl = (token) => `${HOTSPOT_URL}/kiosk/${encodeURIComponent(token)}`;
