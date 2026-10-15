// Line icons for the tutorial cards (same 24px / 1.8 stroke style as the rest of the app).
const P = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const ICONS = {
  play: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5-6-3.5z" /></>,
  plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  launch: <><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 3" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8c-2-4-6-3-5 0 .6 1.6 3 1 5 0zM12 8c2-4 6-3 5 0-.6 1.6-3 1-5 0z" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.4-3.6 3-5.5 6-5.5s5.6 1.9 6 5.5" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.8c1.7.7 2.8 2.3 3 5.2" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  offline: <><path d="M3 3l18 18" /><path d="M9.5 5.4A6 6 0 0 1 18 10a4 4 0 0 1 1.9 7.5" /><path d="M6.3 7.3A6 6 0 0 0 7 19h9.5" /></>,
  wrench: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5 6.5 20.5l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  wheel: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /><path d="M12 3v7M12 14v7M3 12h7M14 12h7M5.6 5.6l5 5M13.4 13.4l5 5M18.4 5.6l-5 5M10.6 13.4l-5 5" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
  userplus: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.4-3.6 3-5.5 6-5.5s5.6 1.9 6 5.5M19 8v6M16 11h6" /></>,
  download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" /></>,
  box: <><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16z" /><path d="M8 7h8M8 11h8" /></>,
};
export default function TutorialIcon({ name, size = 26 }) {
  return <svg {...P} width={size} height={size}>{ICONS[name] || ICONS.book}</svg>;
}
