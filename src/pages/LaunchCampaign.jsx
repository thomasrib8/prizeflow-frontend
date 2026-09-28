import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { Card, Badge, Button, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { useGuestFlow } from '../hooks/useGuestFlow';
import { useLaunchQueue, toggleValue } from '../hooks/useLaunchQueue';
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
// a phone. See LaunchPWA.jsx for the phone-only, QR-less equivalent meant to
// be installed as its own home-screen app for a sales rep.
export default function LaunchCampaign() {
  const { agentConnected } = useWheelSocket();
  const q = useLaunchQueue();
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [guestUrl, setGuestUrl] = useState('');
  const [showKiosk, setShowKiosk] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [noteGuest, setNoteGuest] = useState(null); // { email, firstName, lastName } | null
  const [showNewProspect, setShowNewProspect] = useState(false);
  const [scanFile, setScanFile] = useState(null); // photo taken from the header's Scan button, handed to the popup
  const [prospectAdded, setProspectAdded] = useState('');
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
          <h1 className="page-title">Launch Campaign</h1>
          <p className="page-subtitle">Guests scan the QR code below to play from their own phone</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone={agentConnected ? 'green' : 'red'}>{agentConnected ? 'Wheel ready' : 'Wheel offline'}</Badge>
          {q.scanEnabled && q.campaign && (
            // A label around a hidden file input, so one tap opens the camera
            // directly (the browser only allows that from a real tap).
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              📷 Scan badge
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
          <Button variant="secondary" onClick={() => { setScanFile(null); setShowNewProspect(true); }} disabled={!q.campaign}>+ New prospect</Button>
          <Button onClick={() => setShowKiosk(true)} disabled={!q.campaign}>SPIN THE WHEEL</Button>
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
          <EmptyState title="No campaign is currently active" description="Start one from the Campaigns page to get its QR code." />
        </Card>
      )}

      {q.campaign !== null && (
      <div className="qr-layout">
        <Card title="Guest QR code">
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Guest QR code" style={{ width: 240, height: 240 }} />
            ) : (
              <p className="page-subtitle">Loading…</p>
            )}
            {guestUrl && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 12, wordBreak: 'break-all' }}>{guestUrl}</p>
            )}
            {q.campaign && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Campaign: {q.campaign.name}</p>
            )}
            {qrDataUrl && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <Button size="sm" variant="secondary" onClick={handleDownloadPng}>Download PNG</Button>
                <Button size="sm" variant="secondary" disabled={pdfBusy} onClick={handleDownloadPdf}>
                  {pdfBusy ? 'Generating…' : 'Download PDF'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card title="Live queue">
          {!q.queue && <p className="page-subtitle">Loading…</p>}
          {q.queue && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Currently playing
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
                      {' '}— {q.queue.active.launched ? 'spinning…' : 'waiting to spin'}
                      {q.queue.active.retryMessage && (
                        <span style={{ marginLeft: 10, fontSize: 12, color: '#EF4444' }}>({q.queue.active.retryMessage})</span>
                      )}
                    </div>
                    {/* The gift order is predetermined (see sequence.js) — the
                        wheel only announces it, so staff can see it before the
                        spin happens. */}
                    {q.queue.active.giftName && (
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                        Will win: <strong style={{ color: '#0055F8' }}>{q.queue.active.giftName}</strong>
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
                        Passer le joueur
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
                        Annuler le joueur
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="page-subtitle" style={{ margin: 0 }}>Nobody right now</p>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Waiting ({q.queue.waiting.length})
                </div>
                {q.queue.waiting.length === 0 ? (
                  <p className="page-subtitle" style={{ margin: 0 }}>No one in line</p>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#334155' }}>
                    {q.queue.waiting.map((w, i) => <li key={i}>{w.firstName}</li>)}
                  </ol>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Recent results
                </div>
                {q.queue.recentCompleted.length === 0 ? (
                  <p className="page-subtitle" style={{ margin: 0 }}>No spins yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.queue.recentCompleted.map((r, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#334155' }}>
                        <strong>{r.firstName}</strong> — {r.isTest ? r.giftName : 'reward sent by email'}
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
        <Card title="Last 20 players" className="mt-card">
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>
            Click a name to add or edit a note, lead rating, or customer segment for them.
          </p>
          {q.recentPlayers && q.recentPlayers.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <input
                placeholder="Search by name, email, gift, segment or note…"
                value={q.playerSearch}
                onChange={(e) => q.setPlayerSearch(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
              />
              <Button variant="secondary" onClick={() => setPlayerFiltersOpen(true)} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                Filters{q.playerActiveFilterCount > 0 ? ` (${q.playerActiveFilterCount})` : ''}
              </Button>
            </div>
          )}
          {!q.recentPlayers && <p className="page-subtitle">Loading…</p>}
          {q.recentPlayers && q.recentPlayers.length === 0 && <p className="page-subtitle">No players yet.</p>}
          {q.recentPlayers && q.recentPlayers.length > 0 && q.filteredRecentPlayers.length === 0 && (
            <p className="page-subtitle">No players match your search or filters.</p>
          )}
          {q.recentPlayers && q.filteredRecentPlayers.length > 0 && (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Gift</th><th>Segment</th><th>Lead</th><th>Note</th></tr>
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
                          No gift · {p.outcome === 'cancelled' ? 'cancelled' : 'skipped'}
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Filters</h3>
              {q.playerActiveFilterCount > 0 && (
                <button
                  onClick={() => { q.setPlayerFilterGifts([]); q.setPlayerFilterSegments([]); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--link)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Clear all</button>
              )}
            </div>

            <FilterGroup title="Gift" options={q.playerGiftOptions} selected={q.playerFilterGifts}
              onToggle={(v) => q.setPlayerFilterGifts(toggleValue(q.playerFilterGifts, v))} />
            <FilterGroup title="Segment" options={q.playerSegmentOptions} selected={q.playerFilterSegments}
              onToggle={(v) => q.setPlayerFilterSegments(toggleValue(q.playerFilterSegments, v))} />

            <Button onClick={() => setPlayerFiltersOpen(false)} style={{ marginTop: 4 }}>Done</Button>
          </div>
        </div>
      )}

      {showNewProspect && q.campaign && (
        <NewProspectModal
          campaign={q.campaign}
          initialFile={scanFile}
          scanEnabled={q.scanEnabled}
          onClose={() => { setShowNewProspect(false); setScanFile(null); }}
          onCreated={({ name, queued, emailMissing }) => {
            setProspectAdded(
              `${name || 'The prospect'} was added to the CRM${queued ? ' and put in the queue' : ''}.` +
              (emailMissing ? ' No email yet — add it from their card (their gift is held until then).' : '')
            );
            setTimeout(() => setProspectAdded(''), 8000);
          }}
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
