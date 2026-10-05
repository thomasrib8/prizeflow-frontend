import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Badge, Button, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { useGuestFlow } from '../hooks/useGuestFlow';
import { useLaunchQueue, toggleValue } from '../hooks/useLaunchQueue';
import { useProspectAddedToast } from '../hooks/useProspectAddedToast';
import GuestFlowScreen from '../components/GuestFlowScreen';
import ProspectCard from '../components/ProspectCard';
import NewProspectModal from '../components/NewProspectModal';
import FilterGroup from '../components/FilterGroup';

// A shared tablet cycles through walk-up guests one after another, so unlike
// the personal-phone guest page: never persist the session, and auto-return
// to the form 7s after the reveal instead of staying on it.
function KioskOverlay({ token, onClose }) {
  const flow = useGuestFlow({ token, persistSession: false, autoReturnMs: 7000, source: 'kiosk' });
  return (
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
    <div>
      <div className="page-header launch-header">
        <div>
          <h1 className="page-title">{t('launchCampaign.pageTitle')}</h1>
          <p className="page-subtitle">{t('launchCampaign.pageSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone={agentConnected ? 'green' : 'red'}>{agentConnected ? t('pwa.wheelReady') : t('pwa.wheelOffline')}</Badge>
          {q.scanEnabled && q.campaign && (
            // A label around a hidden file input, so one tap opens the camera
            // directly (the browser only allows that from a real tap).
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('pwa.currentlyPlaying')}
                </div>
                {q.queue.active ? (
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#03041A' }}>
                      <button
                        type="button"
                        onClick={() => setNoteGuest({ email: q.queue.active.email, firstName: q.queue.active.firstName, lastName: q.queue.active.lastName })}
                        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 600, color: '#002881', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {q.queue.active.firstName}
                      </button>
                      {' '}— {q.queue.active.launched ? t('pwa.spinning') : t('pwa.waitingToSpin')}
                      {q.queue.active.retryMessage && (
                        <span style={{ marginLeft: 10, fontSize: 12, color: '#EF4444' }}>({q.queue.active.retryMessage})</span>
                      )}
                    </div>
                    {/* The gift order is predetermined (see sequence.js) — the
                        wheel only announces it, so staff can see it before the
                        spin happens. */}
                    {q.queue.active.giftName && (
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                        {t('pwa.willWin')} <strong style={{ color: '#0055F8' }}>{q.queue.active.giftName}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={q.queueActionBusy}
                        onClick={q.handleSkipPlayer}
                        style={{
                          background: '#F59E0B', color: 'white', border: 'none', borderRadius: 8,
                          padding: '13px 16px', minHeight: 44, fontSize: 13, fontWeight: 700, cursor: q.queueActionBusy ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: q.queueActionBusy ? 0.6 : 1,
                        }}
                      >
                        {t('pwa.skipPlayer')}
                      </button>
                      <button
                        type="button"
                        disabled={q.queueActionBusy}
                        onClick={q.handleCancelPlayer}
                        style={{
                          background: '#EF4444', color: 'white', border: 'none', borderRadius: 8,
                          padding: '13px 16px', minHeight: 44, fontSize: 13, fontWeight: 700, cursor: q.queueActionBusy ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: q.queueActionBusy ? 0.6 : 1,
                        }}
                      >
                        {t('pwa.cancelPlayer')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="page-subtitle" style={{ margin: 0 }}>{t('pwa.nobodyRightNow')}</p>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('pwa.waitingLabel', { count: q.queue.waiting.length })}
                </div>
                {q.queue.waiting.length === 0 ? (
                  <p className="page-subtitle" style={{ margin: 0 }}>{t('pwa.noOneInLine')}</p>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#334155' }}>
                    {q.queue.waiting.map((w, i) => <li key={i}>{w.firstName}</li>)}
                  </ol>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('launchCampaign.recentResultsTitle')}
                </div>
                {q.queue.recentCompleted.length === 0 ? (
                  <p className="page-subtitle" style={{ margin: 0 }}>{t('launchCampaign.noSpinsYet')}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.queue.recentCompleted.map((r, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#334155' }}>
                        <strong>{r.firstName}</strong> — {r.isTest ? r.giftName : t('launchCampaign.rewardSentByEmail')}
                      </div>
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
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <input
                placeholder={t('launchCampaign.searchPlaceholder')}
                value={q.playerSearch}
                onChange={(e) => q.setPlayerSearch(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
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
            <table className="data-table">
              <thead>
                <tr><th>{t('launchCampaign.tableNameHeader')}</th><th>{t('common.gift')}</th><th>{t('common.segment')}</th><th>{t('launchCampaign.tableLeadHeader')}</th><th>{t('common.noteLabel')}</th></tr>
              </thead>
              <tbody>
                {q.filteredRecentPlayers.map((p) => (
                  <tr key={p.rewardId} style={{ cursor: 'pointer' }} onClick={() => setNoteGuest({
                    email: p.email, firstName: p.first_name, lastName: p.last_name,
                  })}>
                    <td style={{ color: '#002881', fontWeight: 600, textDecoration: 'underline' }}>{p.first_name} {p.last_name}</td>
                    <td>
                      {p.gift_name || (
                        <span style={{ color: '#94A3B8', fontSize: 12 }}>
                          {p.outcome === 'manual' ? t('pwa.noGift') : p.outcome === 'cancelled' ? t('pwa.noGiftCancelled') : t('pwa.noGiftSkipped')}
                        </span>
                      )}
                    </td>
                    <td style={{ color: '#64748B' }}>{p.segment || '—'}</td>
                    <td>{p.lead_rating ? '★'.repeat(p.lead_rating) + '☆'.repeat(3 - p.lead_rating) : '—'}</td>
                    <td style={{ color: '#64748B', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
