import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';

// Shown from the Dashboard's "Download the app" button. Scanning the QR
// (or opening the link) takes a sales rep straight to the installable
// booth shell (LaunchPWA.jsx) at app.sparkapp360.com/pwa — not the main site.
// The public URL is fixed in production (not window.location.origin) so the
// QR is right even if the dashboard is opened from an old address.
const APP_ORIGIN = import.meta.env.PROD ? 'https://app.sparkapp360.com' : window.location.origin;

export default function DownloadAppModal({ onClose }) {
  const { t } = useTranslation('admin');
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const pwaUrl = `${APP_ORIGIN}/pwa`;

  useEffect(() => {
    QRCode.toDataURL(pwaUrl, { width: 280, margin: 1 }).then(setQrDataUrl).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ '--modal-w': '480px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{t('downloadAppModal.title')}</h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748B' }}>
          {t('downloadAppModal.subtitle')}
        </p>

        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR code to app.sparkapp360.com/pwa" style={{ width: 200, height: 200 }} />
        ) : (
          <div style={{ width: 200, height: 200, margin: '0 auto' }} />
        )}
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '10px 0 24px', wordBreak: 'break-all' }}>{pwaUrl}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0055F8', marginBottom: 8 }}>
              {t('downloadAppModal.iphoneTitle')}
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
              <li>{t('downloadAppModal.iphoneStep1')}</li>
              <li>{t('downloadAppModal.iphoneStep2')}</li>
              <li>{t('downloadAppModal.iphoneStep3Prefix')} <span style={{ fontWeight: 700 }}>{t('downloadAppModal.iphoneStep3Bold')}</span>.</li>
              <li>{t('downloadAppModal.iphoneStep4Prefix')} <span style={{ fontWeight: 700 }}>{t('downloadAppModal.iphoneStep4Bold')}</span> {t('downloadAppModal.iphoneStep4Suffix')}</li>
            </ol>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0055F8', marginBottom: 8 }}>
              {t('downloadAppModal.androidTitle')}
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
              <li>{t('downloadAppModal.androidStep1')}</li>
              <li>{t('downloadAppModal.androidStep2')}</li>
              <li>{t('downloadAppModal.androidStep3Prefix')} <span style={{ fontWeight: 700 }}>{t('downloadAppModal.androidStep3Bold')}</span> {t('downloadAppModal.androidStep3Suffix')}</li>
              <li>{t('downloadAppModal.androidStep4')}</li>
            </ol>
          </div>
        </div>

        <Button variant="secondary" onClick={onClose} style={{ marginTop: 24 }}>{t('common.close')}</Button>
      </div>
    </div>
  );
}
