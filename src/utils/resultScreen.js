// Final guest screen customization (see backend src/resultScreen.js).
// Shared by the real screen (GuestFlowScreen) and the live preview in the
// campaign settings so both always render the same thing.
export const RESULT_EMOJIS = { party: '🎉', gift: '🎁', heart: '❤️', none: '' };

// '{firstName}' (or '{prénom}') is replaced by the guest's first name; when
// there is none, the placeholder and the punctuation hugging it disappear.
export function fillName(text, name) {
  const s = String(text || '');
  if (name) return s.replace(/\{(?:firstName|prénom|prenom)\}/gi, name);
  return s.replace(/[\s,;:-]*\{(?:firstName|prénom|prenom)\}/gi, '').replace(/\s{2,}/g, ' ').trim();
}

export function resultCopy(rs, { firstName, giftName, t }) {
  const custom = rs || {};
  return {
    emoji: custom.emoji && RESULT_EMOJIS[custom.emoji] !== undefined ? RESULT_EMOJIS[custom.emoji] : RESULT_EMOJIS.party,
    title: custom.title ? fillName(custom.title, firstName) : (firstName ? t('result.thankYouWithName', { name: firstName }) : t('result.thankYou')),
    message: custom.message ? fillName(custom.message, firstName) : t('result.emailNotice'),
    gift: custom.showGift && giftName ? giftName : null,
    button: custom.button && custom.button.enabled && custom.button.url && custom.button.label ? custom.button : null,
  };
}

// ---- Background colour of the final screen --------------------------------------------------------------------------------
// Ready-made colours (the full palette is the colour picker next to them).
export const RESULT_BG_PRESETS = ['#E5B545', '#8ED3A2', '#0B1437', '#16A34A', '#DC2626', '#9333EA', '#EC4899', '#F97316', '#0D9488', '#F1F5F9', '#FFFFFF'];
export const isHexColor = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || ''));

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')).join('')}`;
const mix = (hex, to, k) => { const a = rgb(hex); const b = rgb(to); return toHex(a.map((v, i) => v + (b[i] - v) * k)); };
// WCAG relative luminance
const lum = (hex) => { const [r, g, b] = rgb(hex).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

// Colours of the final screen for a chosen background: text, accent (title / gift name), panels and buttons are all derived
// from it so the screen stays readable whatever colour is picked (white text on dark, navy text on light).
export function resultTheme(bgColor) {
  if (!isHexColor(bgColor)) {
    return { custom: false, background: 'linear-gradient(160deg, #0055F8 0%, #266FF9 100%)', text: 'white', accent: '#90DCFE', panel: 'rgba(255,255,255,0.08)', btnBg: 'white', btnText: '#002881', mutedBtn: 'rgba(255,255,255,0.15)', mutedText: '#94A3B8' };
  }
  const c = bgColor.toUpperCase();
  const light = lum(c) > 0.4; // contrast with navy text beats contrast with white text above this point
  return light
    ? { custom: true, background: `linear-gradient(160deg, ${c} 0%, ${mix(c, '#FFFFFF', 0.35)} 100%)`, text: '#0B1437', accent: mix(c, '#000000', 0.62), panel: 'rgba(11,20,55,0.07)', btnBg: '#0B1437', btnText: 'white', mutedBtn: 'rgba(11,20,55,0.12)', mutedText: '#475569' }
    : { custom: true, background: `linear-gradient(160deg, ${c} 0%, ${mix(c, '#FFFFFF', 0.14)} 100%)`, text: 'white', accent: mix(c, '#FFFFFF', 0.72), panel: 'rgba(255,255,255,0.10)', btnBg: 'white', btnText: mix(c, '#000000', 0.55), mutedBtn: 'rgba(255,255,255,0.15)', mutedText: '#CBD5E1' };
}
