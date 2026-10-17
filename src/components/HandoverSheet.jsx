// The printable handover sheet given with a rented pack: Spark-Local Wi-Fi QR (join the box's Wi-Fi), the kiosk/PWA page QR,
// the wheel and box names, the Wi-Fi password and the support phone (the admin's own number from their profile).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { Button } from './ui';
import { SSID, SETUP_PAGE, wifiString } from './WifiQrSheet';
import './wifi-qr.css';
import './setup-wizard.css';

export default function HandoverSheet({ clientLabel, serial, boxName, password, phone }) {
  const { t } = useTranslation('admin');
  const [qrWifi, setQrWifi] = useState('');
  const [qrSetup, setQrSetup] = useState('');

  useEffect(() => {
    if (!password) return;
    QRCode.toDataURL(wifiString(SSID, password), { errorCorrectionLevel: 'M', margin: 1, width: 720 }).then(setQrWifi).catch(() => {});
    QRCode.toDataURL(SETUP_PAGE, { errorCorrectionLevel: 'M', margin: 1, width: 720 }).then(setQrSetup).catch(() => {});
  }, [password]);

  return (
    <div className="sw-sheet-row">
      <div id="handover-sheet" className="wq-sheet">
        <div className="wq-sheet-brand">SPARK</div>
        <h2>{clientLabel}</h2>
        <div className="wq-qrs">
          <figure>
            <div className="wq-qr">{qrWifi ? <img src={qrWifi} alt="QR Wi-Fi" /> : null}</div>
            <figcaption><b>1</b> {t('settings.offlineMode.sheetStep1')}</figcaption>
          </figure>
          <figure>
            <div className="wq-qr">{qrSetup ? <img src={qrSetup} alt="QR" /> : null}</div>
            <figcaption><b>2</b> {t('settings.offlineMode.sheetStep2')}</figcaption>
          </figure>
        </div>
        <table className="wq-creds">
          <tbody>
            <tr><th>{t('setupWizard.sheetWheel')}</th><td className="wq-mono">{serial || '—'}</td></tr>
            <tr><th>{t('setupWizard.sheetBox')}</th><td className="wq-mono">{boxName || '—'}</td></tr>
            <tr><th>{t('settings.offlineMode.sheetNetwork')}</th><td>{SSID}</td></tr>
            <tr><th>{t('settings.offlineMode.sheetPassword')}</th><td className="wq-mono">{password || '—'}</td></tr>
          </tbody>
        </table>
        <p className="wq-open">{t('setupWizard.sheetApp')} <strong>sparkoff.box</strong>{phone ? <> · {t('setupWizard.sheetSupport')} <strong>{phone}</strong></> : null}</p>
      </div>
      <div>
        <Button variant="secondary" size="sm" type="button" onClick={() => window.print()}>{t('setupWizard.printBtn')}</Button>
        {!phone && <div className="sw-sub" style={{ marginTop: 8 }}>{t('setupWizard.noPhone')}</div>}
      </div>
    </div>
  );
}
