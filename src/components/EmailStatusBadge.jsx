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

import { useTranslation } from 'react-i18next';

export const META_TKEY = {
  verified: { tKey: 'labelVerified', color: '#065F46', bg: '#D1FAE5' },
  risky: { tKey: 'labelUncertain', color: '#92400E', bg: '#FEF3C7' },
  invalid: { tKey: 'labelInvalid', color: '#991B1B', bg: '#FEE2E2' },
  unknown: { tKey: 'labelUnverifiable', color: '#475569', bg: '#E2E8F0' },
};

export function explain(status, { isCatchAll, isDisposable, isRoleAccount }, t) {
  let text;
  if (status === 'verified') {
    text = t('emailStatusBadge.explainVerified');
    if (isCatchAll) text += t('emailStatusBadge.explainVerifiedCatchAllSuffix');
  } else if (status === 'risky') {
    text = isCatchAll
      ? t('emailStatusBadge.explainRiskyCatchAll')
      : t('emailStatusBadge.explainRisky');
  } else if (status === 'invalid') {
    text = t('emailStatusBadge.explainInvalid');
  } else if (status === 'pending') {
    text = t('emailStatusBadge.explainPending');
  } else {
    text = t('emailStatusBadge.explainDefault');
  }
  if (isDisposable) text += t('emailStatusBadge.explainDisposableSuffix');
  if (isRoleAccount) text += t('emailStatusBadge.explainRoleAccountSuffix');
  return text;
}

export default function EmailStatusBadge({ email, status, isCatchAll, isDisposable, isRoleAccount, variant = 'inline' }) {
  const { t } = useTranslation('admin');
  const metaTkey = META_TKEY[status];
  const meta = metaTkey ? { ...metaTkey, label: t(`emailStatusBadge.${metaTkey.tKey}`) } : null;
  if (!status) return <>{email}</>; // never checked: plain address
  const text = explain(status, { isCatchAll: !!isCatchAll, isDisposable: !!isDisposable, isRoleAccount: !!isRoleAccount }, t);
  const label = meta ? meta.label : t('emailStatusBadge.labelChecking');

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
          title={t('emailStatusBadge.disposableTitle')}
          style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 10, padding: '1px 7px', whiteSpace: 'nowrap' }}
        >
          {t('emailStatusBadge.disposableBadge')}
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
