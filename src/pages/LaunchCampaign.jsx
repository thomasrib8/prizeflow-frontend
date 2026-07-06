import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { Card, Badge, Button } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { useGuestFlow } from '../hooks/useGuestFlow';
import GuestFlowScreen from '../components/GuestFlowScreen';

const POLL_INTERVAL_MS = 2000;

// A shared tablet cycles through walk-up guests one after another, so unlike
// the personal-phone guest page: never persist the session, and auto-return
// to the form 7s after the reveal instead of staying on it.
function KioskOverlay({ token, onClose }) {
  const flow = useGuestFlow({ token, persistSession: false, autoReturnMs: 7000 });
  return (
    <GuestFlowScreen
      view={flow.view}
      form={flow.form}
      setForm={flow.setForm}
      error={flow.error}
      busy={flow.busy}
      status={flow.status}
      onSubmit={flow.handleSubmit}
      onRestart={flow.restart}
      onClose={onClose}
    />
  );
}

// Staff-facing: guests never see this page. It shows the QR code that leads
// to the guest flow (/play/:token), a live view of the queue, so the active
// campaign's real-time results are visible from the dashboard side while
// guests play from their own phones — plus a "Spin the wheel" button that
// opens the same guest flow full-screen on this device, for walk-up guests
// without a phone.
export default function LaunchCampaign() {
  const { agentConnected } = useWheelSocket();
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [guestUrl, setGuestUrl] = useState('');
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState(null);
  const [showKiosk, setShowKiosk] = useState(false);

  useEffect(() => {
    api.getQrToken()
      .then(({ token: t }) => {
        setToken(t);
        const url = `${window.location.origin}/play/${t}`;
        setGuestUrl(url);
        return QRCode.toDataURL(url, { width: 320, margin: 1 });
      })
      .then(setQrDataUrl)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await api.getGuestQueueSnapshot();
        if (!cancelled) setQueue(res);
      } catch {
        // transient network hiccup — just try again next tick
      }
    }
    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Launch Campaign</h1>
          <p className="page-subtitle">Guests scan the QR code below to play from their own phone</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge tone={agentConnected ? 'green' : 'red'}>{agentConnected ? 'Wheel ready' : 'Wheel offline'}</Badge>
          <Button onClick={() => setShowKiosk(true)}>SPIN THE WHEEL</Button>
        </div>
      </div>

      {showKiosk && token && <KioskOverlay token={token} onClose={() => setShowKiosk(false)} />}

      {error && <div className="error-banner">{error}</div>}

      <div className="grid-stats" style={{ gridTemplateColumns: '360px 1fr', alignItems: 'start' }}>
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
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
                    {queue.active.firstName} — {queue.active.launched ? 'spinning…' : 'waiting to spin'}
                    {queue.active.retryMessage && (
                      <span style={{ marginLeft: 10, fontSize: 12, color: '#EF4444' }}>({queue.active.retryMessage})</span>
                    )}
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
    </div>
  );
}
