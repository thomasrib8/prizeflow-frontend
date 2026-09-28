// Deliverability verdict for an email address (see the backend's
// services/emailVerification/). This is a deliverability signal from a
// third-party checker, never proof that a mailbox exists — the wording and
// tooltips below are deliberately hedged. All the wording/mapping lives in
// this one file so the CRM list and the prospect card can't drift apart.
//
// `compact` (CRM table): just the icon. Full (prospect card): icon + label.
// Flags may arrive as 0/1/null (list rows) or booleans (prospect card).

const META = {
  verified: { icon: '✅', label: 'Verified', color: '#047857', bg: '#ECFDF5' },
  risky: { icon: '⚠️', label: 'Uncertain', color: '#B45309', bg: '#FFFBEB' },
  invalid: { icon: '❌', label: 'Invalid', color: '#B91C1C', bg: '#FEF2F2' },
  unknown: { icon: '⚪', label: 'Unverifiable', color: '#64748B', bg: '#F1F5F9' },
  pending: { icon: '⏳', label: 'Checking…', color: '#64748B', bg: '#F1F5F9' },
};

function explain(status, { isCatchAll, isDisposable, isRoleAccount }) {
  let text;
  if (status === 'verified') text = 'This address looks able to receive emails. This is a deliverability check, not a guarantee that the mailbox exists.';
  else if (status === 'risky') text = isCatchAll
    ? "The domain may accept any email address. The exact existence of this mailbox can't be confirmed."
    : 'This address may be valid but carries a delivery risk.';
  else if (status === 'invalid') text = 'This address seems unable to receive emails.';
  else if (status === 'pending') text = 'Checking this address…';
  else text = 'Verification not available right now.';
  if (isDisposable) text += ' It looks like a temporary (disposable) address.';
  if (isRoleAccount) text += ' It looks like a shared mailbox (e.g. info@, sales@).';
  return text;
}

export default function EmailStatusBadge({ status, isCatchAll, isDisposable, isRoleAccount, compact = false }) {
  const meta = META[status];
  if (!meta) return null; // never checked (feature off, or older contact): show nothing
  const text = explain(status, { isCatchAll: !!isCatchAll, isDisposable: !!isDisposable, isRoleAccount: !!isRoleAccount });
  const chip = { fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 10, padding: '1px 7px', whiteSpace: 'nowrap' };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 6, verticalAlign: 'middle' }}>
      <span
        title={`${meta.label} — ${text}`}
        aria-label={`Email ${meta.label}: ${text}`}
        style={compact
          ? { fontSize: 12, lineHeight: 1, cursor: 'help' }
          : { fontSize: 12, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 12, padding: '3px 10px', cursor: 'help', whiteSpace: 'nowrap' }}
      >
        {meta.icon}{compact ? '' : ` ${meta.label}`}
      </span>
      {!!isDisposable && <span style={chip} title="Temporary / disposable email address">Disposable</span>}
    </span>
  );
}
