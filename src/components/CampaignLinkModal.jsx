import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Badge, Button } from './ui';

// "See the link and the QR code of the campaign": available as soon as the draft exists, the address never changes.
const TONE = { draft: 'neutral', active: 'green', paused: 'orange', completed: 'blue', archived: 'neutral' };
const STATUS_TKEY = { draft: 'statusDraft', active: 'statusActive', paused: 'statusPaused', completed: 'statusCompleted', archived: 'statusArchived' };

export default function CampaignLinkModal({ campaignId, onClose }) {
  const { t } = useTranslation('admin');
  const [link, setLink] = useState(null);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getCampaignPublicLink(campaignId)
      .then((l) => { setLink(l); return QRCode.toDataURL(l.url, { width: 640, margin: 2, errorCorrectionLevel: 'M' }); })
      .then(setQr)
      .catch((e) => setError(e.message));
  }, [campaignId]);

  async function copy() {
    try { await navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError(t('campaignLink.copyFailed')); }
  }
  async function download() {
    setBusy(true); setError('');
    try { await api.downloadCampaignQrPdf(campaignId); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card ap" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '480px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>{t('campaignLink.title')}</h3>
        {error && <div className="error-banner">{error}</div>}
        {!link && !error && <p className="page-subtitle">{t('common.loading')}</p>}
        {link && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#002881' }}>{link.name}</div>
            <div style={{ margin: '6px 0 14px' }}><Badge tone={TONE[link.status] || 'neutral'}>{t(`common.${STATUS_TKEY[link.status] || 'statusDraft'}`)}</Badge></div>
            {link.status === 'draft' && <p className="ap-hint" style={{ marginTop: 0 }}>{t('campaignLink.draftNote')}</p>}
            {qr ? <img src={qr} alt="QR code" style={{ width: 240, height: 240 }} /> : <p className="page-subtitle">…</p>}
            <div style={{ margin: '10px 0 14px', padding: '8px 10px', background: '#F4F8FF', border: '1px solid #D4DEF5', borderRadius: 10, fontSize: 12.5, color: '#334155', wordBreak: 'break-all' }}>{link.url}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={copy}>{copied ? t('campaignLink.copied') : t('campaignLink.copy')}</Button>
              <Button disabled={busy} onClick={download}>{busy ? t('launchCampaign.generatingBtn') : t('campaignLink.downloadPdf')}</Button>
            </div>
          </>
        )}
        <div style={{ marginTop: 16 }}><Button variant="ghost" onClick={onClose}>{t('common.close')}</Button></div>
      </div>
    </div>
  );
}
