// The 10 x 5 cm sticker of a wheel: QR code (opens the wheel's page, admins only) + its identity. Printed from the browser
// with the page size set to 100 x 50 mm. The QR holds only the link — never the security key.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { Button } from '../ui';
import { ONLINE_APP_URL } from '../../utils/offlineBox';
import './wheel.css';

export const wheelPageUrl = (id) => `${import.meta.env.PROD ? ONLINE_APP_URL : window.location.origin}/wheel/${encodeURIComponent(id)}`;

export default function WheelLabel({ wheel, onClose }) {
  const { t } = useTranslation('admin');
  const [qr, setQr] = useState('');
  useEffect(() => { QRCode.toDataURL(wheelPageUrl(wheel.id), { errorCorrectionLevel: 'M', margin: 0, width: 600 }).then(setQr).catch(() => {}); }, [wheel.id]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 320 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '460px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#03041A' }}>{t('wheelOps.labelTitle')}</h3>
        <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: 4 }}>
          <div id="wheel-label" className="wh-label">
            <div className="wh-label-qr">{qr && <img src={qr} alt="QR" />}</div>
            <div className="wh-label-info">
              <div className="wh-label-brand">SPARK</div>
              <div className="wh-label-row"><span>{t('wheelOps.labelModel')}</span><b>{wheel.modelNumber}</b></div>
              <div className="wh-label-row"><span>{t('wheelOps.labelSerial')}</span><b>{wheel.serialNumber}</b></div>
              <div className="wh-label-row"><span>{t('wheelOps.labelKey')}</span><b>{wheel.securityKey}</b></div>
              {wheel.box && <div className="wh-label-row"><span>{t('wheelOps.labelBox')}</span><b>{wheel.box.name}</b></div>}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#64748B', margin: '14px 0 0' }}>{t('wheelOps.labelHint')}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose}>{t('park.closeBtn')}</Button>
          <Button onClick={() => window.print()}>{t('wheelOps.labelPrint')}</Button>
        </div>
      </div>
    </div>
  );
}
