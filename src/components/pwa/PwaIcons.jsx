// Line icons for the mobile PWA — same 24px / 1.8-stroke style as the desktop
// sidebar icons in Layout.jsx, so the two apps feel like one product.
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const IconHome = (p) => <svg {...base} {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5a1 1 0 0 0 1 1H10v-5.5h4v5.5h3.5a1 1 0 0 0 1-1V10" /></svg>;
export const IconProspects = (p) => <svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.8 19.5c.4-3.3 3-5.3 6.2-5.3s5.8 2 6.2 5.3" /><circle cx="17.2" cy="8.8" r="2.4" /><path d="M17.5 14.2c2.2.2 3.8 1.7 4.2 4" /></svg>;
export const IconScan = (p) => <svg {...base} {...p}><path d="M4 8V6.2A2.2 2.2 0 0 1 6.2 4H8M16 4h1.8A2.2 2.2 0 0 1 20 6.2V8M20 16v1.8a2.2 2.2 0 0 1-2.2 2.2H16M8 20H6.2A2.2 2.2 0 0 1 4 17.8V16" /><path d="M8 9.5h8M8 12h8M8 14.5h5" /></svg>;
export const IconAnalytics = (p) => <svg {...base} {...p}><path d="M5 20V12M12 20V5M19 20v-9" /></svg>;
export const IconSettings = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.8a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5h0a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></svg>;
export const IconUser = (p) => <svg {...base} {...p}><circle cx="12" cy="8.2" r="3.6" /><path d="M4.5 20c.5-3.6 3.5-5.8 7.5-5.8s7 2.2 7.5 5.8" /></svg>;
export const IconPlus = (p) => <svg {...base} strokeWidth={2.2} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const IconSearch = (p) => <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
export const IconFilter = (p) => <svg {...base} {...p}><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
export const IconChevronRight = (p) => <svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>;
export const IconClose = (p) => <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconGift = (p) => <svg {...base} {...p}><rect x="3.5" y="8.5" width="17" height="4" rx="1" /><path d="M5 12.5V20h14v-7.5M12 8.5V20" /><path d="M12 8.5C10.5 8.5 8 8 8 6a2 2 0 0 1 4 0M12 8.5C13.5 8.5 16 8 16 6a2 2 0 0 0-4 0" /></svg>;
export const IconStar = ({ filled, ...p }) => <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true" {...p}><path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.6Z" /></svg>;
export const IconUsers = (p) => <svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.8 19.5c.4-3.3 3-5.3 6.2-5.3s5.8 2 6.2 5.3" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.6c1.8.6 3 2.2 3.2 4.4" /></svg>;
export const IconWheel = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="1.8" /><path d="M12 3.5v6.7M12 13.8v6.7M3.5 12h6.7M13.8 12h6.7M6 6l4.7 4.7M13.3 13.3 18 18M18 6l-4.7 4.7M10.7 13.3 6 18" /></svg>;
export const IconReview = (p) => <svg {...base} {...p}><path d="M20 12.2a7.8 7.8 0 0 1-11.4 6.9L4 20.5l1.4-4.4A7.8 7.8 0 1 1 20 12.2Z" /><path d="m12 8.4.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1L9 10.6l2.1-.3.9-1.9Z" /></svg>;
export const IconShare = (p) => <svg {...base} {...p}><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8" /></svg>;
export const IconSparkles = (p) => <svg {...base} {...p}><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" /><path d="M19 3.5v3M17.5 5h3M5 17.5v3M3.5 19h3" /></svg>;
export const IconGlobe = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.3-3.6-8.5S9.6 5.9 12 3.5Z" /></svg>;
export const IconLogout = (p) => <svg {...base} {...p}><path d="M14 4.5h3.5A2.5 2.5 0 0 1 20 7v10a2.5 2.5 0 0 1-2.5 2.5H14M10 8l-4 4 4 4M6 12h10" /></svg>;
export const IconExternal = (p) => <svg {...base} {...p}><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></svg>;
export const IconEdit = (p) => <svg {...base} {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 7.5 3 3" /></svg>;
