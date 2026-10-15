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
