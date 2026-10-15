// The in-browser "server" of tutorial mode. Answers the app's API calls from an in-memory store seeded with
// made-up data (fixtures.js); state changes (start a campaign, pause it...) really happen in that store, so the
// screens react exactly as they do for real. Reloaded = reset. An endpoint nobody has taught yet answers an
// empty object and says so in the console, so a new tutorial shows quickly what it still needs.
import { DEMO_PARAMS, DEMO_USER } from './demo';
import { T } from './fixtures';
import { makeCampaignsForTutorial, makeSlots, makeCampaigns, GIFTS, STOCKS, TEMPLATE_NAME, SEGMENT_CATEGORIES, FIELDS, PLAYERS, QUEUE, COMPANY } from './fixtures';

const CAMPAIGN_NAME = makeCampaigns()[0].name;
const CLIENTS = [
  { id: 'usr_c1', name: 'Julie Perrin', email: 'julie@festival-nantes.fr', company: 'Festival Nantes', role: 'operator', status: 'approved', created_at: '2026-09-02 10:00:00' },
  { id: 'usr_c2', name: 'Marc Vidal', email: 'marc@salon-auto-lyon.fr', company: 'Salon Auto Lyon', role: 'operator', status: 'approved', created_at: '2026-09-20 14:00:00' },
  { id: 'usr_c3', name: 'Sonia Haddad', email: 'sonia@bio-expo.fr', company: 'Bio Expo', role: 'operator', status: 'approved', created_at: '2026-10-08 09:30:00' },
];
const store = { inspections: [], campaigns: makeCampaignsForTutorial(DEMO_PARAMS.tuto), settings: { language: DEMO_PARAMS.lang }, wheels: [
    { id: 'whl_1', serialNumber: 'PF260000152', modelNumber: 'PF-ALPHA-V1', securityKey: 'K8Q7F3', status: 'rented', ownerId: 'usr_c1', notes: '', assignedAt: '2026-10-10 09:00:00', lastSeenAt: '2026-10-14 17:42:00', history: [{ id: 1, owner_id: 'usr_c1', assigned_at: '2026-10-10 09:00:00', released_at: null }] },
    { id: 'whl_2', serialNumber: 'PF260000153', modelNumber: 'PF-ALPHA-V1', securityKey: 'X9M2P8', status: 'available', ownerId: null, notes: '', assignedAt: null, lastSeenAt: '2026-10-02 18:20:00', history: [{ id: 2, owner_id: 'usr_c2', assigned_at: '2026-09-25 09:00:00', released_at: '2026-10-02 18:30:00' }] },
    { id: 'whl_3', serialNumber: 'PF260000154', modelNumber: 'PF-ALPHA-V1', securityKey: 'Q4T7NB', status: 'maintenance', ownerId: null, notes: '', assignedAt: null, lastSeenAt: null, history: [] },
    { id: 'whl_4', serialNumber: 'PF260000155', modelNumber: 'PF-ALPHA-V1', securityKey: 'M3R8WD', status: 'available', ownerId: null, notes: '', assignedAt: null, lastSeenAt: null, history: [] },
  ],
  clients: CLIENTS.map((c) => ({ ...c })),
  flags: { guest: 'idle', queue: 'playing', joined: null, wheelLive: 'off', box: 'none' }, players: PLAYERS.map((p) => ({ ...p })),
  rewards: PLAYERS.map((p, i) => ({ id: p.rewardId, first_name: p.first_name, last_name: p.last_name, email: p.email, campaign_id: 'CAM-2026-0007', campaign_name: CAMPAIGN_NAME, segment: p.segment, note: p.note, email_status: 'valid', gift_on_hold: 0, gift_name: p.gift_name, status: i === 0 || i === 2 ? 'active' : i === 4 ? 'no_gift' : 'redeemed', created_at: `2026-10-12 1${i}:0${i}:00`, distributedBy: i > 2 || i === 1 ? 'Camille Martin' : null, launchedAt: `2026-10-12T1${i}:0${i}:00Z` })) };
// The tutorial steps drive the scene through this (e.g. "the guest is now at the wheel"): window.__demo.set('guest', 'active')
if (typeof window !== 'undefined') window.__demo = { set: (k, v) => { store.flags[k] = v; }, get: (k) => store.flags[k] };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));
const campaignById = (id) => store.campaigns.find((c) => c.id === id);
const fail = (message, status = 404) => { const e = new Error(message); e.status = status; throw e; };

function campaignDetail(c) {
  if (c._slots) return { ...c, slots: c._slots, sequence_length: c._slots.reduce((n, x) => n + x.stock_initial, 0), next_position: 0, segments: [], segmentCategories: c._segments && c._segments.length ? c._segments : SEGMENT_CATEGORIES, fields: FIELDS };
  const slots = makeSlots(c.id, undefined, c.status === 'draft' ? 0 : c.status === 'active' ? 0.12 : 0.55);
  return { ...c, slots, sequence_length: slots.reduce((n, s) => n + s.stock_initial, 0), next_position: 0, segments: [], segmentCategories: SEGMENT_CATEGORIES, fields: FIELDS };
}

function settingsPayload() {
  return {
    googleReviewUrl: 'https://g.page/r/maison-dupont/review', facebookUrl: 'https://facebook.com/maisondupont', instagramUrl: 'https://instagram.com/maisondupont', linkedinUrl: '', xUrl: '',
    language: store.settings.language, aiAssistantMode: 'supervised', privacyPolicyUrl: 'https://maison-dupont.fr/confidentialite', retentionMonths: 12, marketingConsentEnabled: true,
    offlineAccessCodeSet: true, cloudLossAlertEnabled: true, cloudLossAlertCooldownMinutes: 30,
    linkedinSearch: { enabled: false, total: 0, used: 0, remaining: 0, level: 'empty' },
  };
}

function presentWheel(w) {
  const owner = w.ownerId ? store.clients.find((x) => x.id === w.ownerId) : null;
  const activated = !!owner && store.flags.box === 'activated' && w.id === 'whl_1' ? true : !!owner && w.id === 'whl_1';
  return { id: w.id, serialNumber: w.serialNumber, modelNumber: w.modelNumber, securityKey: w.securityKey, status: w.status, notes: w.notes, createdAt: '2026-09-01 08:00:00', assignedAt: w.assignedAt, lastSeenAt: w.lastSeenAt,
    connected: w.id === 'whl_1' && !!owner, owner: owner ? { id: owner.id, name: owner.name, email: owner.email, company: owner.company } : null,
    box: { name: `spark-box-${w.serialNumber.slice(-6)}`, activated, lastPollAt: null, seen: activated },
    boxReset: w.boxResetPending ? { state: 'pending', createdAt: '2026-10-15 10:05:00', confirmedAt: null } : null };
}

const ROUTES = [
  ['GET', /^\/users\/pending-count$/, () => ({ count: 0 })],
  ['GET', /^\/offline\/status$/, () => ({ enabled: true, boxSeen: true, pendingReviews: 0, lastPollSecondsAgo: 2, eventsBehind: 0, inSync: true })],
  ['GET', /^\/offline\/reviews$/, () => []],
  ['GET', /^\/account\/settings$/, () => settingsPayload()],
  ['PATCH', /^\/account\/settings$/, (m, body) => { if (body && body.language) store.settings.language = body.language; return settingsPayload(); }],
  ['GET', /^\/spin\/status$/, () => ({ agentConnected: true, wheelStatus: { status: 'Free', currentPos: 3.2 }, diagnostics: { agent: { connectedSince: new Date(Date.now() - 600000).toISOString(), disconnectHistory: [] }, wheelLocal: { connected: true }, wifiSignal: { percent: 77, ssid: 'Wifi-Evenement' }, wheelIdentity: { modelNumber: 'PF-ALPHA-V1', serialNumber: 'PF260000152', securityKey: 'K8Q7F3' } } })],

  ['GET', /^\/campaign-templates$/, () => [{ id: 'tpl_demo', name: TEMPLATE_NAME, slotCount: GIFTS.length }]],
  ['GET', /^\/campaign-templates\/([^/]+)$/, () => ({ id: 'tpl_demo', name: TEMPLATE_NAME, slots: GIFTS.map((g, i) => ({ slotIndex: i, giftName: g })) })],
  ['POST', /^\/campaigns$/, (m, body) => {
    const id = `CAM-2026-00${8 + store.campaigns.filter((c) => c._created).length}`;
    const slots = (body.slots || []).map((s, i) => ({ id: i + 1, campaign_id: id, slot_index: s.slotIndex, gift_name: s.giftName, stock_initial: s.stock, stock_remaining: s.stock, redeem_method: s.redeemMethod || 'qr', perso_delivery: null, perso_subject: null, perso_body: null, perso_auto_distribute: 0 }));
    const total = slots.reduce((n, x) => n + x.stock_initial, 0);
    store.campaigns.unshift({ ...makeCampaigns()[0], id, name: body.name, event_name: body.eventName || '', description: body.description || '', status: 'draft', total_stock: total, total_distributed: 0, public_token: `demo-new-${id}`, created_at: '2026-10-15 09:00:00', _created: true, _slots: slots, _segments: body.segmentCategories || [] });
    return { id };
  }],
  ['GET', /^\/campaigns$/, () => clone(store.campaigns)],
  ['GET', /^\/campaigns\/([^/]+)$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); return clone(campaignDetail(c)); }],
  ['POST', /^\/campaigns\/([^/]+)\/start$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); if (c.status === 'active') fail('Already active', 409); const other = store.campaigns.find((o) => o.status === 'active' && o.id !== c.id); if (other) fail(`Campaign ${other.id} is already active. End or pause it first.`, 409); c.status = 'active'; return { ok: true }; }],
  ['POST', /^\/campaigns\/([^/]+)\/pause$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); c.status = 'paused'; return { ok: true }; }],
  ['POST', /^\/campaigns\/([^/]+)\/end$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); c.status = 'completed'; return { ok: true }; }],
  ['POST', /^\/campaigns\/([^/]+)\/archive$/, (m) => { const c = campaignById(m[1]); if (!c) fail('Campaign not found'); c.status = 'archived'; return { ok: true }; }],

  ['GET', /^\/account\/linkedin\/status$/, () => ({ available: true, enabled: true, credits: { total: 50, used: 6, remaining: 44, level: 'ok' } })],
  // ---- Launch / live event ----
  ['GET', /^\/account\/badge-scan$/, () => ({ enabled: true })],
  ['GET', /^\/account\/guest-queue$/, () => {
    if (store.flags.queue !== 'playing') return { active: null, waiting: [], recentCompleted: clone(QUEUE.recentCompleted) };
    return clone({ ...QUEUE, active: { ...QUEUE.active, launched: store.flags.launched === true } });
  }],
  ['POST', /^\/account\/guest-queue\/(skip|cancel)$/, () => { store.flags.queue = 'idle'; return { ok: true }; }],
  ['GET', /^\/account\/recent-players$/, () => clone(store.players)],
  // ---- What the guest sees (public routes) ----
  ['GET', /^\/guest\/([^/]+)\/campaign$/, () => ({
    active: true, name: store.campaigns.find((c) => c.status === 'active')?.name || store.campaigns[0].name, isTest: false, googleReviewRequired: false, googleReviewPosition: 'after', socialMediaRequired: false,
    language: DEMO_PARAMS.lang, googleReviewUrl: '', privacyPolicyUrl: 'https://maison-dupont.fr/confidentialite', marketingConsentEnabled: true, companyName: COMPANY, guestFormLogoUrl: null, socialLinks: {},
    guestFields: clone(FIELDS.filter((f) => f.scope === 'guest')),
  })],
  ['POST', /^\/guest\/([^/]+)\/join$/, (m, body) => { store.flags.joined = { firstName: body.firstName || 'Camille' }; store.flags.guest = 'waiting2'; return { sessionToken: 'demo-session' }; }],
  ['GET', /^\/guest\/([^/]+)\/status$/, () => {
    const g = store.flags.guest; const name = (store.flags.joined && store.flags.joined.firstName) || 'Camille';
    if (g === 'waiting2') return { found: true, status: 'waiting', firstName: name, position: 2, activeFirstName: 'Léa', launched: false, retryMessage: null, result: null };
    if (g === 'waiting0') return { found: true, status: 'waiting', firstName: name, position: 0, activeFirstName: 'Léa', launched: false, retryMessage: null, result: null };
    if (g === 'active') return { found: true, status: 'active', firstName: name, position: null, activeFirstName: name, launched: false, retryMessage: null, result: null };
    if (g === 'spinning') return { found: true, status: 'active', firstName: name, position: null, activeFirstName: name, launched: true, retryMessage: null, result: null };
    if (g === 'done') return { found: true, status: 'done', firstName: name, position: null, activeFirstName: null, launched: true, retryMessage: null, result: { isTest: false, giftName: GIFTS[2] } };
    return { found: false };
  }],

  // ---- Redeeming gifts (Retrait) ----
  ['GET', /^\/rewards$/, () => clone(store.rewards.map((r) => ({ ...r, segment: (store.players.find((p) => p.rewardId === r.id) || {}).segment || '', note: (store.players.find((p) => p.rewardId === r.id) || {}).note || '' })))],
  ['GET', /^\/distributions$/, () => []],
  ['GET', /^\/rewards\/code\/([^/]+)\/redeem-code$/, () => ({ code: `signed-${store.rewards[0].id}` })],
  ['GET', /^\/rewards\/([^/]+)\/redeem-code$/, (m) => ({ code: `signed-${m[1]}` })],
  ['GET', /^\/redeem\/signed-([^/]+)$/, (m) => { const r = store.rewards.find((x) => x.id === m[1]); if (!r) fail('Reward not found'); return { status: r.status, giftName: r.gift_name, firstName: r.first_name, lastName: r.last_name, launchedAt: r.launchedAt, distributedBy: r.distributedBy, distributedAt: r.distributedBy ? '2026-10-12T15:20:00Z' : null }; }],
  ['POST', /^\/redeem\/signed-([^/]+)\/distribute$/, (m) => { const r = store.rewards.find((x) => x.id === m[1]); r.status = 'redeemed'; r.distributedBy = DEMO_USER.name; return { distributedBy: DEMO_USER.name }; }],
  ['POST', /^\/redeem\/signed-([^/]+)\/undo$/, (m) => { const r = store.rewards.find((x) => x.id === m[1]); r.status = 'active'; r.distributedBy = null; return { ok: true }; }],
  ['POST', /^\/redeem\/signed-([^/]+)\/cancel$/, (m) => { const r = store.rewards.find((x) => x.id === m[1]); r.status = 'cancelled'; return { ok: true }; }],

  // ---- Prospect card (CRM, Launch, PWA) ----
  ['GET', /^\/account\/guest-notes$/, (m, b, q) => {
    const email = q.get('email'); const p = store.players.find((x) => x.email === email) || store.players[0];
    const cat = SEGMENT_CATEGORIES[0].name;
    return { note: p.note || '', leadRating: p.lead_rating || null, segments: p.segment ? { [cat]: p.segment } : {}, tags: p.tags || '', customFields: p.customFields || {},
      guestAnswers: { [FIELDS[2].label]: FIELDS[2].options[0] }, phone: '06 12 34 56 78', emailVerification: { status: 'valid', score: 96 }, emailEnrichment: null, pendingGift: null,
      consent: { attestedBy: null, attestedAt: '2026-10-12 10:04:00' }, linkedin: null, aiSuggestions: p.aiSuggestions || null, aiAnalyzedNote: p.aiAnalyzedNote ?? null };
  }],
  ['PATCH', /^\/account\/guest-notes$/, (m, body) => {
    const p = store.players.find((x) => x.email === body.email); if (p) { p.note = body.note; p.lead_rating = body.leadRating; p.tags = body.tags; p.customFields = body.customFields; const v = Object.values(body.segments || {})[0]; if (v) p.segment = v; }
    return { ok: true };
  }],
  ['POST', /^\/account\/ai-assistant\/analyze$/, (m, body) => {
    const p = store.players.find((x) => x.email === body.email) || store.players[0];
    const analysis = { reworkedNote: T('Souhaite refaire sa cuisine ; veut être rappelé après le salon.', 'Wants a new kitchen; wants a call after the show.', 'Quiere una cocina nueva; quiere una llamada después de la feria.', 'Möchte eine neue Küche; möchte nach der Messe angerufen werden.'),
      unmappedInfo: [], toCheck: [], nextActions: [
        { title: T('Envoyer un devis cuisine', 'Send a kitchen quote', 'Enviar un presupuesto de cocina', 'Küchenangebot senden'), description: T('Sous 48 h, avec les deux gammes évoquées.', 'Within 48 h, with the two ranges discussed.', 'En 48 h, con las dos gamas mencionadas.', 'Innerhalb von 48 Std., mit den beiden besprochenen Reihen.') },
        { title: T('Proposer un rendez-vous en magasin', 'Offer an in-store appointment', 'Proponer una cita en tienda', 'Termin im Geschäft vorschlagen'), description: T('Idéalement le samedi matin.', 'Ideally Saturday morning.', 'Idealmente el sábado por la mañana.', 'Am besten Samstagvormittag.') },
      ] };
    const values = { segments: { [SEGMENT_CATEGORIES[0].name]: SEGMENT_CATEGORIES[0].options[1].label }, customFields: { [FIELDS[0].label]: T('Cuisine neuve en mars', 'New kitchen in March', 'Cocina nueva en marzo', 'Neue Küche im März') }, leadRating: 3, tags: T('cuisine, rappel', 'kitchen, callback', 'cocina, llamada', 'Küche, Rückruf') };
    p.aiSuggestions = analysis; p.aiAnalyzedNote = (p.note || '').trim(); p.lead_rating = 3; p.segment = values.segments[SEGMENT_CATEGORIES[0].name];
    return { analysis, values };
  }],
  ['GET', /^\/account\/prospect-history$/, () => ({ events: [
    { type: 'played', at: '2026-10-12T10:05:00Z', detail: { gift: GIFTS[2] } }, { type: 'gift_email_sent', at: '2026-10-12T10:05:30Z', detail: { gift: GIFTS[2] } },
    { type: 'consent', at: '2026-10-12T10:04:00Z', detail: {} }, { type: 'created', at: '2026-10-12T10:03:00Z', detail: { manual: false } } ] })],
  ['GET', /^\/account\/prospect-campaigns$/, () => ({ campaigns: [] })],
  ['GET', /^\/account\/prospect-notes$/, () => ({ notes: [] })],
  ['POST', /^\/account\/prospect-notes$/, (m, body) => ({ note: { id: 1, body: body.body, createdAt: new Date().toISOString(), authorName: DEMO_USER.name } })],

  // ---- Settings ----
  ['GET', /^\/account\/profile$/, () => ({ user: { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name, first_name: 'Camille', last_name: 'Martin', address: '12 rue des Lilas, 69003 Lyon', company: COMPANY, phone: '04 78 12 34 56', industry_sector: T('Équipement de la maison', 'Home furnishing', 'Equipamiento del hogar', 'Wohnausstattung'), role: DEMO_USER.role } })],
  ['GET', /^\/account\/mfa$/, () => ({ enabled: false, recoveryCodesLeft: 0 })],
  ['GET', /^\/account\/ai-assistant$/, () => ({ configured: true })],
  ['GET', /^\/account\/offline-access-code$/, () => ({ code: '48213', set: true })],
  ['GET', /^\/account\/email-templates$/, () => ({
    templates: { qr: { subject: '', bodyText: '' }, code: { subject: '', bodyText: '' }, voucher: { subject: '', bodyText: '' }, perso: { subject: '', bodyText: '' } },
    defaultSubject: T('Votre cadeau vous attend : {{giftName}}', 'Your gift is waiting: {{giftName}}', 'Su regalo le espera: {{giftName}}', 'Ihr Geschenk wartet: {{giftName}}'),
    defaultBodyText: T('Bonjour {{firstName}}, félicitations ! Présentez ce QR code au stand pour récupérer votre cadeau.', 'Hello {{firstName}}, congratulations! Show this QR code at the booth to collect your gift.', 'Hola {{firstName}}, ¡felicidades! Muestre este código QR en el stand para recoger su regalo.', 'Hallo {{firstName}}, herzlichen Glückwunsch! Zeigen Sie diesen QR-Code am Stand, um Ihr Geschenk abzuholen.'),
    hasCustomLogo: false, guestFormLogoEnabled: false, headerColor: '', footerText: '', logoSize: null, defaultHeaderColor: '#09B2FD', defaultFooterText: COMPANY, defaultLogoSize: 120, minLogoSize: 40, maxLogoSize: 220,
  })],

  // ---- Dashboard ----
  ['GET', /^\/dashboard$/, (m, b, q) => {
    const id = q.get('campaignId'); const scoped = id && id !== 'all';
    const c = scoped ? campaignById(id) : store.campaigns.find((x) => x.status === 'active') || null;
    if (scoped && !c) fail('Campaign not found');
    const slots = c ? makeSlots(c.id, undefined, c.status === 'completed' || c.status === 'archived' ? 0.9 : 0.12) : [];
    const planned = slots.reduce((n, x) => n + x.stock_initial, 0); const remaining = slots.reduce((n, x) => n + x.stock_remaining, 0);
    const distributed = planned - remaining;
    const sent = c ? Math.min(distributed, 218) : 0;
    return { kpi: c ? { campaign: { ...c, slots, total_stock: planned, total_distributed: distributed }, planned, distributed, remaining, progressPct: planned ? Math.round(distributed / planned * 100) : 0 } : null,
      rewards: { sent, used: Math.round(sent * 0.6), expired: 2, recoveryRatePct: 60 },
      leads: { captured: sent, qualified: Math.round(sent * 0.45), segmented: Math.round(sent * 0.75), segmentBreakdown: SEGMENT_CATEGORIES[0].options.map((o, i) => ({ segment: o.label, count: [58, 71, 35][i] })) },
      recentActivity: store.players.slice(0, 6).map((p, i) => ({ gift_name: p.gift_name, slot_index: i, created_at: `2026-10-12 1${5 - i}:2${i}:00`, room_number: null })) };
  }],
  ['GET', /^\/dashboard\/chart$/, () => [0, 1, 2, 3, 4, 5, 6].map((i) => ({ date: `${6 + i}/10`, planned: 1300, distributed: [0, 12, 40, 75, 120, 170, 218][i], remaining: 1300 - [0, 12, 40, 75, 120, 170, 218][i] }))],
  ['GET', /^\/dashboard\/top-rewards$/, () => makeSlots('x', undefined, 0.12).slice(0, 6).map((s) => ({ slotIndex: s.slot_index, giftName: s.gift_name, planned: s.stock_initial, distributed: s.stock_initial - s.stock_remaining, remaining: s.stock_remaining, pct: Math.round((s.stock_initial - s.stock_remaining) / s.stock_initial * 100) }))],

  // ---- Adding / enriching a contact ----
  ['POST', /^\/account\/prospects\/scan$/, () => ({ documentType: 'badge', fields: { firstName: 'Nadia', lastName: 'Benali', email: '', company: 'Cuisines Benali', jobTitle: T('Directrice', 'Director', 'Directora', 'Geschäftsführerin'), phone: '06 55 44 33 22' }, customFields: {}, confidence: { firstName: 'high', lastName: 'high', email: 'none', company: 'high' } })],
  ['POST', /^\/account\/prospects\/find-email$/, () => ({ found: true, email: 'nadia.benali@cuisines-benali.fr', score: 92 })],
  ['POST', /^\/account\/prospects$/, (m, body) => {
    const email = (body.email || '').toLowerCase();
    store.players.unshift({ rewardId: `REWARD-0063`, email, first_name: body.firstName, last_name: body.lastName, gift_name: '', segment: '', lead_rating: null, note: body.note || '', outcome: 'manual', minutesAgo: 0 });
    return { email, queued: false, emailMissing: !email, prospectId: 'p_demo', emailEnrichment: null };
  }],
  ['POST', /^\/account\/linkedin\/search$/, () => ({ status: 'found', operationId: 'op_demo', candidate: { name: 'Nadia Benali', title: T('Directrice', 'Director', 'Directora', 'Geschäftsführerin'), company: 'Cuisines Benali', url: 'https://www.linkedin.com/in/nadia-benali', uncertain: false }, balance: { total: 50, used: 7, remaining: 43, level: 'ok' } })],
  ['POST', /^\/account\/linkedin\/searches\/([^/]+)\/decision$/, () => ({ attached: false })],

  // ---- Admin: wheel park, clients, commissioning ----
  ['GET', /^\/users$/, () => clone([{ id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email, company: COMPANY, role: 'admin', status: 'approved', created_at: '2026-06-01 08:00:00' }, ...store.clients])],
  ['GET', /^\/users\/pending-count$/, () => ({ count: 0 })],
  ['GET', /^\/users\/wheel-identities$/, () => []],
  ['GET', /^\/users\/([^/]+)$/, (m) => { const c = store.clients.find((x) => x.id === m[1]); if (!c) fail('User not found'); const w = store.wheels.find((x) => x.ownerId === c.id); return { ...clone(c), first_name: '', last_name: '', address: '', phone: '', industry_sector: '', agent_token: 'wheeltoken_demo_0123456789', wheel_model_number: w ? w.modelNumber : null, wheel_serial_number: w ? w.serialNumber : null, wheel_security_key: w ? w.securityKey : null, wheel_identity_generated_at: null, wheel_first_connected_at: null }; }],
  ['GET', /^\/users\/([^/]+)\/overview$/, (m) => { const w = store.wheels.find((x) => x.ownerId === m[1]); const live = store.flags.wheelLive === 'on' && w; return { campaigns: [], wheel: { connected: !!live, identity: live ? { modelNumber: w.modelNumber, serialNumber: w.serialNumber, securityKey: w.securityKey } : null, diagnostics: null } }; }],
  ['GET', /^\/users\/([^/]+)\/(activity|notes)$/, () => []],
  ['GET', /^\/wheels$/, () => clone(store.wheels.map(presentWheel))],
  ['POST', /^\/wheels$/, (m, body) => { const w = { id: `whl_${store.wheels.length + 1}`, serialNumber: body.serialNumber || `PF260000${160 + store.wheels.length}`, modelNumber: body.modelNumber || `PF-ALPHA-V${body.series || 1}`, securityKey: body.securityKey || 'R5T9KC', status: 'available', ownerId: null, notes: body.notes || '', assignedAt: null, lastSeenAt: null, history: [] }; store.wheels.push(w); return presentWheel(w); }],
  ['GET', /^\/wheels\/inspections/, () => clone(store.inspections)],
  ['GET', /^\/wheels\/([^/]+)$/, (m) => { const w = store.wheels.find((x) => x.id === m[1]); if (!w) fail('Wheel not found'); return clone({ ...presentWheel(w), history: w.history.map((h) => { const c = store.clients.find((x) => x.id === h.owner_id) || {}; return { ...h, name: c.name, email: c.email, company: c.company }; }).reverse(), inspections: store.inspections.filter((i) => i.wheelId === w.id) }); }],
  ['PATCH', /^\/wheels\/([^/]+)$/, (m, body) => { const w = store.wheels.find((x) => x.id === m[1]); if (body.notes !== undefined) w.notes = body.notes; if (body.status) w.status = body.status; return clone(presentWheel(w)); }],
  ['POST', /^\/wheels\/([^/]+)\/assign$/, (m, body) => { const w = store.wheels.find((x) => x.id === m[1]); const prev = store.wheels.find((x) => x.ownerId === body.userId); if (prev) { prev.ownerId = null; prev.status = 'available'; } if (w.ownerId) { const h = w.history.find((x) => !x.released_at); if (h) h.released_at = '2026-10-15 10:00:00'; } w.ownerId = body.userId; w.status = 'rented'; w.assignedAt = '2026-10-15 10:00:00'; w.history.push({ id: Date.now(), owner_id: body.userId, assigned_at: w.assignedAt, released_at: null }); return clone(presentWheel(w)); }],
  ['POST', /^\/wheels\/([^/]+)\/(end-rental|release)$/, (m, body) => { const w = store.wheels.find((x) => x.id === m[1]); const insp = body && body.inspection; const bad = insp && (insp.visualRating <= 1 || insp.hardwareOk === false || insp.packComplete === false); if (insp) store.inspections.unshift({ id: `insp_${store.inspections.length + 1}`, wheelId: w.id, serialNumber: w.serialNumber, createdAt: '2026-10-15 10:05:00', owner: { id: w.ownerId }, inspector: 'Camille Martin', visualRating: insp.visualRating, visualComment: insp.visualComment || '', hardwareOk: insp.hardwareOk, packComplete: insp.packComplete, packComment: insp.packComment || '', photos: [] }); const h = w.history.find((x) => !x.released_at); if (h) { h.released_at = '2026-10-15 10:05:00'; } w.boxResetPending = !!w.ownerId; w.ownerId = null; w.status = bad ? 'maintenance' : 'available'; w.assignedAt = null; return { ...clone(presentWheel(w)), maintenance: !!bad }; }],
  ['GET', /^\/box-activation\/([^/]+)\/wifi$/, () => ({ password: store.flags.wifiPassword || null })],
  ['PUT', /^\/box-activation\/([^/]+)\/wifi$/, (m, body) => { store.flags.wifiPassword = body.password; return { ok: true, boxAlreadyActivated: false }; }],
  ['GET', /^\/box-activation\/([^/]+)\/wheel-script$/, (m) => { const w = store.wheels.find((x) => x.ownerId === m[1]); return { boxName: `spark-box-${(w ? w.serialNumber : 'PF260000152').slice(-6)}`, script: '# SPARK — configuration de la roue\nset +o history\nENVF=/home/pi/wheel-agent/.env\n…' }; }],
  ['POST', /^\/box-activation\/prepare$/, (m, body) => { store.flags.box = 'pending'; const w = store.wheels.find((x) => x.ownerId === body.userId); return { code: 'K7QM2-X9TRB', boxName: `spark-box-${(w ? w.serialNumber : 'PF260000152').slice(-6)}`, expiresAt: '2026-10-16 10:00:00', fallbackLine: '' }; }],
  ['GET', /^\/box-activation\/([^/]+)$/, (m) => { const w = store.wheels.find((x) => x.ownerId === m[1]); const st = store.flags.box; const name = `spark-box-${(w ? w.serialNumber : 'PF260000152').slice(-6)}`; return { state: st === 'none' ? 'none' : st === 'pending' ? 'pending' : st === 'delivered' ? 'delivered' : 'activated', boxName: name, expiresAt: '2026-10-16 10:00:00', createdAt: '2026-10-15 10:00:00', deliveredAt: null, activatedAt: st === 'activated' ? '2026-10-15 10:20:00' : null, fallbackLine: null, hasSerial: !!w, wifiSet: !!store.flags.wifiPassword, box: { seen: st === 'activated', lastPollAt: null, ageSeconds: 2, inSync: st === 'activated' } }; }],
];

export async function demoRequest(rawPath, { method = 'GET', body } = {}) {
  const path = rawPath.split('?')[0];
  const query = new URLSearchParams(rawPath.includes('?') ? rawPath.split('?')[1] : '');
  await delay(90);
  for (const [m, re, fn] of ROUTES) {
    if (m !== method) continue;
    const match = re.exec(path);
    if (match) return fn(match, body, query);
  }
  console.warn(`[tutorial] endpoint not taught yet: ${method} ${rawPath}`);
  return {};
}

export { DEMO_USER };
