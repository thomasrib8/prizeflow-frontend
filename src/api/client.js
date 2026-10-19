import { getToken, adoptRefreshedToken, dropToken } from './tokenStore';
import i18n from '../i18n';
import { IS_DEMO } from '../tutorial/demo';
import { createDemoSocket } from '../tutorial/demoSocket';
// 'same-origin' = this page and the API come from the same server — what the
// offline event box does (it serves the built app itself, reached by IP).
const API_BASE = import.meta.env.VITE_API_BASE_URL === 'same-origin'
  ? window.location.origin
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || API_BASE.replace(/^http/, 'ws');


// For idempotent calls only: one more try when the network itself failed before any answer.
async function retryOnce(fn) {
  try { return await fn(); } catch (e) {
    if (e instanceof TypeError) { await new Promise((r) => setTimeout(r, 400)); return fn(); }
    throw e;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  // Tutorial mode: answered by the in-browser fake server, never the network (loaded only then)
  if (IS_DEMO) { const { demoRequest } = await import('../tutorial/fakeBackend'); return demoRequest(path, { method, body }); }
  const headers = { 'Content-Type': 'application/json' };
  // Captured up front so the 401 handler below can tell "this exact token
  // just got rejected" apart from "a newer login already replaced it while
  // this request was in flight" — see the comment down there for why that
  // distinction matters.
  const tokenForThisRequest = auth ? getToken() : null;
  if (tokenForThisRequest) headers.Authorization = `Bearer ${tokenForThisRequest}`;
  // cache: 'no-store' — never let the browser's HTTP cache answer (or
  // revalidate) an API call: a cached response would replay an old
  // X-Refreshed-Token header (see the matching note in the backend's
  // server.js).
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  // Sliding session (see backend auth.js requireAuth): the server quietly
  // hands back a fresh token once the current one is past half its life, so
  // an operator actively using SPARK never hits the 12h wall mid-shift.
  const refreshedToken = res.headers.get('X-Refreshed-Token');
  if (refreshedToken) adoptRefreshedToken(refreshedToken);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }
  // A previously-signed-in session went stale (12h JWT expiry, deactivated
  // account, etc.) — AuthContext only checks whether a token/user is present
  // in localStorage, not whether it's still valid, so without this an
  // operator scanning a reward QR (or doing anything else) hours after their
  // last login would see this raw backend error instead of being sent back
  // to sign in. `auth: false` calls (login/register/forgot-password/guest
  // routes) never send a token, so they can't hit this — only a rejected
  // Bearer token does.
  if (res.status === 401 && auth) {
    // Several requests fired at once (Dashboard + Layout's sidebar badge,
    // say) all read the same stale token and are all in flight together —
    // the first 401 to come back already starts the redirect below. If a
    // slower one among them resolves AFTER the operator has since logged
    // back in (a fresh token now sits in storage), clearing storage here
    // would silently rip out that brand-new, perfectly valid session right
    // out from under them and bounce them straight back to /login — which
    // is exactly the "I log in and it immediately kicks me out" symptom.
    // Only act when the token that just failed is still this tab's session.
    if (getToken() === tokenForThisRequest) {
      dropToken(tokenForThisRequest);
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?returnTo=${returnTo}`;
    }
    return new Promise(() => {}); // navigation is already underway (or a newer session is active — either way, this caller gets nothing more)
  }
  if (!res.ok) {
    // Event-box answers worth showing in the rep's own language
    const boxKey = { BOX_NOT_PRIMARY: 'boxApp.readOnly', BOX_BAD_CODE: 'boxApp.badCode', BOX_NO_CODE: 'boxApp.noCode', BOX_NOT_READY: 'boxApp.notReady' }[data && data.code];
    const err = new Error(boxKey ? i18n.t(boxKey, { ns: 'admin' }) : (data && data.error) || `Request failed (${res.status})`);
    if (data && data.code) err.code = data.code; // e.g. POSSIBLE_DUPLICATE — lets a screen offer a specific way forward
    throw err;
  }
  return data;
}

// Authenticated file download — browsers won't attach the Bearer token to a
// plain navigation/<a href>, so this fetches the file as a blob (with the
// header attached) and triggers the save via a throwaway object URL instead.
async function downloadFile(path) {
  if (IS_DEMO) return; // nothing to download in a tutorial
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch (e) {
      // no JSON body
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'download';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  // Second step when the account has two-step sign-in on (login answered { mfaRequired, mfaToken })
  // A first attempt on a connection the box had just closed fails at once ("Load failed" on iPhone): try once more.
  boxLogin: (code) => retryOnce(() => request('/box/login', { method: 'POST', body: { code }, auth: false })),
  boxStatus: () => retryOnce(() => request('/box/status', { auth: false })),
  verifyMfa: (mfaToken, code) => request('/auth/mfa/verify', { method: 'POST', body: { mfaToken, code }, auth: false }),
  getMfaStatus: () => request('/account/mfa'),
  setupMfa: (password) => request('/account/mfa/setup', { method: 'POST', body: { password } }),
  enableMfa: (code) => request('/account/mfa/enable', { method: 'POST', body: { code } }),
  disableMfa: (password, code) => request('/account/mfa/disable', { method: 'POST', body: { password, code } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token, password) =>
    request('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false }),

  // Self-service profile — all registration fields, email, and/or password
  // (password change requires currentPassword).
  getProfile: () => request('/account/profile'),
  updateProfile: (payload) => request('/account/profile', { method: 'PATCH', body: payload }),
  requestAccountDeletion: () => request('/account/request-deletion', { method: 'POST' }),
  // Personal data of ONE person (RGPD): export everything held, or anonymize/delete it.
  exportPersonData: (email) => request(`/account/privacy/person?email=${encodeURIComponent(email)}`),
  erasePersonData: (email) => request('/account/privacy/erase', { method: 'POST', body: { email } }),

  // Admin-only account management.
  listUsers: () => request('/users'),
  getUsersPendingCount: () => request('/users/pending-count'),
  getWheelIdentities: () => request('/users/wheel-identities'),
  // Wheel park (rental fleet), admin only.
  listWheels: () => request('/wheels'),
  createWheel: (payload) => request('/wheels', { method: 'POST', body: payload }),
  getWheel: (id) => request(`/wheels/${id}`),
  updateWheel: (id, payload) => request(`/wheels/${id}`, { method: 'PATCH', body: payload }),
  getParkProfitability: () => request('/wheels/profitability'),
  getWheelProfitability: (id) => request(`/wheels/${id}/profitability`),
  setWheelCost: (id, payload) => request(`/wheels/${id}/cost`, { method: 'PUT', body: payload }),
  addWheelDirectCost: (id, payload) => request(`/wheels/${id}/direct-costs`, { method: 'POST', body: payload }),
  deleteWheelDirectCost: (id, costId) => request(`/wheels/${id}/direct-costs/${costId}`, { method: 'DELETE' }),
  getAdminDashboard: (query) => request(`/admin/dashboard?${query}`),
  downloadAdminDashboardCsv: (query) => downloadFile(`/admin/dashboard/export.csv?${query}`),
  searchEvents: (q) => request(`/events/search?q=${encodeURIComponent(q)}`),
  listCatalog: (query = '') => request(`/admin/catalog${query ? `?${query}` : ''}`),
  getCatalogPending: () => request('/admin/catalog/pending-count'),
  getCatalogEntry: (id) => request(`/admin/catalog/${id}`),
  editCatalogEntry: (id, payload) => request(`/admin/catalog/${id}`, { method: 'PATCH', body: payload }),
  verifyCatalogEntry: (id, payload = {}) => request(`/admin/catalog/${id}/verify`, { method: 'POST', body: payload }),
  rejectCatalogEntry: (id) => request(`/admin/catalog/${id}/reject`, { method: 'POST' }),
  mergeCatalogEntry: (id, intoId) => request(`/admin/catalog/${id}/merge`, { method: 'POST', body: { intoId } }),
  regeocodeCatalogEntry: (id) => request(`/admin/catalog/${id}/regeocode`, { method: 'POST' }),
  importCatalog: () => request('/admin/catalog/import', { method: 'POST', body: {} }),
  getLive: (query = '') => request(`/admin/live${query ? `?${query}` : ''}`),
  getLiveWheel: (id) => request(`/admin/live/wheels/${id}`),
  getLiveHistory: (query) => request(`/admin/live/history?${query}`),
  setLiveStyle: (styleUrl) => request('/admin/live/settings', { method: 'PUT', body: { styleUrl } }),
  getApiOverview: (month) => request(`/admin/api-usage/overview?month=${month}`),
  getApiProvider: (provider, month) => request(`/admin/api-usage/providers/${encodeURIComponent(provider)}?month=${month}`),
  getApiClients: (month) => request(`/admin/api-usage/clients?month=${month}`),
  downloadApiClientsCsv: (month) => downloadFile(`/admin/api-usage/clients.csv?month=${month}`),
  runApiReconcile: () => request('/admin/api-usage/reconcile', { method: 'POST', body: {} }),
  getResellerStatus: () => request('/reseller/status'),
  getResellerPark: () => request('/reseller/park'),
  getResellerClients: () => request('/reseller/clients'),
  getResellerHistory: () => request('/reseller/history'),
  createResellerRequest: (payload) => request('/reseller/requests', { method: 'POST', body: payload }),
  cancelResellerRequest: (id) => request(`/reseller/requests/${id}/cancel`, { method: 'POST', body: {} }),
  getAttributionRequests: () => request('/admin/commercial/requests'),
  resolveAttributionRequest: (id, status) => request(`/admin/commercial/requests/${id}/resolve`, { method: 'POST', body: { status } }),
  getCommercialTypes: () => request('/admin/commercial/types'),
  getCommercialResellers: () => request('/admin/commercial/resellers'),
  getCommercialUser: (id) => request(`/admin/commercial/users/${id}`),
  addCommercialTerms: (id, payload) => request(`/admin/commercial/users/${id}/terms`, { method: 'POST', body: payload }),
  startHolding: (payload) => request('/admin/commercial/holdings', { method: 'POST', body: payload }),
  endHolding: (id, endedOn) => request(`/admin/commercial/holdings/${id}/end`, { method: 'POST', body: { endedOn } }),
  listPlannedRentals: (status = 'planned') => request(`/admin/commercial/planned?status=${status}`),
  addPlannedRental: (payload) => request('/admin/commercial/planned', { method: 'POST', body: payload }),
  cancelPlannedRental: (id) => request(`/admin/commercial/planned/${id}/cancel`, { method: 'POST' }),
  getRevenue: (query = '') => request(`/admin/commercial/revenue${query ? `?${query}` : ''}`),
  reverseRevenueEntry: (id, note) => request(`/admin/commercial/revenue/${id}/reverse`, { method: 'POST', body: { note } }),
  assignWheel: (id, userId, params = {}) => request(`/wheels/${id}/assign`, { method: 'POST', body: { userId, ...params } }),
  updateWheelAssignment: (id, params) => request(`/wheels/${id}/assignment`, { method: 'PATCH', body: params }),
  endWheelRental: (id, inspection) => request(`/wheels/${id}/end-rental`, { method: 'POST', body: { inspection } }),
  wheelInspections: (ownerId) => request(`/wheels/inspections?ownerId=${encodeURIComponent(ownerId)}`),
  // Photos of the return inspection: the browser resizes the picture to a JPEG blob first; sent as a raw body.
  async uploadWheelPhoto(id, blob) {
    const res = await fetch(`${API_BASE}/wheels/${id}/photos`, {
      method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg', Authorization: `Bearer ${getToken()}` }, body: blob, cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data.id;
  },
  // <img> cannot send the Authorization header: the photo is fetched with it and shown from a blob URL.
  async wheelPhotoUrl(photoId) {
    const res = await fetch(`${API_BASE}/wheels/photos/${photoId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return URL.createObjectURL(await res.blob());
  },
  setUserStatus: (id, status) => request(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
  setUserRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
  getUserDetail: (id) => request(`/users/${id}`),
  getUserOverview: (id) => request(`/users/${id}/overview`),
  getUserActivity: (id) => request(`/users/${id}/activity`),
  getUserNotes: (id) => request(`/users/${id}/notes`),
  addUserNote: (id, body) => request(`/users/${id}/notes`, { method: 'POST', body: { body } }),
  adminResetUserPassword: (id) => request(`/users/${id}/reset-password`, { method: 'POST' }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  getAppHealth: () => request('/admin/health'),
  // refresh = true skips the server's one-minute cache (the widget's manual refresh button)
  getEmailStatus: (refresh = false) => request(`/admin/email-status${refresh ? '?refresh=1' : ''}`),
  getEmailLog: (limit = 30) => request(`/admin/email-log?limit=${limit}`),

  dashboard: (campaignId = 'all') => request(`/dashboard?campaignId=${encodeURIComponent(campaignId)}`),
  dashboardChart: (days = '7', campaignId = 'all') => request(`/dashboard/chart?days=${days}&campaignId=${encodeURIComponent(campaignId)}`),
  // Custom dashboard of a campaign (modules chosen by the owner)
  dashboardLayout: (campaignId) => request(`/dashboard/layout?campaignId=${encodeURIComponent(campaignId)}`),
  saveDashboardLayout: (campaignId, layout) => request('/dashboard/layout', { method: 'PUT', body: { campaignId, layout } }),
  resetDashboardLayout: (campaignId) => request(`/dashboard/layout?campaignId=${encodeURIComponent(campaignId)}`, { method: 'DELETE' }),
  suggestDashboard: (campaignId, goal) => request('/dashboard/layout/suggest', { method: 'POST', body: { campaignId, goal } }),
  dashboardTemplate: (campaignId, name) => request(`/dashboard/layout/template?campaignId=${encodeURIComponent(campaignId)}&name=${encodeURIComponent(name)}`),
  dashboardModuleData: (campaignId, source) => request(`/dashboard/module-data?campaignId=${encodeURIComponent(campaignId)}&source=${encodeURIComponent(source)}`),
  downloadDashboardPdf: (campaignId) => downloadFile(`/dashboard/export.pdf?campaignId=${encodeURIComponent(campaignId)}`),
  dashboardProfitability: (campaignId) => request(`/dashboard/profitability?campaignId=${encodeURIComponent(campaignId)}`),
  saveProfitability: (campaignId, settings) => request('/dashboard/profitability', { method: 'PUT', body: { campaignId, ...settings } }),
  createBudgetField: (campaignId) => request('/dashboard/profitability/budget-field', { method: 'POST', body: { campaignId } }),
  dashboardTopRewards: (campaignId = 'all') => request(`/dashboard/top-rewards?campaignId=${encodeURIComponent(campaignId)}`),
  adminSequence: (id) => request(`/admin/campaigns/${id}/sequence`),
  adminTestCampaigns: () => request('/admin/test-campaigns'),
  distributions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/distributions${qs ? `?${qs}` : ''}`);
  },
  rewards: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/rewards${qs ? `?${qs}` : ''}`);
  },
  exportDistributionsCsv: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/distributions/export${qs ? `?${qs}` : ''}`);
  },
  exportRewardsCsv: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/rewards/export${qs ? `?${qs}` : ''}`);
  },
  exportDistributionsPdf: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/distributions/report.pdf${qs ? `?${qs}` : ''}`);
  },
  exportDistributionsJson: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/distributions/export.json${qs ? `?${qs}` : ''}`);
  },
  exportRewardsPdf: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/rewards/report.pdf${qs ? `?${qs}` : ''}`);
  },
  exportRewardsJson: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/rewards/export.json${qs ? `?${qs}` : ''}`);
  },
  downloadCampaignReport: (id) => downloadFile(`/campaigns/${id}/report.pdf`),
  exportCampaignGiftDistribution: (id) => downloadFile(`/campaigns/${id}/gift-distribution.csv`),
  downloadCommissioningGuide: () => downloadFile('/admin/guides/mise-en-service'),
  // One-time activation code for an event box (admin, from the client's page)
  getBoxActivation: (userId) => request(`/box-activation/${encodeURIComponent(userId)}`),
  // Pack preparation (Parc hardware wizard): per wheel, not per client.
  getPackState: (wheelId) => request(`/box-activation/pack/${encodeURIComponent(wheelId)}`),
  getPackWifi: (wheelId) => request(`/box-activation/pack/${encodeURIComponent(wheelId)}/wifi`),
  setPackWifi: (wheelId, password) => request(`/box-activation/pack/${encodeURIComponent(wheelId)}/wifi`, { method: 'PUT', body: { password } }),
  getPackWheelScript: (wheelId) => request(`/box-activation/pack/${encodeURIComponent(wheelId)}/wheel-script`),
  preparePackBox: (wheelId) => request(`/box-activation/pack/${encodeURIComponent(wheelId)}/prepare`, { method: 'POST', body: {} }),
  markPackReady: (wheelId, boxAlreadyActivated) => request(`/box-activation/pack/${encodeURIComponent(wheelId)}/ready`, { method: 'POST', body: { boxAlreadyActivated: !!boxAlreadyActivated } }),
  downloadCampaignQrPdf: (id) => downloadFile(`/campaigns/${id}/qr.pdf`),
  // Manual fallback for when scanning the QR fails — an already-logged-in
  // operator looks up a reward by ID and gets back the same signed code
  // the email's QR encodes, then opens the normal /redeem/:code page.
  getRewardRedeemCode: (id) => request(`/rewards/${id}/redeem-code`),
  // Same, but for the 'code' redemption flow — operator types the guest's
  // 8-char human code on the Rewards page instead of scanning.
  getRewardCodeLookup: (code) => request(`/rewards/code/${encodeURIComponent(code)}/redeem-code`),

  listCampaigns: () => request('/campaigns'),
  getCampaign: (id) => request(`/campaigns/${id}`),
  getCampaignSequence: (id) => request(`/campaigns/${id}/sequence`),
  createCampaign: (payload) => request('/campaigns', { method: 'POST', body: payload }),
  updateCampaignDetails: (id, payload) => request(`/campaigns/${id}/details`, { method: 'PATCH', body: payload }),
  updateCampaignSlots: (id, payload) => request(`/campaigns/${id}/slots`, { method: 'PATCH', body: payload }),
  updateCampaignSegments: (id, segments) => request(`/campaigns/${id}/segments`, { method: 'PUT', body: { segments } }),
  updateCampaignSegmentCategories: (id, categories) => request(`/campaigns/${id}/segment-categories`, { method: 'PUT', body: { categories } }),
  updateCampaignFields: (id, fields) => request(`/campaigns/${id}/fields`, { method: 'PUT', body: { fields } }),
  startCampaign: (id) => request(`/campaigns/${id}/start`, { method: 'POST' }),
  pauseCampaign: (id) => request(`/campaigns/${id}/pause`, { method: 'POST' }),
  endCampaign: (id) => request(`/campaigns/${id}/end`, { method: 'POST' }),
  archiveCampaign: (id) => request(`/campaigns/${id}/archive`, { method: 'POST' }),
  deleteCampaign: (id) => request(`/campaigns/${id}`, { method: 'DELETE' }),
  // Google review invite (+ its link), social media invite and AI assistant
  // for one campaign — see CampaignSettingsForm.jsx.
  updateCampaignSettings: (id, settings) =>
    request(`/campaigns/${id}/settings`, { method: 'PATCH', body: settings }),

  // Reusable slot/gift configs — "start from template" and "duplicate an
  // existing campaign" both prefill NewCampaign.jsx's form (stock reset to 0,
  // adjustable before creating), rather than silently creating a copy.
  listCampaignTemplates: () => request('/campaign-templates'),
  getCampaignTemplate: (id) => request(`/campaign-templates/${id}`),
  saveCampaignTemplate: (name, slots) => request('/campaign-templates', { method: 'POST', body: { name, slots } }),

  spinStatus: () => request('/spin/status'),
  wheelCommand: (command) => request('/spin/command', { method: 'POST', body: { command } }),
  spinDemo: (slotIndex) => request('/spin/demo', { method: 'POST', body: { slotIndex } }),

  listAdminSequences: () => request('/admin-sequences'),
  createAdminSequence: (name, steps, description) => request('/admin-sequences', { method: 'POST', body: { name, steps, description } }),
  deleteAdminSequence: (id) => request(`/admin-sequences/${id}`, { method: 'DELETE' }),
  activateAdminSequence: (id) => request(`/admin-sequences/${id}/activate`, { method: 'POST' }),
  stopAdminSequence: () => request('/admin-sequences/stop', { method: 'POST' }),
  getAdminSequenceStatus: () => request('/admin-sequences/status'),

  // Staff-facing: live snapshot of one campaign's guest queue. The QR itself
  // is built from that campaign's own public_token (see listCampaigns/getCampaign).
  getGuestQueueSnapshot: (campaignId) => request(`/account/guest-queue?campaignId=${encodeURIComponent(campaignId)}`),
  // Manual replacements for the old automatic per-guest timeout — see
  // guestQueue.js's cancelActivePlayer/skipActivePlayer.
  cancelActivePlayer: (campaignId) => request('/account/guest-queue/cancel', { method: 'POST', body: { campaignId } }),
  skipActivePlayer: (campaignId) => request('/account/guest-queue/skip', { method: 'POST', body: { campaignId } }),
  // Note/lead-rating/segment popup on the Launch page — upserts by (campaignId, email).
  createProspect: (payload) => request('/account/prospects', { method: 'POST', body: payload }),
  setProspectEmail: (payload) => request('/account/prospects/email', { method: 'PATCH', body: payload }),
  // Polled by useProspectAddedToast right after a scan/manual entry with no
  // email kicks off an automatic Hunter lookup (see POST /prospects's
  // emailEnrichment flag) — { status: 'searching'|'found'|'not_found'|'error'|'none', email, score }.
  getEmailEnrichmentStatus: (prospectId) => request(`/account/prospects/${prospectId}/email-enrichment`),
  // Live Hunter search from inside the New prospect modal itself — resolves
  // right away (unlike the fire-and-forget path above) so the rep sees the
  // result before saving. { found: true, email, score } | { found: false }.
  findEmailViaHunter: (payload) => request('/account/prospects/find-email', { method: 'POST', body: payload }),
  voidPendingReward: (payload) => request('/account/prospects/void-reward', { method: 'POST', body: payload }),
  getBadgeScanStatus: () => request('/account/badge-scan'),
  // Multipart (a photo), so it can't go through request(), which always sends JSON.
  scanProspectImage: async (campaignId, blob) => {
    if (IS_DEMO) { const { demoRequest } = await import('../tutorial/fakeBackend'); return demoRequest('/account/prospects/scan', { method: 'POST', body: {} }); }
    const form = new FormData();
    form.append('campaignId', campaignId);
    form.append('image', blob, 'scan.jpg');
    const token = getToken();
    const res = await fetch(`${API_BASE}/account/prospects/scan`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  },
  saveGuestNote: (payload) => request('/account/guest-notes', { method: 'PATCH', body: payload }),
  getGuestNote: (campaignId, email) => request(`/account/guest-notes?campaignId=${encodeURIComponent(campaignId)}&email=${encodeURIComponent(email)}`),
  // The prospect card's right-hand column. History and other campaigns are cloud-only; manual notes also work on the event box.
  getProspectHistory: (campaignId, email) => request(`/account/prospect-history?campaignId=${encodeURIComponent(campaignId)}&email=${encodeURIComponent(email)}`),
  getProspectCampaigns: (email) => request(`/account/prospect-campaigns?email=${encodeURIComponent(email)}`),
  getProspectNotes: (campaignId, email) => request(`/account/prospect-notes?campaignId=${encodeURIComponent(campaignId)}&email=${encodeURIComponent(email)}`),
  addProspectNote: (payload) => request('/account/prospect-notes', { method: 'POST', body: payload }),
  // LinkedIn profile search (Apollo.io). Credits live only on the server; each search is started by a rep's click.
  linkedinStatus: (campaignId) => request(`/account/linkedin/status?campaignId=${encodeURIComponent(campaignId)}`),
  linkedinSearch: (payload) => request('/account/linkedin/search', { method: 'POST', body: payload }),
  linkedinDecision: (operationId, decision) => request(`/account/linkedin/searches/${encodeURIComponent(operationId)}/decision`, { method: 'POST', body: { decision } }),
  setLinkedinUrl: (payload) => request('/account/linkedin/url', { method: 'PUT', body: payload }),
  getUserLinkedin: (id) => request(`/users/${id}/linkedin`),
  setUserLinkedin: (id, payload) => request(`/users/${id}/linkedin`, { method: 'PATCH', body: payload }),
  // Cheap reachability check of the cloud (no sign-in): throws a TypeError when the network itself fails.
  pingCloud: async () => {
    // tutorial mode: the cloud answers, unless the tutorial pretends the connection was lost (window.__demo 'cloudLost')
    if (IS_DEMO) { if (window.__demo && window.__demo.get('cloudLost')) throw new TypeError('Failed to fetch'); return true; }
    const r = await fetch(`${API_BASE}/health`, { cache: 'no-store' }); return r.ok;
  },
  getRecentPlayers: (campaignId) => request(`/account/recent-players?campaignId=${encodeURIComponent(campaignId)}`),
  getBoxWifiPassword: () => request('/account/box-wifi-password'),
  setBoxWifiPassword: (password) => request('/account/box-wifi-password', { method: 'PUT', body: { password } }),
  getOfflineAccessCode: () => request('/account/offline-access-code'),
  getAccountSettings: () => request('/account/settings'),
  getAdminAlertSettings: () => request('/admin/api-usage/settings'),
  updateAdminAlertSettings: (payload) => request('/admin/api-usage/settings', { method: 'PUT', body: payload }),
  getAdminAlerts: () => request('/admin/api-usage/alerts'),
  getApiPrices: () => request('/admin/api-usage/prices'),
  addApiPrice: (payload) => request('/admin/api-usage/prices', { method: 'POST', body: payload }),
  editPreparedApiPrice: (id, payload) => request(`/admin/api-usage/prices/${id}`, { method: 'PUT', body: payload }),
  switchApiPlan: (payload) => request('/admin/api-usage/plans/switch', { method: 'POST', body: payload }),
  getApiPacks: () => request('/admin/api-usage/packs'),
  addApiPack: (payload) => request('/admin/api-usage/packs', { method: 'POST', body: payload }),
  markAdminAlertsRead: () => request('/admin/api-usage/alerts/read-all', { method: 'POST' }),
  updateAccountSettings: (payload) => request('/account/settings', { method: 'PATCH', body: payload }),

  // AI sales assistant (services/salesAssistant) — analyzes a saved note and
  // proposes CRM updates for a rep to accept/dismiss; never applies anything
  // by itself. See ProspectCard.jsx / AISuggestionsPanel.jsx.
  getAiAssistantStatus: () => request('/account/ai-assistant'),
  // Offline event box (see components/OfflineBoxStatus.jsx)
  getOfflineStatus: () => request('/offline/status'),
  getOfflineReviews: () => request('/offline/reviews'),
  resolveOfflineReview: (id, action) => request(`/offline/reviews/${id}/resolve`, { method: 'POST', body: { action } }),
  // The assistant fills the prospect's CRM record itself and answers with
  // { analysis (the AI note), values (the record after filling) }. The browser's
  // time zone lets it resolve "mardi à 14h" for a date+time field.
  analyzeGuestNote: (payload) => request('/account/ai-assistant/analyze', {
    method: 'POST',
    body: { ...payload, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  }),

  // Reward-win email customization (subject/body per redeem method + a
  // shared header logo). Uploading/deleting the logo isn't plain JSON, so
  // those two bypass the shared `request` helper.
  getEmailTemplates: () => request('/account/email-templates'),
  // payload: { templates, headerColor?, footerText? } — headerColor/footerText
  // are optional; omitting them leaves those fields untouched server-side.
  updateEmailTemplates: (payload) => request('/account/email-templates', { method: 'PATCH', body: payload }),
  uploadEmailLogo: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch(`${API_BASE}/account/email-logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  },
  deleteEmailLogo: () => request('/account/email-logo', { method: 'DELETE' }),
  // Returns an object URL for the account's current custom logo, or null if
  // none is set — caller is responsible for revoking it when done.
  getEmailLogoPreviewUrl: async () => {
    if (IS_DEMO) return null; // tutorial mode: no custom logo, nothing to fetch
    const token = getToken();
    const res = await fetch(`${API_BASE}/account/email-logo`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Guest-facing (public, unauthenticated — scanned via QR, no login).
  getGuestCampaign: (token) => request(`/guest/${token}/campaign`, { auth: false }),
  joinGuestQueue: (token, payload) =>
    request(`/guest/${token}/join`, { method: 'POST', body: payload, auth: false }),
  getGuestStatus: (token, sessionToken) =>
    request(`/guest/${token}/status?session=${encodeURIComponent(sessionToken)}`, { auth: false }),

  // Reward redemption — scanned via QR or reached via a manual code lookup
  // above. Both viewing and distributing require an operator to be signed
  // in (see routes/redeem.js) — RedeemPage.jsx redirects to /login first if not.
  getRedeemStatus: (code) => request(`/redeem/${encodeURIComponent(code)}`),
  distributeReward: (code) => request(`/redeem/${encodeURIComponent(code)}/distribute`, { method: 'POST' }),
  cancelReward: (code) => request(`/redeem/${encodeURIComponent(code)}/cancel`, { method: 'POST' }),
  undistributeReward: (code) => request(`/redeem/${encodeURIComponent(code)}/undo`, { method: 'POST' }),
};

export function connectWs() {
  if (IS_DEMO) return createDemoSocket();
  const token = getToken();
  return new WebSocket(`${WS_BASE}/ws?role=browser&token=${encodeURIComponent(token || '')}`);
}

export { getToken, API_BASE };