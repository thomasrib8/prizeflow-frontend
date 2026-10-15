// Return inspection filled in by the operator when a rental ends: visual condition (0-3 stars, mandatory), photos,
// does it work, is the pack complete. Validating it ends the rental. Phone first: big touch targets, camera upload.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import './wheel.css';

const MAX_PHOTOS = 6;

// The camera gives 4000 px photos: shrink to 1280 px JPEG before sending (a few hundred KB, fast on 4G).
function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('image'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}

export default function ReturnForm({ wheel, onDone, onCancel }) {
  const { t } = useTranslation('admin');
  const fileRef = useRef(null);
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [hardwareOk, setHardwareOk] = useState(null);
  const [packComplete, setPackComplete] = useState(null);
  const [packComment, setPackComment] = useState('');
  const [photos, setPhotos] = useState([]); // [{ id, url }]
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFiles(e) {
    const files = [...(e.target.files || [])].slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    setError('');
    for (const f of files) {
      setUploading((n) => n + 1);
      try {
        const blob = await shrink(f);
        const id = await api.uploadWheelPhoto(wheel.id, blob);
        setPhotos((p) => [...p, { id, url: URL.createObjectURL(blob) }]);
      } catch (err) { setError(err.message || String(err)); }
      setUploading((n) => n - 1);
    }
  }

  async function submit() {
    if (rating === null) return setError(t('wheelOps.errRating'));
    if (hardwareOk === null) return setError(t('wheelOps.errHardware'));
    if (packComplete === null) return setError(t('wheelOps.errPack'));
    if (packComplete === false && !packComment.trim()) return setError(t('wheelOps.errMissing'));
    setBusy(true); setError('');
    try {
      const res = await api.endWheelRental(wheel.id, {
        visualRating: rating, visualComment: comment, hardwareOk, packComplete, packComment, photoIds: photos.map((p) => p.id),
      });
      onDone(res);
    } catch (e) { setError(e.message); setBusy(false); }
  }

  const needsMaintenance = rating !== null && (rating <= 1 || hardwareOk === false || packComplete === false);

  return (
    <div className="wh-card">
      <div className="wh-lb">{t('wheelOps.visualState')} *</div>
      <div className="wh-stars">
        {[0, 1, 2, 3].map((n) => (
          <button key={n} type="button" className={`wh-star${rating === n ? ' on' : ''}`} onClick={() => setRating(n)} aria-pressed={rating === n}>{n} ★</button>
        ))}
      </div>
      <div className="wh-hint">{t('wheelOps.visualHint')}</div>

      <div className="wh-lb">{t('wheelOps.photos')} · {t('wheelOps.photosMax', { count: MAX_PHOTOS })}</div>
      <div className="wh-photos">
        {photos.map((p) => (
          <div key={p.id} className="wh-thumb">
            <img src={p.url} alt="" />
            <button type="button" aria-label={t('wheelOps.removePhoto')} onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))}>✕</button>
          </div>
        ))}
        {photos.length + uploading < MAX_PHOTOS && (
          <button type="button" className="wh-add" aria-label={t('wheelOps.addPhoto')} onClick={() => fileRef.current && fileRef.current.click()}>{uploading ? '…' : '+'}</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={onFiles} />
      </div>
      <textarea className="wh-txt" rows={2} value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} placeholder={t('wheelOps.commentPh')} />

      <div className="wh-lb">{t('wheelOps.hardware')} *</div>
      <div className="wh-yn">
        <button type="button" className={hardwareOk === true ? 'yes' : ''} onClick={() => setHardwareOk(true)}>{t('wheelOps.yes')}</button>
        <button type="button" className={hardwareOk === false ? 'no' : ''} onClick={() => setHardwareOk(false)}>{t('wheelOps.no')}</button>
      </div>

      <div className="wh-lb">{t('wheelOps.packComplete')} *</div>
      <div className="wh-yn">
        <button type="button" className={packComplete === true ? 'yes' : ''} onClick={() => setPackComplete(true)}>{t('wheelOps.yes')}</button>
        <button type="button" className={packComplete === false ? 'no' : ''} onClick={() => setPackComplete(false)}>{t('wheelOps.no')}</button>
      </div>
      {packComplete === false && (
        <textarea className={`wh-txt${error === t('wheelOps.errMissing') ? ' bad' : ''}`} rows={2} value={packComment} maxLength={1000} onChange={(e) => setPackComment(e.target.value)} placeholder={t('wheelOps.missingPh')} />
      )}

      {error && <div className="wh-err">{error}</div>}
      <button type="button" className="wh-btn danger" disabled={busy || uploading > 0} onClick={submit}>{t('wheelOps.validateBtn')}</button>
      {onCancel && <button type="button" className="wh-btn out" disabled={busy} onClick={onCancel}>{t('wheelOps.cancel')}</button>}
      {needsMaintenance && <div className="wh-note">{t('wheelOps.maintenanceNote')}</div>}
    </div>
  );
}
