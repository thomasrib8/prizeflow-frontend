// The 3 stickers of a pack, chosen with tabs and printed from the browser (the page size is set for the chosen sticker):
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

// Size in mm of each sticker (width x height) and the zoom used only for the on-screen preview.
const KINDS = {
  wheel: { w: 100, h: 50, zoom: 1 },
  box: { w: 20, h: 10, zoom: 4 },
  router: { w: 40, h: 20, zoom: 2 },
};

// Box name: the one stored on the wheel, or the factory rule "spark-box-" + last 6 digits of the serial.
const boxNameOf = (wheel) => {
  if (wheel.box && wheel.box.name) return wheel.box.name;
  const digits = String(wheel.serialNumber || '').replace(/\D/g, '').slice(-6);
  return digits ? `spark-box-${digits}` : '';
};

export default function WheelLabel({ wheel, onClose }) {
  const { t } = useTranslation('admin');
  const [kind, setKind] = useState('wheel');
  const [qr, setQr] = useState('');
  const size = KINDS[kind];
  const boxName = boxNameOf(wheel);

  useEffect(() => { QRCode.toDataURL(wheelPageUrl(wheel.id), { errorCorrectionLevel: 'M', margin: 0, width: 600 }).then(setQr).catch(() => {}); }, [wheel.id]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  // The browser prints with the page size we declare: one rule per sticker, replaced when the tab changes.
  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-wheel-label-page', '1');
    style.textContent = `@media print { @page { size: ${size.w}mm ${size.h}mm; margin: 0; } }`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [size.w, size.h]);

  const title = kind === 'box' ? t('wheelOps.labelTitleBox') : kind === 'router' ? t('wheelOps.labelTitleRouter') : t('wheelOps.labelTitle');
  const hint = kind === 'box' ? t('wheelOps.labelHintBox') : kind === 'router' ? t('wheelOps.labelHintRouter') : t('wheelOps.labelHint');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 320 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '460px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#03041A' }}>{title}</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <Button size="sm" variant={kind === 'wheel' ? undefined : 'secondary'} onClick={() => setKind('wheel')}>{t('wheelOps.labelTabWheel')}</Button>
          <Button size="sm" variant={kind === 'box' ? undefined : 'secondary'} onClick={() => setKind('box')}>{t('wheelOps.labelTabBox')}</Button>
          <Button size="sm" variant={kind === 'router' ? undefined : 'secondary'} onClick={() => setKind('router')}>{t('wheelOps.labelTabRouter')}</Button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: 4 }}>
          <div className="wh-prev" style={{ '--z': size.zoom }}>
            {kind === 'wheel' && (
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
            )}
            {kind === 'box' && (
              <div id="wheel-label" className="wh-label wh-label-box">
                <div className="wh-lb-brand">SPARK</div>
                <div className="wh-lb-name">{boxName}</div>
                <div className="wh-lb-sub">{wheel.serialNumber}</div>
              </div>
            )}
            {kind === 'router' && (
              <div id="wheel-label" className="wh-label wh-label-router">
                <div className="wh-label-qr">{qr && <img src={qr} alt="QR" />}</div>
                <div className="wh-label-info">
                  <div className="wh-label-brand">SPARK</div>
                  <div className="wh-lr-cap">{t('wheelOps.labelRouterCap')}</div>
                  <div className="wh-lr-serial">{wheel.serialNumber}</div>
                  <div className="wh-lr-box">{boxName}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#64748B', margin: '14px 0 0' }}>{hint}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose}>{t('park.closeBtn')}</Button>
          <Button onClick={() => window.print()}>{t('wheelOps.labelPrint')}</Button>
        </div>
      </div>
    </div>
  );
}
