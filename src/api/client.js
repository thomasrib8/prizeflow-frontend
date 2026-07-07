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
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (email, password, name) =>
    request('/auth/register', { method: 'POST', body: { email, password, name }, auth: false }),

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
  redeemReward: (id) => request(`/rewards/${id}/redeem`, { method: 'POST' }),

  listCampaigns: () => request('/campaigns'),
  getCampaign: (id) => request(`/campaigns/${id}`),
  getCampaignSequence: (id) => request(`/campaigns/${id}/sequence`),
  createCampaign: (payload) => request('/campaigns', { method: 'POST', body: payload }),
  duplicateCampaign: (id, name) => request(`/campaigns/${id}/duplicate`, { method: 'POST', body: { name } }),
  startCampaign: (id) => request(`/campaigns/${id}/start`, { method: 'POST' }),
  pauseCampaign: (id) => request(`/campaigns/${id}/pause`, { method: 'POST' }),
  endCampaign: (id) => request(`/campaigns/${id}/end`, { method: 'POST' }),
  archiveCampaign: (id) => request(`/campaigns/${id}/archive`, { method: 'POST' }),
  setCampaignGoogleReview: (id, required) =>
    request(`/campaigns/${id}/google-review`, { method: 'PATCH', body: { required } }),

  spinStatus: () => request('/spin/status'),
  wheelCommand: (command) => request('/spin/command', { method: 'POST', body: { command } }),
  spinDemo: (slotIndex) => request('/spin/demo', { method: 'POST', body: { slotIndex } }),

  // Staff-facing: the account's guest QR token + a live snapshot of the queue.
  getQrToken: () => request('/account/qr-token'),
  getGuestQueueSnapshot: () => request('/account/guest-queue'),
  getAccountSettings: () => request('/account/settings'),
  updateAccountSettings: (payload) => request('/account/settings', { method: 'PATCH', body: payload }),

  // Guest-facing (public, unauthenticated — scanned via QR, no login).
  getGuestCampaign: (token) => request(`/guest/${token}/campaign`, { auth: false }),
  joinGuestQueue: (token, payload) =>
    request(`/guest/${token}/join`, { method: 'POST', body: payload, auth: false }),
  getGuestStatus: (token, sessionToken) =>
    request(`/guest/${token}/status?session=${encodeURIComponent(sessionToken)}`, { auth: false }),
};

export function connectWs() {
  const token = getToken();
  return new WebSocket(`${WS_BASE}/ws?role=browser&token=${encodeURIComponent(token || '')}`);
}

export { getToken };