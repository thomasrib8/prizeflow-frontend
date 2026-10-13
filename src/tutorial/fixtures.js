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

export function makeCampaigns() {
  const base = { owner_id: 'usr_demo', language: LANG, is_test: 0, social_media_required: 0, google_review_required: 0, ai_assistant_enabled: 0, linkedin_search_enabled: 0, total_distributed: 0 };
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
