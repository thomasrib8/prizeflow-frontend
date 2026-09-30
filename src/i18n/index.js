// i18n for both the guest-facing play flow (Phase 1) and the admin panel
// (Phase 2 — see the "Multilingue" plan). The guest flow (useGuestFlow.js,
// GuestFlowScreen.jsx) never mutates this module's global current language —
// it pins its own `t` to the campaign's own `language` column
// (routes/campaigns.js) via useTranslation's `lng` option, so a staff
// member's admin-language UI and a guest overlay in a different language
// (the kiosk in LaunchCampaign.jsx) can be on screen at once without
// fighting over global state. The admin panel, by contrast, is safe to use
// i18n.changeLanguage(user.language) globally — there's never two admin
// languages active in one tab.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';
// Separate namespace (not merged into the guest-flow files above) so the
// ~900-string admin panel doesn't turn the player-facing translation file
// into one giant undifferentiated blob — see the Phase 2a plan.
import adminEn from './locales/admin-en.json';
import adminFr from './locales/admin-fr.json';
import adminEs from './locales/admin-es.json';
import adminDe from './locales/admin-de.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en, admin: adminEn },
    fr: { translation: fr, admin: adminFr },
    es: { translation: es, admin: adminEs },
    de: { translation: de, admin: adminDe },
  },
  lng: 'en', // matches campaigns.language's DB default — existing campaigns look identical until an admin picks another language
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes — double-escaping would turn a literal "&" into "&amp;"
});

export default i18n;
