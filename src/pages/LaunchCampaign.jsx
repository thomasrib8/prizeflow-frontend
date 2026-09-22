import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { Card, Badge, Button, EmptyState } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { useGuestFlow } from '../hooks/useGuestFlow';
import GuestFlowScreen from '../components/GuestFlowScreen';
import ProspectCard from '../components/ProspectCard';

const POLL_INTERVAL_MS = 2000;

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
// a phone.
export default function LaunchCampaign() {
  const { agentConnected } = useWheelSocket();
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [guestUrl, setGuestUrl] = useState('');
  const [campaign, setCampaign] = useState(undefined); // undefined while loading, null if none active
  const [error, setError] = useState('');
  const [queue, setQueue] = useState(null);
  const [showKiosk, setShowKiosk] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [recentPlayers, setRecentPlayers] = useState(null);
  const [noteGuest, setNoteGuest] = useState(null); // { email, firstName, lastName, note?, leadRating?, segment? } | null
  const [queueActionBusy, setQueueActionBusy] = useState(false);

  function handleDownloadPng() {
    if (!qrDataUrl || !campaign) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${campaign.id}-qr.png`;
    a.click();
  }

  async function handleDownloadPdf() {
    if (!campaign) return;
    setPdfBusy(true);
    setError('');
    try {
      await api.downloadCampaignQrPdf(campaign.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setPdfBusy(false);
    }
  }

  useEffect(() => {
    api.listCampaigns()
      .then((rows) => {
        const active = rows.find((c) => c.status === 'active') || null;
        if (!active) { setCampaign(null); return null; }
        // The list endpoint doesn't include segments (see routes/campaigns.js)
        // — fetch the full campaign once we know which one is active.
        return api.getCampaign(active.id).then((full) => {
          setCampaign(full);
          const url = `${window.location.origin}/play/${full.public_token}`;
          setGuestUrl(url);
          return QRCode.toDataURL(url, { width: 320, margin: 1 });
        });
      })
      .then((dataUrl) => { if (dataUrl) setQrDataUrl(dataUrl); })
      .catch((e) => setError(e.message));
  }, []);

  function loadRecentPlayers(campaignId) {
    api.getRecentPlayers(campaignId).then(setRecentPlayers).catch(() => {});
  }

  useEffect(() => {
    if (!campaign) return undefined;
    let cancelled = false;
    async function poll() {
      try {
        const res = await api.getGuestQueueSnapshot(campaign.id);
        if (!cancelled) setQueue(res);
      } catch {
        // transient network hiccup — just try again next tick
      }
      if (!cancelled) loadRecentPlayers(campaign.id);
    }
    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id]);

  async function handleCancelPlayer() {
    if (!campaign || queueActionBusy) return;
    setQueueActionBusy(true);
    try {
      await api.cancelActivePlayer(campaign.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setQueueActionBusy(false);
    }
  }

  async function handleSkipPlayer() {
    if (!campaign || queueActionBusy) return;
    setQueueActionBusy(true);
    try {
      await api.skipActivePlayer(campaign.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setQueueActionBusy(false);
    }
  }

  function handleNoteSaved() {
    if (campaign) loadRecentPlayers(campaign.id);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Launch Campaign</h1>
          <p className="page-subtitle">Guests scan the QR code below to play from their own phone</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge tone={agentConnected ? 'green' : 'red'}>{agentConnected ? 'Wheel ready' : 'Wheel offline'}</Badge>
          <Button onClick={() => setShowKiosk(true)} disabled={!campaign}>SPIN THE WHEEL</Button>
        </div>
      </div>

      {showKiosk && campaign && <KioskOverlay token={campaign.public_token} onClose={() => setShowKiosk(false)} />}

      {error && <div className="error-banner">{error}</div>}

      {campaign === null && (
        <Card className="mt-card">
          <EmptyState title="No campaign is currently active" description="Start one from the Campaigns page to get its QR code." />
        </Card>
      )}

      {campaign !== null && (
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
            {campaign && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Campaign: {campaign.name}</p>
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
          {!queue && <p className="page-subtitle">Loading…</p>}
          {queue && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Currently playing
                </div>
                {queue.active ? (
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#03041A' }}>
                      <button
                        type="button"
                        onClick={() => setNoteGuest({ email: queue.active.email, firstName: queue.active.firstName, lastName: queue.active.lastName })}
                        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 600, color: '#002881', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {queue.active.firstName}
                      </button>
                      {' '}— {queue.active.launched ? 'spinning…' : 'waiting to spin'}
                      {queue.active.retryMessage && (
                        <span style={{ marginLeft: 10, fontSize: 12, color: '#EF4444' }}>({queue.active.retryMessage})</span>
                      )}
                    </div>
                    {/* The gift order is predetermined (see sequence.js) — the
                        wheel only announces it, so staff can see it before the
                        spin happens. */}
                    {queue.active.giftName && (
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                        Will win: <strong style={{ color: '#0055F8' }}>{queue.active.giftName}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={queueActionBusy}
                        onClick={handleSkipPlayer}
                        style={{
                          background: '#F59E0B', color: 'white', border: 'none', borderRadius: 8,
                          padding: '13px 16px', minHeight: 44, fontSize: 13, fontWeight: 700, cursor: queueActionBusy ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: queueActionBusy ? 0.6 : 1,
                        }}
                      >
                        Passer le joueur
                      </button>
                      <button
                        type="button"
                        disabled={queueActionBusy}
                        onClick={handleCancelPlayer}
                        style={{
                          background: '#EF4444', color: 'white', border: 'none', borderRadius: 8,
                          padding: '13px 16px', minHeight: 44, fontSize: 13, fontWeight: 700, cursor: queueActionBusy ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: queueActionBusy ? 0.6 : 1,
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
                  Waiting ({queue.waiting.length})
                </div>
                {queue.waiting.length === 0 ? (
                  <p className="page-subtitle" style={{ margin: 0 }}>No one in line</p>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#334155' }}>
                    {queue.waiting.map((w, i) => <li key={i}>{w.firstName}</li>)}
                  </ol>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Recent results
                </div>
                {queue.recentCompleted.length === 0 ? (
                  <p className="page-subtitle" style={{ margin: 0 }}>No spins yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {queue.recentCompleted.map((r, i) => (
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

      {campaign !== null && (
        <Card title="Last 20 players" className="mt-card">
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>
            Click a name to add or edit a note, lead rating, or customer segment for them.
          </p>
          {!recentPlayers && <p className="page-subtitle">Loading…</p>}
          {recentPlayers && recentPlayers.length === 0 && <p className="page-subtitle">No players yet.</p>}
          {recentPlayers && recentPlayers.length > 0 && (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Gift</th><th>Segment</th><th>Lead</th><th>Note</th></tr>
              </thead>
              <tbody>
                {recentPlayers.map((p) => (
                  <tr key={p.rewardId} style={{ cursor: 'pointer' }} onClick={() => setNoteGuest({
                    email: p.email, firstName: p.first_name, lastName: p.last_name,
                  })}>
                    <td style={{ color: '#002881', fontWeight: 600, textDecoration: 'underline' }}>{p.first_name} {p.last_name}</td>
                    <td>{p.gift_name}</td>
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

      {noteGuest && campaign && (
        <ProspectCard
          campaignId={campaign.id}
          guest={noteGuest}
          initialMode="edit"
          onClose={() => setNoteGuest(null)}
          onSaved={handleNoteSaved}
        />
      )}
    </div>
  );
}
