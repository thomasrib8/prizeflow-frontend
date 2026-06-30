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
  createCampaign: (payload) => request('/campaigns', { method: 'POST', body: payload }),
  duplicateCampaign: (id, name) => request(`/campaigns/${id}/duplicate`, { method: 'POST', body: { name } }),
  startCampaign: (id) => request(`/campaigns/${id}/start`, { method: 'POST' }),
  pauseCampaign: (id) => request(`/campaigns/${id}/pause`, { method: 'POST' }),
  endCampaign: (id) => request(`/campaigns/${id}/end`, { method: 'POST' }),
  archiveCampaign: (id) => request(`/campaigns/${id}/archive`, { method: 'POST' }),

  spinStatus: () => request('/spin/status'),
  wheelCommand: (command) => request('/spin/command', { method: 'POST', body: { command } }),
  spinCampaign: (roomNumber) => request('/spin/campaign', { method: 'POST', body: { roomNumber } }),
  spinDemo: (slotIndex) => request('/spin/demo', { method: 'POST', body: { slotIndex } }),
  submitReward: (distributionId, payload) =>
    request(`/spin/distributions/${distributionId}/reward`, { method: 'POST', body: payload }),
};

export function connectWs() {
  const token = getToken();
  return new WebSocket(`${WS_BASE}/ws?role=browser&token=${encodeURIComponent(token || '')}`);
}

export { getToken };
