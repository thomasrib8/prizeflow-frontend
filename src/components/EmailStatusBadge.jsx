// Shows an email address with its deliverability verdict (see the backend's
// services/emailVerification/) as a coloured highlight on the address itself:
// green = verified, orange = uncertain, red = invalid, grey = couldn't be
// verified. Not yet checked (feature off, or an older contact) or still being
// checked: the address is shown plain. This is a deliverability signal from a
// third-party checker, never proof that a mailbox exists — the wording is
// deliberately hedged. All the colours and wording live in this one file so
// the CRM list and the prospect card can't drift apart.
//
// variant "inline" (CRM table): just the highlighted address, explanation on
// hover. variant "card" (prospect card): also writes the explanation out under
// the address, since a phone has no hover.
// Flags may arrive as 0/1/null (list rows) or booleans (prospect card).

const META = {
  verified: { label: 'Verified', color: '#065F46', bg: '#D1FAE5' },
  risky: { label: 'Uncertain', color: '#92400E', bg: '#FEF3C7' },
  invalid: { label: 'Invalid', color: '#991B1B', bg: '#FEE2E2' },
  unknown: { label: 'Unverifiable', color: '#475569', bg: '#E2E8F0' },
};

function explain(status, { isCatchAll, isDisposable, isRoleAccount }) {
  let text;
  if (status === 'verified') {
    text = 'This address looks able to receive emails. This is a deliverability check, not a guarantee that the mailbox exists.';
    if (isCatchAll) text += " Its domain accepts any address, so the exact mailbox can't be independently confirmed.";
  } else if (status === 'risky') {
    text = isCatchAll
      ? "The domain may accept any email address. The exact existence of this mailbox can't be confirmed."
      : 'This address may be valid but carries a delivery risk.';
  } else if (status === 'invalid') {
    text = 'This address seems unable to receive emails.';
  } else if (status === 'pending') {
    text = 'Checking this address…';
  } else {
    text = 'Verification not available right now.';
  }
  if (isDisposable) text += ' It looks like a temporary (disposable) address.';
  if (isRoleAccount) text += ' It looks like a shared mailbox (e.g. info@, sales@).';
  return text;
}

export default function EmailStatusBadge({ email, status, isCatchAll, isDisposable, isRoleAccount, variant = 'inline' }) {
  const meta = META[status];
  if (!status) return <>{email}</>; // never checked: plain address
  const text = explain(status, { isCatchAll: !!isCatchAll, isDisposable: !!isDisposable, isRoleAccount: !!isRoleAccount });
  const label = meta ? meta.label : 'Checking…';

  return (
    <>
      <span
        title={`${label} — ${text}`}
        style={{
          padding: meta ? '1px 6px' : 0,
          borderRadius: 5,
          background: meta ? meta.bg : 'transparent',
          color: meta ? meta.color : 'inherit',
          fontWeight: meta ? 600 : 'inherit',
          cursor: 'help',
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
          wordBreak: 'break-all',
        }}
      >
        {email}
      </span>
      {!!isDisposable && (
        <span
          title="Temporary / disposable email address"
          style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 10, padding: '1px 7px', whiteSpace: 'nowrap' }}
        >
          Disposable
        </span>
      )}
      {variant === 'card' && (
        <div style={{ fontSize: 11, lineHeight: 1.4, marginTop: 5, color: meta ? meta.color : '#64748B' }}>
          <strong>{label}.</strong> {text}
        </div>
      )}
    </>
  );
}
