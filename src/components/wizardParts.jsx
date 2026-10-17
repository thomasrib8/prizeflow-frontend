// Pieces shared by the pack preparation wizard (Parc hardware) and the client commissioning wizard.
const PSK_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const WHEEL_COMMAND = "pbpaste | ssh pi@realtimepi.local 'bash -s'";

export function suggestPassword() {
  const pick = (n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => PSK_ALPHABET[v % PSK_ALPHABET.length]).join('');
  return `Spark-${pick(4)}-${pick(4)}`;
}
export const pwError = (pw, pw2, t) => {
  if (pw.length < 8 || pw.length > 63 || !/^[\x20-\x7e]+$/.test(pw)) return t('setupWizard.errLen');
  if (pw !== pw2) return t('setupWizard.errMatch');
  return '';
};
export const fmt = (s) => (s ? new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

export function Row({ selected, onClick, children }) {
  return (
    <div className={`sw-row${selected ? ' sel' : ''}`} onClick={onClick} role="radio" aria-checked={!!selected} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
      <span className="sw-radio" aria-hidden="true">{selected ? '●' : '○'}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export function Check({ ok, label, note }) {
  return (
    <div className="sw-check">
      <span className={ok ? 'ok' : 'wait'} aria-hidden="true">{ok ? '✓' : '…'}</span>
      <span>{label}</span>
      {!ok && note ? <span className="sw-note">{note}</span> : null}
    </div>
  );
}
