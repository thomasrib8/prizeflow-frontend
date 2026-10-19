import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { useGuestFlow } from '../hooks/useGuestFlow';
import { useLaunchQueue, toggleValue } from '../hooks/useLaunchQueue';
import { useProspectAddedToast } from '../hooks/useProspectAddedToast';
import GuestFlowScreen from '../components/GuestFlowScreen';
import { boxHotspotKioskUrl, boxKioskUrl, getBoxUrl, setBoxUrl } from '../utils/offlineBox';
import CloudLostBanner from '../components/CloudLostBanner';
import { useCloudWatch } from '../hooks/useCloudWatch';
import { useWheelLost } from '../hooks/useWheelLost';
import { OfflineReviews, useOfflineBox } from '../components/OfflineBoxStatus';
import ProspectCard from '../components/ProspectCard';
import NewProspectModal from '../components/NewProspectModal';
import FilterGroup from '../components/FilterGroup';
import './crm.css';
import './launch.css';

const AVATARS = [['#0055F8', '#002881'], ['#00B0FF', '#0055F8'], ['#7AA8FF', '#0055F8'], ['#002881', '#0B1437'], ['#1AA864', '#0D9488'], ['#9333EA', '#4F46E5']];
function avatarGradient(seed) {
  let h = 0; for (const ch of String(seed || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = AVATARS[h % AVATARS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
const initialsOf = (p) => `${(p.first_name || '').trim().charAt(0)}${(p.last_name || '').trim().charAt(0)}` || (p.email || '?').charAt(0);

// A shared tablet cycles through walk-up guests one after another, so unlike
// the personal-phone guest page: never persist the session, and auto-return
// to the form 7s after the reveal instead of staying on it.
function KioskOverlay({ token, onClose }) {
  const { t } = useTranslation('admin');
  const flow = useGuestFlow({ token, persistSession: false, autoReturnMs: 7000, source: 'kiosk', watchConnection: true });
  function editBoxAddress() {
    const next = window.prompt(t('launchCampaign.boxAddressPrompt'), getBoxUrl());
    if (next !== null) setBoxUrl(next);
  }
  return (
    <>
    {flow.connectionLost && (
      <div
        role="alert"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', background: '#B91C1C', color: 'white', fontSize: 14, fontWeight: 700 }}
      >
        <span>{t('launchCampaign.connectionLost')}</span>
        <button
          type="button"
          onClick={() => { window.location.href = boxKioskUrl(token); }}
          style={{ background: 'white', color: '#B91C1C', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {t('launchCampaign.switchToLocal')}
        </button>
        <button
          type="button"
          onClick={() => { window.location.href = boxHotspotKioskUrl(token); }}
          style={{ background: 'none', border: '1px solid white', color: 'white', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {t('launchCampaign.switchToLocalHotspot')}
        </button>
        <button
          type="button"
          onClick={editBoxAddress}
          style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'underline', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {t('launchCampaign.editBoxAddress')}
        </button>
      </div>
    )}
    <GuestFlowScreen
      view={flow.view}
      campaignInfo={flow.campaignInfo}
      form={flow.form}
      setForm={flow.setForm}
      error={flow.error}
      busy={flow.busy}
      status={flow.status}
      onSubmit={flow.handleSubmit}
      onRestart={flow.restart}
      onClose={onClose}
      onOpenReview={flow.openReviewLink}
    />
    </>
  );
}

// Staff-facing: guests never see this page. It shows the QR code that leads
// to the guest flow (/play/:token) for whichever campaign is currently
// active — each campaign has its own token (so guests from a past campaign
// never collide with a new one) — plus a "Spin the wheel" button that opens
// the same guest flow full-screen on this device, for walk-up guests without
// a phone. See pages/pwa/ for the phone-only, QR-less equivalent meant to
// be installed as its own home-screen app for a sales rep.
export default function LaunchCampaign() {
  const { t } = useTranslation('admin');
  const { agentConnected } = useWheelSocket();
  const q = useLaunchQueue();
  const offlineBox = useOfflineBox();
  const cloudLost = useCloudWatch(true);
  const wheelLost = useWheelLost({ agentConnected, hasCampaign: !!q.campaign, boxSeen: !!(offlineBox.status && offlineBox.status.boxSeen) });
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [guestUrl, setGuestUrl] = useState('');
  const [showKiosk, setShowKiosk] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [noteGuest, setNoteGuest] = useState(null); // { email, firstName, lastName } | null
  const [showNewProspect, setShowNewProspect] = useState(false);
  const [scanFile, setScanFile] = useState(null); // photo taken from the header's Scan button, handed to the popup
  const { message: prospectAdded, notify: notifyProspectAdded } = useProspectAddedToast();
  const [playerFiltersOpen, setPlayerFiltersOpen] = useState(false);

  useEffect(() => {
    if (!q.campaign) return;
    const url = `${window.location.origin}/play/${q.campaign.public_token}`;
    setGuestUrl(url);
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setQrDataUrl).catch((e) => q.setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.campaign?.id]);

  function handleDownloadPng() {
    if (!qrDataUrl || !q.campaign) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${q.campaign.id}-qr.png`;
    a.click();
  }

  async function handleDownloadPdf() {
    if (!q.campaign) return;
    setPdfBusy(true);
    q.setError('');
    try {
      await api.downloadCampaignQrPdf(q.campaign.id);
    } catch (e) {
      q.setError(e.message);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="ap lc">
      {(cloudLost || wheelLost) && <CloudLostBanner reason={cloudLost ? 'cloud' : 'wheel'} kioskUrl={q.campaign ? boxKioskUrl(q.campaign.public_token) : null} />}
      <div className="page-header launch-header">
        <div>
          <h1 className="page-title">{t('launchCampaign.pageTitle')}</h1>
          <p className="page-subtitle">{t('launchCampaign.pageSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className={`lc-pill${agentConnected ? ' on' : ''}`}>{agentConnected ? t('pwa.wheelReady') : t('pwa.wheelOffline')}</span>
          {q.campaign && (
            // The tablet's kiosk, served by the offline box (works with no internet, on Spark-Local or the venue Wi-Fi).
            <a className="btn btn-secondary" href={boxKioskUrl(q.campaign.public_token)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M11 18h2" /></svg>
              {t('launchCampaign.offlineKioskBtn')}
            </a>
          )}
          {q.scanEnabled && q.campaign && (
            // A label around a hidden file input, so one tap opens the camera
            // directly (the browser only allows that from a real tap).
            <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
              {t('launchCampaign.scanBadgeBtn')}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) { setScanFile(f); setShowNewProspect(true); }
                }}
              />
            </label>
          )}
          <Button variant="secondary" onClick={() => { setScanFile(null); setShowNewProspect(true); }} disabled={!q.campaign}>{t('pwa.newProspect')}</Button>
          <Button onClick={() => setShowKiosk(true)} disabled={!q.campaign}>{t('launchCampaign.spinWheelBtn')}</Button>
        </div>
      </div>

      <OfflineReviews reviews={offlineBox.reviews} onChanged={offlineBox.reload} />

      {showKiosk && q.campaign && <KioskOverlay token={q.campaign.public_token} onClose={() => setShowKiosk(false)} />}

      {q.error && <div className="error-banner">{q.error}</div>}

      {prospectAdded && (
        <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#047857', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          ✓ {prospectAdded}
        </div>
      )}

      {q.campaign === null && (
        <Card className="mt-card">
          <EmptyState title={t('pwa.noCampaignTitle')} description={t('launchCampaign.noCampaignDesc')} />
        </Card>
      )}

      {q.campaign !== null && (
      <div className="qr-layout">
        <Card title={t('launchCampaign.guestQrCodeTitle')}>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Guest QR code" style={{ width: 240, height: 240 }} />
            ) : (
              <p className="page-subtitle">{t('common.loading')}</p>
            )}
            {guestUrl && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 12, wordBreak: 'break-all' }}>{guestUrl}</p>
            )}
            {q.campaign && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{t('launchCampaign.campaignLabel', { name: q.campaign.name })}</p>
            )}
            {qrDataUrl && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <Button size="sm" variant="secondary" onClick={handleDownloadPng}>{t('launchCampaign.downloadPngBtn')}</Button>
                <Button size="sm" variant="secondary" disabled={pdfBusy} onClick={handleDownloadPdf}>
                  {pdfBusy ? t('launchCampaign.generatingBtn') : t('launchCampaign.downloadPdfBtn')}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card title={t('pwa.liveQueueTitle')}>
          {!q.queue && <p className="page-subtitle">{t('common.loading')}</p>}
          {q.queue && (
            <div className="lc-queue">
              <div className="lc-sec">
                <div className="lc-label">{t('pwa.currentlyPlaying')}</div>
                {q.queue.active ? (
                  <div className="lc-now">
                    <div className="lc-now-top">
                      <div className="crm-av" style={{ background: avatarGradient(q.queue.active.email || q.queue.active.firstName) }} aria-hidden="true">{(q.queue.active.firstName || '?').charAt(0)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <button type="button" className="crm-name" onClick={() => setNoteGuest({ email: q.queue.active.email, firstName: q.queue.active.firstName, lastName: q.queue.active.lastName })}>{q.queue.active.firstName}</button>
                        {q.queue.active.giftName && <div className="lc-will">{t('pwa.willWin')} <strong>{q.queue.active.giftName}</strong></div>}
                      </div>
                      <span className={`lc-state${q.queue.active.launched ? ' spin' : ''}`}>{q.queue.active.launched ? t('pwa.spinning') : t('pwa.waitingToSpin')}</span>
                    </div>
                    {q.queue.active.retryMessage && <div className="lc-retry">{q.queue.active.retryMessage}</div>}
                    <div className="lc-actions">
                      <button type="button" className="lc-btn warn" disabled={q.queueActionBusy} onClick={q.handleSkipPlayer}>{t('pwa.skipPlayer')}</button>
                      <button type="button" className="lc-btn danger" disabled={q.queueActionBusy} onClick={q.handleCancelPlayer}>{t('pwa.cancelPlayer')}</button>
                    </div>
                  </div>
                ) : (
                  <p className="lc-empty">{t('pwa.nobodyRightNow')}</p>
                )}
              </div>

              <div className="lc-sec">
                <div className="lc-label">{t('pwa.waitingLabel', { count: q.queue.waiting.length })}</div>
                {q.queue.waiting.length === 0 ? (
                  <p className="lc-empty">{t('pwa.noOneInLine')}</p>
                ) : (
                  <div className="lc-wait">{q.queue.waiting.map((w, i) => <span key={i} className="lc-chip"><i>{i + 1}</i>{w.firstName}</span>)}</div>
                )}
              </div>

              <div className="lc-sec">
                <div className="lc-label">{t('launchCampaign.recentResultsTitle')}</div>
                {q.queue.recentCompleted.length === 0 ? (
                  <p className="lc-empty">{t('launchCampaign.noSpinsYet')}</p>
                ) : (
                  <div className="lc-results">
                    {q.queue.recentCompleted.map((r, i) => (
                      <div key={i} className="lc-result"><b>{r.firstName}</b><span>{r.isTest ? r.giftName : t('launchCampaign.rewardSentByEmail')}</span></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
      )}

      {q.campaign !== null && (
        <Card title={t('pwa.last20PlayersTitle')} className="mt-card">
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>
            {t('launchCampaign.clickNameHint')}
          </p>
          {q.recentPlayers && q.recentPlayers.length > 0 && (
            <div className="lc-search">
              <input
                placeholder={t('launchCampaign.searchPlaceholder')}
                value={q.playerSearch}
                onChange={(e) => q.setPlayerSearch(e.target.value)}
              />
              <Button variant="secondary" onClick={() => setPlayerFiltersOpen(true)} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                {t('pwa.filters')}{q.playerActiveFilterCount > 0 ? ` (${q.playerActiveFilterCount})` : ''}
              </Button>
            </div>
          )}
          {!q.recentPlayers && <p className="page-subtitle">{t('common.loading')}</p>}
          {q.recentPlayers && q.recentPlayers.length === 0 && <p className="page-subtitle">{t('pwa.noPlayersYet')}</p>}
          {q.recentPlayers && q.recentPlayers.length > 0 && q.filteredRecentPlayers.length === 0 && (
            <p className="page-subtitle">{t('pwa.noPlayersMatch')}</p>
          )}
          {q.recentPlayers && q.filteredRecentPlayers.length > 0 && (
            <div className="crm-list lc-list">
              <div className="crm-head"><span>{t('launchCampaign.tableNameHeader')}</span><span>{t('common.gift')}</span><span>{t('common.segment')}</span><span>{t('launchCampaign.tableLeadHeader')}</span></div>
              {q.filteredRecentPlayers.map((p) => (
                <div key={p.rewardId} className="crm-row click" style={{ '--c': p.lead_rating === 3 ? '#059669' : p.lead_rating === 2 ? '#F59E0B' : '#0055F8' }} role="button" tabIndex={0}
                  onClick={() => setNoteGuest({ email: p.email, firstName: p.first_name, lastName: p.last_name })}
                  onKeyDown={(e) => { if (e.key === 'Enter') setNoteGuest({ email: p.email, firstName: p.first_name, lastName: p.last_name }); }}>
                  <div className="crm-who">
                    <div className="crm-av" style={{ background: avatarGradient(`${p.first_name} ${p.last_name} ${p.email}`) }} aria-hidden="true">{initialsOf(p)}</div>
                    <div className="crm-who-text">
                      <span className="crm-name plain" style={{ color: '#002881' }}>{p.first_name} {p.last_name}</span>
                      <div className="crm-mail">{p.note || '—'}</div>
                    </div>
                  </div>
                  <div className="crm-gift">
                    {p.gift_name ? <div className="crm-gift-name">{p.gift_name}</div> : (
                      <div className="crm-gift-none">{p.outcome === 'manual' ? t('pwa.noGift') : p.outcome === 'cancelled' ? t('pwa.noGiftCancelled') : t('pwa.noGiftSkipped')}</div>
                    )}
                  </div>
                  <div className="crm-seg">{p.segment ? <span className="crm-chip">{p.segment}</span> : <span className="crm-gift-none">—</span>}</div>
                  <div className="crm-stars">{p.lead_rating ? <>{'★'.repeat(p.lead_rating)}<i>{'★'.repeat(3 - p.lead_rating)}</i></> : <span className="none">—</span>}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {playerFiltersOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t('pwa.filters')}</h3>
              {q.playerActiveFilterCount > 0 && (
                <button
                  onClick={() => { q.setPlayerFilterGifts([]); q.setPlayerFilterSegments([]); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--link)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >{t('pwa.clearAll')}</button>
              )}
            </div>

            <FilterGroup title={t('common.gift')} options={q.playerGiftOptions} selected={q.playerFilterGifts}
              onToggle={(v) => q.setPlayerFilterGifts(toggleValue(q.playerFilterGifts, v))} />
            <FilterGroup title={t('common.segment')} options={q.playerSegmentOptions} selected={q.playerFilterSegments}
              onToggle={(v) => q.setPlayerFilterSegments(toggleValue(q.playerFilterSegments, v))} />

            <Button onClick={() => setPlayerFiltersOpen(false)} style={{ marginTop: 4 }}>{t('common.done')}</Button>
          </div>
        </div>
      )}

      {showNewProspect && q.campaign && (
        <NewProspectModal
          campaign={q.campaign}
          initialFile={scanFile}
          scanEnabled={q.scanEnabled}
          onClose={() => { setShowNewProspect(false); setScanFile(null); }}
          onCreated={notifyProspectAdded}
        />
      )}

      {noteGuest && q.campaign && (
        <ProspectCard
          campaignId={q.campaign.id}
          guest={noteGuest}
          initialMode="edit"
          onClose={() => setNoteGuest(null)}
          onSaved={q.handleNoteSaved}
        />
      )}
    </div>
  );
}
