import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

// Phone / box app, dynamic distribution: the stock of each case and "add stock" (works offline too: the box applies it at once and
// sends it to the cloud when the internet is back). Nothing is shown for a campaign that uses the static method.
export default function PwaStockCard({ campaign }) {
  const { t } = useTranslation('admin');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null); // { slotIndex, giftName, add }
  const [busy, setBusy] = useState(false);
  const dynamic = campaign && campaign.distribution_mode === 'dynamic';
  const load = useCallback(() => api.getDynamicState(campaign.id).then(setData).catch((e) => setError(e.message)), [campaign && campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dynamic) return undefined;
    load();
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
  }, [dynamic, load]);
  if (!dynamic || !data) return null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.restockCampaign(campaign.id, { slotIndex: open.slotIndex, add: Number(open.add) });
      setOpen(null); await load();
    } catch (err) {
      setError(t(`dynamic.err.${err.code}`, { defaultValue: err.message }));
    } finally { setBusy(false); }
  }

  return (
    <section className="pw-card pw-card-pad" aria-label={t('dynamic.stockTitle')}>
      <div className="pw-card-head"><h2 className="pw-card-title">{t('dynamic.stockTitle')}</h2></div>
      {data.suspended && <div className="pw-queue-retry" style={{ marginBottom: 8 }}><b>{t('dynamic.suspendedTitle')}</b> — {t('dynamic.suspendedLaunch')}</div>}
      {error && <div className="pw-queue-retry">{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.cases.map((c) => (
          <div key={c.slotIndex} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: c.available ? 1 : 0.65 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.giftName}</div>
              <div style={{ fontSize: 12, color: 'var(--pw-soft)' }}>{t('dynamic.colEffective')} {Math.round(c.effectiveProbability * 100) / 100} %</div>
            </div>
            <div style={{ fontWeight: 800, minWidth: 54, textAlign: 'right' }}>{c.unlimited ? t('dynamic.unlimitedShort') : c.stockRemaining}</div>
            {!c.unlimited && <button type="button" className="pw-queue-btn skip" onClick={() => setOpen({ slotIndex: c.slotIndex, giftName: c.giftName, add: '' })}>+ {t('dynamic.addShort')}</button>}
          </div>
        ))}
      </div>
      {open && (
        <form onSubmit={submit} style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <b style={{ fontSize: 13 }}>{open.giftName}</b>
          <input type="number" min="1" step="1" autoFocus required value={open.add} onChange={(e) => setOpen({ ...open, add: e.target.value })} style={{ width: 90 }} aria-label={t('dynamic.quantity')} />
          <button type="submit" className="pw-queue-btn skip" disabled={busy || !(Number(open.add) >= 1)}>{t('dynamic.add')}</button>
          <button type="button" className="pw-queue-btn cancel" disabled={busy} onClick={() => setOpen(null)}>{t('common.cancel')}</button>
        </form>
      )}
    </section>
  );
}
