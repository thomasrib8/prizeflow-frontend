// Tutorial mode: the REAL application, running on made-up data inside the tutorials page (an <iframe> of itself,
// loaded with ?demo=1). It never talks to the server: every API call is answered by tutorial/fakeBackend.js, the
// session is a made-up user kept in memory only (the parent page's real session in localStorage is never touched),
// and tutorial/TutorialRunner.jsx moves a "ghost" cursor over the real screens.
//
//   /campaigns?demo=1&lang=fr&tuto=pause-end&from=0&speed=1&role=admin
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

export const IS_DEMO = params.has('demo');
export const DEMO_PARAMS = {
  lang: ['fr', 'en', 'es', 'de'].includes(params.get('lang')) ? params.get('lang') : 'fr',
  tuto: params.get('tuto') || '',
  from: Math.max(0, parseInt(params.get('from') || '0', 10) || 0),
  speed: Math.min(4, Math.max(0.5, Number(params.get('speed')) || 1)),
  role: params.get('role') === 'admin' ? 'admin' : 'operator',
  autoplay: params.get('autoplay') !== '0',
};

export const DEMO_USER = {
  id: 'usr_demo',
  email: 'camille@maison-dupont.fr',
  name: 'Camille Martin',
  role: DEMO_PARAMS.role,
  status: 'approved',
  language: DEMO_PARAMS.lang,
  mfaEnabled: false,
};
