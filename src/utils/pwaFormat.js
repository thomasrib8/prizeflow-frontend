// Small presentation helpers for the mobile PWA — formatting only, no data
// logic (the numbers and lists themselves always come from the backend).

// Backend timestamps are UTC "YYYY-MM-DD HH:MM:SS" (SQLite datetime('now')).
export function parseDbDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

// "10:24" for today, "12 Oct, 10:24" for another day — in the app's language.
export function formatWhen(value, lang) {
  const d = parseDbDate(value);
  if (!d) return '';
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${d.toLocaleDateString(lang, { day: 'numeric', month: 'short' })}, ${time}`;
}

export function initials(first, last) {
  const a = (first || '').trim()[0] || '';
  const b = (last || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
}

const AVATAR_TONES = [
  { bg: '#E6F0FF', fg: '#0055F8' },
  { bg: '#FDECEC', fg: '#DC2626' },
  { bg: '#E3F6EC', fg: '#15803D' },
  { bg: '#F1E8FD', fg: '#7C3AED' },
  { bg: '#FEF3E0', fg: '#D97706' },
  { bg: '#E0F5F6', fg: '#0E7490' },
];

// Stable colour per person so the same prospect keeps the same avatar.
export function avatarTone(seed) {
  let h = 0;
  for (const ch of String(seed || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

// guest_notes.segment is the campaign's categories joined as
// "Category: value · Category: value" (see routes/account.js).
export function segmentChips(segment) {
  return String(segment || '').split(' · ').map((s) => s.trim()).filter(Boolean);
}

export const noteExcerpt = (note, max = 90) => {
  const s = String(note || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
};
