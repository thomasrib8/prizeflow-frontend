// Who this is, at a glance: avatar, name, potential (phone: right here under the name), e-mail with its
// verification badge, up to three facts the campaign collected, the phone, and the quick actions.
import { useTranslation } from 'react-i18next';
import { IS_BOX_BUILD } from '../../utils/boxMode';
import EmailStatusBadge, { META_TKEY, explain } from '../EmailStatusBadge';
import LeadPotentialRating from './LeadPotentialRating';
import { IcMail, IcPencil, IcPhone } from './icons';
import LinkedInIcon from '../linkedin/LinkedInIcon';

// Discreet verdict next to the address: the colour and word come from the real check (Bouncer), the longer
// explanation sits in the tooltip instead of taking lines on the card. A deliverability check is a signal,
// never proof that the mailbox exists.
function VerificationPill({ v }) {
  const { t } = useTranslation('admin');
  const status = v?.status;
  if (IS_BOX_BUILD && !status) return null; // the box holds no verification results: say nothing rather than "not verified"
  const meta = META_TKEY[status];
  const label = meta ? t(`emailStatusBadge.${meta.tKey}`) : status === 'pending' ? t('emailStatusBadge.labelChecking') : t('prospect.notVerified');
  const flags = { isCatchAll: !!v?.isCatchAll, isDisposable: !!v?.isDisposable, isRoleAccount: !!v?.isRoleAccount };
  return (
    <span
      className="pc-vpill"
      title={status ? explain(status, flags, t) : t('emailStatusBadge.explainDefault')}
      style={meta ? { background: meta.bg, color: meta.color } : undefined}
    >
      {status === 'verified' ? '✓ ' : ''}{label}
    </span>
  );
}

export default function ProspectHeader({ c, email }) {
  const { t } = c;
  return (
    <header className="pc-head">
      <div className="pc-avatar" aria-hidden="true">{c.initials}</div>
      <div className="pc-head-main">
        <h2 className="pc-name">{c.displayName}</h2>
        {/* phone: the stars sit directly under the name; desktop shows them in the side card instead */}
        <div className="pc-only-mobile"><LeadPotentialRating value={c.leadRating} onChange={c.setRating} /></div>

        <div className="pc-emailline">
          {c.emailMissing ? <em className="pc-muted">{t('common.noEmailYet')}</em> : (
            <>
              <span className="pc-email"><EmailStatusBadge email={email} status={c.emailVerification?.status} isCatchAll={c.emailVerification?.isCatchAll} isDisposable={c.emailVerification?.isDisposable} isRoleAccount={c.emailVerification?.isRoleAccount} /></span>
              <VerificationPill v={c.emailVerification} />
            </>
          )}
          {c.emailEnrichment && (
            <span className="pc-found" title={c.emailEnrichment.score != null ? t('prospectCard.hunterConfidenceTitle', { score: c.emailEnrichment.score }) : undefined}>
              {t('prospectCard.foundViaHunterAuto')}
            </span>
          )}
        </div>

        {c.facts.length > 0 && (
          <ul className="pc-facts">
            {c.facts.map((f) => (
              <li key={f.label}><span className="pc-fact-label">{f.label}</span><span className="pc-fact-value">{f.value}</span></li>
            ))}
          </ul>
        )}

        <div className="pc-contact">
          {c.phone && <span className="pc-phone">{c.phone}</span>}
          <div className="pc-quick">
            {c.phone && <a className="pc-iconbtn" href={`tel:${String(c.phone).replace(/[^\d+]/g, '')}`} aria-label={t('prospect.call')} title={t('prospect.call')}><IcPhone /></a>}
            {!c.emailMissing && <a className="pc-iconbtn" href={`mailto:${email}`} aria-label={t('prospect.sendEmail')} title={t('prospect.sendEmail')}><IcMail /></a>}
            {c.linkedinMode === 'open' && <a className="pc-iconbtn" href={c.linkedin.url} target="_blank" rel="noopener noreferrer" aria-label={t('linkedin.iconOpenTitle')} title={t('linkedin.iconOpenTitle')}><LinkedInIcon /></a>}
            {c.linkedinMode === 'search' && <button type="button" className="pc-iconbtn" onClick={c.openLinkedInSearch} aria-label={t('linkedin.iconSearchTitle')} title={t('linkedin.iconSearchTitle')}><LinkedInIcon /></button>}
            {(c.linkedinMode === 'exhausted' || c.linkedinMode === 'offline') && <button type="button" className="pc-iconbtn" disabled aria-disabled="true" title={c.linkedinMode === 'offline' ? t('linkedin.offline') : t('linkedin.exhausted')} aria-label={c.linkedinMode === 'offline' ? t('linkedin.offline') : t('linkedin.exhausted')}><LinkedInIcon /></button>}
            {!c.editing && <button type="button" className="pc-iconbtn" onClick={c.startEdit} aria-label={t('prospectCard.editTitle')} title={t('prospectCard.editTitle')}><IcPencil /></button>}
          </div>
        </div>
        {(c.linkedinMode === 'exhausted' || c.linkedinMode === 'offline') && (
          <div className="pc-li-note">{c.linkedinMode === 'offline' ? t('linkedin.offline') : t('linkedin.exhausted')}</div>
        )}
      </div>
    </header>
  );
}
