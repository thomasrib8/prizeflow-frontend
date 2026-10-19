import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Month chooser in the app's look (the browser's own month popup cannot be styled). value / onChange use 'YYYY-MM'.
export default function MonthPicker({ value, onChange }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(String(value).slice(0, 4)) || new Date().getFullYear());
  const ref = useRef(null);
  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lang = i18n.language || 'fr';
  const fmt = (y, m, style) => new Date(y, m, 1).toLocaleDateString(lang, { month: style, year: style === 'long' ? 'numeric' : undefined });
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const [vy, vm] = String(value || nowKey).split('-').map(Number);
  const pick = (m) => { onChange(`${year}-${String(m + 1).padStart(2, '0')}`); setOpen(false); };
  return (
    <div className="ap-month" ref={ref}>
      <button type="button" className="ap-month-btn" onClick={() => { setYear(vy); setOpen((o) => !o); }} aria-haspopup="dialog" aria-expanded={open}>
        <span style={{ textTransform: 'capitalize' }}>{fmt(vy, vm - 1, 'long')}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
      </button>
      {open && (
        <div className="ap-month-pop" role="dialog">
          <div className="ap-month-head">
            <button type="button" onClick={() => setYear(year - 1)} aria-label="‹">‹</button>
            <b>{year}</b>
            <button type="button" onClick={() => setYear(year + 1)} aria-label="›">›</button>
          </div>
          <div className="ap-month-grid">
            {Array.from({ length: 12 }, (_, m) => {
              const key = `${year}-${String(m + 1).padStart(2, '0')}`;
              return <button type="button" key={m} className={`${key === value ? 'on' : ''}${key === nowKey ? ' now' : ''}`} onClick={() => pick(m)} style={{ textTransform: 'capitalize' }}>{fmt(year, m, 'short').replace('.', '')}</button>;
            })}
          </div>
          <div className="ap-month-foot"><button type="button" onClick={() => { onChange(nowKey); setOpen(false); }}>{new Date().toLocaleDateString(lang, { month: 'long' })}</button></div>
        </div>
      )}
    </div>
  );
}
