import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui';

// Shown from the Dashboard's "Download the app" button. Scanning the QR
// (or opening the link) takes a sales rep straight to the installable
// booth shell (LaunchPWA.jsx) at sparkapp360.com/pwa — not the main site.
export default function DownloadAppModal({ onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const pwaUrl = `${window.location.origin}/pwa`;

  useEffect(() => {
    QRCode.toDataURL(pwaUrl, { width: 280, margin: 1 }).then(setQrDataUrl).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ '--modal-w': '480px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Download the app</h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748B' }}>
          Scan this code on your phone to open the sales app, then add it to your home screen.
        </p>

        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR code to sparkapp360.com/pwa" style={{ width: 200, height: 200 }} />
        ) : (
          <div style={{ width: 200, height: 200, margin: '0 auto' }} />
        )}
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '10px 0 24px', wordBreak: 'break-all' }}>{pwaUrl}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0055F8', marginBottom: 8 }}>
              iPhone (Safari)
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
              <li>Open the link above in Safari.</li>
              <li>Tap the Share button <span style={{ fontWeight: 700 }}>⬆︎</span> at the bottom of the screen.</li>
              <li>Scroll down and tap <span style={{ fontWeight: 700 }}>"Add to Home Screen"</span>.</li>
              <li>Tap <span style={{ fontWeight: 700 }}>"Add"</span> — the Spark icon appears on your home screen.</li>
            </ol>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0055F8', marginBottom: 8 }}>
              Android (Chrome)
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
              <li>Open the link above in Chrome.</li>
              <li>Tap the menu <span style={{ fontWeight: 700 }}>⋮</span> in the top-right corner.</li>
              <li>Tap <span style={{ fontWeight: 700 }}>"Install app"</span> (or "Add to Home screen").</li>
              <li>Confirm — the Spark icon appears on your home screen.</li>
            </ol>
          </div>
        </div>

        <Button variant="secondary" onClick={onClose} style={{ marginTop: 24 }}>Close</Button>
      </div>
    </div>
  );
}
