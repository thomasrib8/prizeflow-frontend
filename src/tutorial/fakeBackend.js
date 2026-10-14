// The in-browser "server" of tutorial mode. Answers the app's API calls from an in-memory store seeded with
// made-up data (fixtures.js); state changes (start a campaign, pause it...) really happen in that store, so the
// screens react exactly as they do for real. Reloaded = reset. An endpoint nobody has taught yet answers an
// empty object and says so in the console, so a new tutorial shows quickly what it still needs.
import { DEMO_PARAMS, DEMO_USER } from './demo';
import { makeCampaigns, makeSlots } from './fixtures';

const store = { campaigns: makeCampaigns(), settings: { language: DEMO_PARAMS.lang } };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));
const campaignById = (id) => store.campaigns.find((c) => c.id === id);
const fail = (message, status = 404) => { const e = new Error(message); e.status = status; throw e; };

function campaignDetail(c) {
  const slots = makeSlots(c.id, undefined, c.status === 'draft' ? 0 : c.status === 'active' ? 0.12 : 0.55);
  return { ...c, slots, sequence_length: slots.reduce((n, s) => n + s.stock_initial, 0), next_position: 0, segments: [] };
}

function settingsPayload() {
  return {
    googleReviewUrl: 'https://g.page/r/maison-dupont/review', facebookUrl: 'https://facebook.com/maisondupont', instagramUrl: 'https://instagram.com/maisondupont', linkedinUrl: '', xUrl: '',
    language: store.settings.language, aiAssistantMode: 'supervised', privacyPolicyUrl: 'https://maison-dupont.fr/confidentialite', retentionMonths: 12, marketingConsentEnabled: true,
    offlineAccessCodeSet: true, cloudLossAlertEnabled: true, cloudLossAlertCooldownMinutes: 30,
    linkedinSearch: { enabled: false, total: 0, used: 0, remaining: 0, level: 'empty' },
  };
}

const ROUTES = [
  ['GET', /^\/users\/pending-count$/, () => ({ count: 0 })],
  ['GET', /^\/offline\/status$/, () => ({ enabled: true, boxSeen: true, pendingReviews: 0, lastPollSecondsAgo: 2, eventsBehind: 0, inSync: true })],
  ['GET', /^\/offline\/reviews$/, () => []],
  ['GET', /^\/account\/settings$/, () => settingsPayload()],
  ['PATCH', /^\/account\/settings$/, (m, body) => { if (body && body.language) store.settings.language = body.language; return settingsPayload(); }],
  ['GET', /^\/spin\/status$/, () => ({ agentConnected: true, wheelStatus: { status: 'Free', currentPos: 3.2 }, diagnostics: { agent: { connectedSince: new Date(Date.now() - 600000).toISOString(), disconnectHistory: [] }, wheelLocal: { connected: true }, wifiSignal: { percent: 77, ssid: 'Wifi-Evenement' }, wheelIdentity: { modelNumber: 'PF-ALPHA-V1', serialNumber: 'PF260000152', securityKey: 'K8Q7F3' } } })],

  ['GET', /^\/campaigns$/, () => clone(store.campaigns)],
  ['GET', /^\/campaigns\/([^/]+)$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); return clone(campaignDetail(c)); }],
  ['POST', /^\/campaigns\/([^/]+)\/start$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); if (c.status === 'active') fail('Already active', 409); const other = store.campaigns.find((o) => o.status === 'active' && o.id !== c.id); if (other) fail(`Campaign ${other.id} is already active. End or pause it first.`, 409); c.status = 'active'; return { ok: true }; }],
  ['POST', /^\/campaigns\/([^/]+)\/pause$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); c.status = 'paused'; return { ok: true }; }],
  ['POST', /^\/campaigns\/([^/]+)\/end$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); c.status = 'completed'; return { ok: true }; }],
  ['POST', /^\/campaigns\/([^/]+)\/archive$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); c.status = 'archived'; return { ok: true }; }],
];

export async function demoRequest(rawPath, { method = 'GET', body } = {}) {
  const path = rawPath.split('?')[0];
  await delay(90);
  for (const [m, re, fn] of ROUTES) {
    if (m !== method) continue;
    const match = re.exec(path);
    if (match) return fn(match, body);
  }
  console.warn(`[tutorial] endpoint not taught yet: ${method} ${rawPath}`);
  return {};
}

export { DEMO_USER };
