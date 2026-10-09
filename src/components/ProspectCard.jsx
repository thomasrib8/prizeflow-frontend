// The prospect's card — the sales rep's view of one guest within one campaign. One component for the phone
// (a full-screen sheet) and the desktop (a large modal with a right-hand column); both read the same state
// (useProspectCard) and only the arrangement differs. Three callers: the CRM list (opens read-only first),
// the Launch page and the PWA (open straight into edit mode so a rep can fill the card on the spot).
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';
import { IS_BOX_BUILD } from '../utils/boxMode';
import { useProspectCard } from './prospect/useProspectCard';
import ProspectHeader from './prospect/ProspectHeader';
import ProspectNote from './prospect/ProspectNote';
import ProspectQualification from './prospect/ProspectQualification';
import SuggestedNextSteps from './prospect/SuggestedNextSteps';
import LeadPotentialRating from './prospect/LeadPotentialRating';
import TagsField from './prospect/TagsField';
import EmailMissingBox from './prospect/EmailMissingBox';
import { ProspectHistory, ProspectCampaigns, ProspectManualNotes, ProspectExtrasMobile } from './prospect/ProspectExtras';
import { IcBack, IcClose, IcMore } from './prospect/icons';
import LinkedInSearchDialog from './linkedin/LinkedInSearchDialog';
import './prospect/prospect-card.css';

function MoreMenu({ c, email }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const items = [
    !c.emailMissing && { key: 'email', label: c.t('prospect.copyEmail'), value: email },
    c.phone && { key: 'phone', label: c.t('prospect.copyPhone'), value: c.phone },
  ].filter(Boolean);
  if (!items.length) return null;
  async function copy(item) {
    try { await navigator.clipboard.writeText(item.value); setDone(c.t('prospect.copied')); } catch { setDone(''); }
    setTimeout(() => { setDone(''); setOpen(false); }, 900);
  }
  return (
    <div className="pc-more" ref={ref}>
      <button type="button" className="pc-iconbtn ghost" onClick={() => setOpen((v) => !v)} aria-label={c.t('prospect.more')} aria-expanded={open}><IcMore /></button>
      {open && (
        <div className="pc-menu" role="menu">
          {done ? <div className="pc-menu-done">{done}</div> : items.map((it) => (
            <button key={it.key} type="button" role="menuitem" onClick={() => copy(it)}>{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProspectCard({ campaignId, guest, initialMode = 'edit', onClose, onSaved }) {
  const c = useProspectCard({ campaignId, guest, initialMode, onClose, onSaved });
  const { t } = c;
  const email = guest.email;

  return (
    <div className="pc-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) c.requestClose(); }}>
      <div className={`pc${IS_BOX_BUILD ? ' pc-offline' : ''}`} role="dialog" aria-modal="true" aria-label={c.displayName}>
        <div className="pc-topbar">
          <button type="button" className="pc-iconbtn ghost pc-only-mobile" onClick={c.requestClose} aria-label={t('prospect.back')}><IcBack /></button>
          <div className="pc-topbar-space" />
          <MoreMenu c={c} email={email} />
          <button type="button" className="pc-iconbtn ghost pc-only-desktop" onClick={c.requestClose} aria-label={t('common.close')}><IcClose /></button>
        </div>

        {c.loading ? (
          <p className="pc-loading">{t('common.loading')}</p>
        ) : (
          <div className="pc-body">
            <div className="pc-main">
              {c.error && <div className="error-banner">{c.error}</div>}
              <ProspectHeader c={c} email={email} />
              {c.emailMissing && <EmailMissingBox c={c} />}
              <ProspectNote c={c} />
              <ProspectQualification c={c} />
              <ProspectExtrasMobile c={c} offline={IS_BOX_BUILD} />
            </div>

            <aside className="pc-side">
              <section className="pc-card pc-potential">
                <div className="pc-side-row">
                  <span className="pc-cell-label">{t('prospect.potential')}</span>
                  <LeadPotentialRating value={c.leadRating} onChange={c.setRating} size={24} />
                </div>
                <TagsField c={c} />
              </section>
              {!IS_BOX_BUILD && <ProspectHistory c={c} />}
              {!IS_BOX_BUILD && <ProspectCampaigns c={c} />}
              <ProspectManualNotes c={c} offline={IS_BOX_BUILD} />
              <SuggestedNextSteps c={c} />
            </aside>
          </div>
        )}

        {c.linkedinDialog && (
          <LinkedInSearchDialog
            campaignId={campaignId}
            person={{ firstName: guest.firstName, lastName: guest.lastName, email: c.emailMissing ? '' : guest.email, company: c.companyHint }}
            prospectSaved
            credits={c.linkedinCredits}
            onCredits={c.setLinkedinCredits}
            onClose={() => c.setLinkedinDialog(false)}
            onLinked={c.handleLinkedInLinked}
          />
        )}

        {!c.loading && c.editing ? (
          <div className="pc-actionbar">
            <Button type="button" variant="secondary" onClick={c.cancelEdit} disabled={c.saving}>{t('common.cancel')}</Button>
            <Button type="button" onClick={c.handleSave} disabled={c.saving}>{c.saving ? t('common.saving') : t('common.save')}</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
