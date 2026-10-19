// Made-up answers of the admin control center screens, for the tutorials (see fakeBackend.js). Fictive companies and figures only.
const days = Array.from({ length: 19 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
const points = days.map((d, i) => {
  const rent = [4, 15].includes(i + 1) ? 90000 : 0; const reseller_rent = [4, 15].includes(i + 1) ? 40000 : 0;
  const short = [6, 12, 17].includes(i + 1) ? 35000 : 0; const activation = [9, 16].includes(i + 1) ? 6000 : 0;
  return { bucket: d, rent, short, reseller_rent, activation, total: rent + short + reseller_rent + activation, api: 400 + (i % 5) * 120 };
});
const figures = (k) => ({
  recognized: Math.round(684000 * k), bySource: { rent: Math.round(180000 * k), short: Math.round(105000 * k), reseller_rent: Math.round(80000 * k), activation: Math.round(12000 * k) }, activationsCount: 2, activationsCents: 12000, avgPerShortRental: 35000,
  rentals: Math.round(34 * k), activeRentals: 5, upcomingRentals: 3, clientsActive: 14, resellers: 2, underResellers: 5, newClients: 3,
  park: { total: 12, rented: 5, available: 5, maintenance: 1, atResellers: 3, rentedDays: Math.round(231 * k), availableDays: 372, realDays: 152, utilization: Math.round(62 * k * 10) / 10, realUtilization: 41, avgDaysPerWheel: 19.3 },
  apiCents: Math.round(15200 * k), apiMissing: 0, apiCalls: 1240, apiRatio: 2.2, contribution: Math.round(668800 * k), apiPerRental: 450,
});
export const demoDashboard = () => ({
  period: { from: '2026-10-01', to: '2026-10-19', days: 19 }, compare: { from: '2026-09-01', to: '2026-09-19', days: 19 }, filters: { model: null, reseller: null },
  current: figures(1), previous: figures(0.85), forecastCents: 213000, mrrCents: 300000, mrrPreviousCents: 260000,
  parkProfit: { initialCostCents: 1140000, withoutCost: 1, coveredWheels: 3, wheelsWithCost: 11, coveragePct: 21.4 },
  series: { granularity: 'day', points },
  rankings: {
    clients: [['usr_c1', 'Maison Dupont', 180000], ['usr_c2', 'Festival Nantes', 90000], ['usr_c3', 'Salon Auto Lyon', 60000]].map(([id, label, cents]) => ({ id, label, cents })),
    resellers: [['usr_r1', 'Événements Plus', 174000], ['usr_r2', 'Fête & Co', 98000]].map(([id, label, cents]) => ({ id, label, cents })),
    wheels: [['whl_1', 'PF260000152', 291000], ['whl_5', 'PF260000158', 196000], ['whl_3', 'PF260000154', 112000]].map(([id, label, cents]) => ({ id, label, cents })),
  },
  toComplete: [{ kind: 'noTerms', id: 'usr_c3', label: 'Bio Expo' }, { kind: 'noLotCost', id: 'whl_4', label: 'PF260000155' }],
  reliability: { recognized: 'real', forecast: 'computed', mrr: 'computed', api: 'estimated', contribution: 'computed', utilization: 'computed', realUtilization: 'computed' },
});

export const demoContract = (userId, store) => {
  const c = store.clients.find((x) => x.id === userId) || {};
  const terms = store.terms[userId] || null;
  const entries = terms ? [
    { id: 3, source: 'rent', status: 'recognized', recognized_on: '2026-10-10', amount_cents: terms.rent_cents, period_no: 2, clientName: c.company },
    { id: 2, source: 'rent', status: 'recognized', recognized_on: '2026-09-10', amount_cents: terms.rent_cents, period_no: 1, clientName: c.company },
    { id: 4, source: 'rent', status: 'forecast', recognized_on: '2026-11-10', amount_cents: terms.rent_cents, period_no: 3, clientName: c.company },
  ] : [];
  return {
    user: { id: userId, name: c.company || c.name }, inForce: terms, parent: null, history: terms ? [terms] : [], holdings: [], subClients: [], planned: [],
    entries, totals: { recognizedCents: terms ? terms.rent_cents * 2 : 0, forecastCents: terms ? terms.rent_cents : 0 },
  };
};

const overview = () => ({
  month: '2026-10',
  providers: [
    { provider: 'anthropic', calls: 412, quantity: 412, realCents: 3980, imputedCents: 3980, unallocatedCents: 0, previousRealCents: 3200, incomplete: { no_tariff: 0, no_rate: 0 }, plan: null, nature: ['real'] },
    { provider: 'hunter', calls: 640, quantity: 640, realCents: 5800, imputedCents: 5800, unallocatedCents: 0, previousRealCents: 4100, incomplete: { no_tariff: 0, no_rate: 0 }, plan: { label: 'prepaid', kind: 'prepaid', quota: null, used: 640, usedPct: null }, nature: ['estimated'] },
    { provider: 'resend', calls: 1150, quantity: 1150, realCents: 0, imputedCents: 0, unallocatedCents: 0, previousRealCents: 0, incomplete: { no_tariff: 0, no_rate: 0 }, plan: { label: 'free', kind: 'free', quota: 3000, used: 1150, usedPct: 38.3 }, nature: ['real'] },
    { provider: 'render', calls: 0, quantity: 0, realCents: 622, imputedCents: 0, unallocatedCents: 622, previousRealCents: 622, incomplete: { no_tariff: 0, no_rate: 0 }, plan: null, nature: [] },
  ],
  totals: { realCents: 10402, imputedCents: 9780, unallocatedCents: 622, previousRealCents: 7922 }, revenueCents: 684000, apiRatioPct: 1.5,
  series: days.map((d, i) => ({ day: d, calls: 60 + (i * 7) % 40, costCents: 380 + (i % 6) * 70 })),
  topAccounts: [['usr_c1', 'Maison Dupont', 2900], ['usr_c2', 'Festival Nantes', 2100], ['usr_c3', 'Salon Auto Lyon', 1400]].map(([id, name, costCents]) => ({ id, name, costCents })),
  unlogged: { withoutTariff: 0, withoutRate: 0 }, fx: { currency: 'USD', known: true, rate: 1.16, stale: false },
  reconciliations: [
    { provider: 'resend', last: { status: 'no_comparison', day: '2026-10-19', detail: { note: 'Resend does not give its own usage with this key: our own count is the only source' } }, sync: null },
    { provider: 'hunter', last: { status: 'ok', day: '2026-10-19', our_quantity: 640, provider_quantity: 642, gap_pct: 0.3, detail: null }, sync: null },
    { provider: 'bouncer', last: { status: 'ok', day: '2026-10-19', our_quantity: 830, provider_quantity: 830, gap_pct: 0, detail: null }, sync: null },
    { provider: 'anthropic', last: { status: 'not_configured', day: '2026-10-19', detail: null }, sync: null },
  ], unreadAlerts: 1,
});
const clients = () => ({
  month: '2026-10', generalCostCents: 120,
  accounts: [
    { id: 'usr_r1', name: 'Événements Plus', type: 'reseller', parentResellerId: null, calls: 20, ownCostCents: 150, consolidatedSubCostCents: 1900, subClients: 3, revenueCents: 174000, contributionCents: 171950, apiRatioPct: 1.2, incomplete: 0 },
    { id: 'usr_c1', name: 'Maison Dupont', type: 'long', parentResellerId: null, calls: 310, ownCostCents: 2900, consolidatedSubCostCents: null, subClients: null, revenueCents: 180000, contributionCents: 177100, apiRatioPct: 1.6, incomplete: 0 },
    { id: 'usr_c2', name: 'Festival Nantes', type: 'short', parentResellerId: null, calls: 205, ownCostCents: 2100, consolidatedSubCostCents: null, subClients: null, revenueCents: 90000, contributionCents: 87900, apiRatioPct: 2.3, incomplete: 0 },
    { id: 'usr_s1', name: 'Café Léa', type: 'sub', parentResellerId: 'usr_r1', parentResellerName: 'Événements Plus', calls: 88, ownCostCents: 900, consolidatedSubCostCents: null, subClients: null, revenueCents: 0, contributionCents: -900, apiRatioPct: null, incomplete: 0 },
  ],
});

export const ADMIN_DEMO_ROUTES = (store) => [
  ['GET', /^\/admin\/dashboard$/, () => demoDashboard()],
  ['GET', /^\/admin\/catalog\/pending-count$/, () => ({ count: 0 })],
  ['GET', /^\/admin\/commercial\/resellers$/, () => [{ id: 'usr_r1', name: 'Événements Plus' }, { id: 'usr_r2', name: 'Fête & Co' }]],
  ['GET', /^\/admin\/commercial\/types$/, () => ({})],
  ['GET', /^\/admin\/commercial\/requests$/, () => []],
  ['GET', /^\/admin\/commercial\/planned$/, () => []],
  ['GET', /^\/admin\/commercial\/users\/([^/]+)$/, (m) => demoContract(m[1], store)],
  ['POST', /^\/admin\/commercial\/users\/([^/]+)\/terms$/, (m, body) => {
    store.terms[m[1]] = { id: 1, user_id: m[1], type: body.type, rent_cents: body.rentCents ?? null, event_price_cents: body.eventPriceCents ?? null, activation_cents: body.activationCents ?? null, parent_reseller_id: body.parentResellerId || null, valid_from: body.validFrom };
    return store.terms[m[1]];
  }],
  ['GET', /^\/admin\/api-usage\/overview$/, () => overview()],
  ['GET', /^\/admin\/api-usage\/clients$/, () => clients()],
  ['POST', /^\/admin\/api-usage\/reconcile$/, () => []],
  ['GET', /^\/admin\/api-usage\/alerts$/, () => [{ id: 1, kind: 'quota', level: 'warning', message: 'Hunter — 82 % du quota mensuel atteint', createdAt: '2026-10-18 09:00:00', readAt: null }]],
  ['GET', /^\/admin\/api-usage\/providers\/([^/]+)$/, (m) => ({
    provider: m[1], month: '2026-10', summary: { realCents: 5800, imputedCents: 5800, unallocatedCents: 0, incomplete: { no_tariff: 0, no_rate: 0 }, fees: [] }, plan: { label: 'prepaid', quota: null, used: 640, usedPct: null }, generalCostCents: 0,
    features: [{ feature: 'email_finder', service: null, calls: 600, quantity: 600, costCents: 5400, inputTokens: 0, outputTokens: 0 }, { feature: 'email_verification', service: null, calls: 40, quantity: 40, costCents: 400, inputTokens: 0, outputTokens: 0 }],
    series: days.map((d, i) => ({ day: d, calls: 25 + (i * 5) % 30, costCents: 230 + (i % 4) * 40 })), topAccounts: [{ id: 'usr_c1', name: 'Maison Dupont', quantity: 240, costCents: 2200 }, { id: 'usr_c2', name: 'Festival Nantes', quantity: 180, costCents: 1700 }],
    packs: [{ id: 1, provider: m[1], credits: 10000, price_micro: 209000000, currency: 'EUR', purchased_on: '2026-09-01', expires_on: '2027-09-01', consumed: 640 }], costLines: [], prices: [], reconciliations: [{ id: 1, day: '2026-10-19', status: 'ok', gap_pct: 0.3 }],
  })],
];
