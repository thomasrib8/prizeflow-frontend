import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { IS_BOX_BUILD } from '../utils/boxMode';

// "Distribuer" / "Annuler" for one player of the "last players" list on the Launch page, so a gift can be handed over without going to the
// Retrait page. Same calls as the Retrait page (signed code of the reward, then distribute / cancel / undo). Cancelling a gift asks for a
// second tap ("Confirmer ?") so a mis-tap in a crowd cannot void a gift. The server stays the judge: if the gift was already handled elsewhere
// it answers 409, the message is shown and the list is reloaded.
export default function RewardRowActions({ player, onChanged }) {
  const { t } = useTranslation('admin');
  const [status, setStatus] = useState(player.status); // follows the list; set locally right after a click
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);

  useEffect(() => { setStatus(player.status); }, [player.status]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const hasReward = player.rewardId && !String(player.rewardId).startsWith('NOGIFT-');
  // No status = a server that does not send it yet: show nothing rather than a button that could be wrong. Not available on the offline box.
  if (IS_BOX_BUILD || !hasReward || !status) return <span className="none" style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>;

  async function run(action) {
    if (busy) return;
    setBusy(true); setError(''); setConfirming(false); clearTimeout(timer.current);
    try {
      const { code } = await api.getRewardRedeemCode(player.rewardId);
      if (action === 'distribute') await api.distributeReward(code);
      else if (action === 'cancel') await api.cancelReward(code);
      else await api.undistributeReward(code);
      setStatus(action === 'distribute' ? 'redeemed' : action === 'cancel' ? 'cancelled' : 'active');
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setBusy(false);
      if (onChanged) onChanged();
    }
  }

  function onCancelClick() {
    if (!confirming) {
      setConfirming(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setConfirming(false), 4000); // an unconfirmed tap expires by itself
      return;
    }
    run('cancel');
  }

  if (status === 'active') {
    return (
      <>
        <button type="button" className="lc-btn lc-do" disabled={busy} onClick={() => run('distribute')}>{busy ? t('launchCampaign.redeemBusy') : t('rewardCard.distributeBtn')}</button>
        <button type="button" className={`lc-btn lc-no${confirming ? ' sure' : ''}`} disabled={busy} onClick={onCancelClick}>{confirming ? t('launchCampaign.redeemConfirmCancel') : t('common.cancel')}</button>
        {error && <span className="lc-act-err" role="alert" title={error}>!</span>}
      </>
    );
  }
  if (status === 'redeemed') {
    return (
      <>
        <span className="lc-chip-st lc-st-redeemed">{t('rewards.statusDistributed')}</span>
        <button type="button" className="lc-btn lc-undo" disabled={busy} onClick={() => run('undo')} title={t('launchCampaign.redeemUndoHint')} aria-label={t('launchCampaign.redeemUndoHint')}>↺</button>
        {error && <span className="lc-act-err" role="alert" title={error}>!</span>}
      </>
    );
  }
  if (status === 'cancelled') return <span className="lc-chip-st lc-st-cancelled">{t('history.rewardStatusCancelled')}</span>;
  if (status === 'expired') return <span className="lc-chip-st lc-st-expired">{t('history.rewardStatusExpired')}</span>;
  return <span className="lc-chip-st lc-st-expired">{status}</span>;
}
