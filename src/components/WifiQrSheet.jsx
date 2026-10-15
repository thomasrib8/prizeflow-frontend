// Settings → Local mode: a printable card with a QR code that joins the box's Wi-Fi in one scan, with the network
// name and password written underneath. The password is typed here and used ONLY in this browser to draw the code:
// it is never sent to the server (the box's Wi-Fi password lives on the box, not in the cloud).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { Button } from './ui';
import './wifi-qr.css';

export const SSID = 'Spark-Local';
// WIFI:T:WPA;S:<name>;P:<password>;;  — \ ; , : " must be escaped for the phone to read the password right
const esc = (s) => String(s).replace(/([\;,:"])/g, '\\$1');
export const SETUP_PAGE = 'http://sparkoff.box/wifi';
export const wifiString = (ssid, pw) => `WIFI:T:WPA;S:${esc(ssid)};P:${esc(pw)};;`;

export default function WifiQrSheet({ onClose }) {
  const { t } = useTranslation('admin');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [img, setImg] = useState('');
  const [img2, setImg2] = useState(''); // second code: opens the box's Wi-Fi setup page once connected
  const [loaded, setLoaded] = useState(false); // the remembered password has been read (nothing is saved before that)
  const [saved, setSaved] = useState(''); // what the server holds
  const [locked, setLocked] = useState(false); // the box is activated: the real password is on the box, only the administrator changes it
  const ready = pw.length >= 8;

  // The password is remembered (encrypted, on the account): prefilled here, saved a moment after you stop typing.
  useEffect(() => {
    let alive = true;
    api.getBoxWifiPassword().then((r) => { if (alive) { setPw(r.password || ''); setSaved(r.password || ''); setLocked(!!r.locked); } }).catch(() => {}).then(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!loaded || locked || pw === saved || (pw !== '' && pw.length < 8)) return undefined;
    const id = setTimeout(() => { api.setBoxWifiPassword(pw).then(() => setSaved(pw)).catch(() => {}); }, 900);
    return () => clearTimeout(id);
  }, [pw, saved, loaded, locked]);

  useEffect(() => {
    QRCode.toDataURL(SETUP_PAGE, { errorCorrectionLevel: 'M', margin: 1, width: 720 }).then(setImg2).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    if (!ready) { setImg(''); return undefined; }
    QRCode.toDataURL(wifiString(SSID, pw), { errorCorrectionLevel: 'M', margin: 1, width: 720 }).then((u) => { if (alive) setImg(u); }).catch(() => { if (alive) setImg(''); });
    return () => { alive = false; };
  }, [pw, ready]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="wq-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wq-modal" role="dialog" aria-modal="true" aria-label={t('settings.offlineMode.qrTitle')}>
        <div className="wq-controls">
          <h3>{t('settings.offlineMode.qrTitle')}</h3>
          <p>{t('settings.offlineMode.qrIntro')}</p>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>{t('settings.offlineMode.qrNetworkLabel')}</label>
            <input type="text" value={SSID} readOnly />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label htmlFor="wq-pw">{t('settings.offlineMode.qrPasswordLabel')}</label>
            <div className="wq-pwwrap">
              <input id="wq-pw" type={show ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={pw} readOnly={locked} onChange={(e) => setPw(e.target.value)} placeholder={t('settings.offlineMode.qrPasswordPlaceholder')} />
              <button type="button" className="wq-eye" onClick={() => setShow((v) => !v)} aria-label={show ? t('settings.offlineMode.hideCode') : t('settings.offlineMode.showCode')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {show ? (<><path d="M3 3l18 18" /><path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4.2 9.5 6a14 14 0 0 1-2.6 3.2M6.5 7.5A14 14 0 0 0 2.5 12c1 1.8 4.5 6 9.5 6 1.5 0 2.8-.4 4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>) : (<><path d="M2.5 12C3.5 10.2 7 6 12 6s8.5 4.2 9.5 6c-1 1.8-4.5 6-9.5 6s-8.5-4.2-9.5-6z" /><circle cx="12" cy="12" r="3" /></>)}
                </svg>
              </button>
            </div>
          </div>
          {locked && <p className="wq-note" style={{ color: '#B45309' }}>{t('settings.offlineMode.qrLocked')}</p>}
          <p className="wq-note">{t('settings.offlineMode.qrKeptLocal')}{ready && pw === saved ? ` ✓ ${t('settings.offlineMode.qrRemembered')}` : ''}</p>
          <div className="wq-actions">
            <Button type="button" variant="secondary" onClick={onClose}>{t('common.close')}</Button>
            <Button type="button" disabled={!ready || !img} onClick={() => window.print()}>{t('settings.offlineMode.qrPrint')}</Button>
          </div>
        </div>

        {/* what gets printed */}
        <div className="wq-sheet" id="wifi-qr-sheet">
          <div className="wq-sheet-brand">SPARK</div>
          <h2>{t('settings.offlineMode.sheetTitle')}</h2>
          <div className="wq-qrs">
            <figure>
              <div className="wq-qr">{img ? <img src={img} alt="QR code Wi-Fi" /> : <div className="wq-qr-empty">{t('settings.offlineMode.qrPasswordPlaceholder')}</div>}</div>
              <figcaption><b>1</b> {t('settings.offlineMode.sheetStep1')}</figcaption>
            </figure>
            <figure>
              <div className="wq-qr">{img2 && <img src={img2} alt="QR code page Wi-Fi" />}</div>
              <figcaption><b>2</b> {t('settings.offlineMode.sheetStep2')}</figcaption>
            </figure>
          </div>
          <p className="wq-scan">{t('settings.offlineMode.sheetScan')}</p>
          <table className="wq-creds">
            <tbody>
              <tr><th>{t('settings.offlineMode.sheetNetwork')}</th><td>{SSID}</td></tr>
              <tr><th>{t('settings.offlineMode.sheetPassword')}</th><td className="wq-mono">{ready ? pw : '—'}</td></tr>
            </tbody>
          </table>
          <p className="wq-open">{t('settings.offlineMode.sheetOpen')} <strong>sparkoff.box</strong></p>
        </div>
      </div>
    </div>
  );
}
