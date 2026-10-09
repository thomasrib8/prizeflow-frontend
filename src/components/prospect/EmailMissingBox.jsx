// A player who has no e-mail yet (scanned in, or Hunter found nothing): add one, or cancel a gift that can
// never be delivered. Same behaviour as before the redesign — only moved out of the card.
import { Button } from '../ui';

export default function EmailMissingBox({ c }) {
  const { t } = c;
  return (
    <div className="pc-warn">
      <div className="pc-warn-title">{t('common.noEmailYet')}</div>
      <div className="pc-warn-text">
        {c.pendingGift
          ? t('prospectCard.playedWonHold', { date: new Date(c.pendingGift.playedAt.replace(' ', 'T') + 'Z').toLocaleString(), gift: c.pendingGift.giftName })
          : t('prospectCard.ifTheyPlayHold')}
      </div>
      <div className="pc-warn-row">
        <input type="email" placeholder={t('common.emailPlaceholder')} value={c.newEmail} onChange={(e) => c.setNewEmail(e.target.value)} />
        <Button type="button" disabled={c.addingEmail || !c.newEmail.trim()} onClick={c.handleAddEmail}>{c.addingEmail ? t('common.saving') : t('common.addEmail')}</Button>
      </div>
      {c.pendingGift && !c.confirmVoid && (
        <button type="button" className="pc-linkbtn danger" onClick={() => c.setConfirmVoid(true)}>{t('prospectCard.invalidatePlayer')}</button>
      )}
      {c.pendingGift && c.confirmVoid && (
        <div className="pc-warn-confirm">
          <div>{t('prospectCard.voidConfirmText', { gift: c.pendingGift.giftName })}</div>
          <div className="pc-warn-row">
            <Button type="button" size="sm" variant="secondary" disabled={c.voiding} onClick={c.handleVoidReward} style={{ color: '#991B1B' }}>
              {c.voiding ? t('prospectCard.voiding') : t('prospectCard.confirmVoidBtn')}
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={c.voiding} onClick={() => c.setConfirmVoid(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
