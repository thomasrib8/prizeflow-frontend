// Mirror of the backend's placeholderEmail.js: a prospect scanned in without
// an email carries a stand-in address on this reserved domain until a real
// one is added. It's the key the prospect card opens by, but it must never
// be shown to anyone as if it were an email.
export const isPlaceholderEmail = (email) =>
  typeof email === 'string' && email.trim().toLowerCase().endsWith('@no-email.spark.invalid');
