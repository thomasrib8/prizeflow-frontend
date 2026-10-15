// Past return inspections (wheel history, client page): stars, answers, comments, photos (tap to enlarge).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import './wheel.css';

function parseDT(s) { return s ? new Date(s.replace(' ', 'T') + 'Z') : null; }

function Photo({ id, onOpen }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true; let made = '';
    api.wheelPhotoUrl(id).then((u) => { made = u; if (alive) setUrl(u); else URL.revokeObjectURL(u); }).catch(() => {});
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [id]);
  return <div className="wh-thumb" style={{ cursor: url ? 'zoom-in' : 'default' }} onClick={() => url && onOpen(url)}>{url && <img src={url} alt="" />}</div>;
}

export default function InspectionList({ items, showWheel = false }) {
  const { t } = useTranslation('admin');
  const [big, setBig] = useState('');
  if (!items || items.length === 0) return <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{t('wheelOps.noInspections')}</p>;
  return (
    <div>
      {items.map((i) => (
        <div key={i.id} className="wh-insp">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span><span className="wh-rate">{'★'.repeat(i.visualRating)}{'☆'.repeat(3 - i.visualRating)}</span> <span style={{ color: '#5B6788' }}>{i.visualRating}/3</span></span>
            <span style={{ fontSize: 12, color: '#5B6788' }}>
              {parseDT(i.createdAt)?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              {i.inspector ? ` · ${t('wheelOps.byOperator', { name: i.inspector })}` : ''}
            </span>
          </div>
          {showWheel && <div style={{ fontSize: 12, color: '#5B6788', marginTop: 3 }}>{i.serialNumber}</div>}
          <div style={{ marginTop: 6 }}>
            <span className={`wh-chip ${i.hardwareOk ? 'ok' : 'ko'}`}>{i.hardwareOk ? t('wheelOps.hwOk') : t('wheelOps.hwKo')}</span>
            <span className={`wh-chip ${i.packComplete ? 'ok' : 'ko'}`}>{i.packComplete ? t('wheelOps.packOk') : t('wheelOps.packKo')}</span>
          </div>
          {i.visualComment && <div style={{ marginTop: 6 }}>{i.visualComment}</div>}
          {i.packComment && <div style={{ marginTop: 4, color: '#B42323' }}>{t('wheelOps.missing')} : {i.packComment}</div>}
          {i.photos.length > 0 && <div className="wh-photos" style={{ marginTop: 8 }}>{i.photos.map((p) => <Photo key={p} id={p} onOpen={setBig} />)}</div>}
        </div>
      ))}
      {big && <div className="wh-big" onClick={() => setBig('')}><img src={big} alt="" /></div>}
    </div>
  );
}
