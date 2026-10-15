// Made-up company, campaign, gifts and people for the tutorials. Nothing here is real.
import { DEMO_PARAMS } from './demo';

const LANG = DEMO_PARAMS.lang;

export const GIFTS = {
  fr: ['Stylo SPARK', 'Tote bag', 'Gourde isotherme', 'Batterie externe', 'Casque Bluetooth', 'Enceinte portable', 'Carnet', 'Chargeur sans fil', 'Mug', 'Clé USB 64 Go', 'Bon d’achat 50 €', 'Trottinette électrique'],
  en: ['SPARK pen', 'Tote bag', 'Insulated bottle', 'Power bank', 'Bluetooth headphones', 'Portable speaker', 'Notebook', 'Wireless charger', 'Mug', '64 GB USB key', '€50 voucher', 'Electric scooter'],
  es: ['Bolígrafo SPARK', 'Bolsa de tela', 'Botella térmica', 'Batería externa', 'Auriculares Bluetooth', 'Altavoz portátil', 'Cuaderno', 'Cargador inalámbrico', 'Taza', 'Llave USB 64 GB', 'Vale de 50 €', 'Patinete eléctrico'],
  de: ['SPARK-Kugelschreiber', 'Stofftasche', 'Thermosflasche', 'Powerbank', 'Bluetooth-Kopfhörer', 'Tragbarer Lautsprecher', 'Notizbuch', 'Kabelloses Ladegerät', 'Tasse', 'USB-Stick 64 GB', '50-€-Gutschein', 'Elektro-Scooter'],
}[LANG];

export const STOCKS = [400, 150, 80, 40, 10, 6, 300, 120, 100, 90, 12, 2];

const CAMPAIGN_NAMES = {
  fr: ['Salon Printemps 2026', 'Boutique Noël 2025', 'Journée Portes Ouvertes'],
  en: ['Spring Show 2026', 'Christmas Shop 2025', 'Open Day'],
  es: ['Feria de Primavera 2026', 'Tienda Navidad 2025', 'Jornada de Puertas Abiertas'],
  de: ['Frühjahrsmesse 2026', 'Weihnachtsshop 2025', 'Tag der offenen Tür'],
}[LANG];

export const COMPANY = 'Maison Dupont';

// Tutorials that need a running event start with the first campaign ACTIVE; the ones about creating or starting a campaign need a draft.
const NEEDS_DRAFT = ['campaign-create', 'campaign-lifecycle'];
const T = (fr, en, es, de) => ({ fr, en, es: es || en, de: de || en }[LANG]);
export { T };

export function makeCampaigns() {
  const base = { owner_id: 'usr_demo', language: LANG, is_test: 0, social_media_required: 0, google_review_required: 0, ai_assistant_enabled: DEMO_PARAMS.tuto === 'prospect-note' || DEMO_PARAMS.tuto === 'crm' ? 1 : 0, linkedin_search_enabled: DEMO_PARAMS.tuto === 'enrichment' ? 1 : 0, total_distributed: 0 };
  const total = STOCKS.reduce((a, b) => a + b, 0);
  return [
    { ...base, id: 'CAM-2026-0007', name: CAMPAIGN_NAMES[0], status: 'draft', event_name: CAMPAIGN_NAMES[0], description: '', total_stock: total, total_distributed: 0, public_token: 'demo-spring-0007xyz', created_at: '2026-10-12 08:30:00' },
    { ...base, id: 'CAM-2025-0031', name: CAMPAIGN_NAMES[1], status: 'completed', event_name: '', total_stock: 600, total_distributed: 548, public_token: 'demo-xmas-0031abcd', created_at: '2025-11-20 10:00:00' },
    { ...base, id: 'CAM-2025-0019', name: CAMPAIGN_NAMES[2], status: 'archived', event_name: '', total_stock: 300, total_distributed: 300, public_token: 'demo-open-0019efgh', created_at: '2025-06-05 09:00:00' },
  ];
}

export function makeSlots(campaignId, stocks = STOCKS, distributedPct = 0) {
  return GIFTS.map((giftName, i) => {
    const initial = stocks[i];
    const used = Math.round(initial * distributedPct);
    return { id: i + 1, campaign_id: campaignId, slot_index: i, gift_name: giftName, stock_initial: initial, stock_remaining: initial - used, redeem_method: 'qr', perso_delivery: null, perso_subject: null, perso_body: null, perso_auto_distribute: 0 };
  });
}

export const TEMPLATE_NAME = { fr: 'Salon — 12 cadeaux standard', en: 'Show — standard 12 gifts', es: 'Feria — 12 regalos estándar', de: 'Messe — 12 Standardpreise' }[LANG];

// The event in progress: the first campaign, already running (tutorials about the day itself)
export function makeCampaignsForTutorial(tuto) {
  const list = makeCampaigns();
  if (!NEEDS_DRAFT.includes(tuto)) { list[0].status = 'active'; list[0].started_at = '2026-10-12 09:00:00'; list[0].total_distributed = 218; }
  return list;
}

export const SEGMENT_CATEGORIES = [
  { id: 1, name: T('Budget', 'Budget', 'Presupuesto', 'Budget'), options: [
    { id: 1, label: T('Moins de 500 €', 'Under €500', 'Menos de 500 €', 'Unter 500 €') },
    { id: 2, label: T('500 à 2 000 €', '€500 to €2,000', '500 a 2.000 €', '500 bis 2.000 €') },
    { id: 3, label: T('Plus de 2 000 €', 'Over €2,000', 'Más de 2.000 €', 'Über 2.000 €') },
  ] },
  { id: 2, name: T('Intérêt', 'Interest', 'Interés', 'Interesse'), options: [
    { id: 4, label: T('Cuisine', 'Kitchen', 'Cocina', 'Küche') }, { id: 5, label: T('Salon', 'Living room', 'Salón', 'Wohnzimmer') }, { id: 6, label: T('Extérieur', 'Outdoor', 'Exterior', 'Außenbereich') },
  ] },
];
export const FIELDS = [
  { id: 1, scope: 'sales', label: T('Projet', 'Project', 'Proyecto', 'Projekt'), fieldType: 'text', options: [], required: false },
  { id: 2, scope: 'sales', label: T('Rendez-vous', 'Appointment', 'Cita', 'Termin'), fieldType: 'datetime', options: [], required: false },
  { id: 3, scope: 'guest', label: T('Comment nous avez-vous connus ?', 'How did you hear about us?', '¿Cómo nos conoció?', 'Wie haben Sie uns gefunden?'), fieldType: 'single_choice', options: [T('Réseaux sociaux', 'Social media', 'Redes sociales', 'Soziale Medien'), T('Bouche à oreille', 'Word of mouth', 'Boca a boca', 'Mundpropaganda'), T('Publicité', 'Advertising', 'Publicidad', 'Werbung')], required: true },
];

const P = (id, first, last, gift, seg, rating, note, minAgo) => ({ rewardId: `REWARD-000${id}`, email: `${first}.${last}@exemple.fr`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z.@]/g, ''), first_name: first, last_name: last, gift_name: gift, segment: seg, lead_rating: rating, note, outcome: 'spun', minutesAgo: minAgo });
export const PLAYERS = [
  P(61, 'Léa', 'Martin', GIFTS[2], SEGMENT_CATEGORIES[0].options[1].label, 3, T('Veut refaire sa cuisine en mars. Budget confirmé.', 'Wants a new kitchen in March. Budget confirmed.', 'Quiere una cocina nueva en marzo. Presupuesto confirmado.', 'Möchte im März eine neue Küche. Budget bestätigt.'), 4),
  P(60, 'Hugo', 'Bernard', GIFTS[0], SEGMENT_CATEGORIES[0].options[0].label, 1, '', 11),
  P(59, 'Inès', 'Petit', GIFTS[6], SEGMENT_CATEGORIES[0].options[2].label, 2, T('À rappeler la semaine prochaine.', 'Call back next week.', 'Llamar la próxima semana.', 'Nächste Woche zurückrufen.'), 18),
  P(58, 'Paul', 'Durand', GIFTS[1], SEGMENT_CATEGORIES[0].options[1].label, 2, '', 26),
  P(57, 'Sofia', 'Rossi', GIFTS[8], SEGMENT_CATEGORIES[0].options[0].label, 1, '', 33),
  P(56, 'Marc', 'Lefèvre', GIFTS[3], SEGMENT_CATEGORIES[0].options[2].label, 3, T('Projet de rénovation complet.', 'Full renovation project.', 'Proyecto de reforma completa.', 'Komplettes Renovierungsprojekt.'), 41),
];

export const QUEUE = {
  active: { firstName: 'Léa', lastName: 'Martin', email: 'lea.martin@exemple.fr', launched: false, giftName: GIFTS[2], retryMessage: null },
  waiting: [{ firstName: 'Hugo' }, { firstName: 'Inès' }, { firstName: 'Karim' }],
  recentCompleted: [{ firstName: 'Paul', giftName: GIFTS[1], isTest: false }, { firstName: 'Sofia', giftName: GIFTS[8], isTest: false }],
};
