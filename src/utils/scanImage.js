// Prepares a photo of a badge / business card for scanning, in the browser:
//
//   1. shrinks it (long edge <= 1600px, JPEG) — a phone photo is 3-8MB and a
//      congress wifi is slow; the reader doesn't need more than this to read
//      printed text, and the smaller upload is also faster to process;
//   2. looks for a QR code on it. Some badges and cards carry a vCard / MECARD
//      QR with the person's details already structured — when one is found we
//      use it directly, which is exact and needs no AI at all.
//
// Nothing here is sent anywhere: it returns the shrunken photo and, if there
// was one, the contact read from the QR.

import jsQR from 'jsqr';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to <img> (some browsers can't createImageBitmap every file type)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("This photo couldn't be opened."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// vCard (BEGIN:VCARD ... FN / N / EMAIL / TEL / ORG / TITLE) or MECARD
// (MECARD:N:Dupont,Jean;EMAIL:...;TEL:...;ORG:...;). Anything else — most
// badge QRs are just an opaque visitor ID for the organizer's own system —
// returns null and the photo goes to the reader instead.
export function parseContactQr(text) {
  if (!text) return null;
  const clean = (v) => (v || '').replace(/\\([,;:])/g, '$1').replace(/\s+/g, ' ').trim();
  let first = '';
  let last = '';
  let email = '';
  let phone = '';
  let company = '';
  let jobTitle = '';

  if (/^BEGIN:VCARD/i.test(text)) {
    const lines = text.split(/\r?\n/);
    const value = (name) => {
      const line = lines.find((l) => new RegExp(`^${name}(;[^:]*)?:`, 'i').test(l));
      return line ? line.slice(line.indexOf(':') + 1) : '';
    };
    const n = value('N');
    if (n) {
      const [family, given] = n.split(';');
      last = clean(family);
      first = clean(given);
    } else {
      const fn = clean(value('FN')).split(' ');
      first = fn.shift() || '';
      last = fn.join(' ');
    }
    email = clean(value('EMAIL'));
    phone = clean(value('TEL'));
    company = clean(value('ORG').split(';')[0]);
    jobTitle = clean(value('TITLE'));
  } else if (/^MECARD:/i.test(text)) {
    const parts = {};
    for (const seg of text.slice(7).split(/(?<!\\);/)) {
      const i = seg.indexOf(':');
      if (i > 0) parts[seg.slice(0, i).toUpperCase()] = seg.slice(i + 1);
    }
    const [family, given] = (parts.N || '').split(',');
    last = clean(family);
    first = clean(given);
    email = clean(parts.EMAIL);
    phone = clean(parts.TEL);
    company = clean(parts.ORG);
  } else {
    return null;
  }

  if (!first && !last && !email) return null;
  return { firstName: first, lastName: last, email: email.toLowerCase(), phone, company, jobTitle };
}

// -> { blob, contact } where contact is the QR's details or null.
export async function prepareScanImage(file) {
  const bitmap = await loadBitmap(file);
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (typeof bitmap.close === 'function') bitmap.close();

  let contact = null;
  try {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
    contact = code ? parseContactQr(code.data) : null;
  } catch {
    // reading the QR is a bonus; the photo itself still goes through
  }

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("This photo couldn't be prepared."))), 'image/jpeg', JPEG_QUALITY)
  );
  return { blob, contact };
}
