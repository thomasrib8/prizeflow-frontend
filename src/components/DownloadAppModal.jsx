import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';

// Shown from the Dashboard's "Download the app" button. Two QR codes, side by side:
//  - SPARK (online): the installable booth app (pages/pwa/) at app.sparkapp360.com/pwa — not the main site;
//  - SPARK Offline: the same app served by the event box, for when the internet drops. The phone has to be on the box's
//    network (Spark-Local, or the venue network the box is plugged into) to open it, so it is installed once, on site.
// The public URL is fixed in production (not window.location.origin) so the QR is right even if the dashboard is
// opened from an old address.
const APP_ORIGIN = import.meta.env.PROD ? 'https://app.sparkapp360.com' : window.location.origin;
const OFFLINE_URL = 'http://sparkoff.box/pwa/home';

function Column({ heading, subtitle, qr, url, alt, children }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0055F8', marginBottom: 4 }}>{heading}</div>
      <p style={{ margin: '0 auto 14px', fontSize: 13, color: '#64748B', maxWidth: 330 }}>{subtitle}</p>
      {qr ? <img src={qr} alt={alt} style={{ width: 190, height: 190 }} /> : <div style={{ width: 190, height: 190, margin: '0 auto' }} />}
      <p style={{ fontSize: 12, color: '#94A3B8', margin: '8px 0 0', wordBreak: 'break-all' }}>{url}</p>
      {children}
    </div>
  );
}

export default function DownloadAppModal({ onClose }) {
  const { t } = useTranslation('admin');
  const [qrOnline, setQrOnline] = useState(null);
  const [qrOffline, setQrOffline] = useState(null);
  const pwaUrl = `${APP_ORIGIN}/pwa`;

  useEffect(() => {
    QRCode.toDataURL(pwaUrl, { width: 280, margin: 1 }).then(setQrOnline).catch(() => {});
    QRCode.toDataURL(OFFLINE_URL, { width: 280, margin: 1 }).then(setQrOffline).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heading = { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0055F8', marginBottom: 8 };
  const list = { margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155', lineHeight: 1.7 };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ '--modal-w': '900px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, textAlign: 'center' }}>{t('downloadAppModal.title')}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>
          <Column heading={t('downloadAppModal.onlineHeading')} subtitle={t('downloadAppModal.subtitle')} qr={qrOnline} url={pwaUrl} alt="QR code to app.sparkapp360.com/pwa" />
          <Column heading={t('downloadAppModal.offlineHeading')} subtitle={t('downloadAppModal.offlineSubtitle')} qr={qrOffline} url={OFFLINE_URL} alt="QR code to the offline app on the box">
            <p style={{ fontSize: 12, color: '#B45309', margin: '8px auto 0', maxWidth: 330, lineHeight: 1.5 }}>{t('downloadAppModal.offlineNote')}</p>
          </Column>
        </div>

        <p style={{ margin: '22px 0 12px', fontSize: 12, color: '#64748B', textAlign: 'center' }}>{t('downloadAppModal.sameGestures')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, textAlign: 'left' }}>
          <div>
            <div style={heading}>{t('downloadAppModal.iphoneTitle')}</div>
            <ol style={list}>
              <li>{t('downloadAppModal.iphoneStep1')}</li>
              <li>{t('downloadAppModal.iphoneStep2')}</li>
              <li>{t('downloadAppModal.iphoneStep3Prefix')} <span style={{ fontWeight: 700 }}>{t('downloadAppModal.iphoneStep3Bold')}</span>.</li>
              <li>{t('downloadAppModal.iphoneStep4Prefix')} <span style={{ fontWeight: 700 }}>{t('downloadAppModal.iphoneStep4Bold')}</span> {t('downloadAppModal.iphoneStep4Suffix')}</li>
            </ol>
          </div>

          <div>
            <div style={heading}>{t('downloadAppModal.androidTitle')}</div>
            <ol style={list}>
              <li>{t('downloadAppModal.androidStep1')}</li>
              <li>{t('downloadAppModal.androidStep2')}</li>
              <li>{t('downloadAppModal.androidStep3Prefix')} <span style={{ fontWeight: 700 }}>{t('downloadAppModal.androidStep3Bold')}</span> {t('downloadAppModal.androidStep3Suffix')}</li>
              <li>{t('downloadAppModal.androidStep4')}</li>
            </ol>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Button variant="secondary" onClick={onClose} style={{ marginTop: 22 }}>{t('common.close')}</Button>
        </div>
      </div>
    </div>
  );
}
