// Where the offline "event box" lives on the local network, for the staff
// tablet's one-tap "Switch to local mode" (see LaunchCampaign.jsx's kiosk
// overlay). The venue's Wi-Fi changes from one event to the next, so the box is reached by its NAME
// (sparkoffline-box.local, answered on any network it is on) or, on its own hotspot, by its fixed address. Default comes from
// the build (VITE_OFFLINE_BOX_URL) and can be changed per tablet — kept in that
// tablet's own localStorage, typed once while there is still internet.
const KEY = 'spark_offline_box_url';
const DEFAULT_URL = import.meta.env.VITE_OFFLINE_BOX_URL || 'http://sparkoffline-box.local:3001';

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

// The box also runs its own Wi-Fi ("Spark-Local") for when the TP-Link is
// gone; on that network it has another, fixed address.
const HOTSPOT_URL = import.meta.env.VITE_OFFLINE_BOX_HOTSPOT_URL || 'http://10.42.0.1:3001';
export const boxHotspotKioskUrl = (token) => `${HOTSPOT_URL}/kiosk/${encodeURIComponent(token)}`;

// Where the normal (online) app lives, for the "Switch to Spark Online" button of the offline app.
export const ONLINE_APP_URL = (import.meta.env.VITE_ONLINE_APP_URL || 'https://app.sparkapp360.com').replace(/\/+$/, '');
