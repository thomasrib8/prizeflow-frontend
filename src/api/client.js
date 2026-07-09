const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || API_BASE.replace(/^http/, 'ws');

function getToken() {
  return localStorage.getItem('prizeflow_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
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
    localStorage.removeItem('prizeflow_token');
    localStorage.removeItem('prizeflow_user');
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
    return new Promise(() => {}); // navigation is already underway
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

// Authenticated file download — browsers won't attach the Bearer token to a
// plain navigation/<a href>, so this fetches the file as a blob (with the
// header attached) and triggers the save via a throwaway object URL instead.
async function downloadFile(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token, password) =>
    request('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false }),

  // Self-service profile — all registration fields, email, and/or password
  // (password change requires currentPassword).
  getProfile: () => request('/account/profile'),
  updateProfile: (payload) => request('/account/profile', { method: 'PATCH', body: payload }),
  requestAccountDeletion: () => request('/account/request-deletion', { method: 'POST' }),

  // Admin-only account management.
  listUsers: () => request('/users'),
  getUsersPendingCount: () => request('/users/pending-count'),
  getWheelIdentities: () => request('/users/wheel-identities'),
  generateWheelIdentity: (id, series) => request(`/users/${id}/wheel-identity`, { method: 'POST', body: { series } }),
  recordWheelIdentity: (id, modelNumber, serialNumber, securityKey) =>
    request(`/users/${id}/wheel-identity`, { method: 'POST', body: { modelNumber, serialNumber, securityKey } }),
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
  getEmailStatus: () => request('/admin/email-status'),
  getEmailLog: (limit = 30) => request(`/admin/email-log?limit=${limit}`),

  dashboard: () => request('/dashboard'),
  dashboardChart: (days = '7') => request(`/dashboard/chart?days=${days}`),
  dashboardTopRewards: () => request('/dashboard/top-rewards'),
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
  exportRewardsPdf: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/rewards/report.pdf${qs ? `?${qs}` : ''}`);
  },
  downloadCampaignReport: (id) => downloadFile(`/campaigns/${id}/report.pdf`),
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
  startCampaign: (id) => request(`/campaigns/${id}/start`, { method: 'POST' }),
  pauseCampaign: (id) => request(`/campaigns/${id}/pause`, { method: 'POST' }),
  endCampaign: (id) => request(`/campaigns/${id}/end`, { method: 'POST' }),
  archiveCampaign: (id) => request(`/campaigns/${id}/archive`, { method: 'POST' }),
  setCampaignGoogleReview: (id, required) =>
    request(`/campaigns/${id}/google-review`, { method: 'PATCH', body: { required } }),

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
  createAdminSequence: (name, steps) => request('/admin-sequences', { method: 'POST', body: { name, steps } }),
  deleteAdminSequence: (id) => request(`/admin-sequences/${id}`, { method: 'DELETE' }),
  activateAdminSequence: (id) => request(`/admin-sequences/${id}/activate`, { method: 'POST' }),
  stopAdminSequence: () => request('/admin-sequences/stop', { method: 'POST' }),
  getAdminSequenceStatus: () => request('/admin-sequences/status'),

  // Staff-facing: live snapshot of one campaign's guest queue. The QR itself
  // is built from that campaign's own public_token (see listCampaigns/getCampaign).
  getGuestQueueSnapshot: (campaignId) => request(`/account/guest-queue?campaignId=${encodeURIComponent(campaignId)}`),
  getAccountSettings: () => request('/account/settings'),
  updateAccountSettings: (payload) => request('/account/settings', { method: 'PATCH', body: payload }),

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
  const token = getToken();
  return new WebSocket(`${WS_BASE}/ws?role=browser&token=${encodeURIComponent(token || '')}`);
}

export { getToken };