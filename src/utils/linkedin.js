// Small helpers shared by the LinkedIn search UI (prospect card, new-prospect form, campaign settings).
// The server re-checks everything; these only decide what to show.

// Private mailboxes say nothing about the employer, so they do not count as a "professional e-mail".
const FREE_MAIL = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
  'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'neuf.fr', 'laposte.net', 'gmx.com', 'gmx.fr', 'gmx.de',
  'web.de', 'proton.me', 'protonmail.com', 'aol.com', 'bbox.fr', 'numericable.fr', 'yahoo.de', 'yahoo.es', 'hotmail.es', 'hotmail.de', 't-online.de']);

export function professionalDomain(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e) || e.endsWith('.placeholder') || e.includes('no-email')) return null;
  const d = e.split('@')[1];
  return FREE_MAIL.has(d) ? null : d;
}

// A first name, a last name, and something that pins the employer down (company, or a professional e-mail).
export function canSearchLinkedIn({ firstName, lastName, email, company }) {
  return !!(String(firstName || '').trim() && String(lastName || '').trim() && (String(company || '').trim() || professionalDomain(email)));
}

export function normalizeLinkedInUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  let u;
  try { u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); } catch { return null; }
  if (!/^(?:[a-z]{2,3}\.|www\.)?linkedin\.com$/i.test(u.hostname)) return null;
  const m = u.pathname.match(/^\/in\/([^/]+)\/?$/i);
  return m ? `https://www.linkedin.com/in/${m[1]}` : null;
}

export const newOperationId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

// "https://www.linkedin.com/in/jane-doe" -> "linkedin.com/in/jane-doe"
export const shortLinkedInUrl = (url) => String(url || '').replace(/^https?:\/\/(www\.)?/i, '');
