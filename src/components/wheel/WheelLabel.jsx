// The 3 stickers of a pack on ONE A4 sheet, printed from the browser at 100 % (no scaling), on adhesive paper, then cut out:
//  - wheel:  10 x 5 cm  QR code (opens the wheel's page, admins only) + its identity
//  - box:     2 x 1 cm  box name + pack serial (text only, too small for a reliable QR code)
//  - router:  4 x 2 cm  QR code (same link) + pack serial + box name
// The QR holds only the link — never the security key.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { Button } from '../ui';
import { ONLINE_APP_URL } from '../../utils/offlineBox';
import './wheel.css';

export const wheelPageUrl = (id) => `${import.meta.env.PROD ? ONLINE_APP_URL : window.location.origin}/wheel/${encodeURIComponent(id)}`;

// Box name: the one stored on the wheel, or the factory rule "spark-box-" + last 6 digits of the serial.
const boxNameOf = (wheel) => {
  if (wheel.box && wheel.box.name) return wheel.box.name;
  const digits = String(wheel.serialNumber || '').replace(/\D/g, '').slice(-6);
  return digits ? `spark-box-${digits}` : '';
};

export default function WheelLabel({ wheel, onClose }) {
  const { t } = useTranslation('admin');
  const [qr, setQr] = useState('');
  const boxName = boxNameOf(wheel);

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
          <div id="wheel-sheet" className="wh-sheet">
            <div className="wh-prev" style={{ '--z': 1 }}>
              <div className="wh-label">
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
            <div className="wh-sheet-row">
              <div className="wh-prev" style={{ '--z': 1.5 }}>
                <div className="wh-label wh-label-router">
                  <div className="wh-label-qr">{qr && <img src={qr} alt="QR" />}</div>
                  <div className="wh-label-info">
                    <div className="wh-label-brand">SPARK</div>
                    <div className="wh-lr-cap">{t('wheelOps.labelRouterCap')}</div>
                    <div className="wh-lr-serial">{wheel.serialNumber}</div>
                    <div className="wh-lr-box">{boxName}</div>
                  </div>
                </div>
              </div>
              <div className="wh-prev" style={{ '--z': 2 }}>
                <div className="wh-label wh-label-box">
                  <div className="wh-lb-brand">SPARK</div>
                  <div className="wh-lb-name">{boxName}</div>
                  <div className="wh-lb-sub">{wheel.serialNumber}</div>
                </div>
              </div>
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
