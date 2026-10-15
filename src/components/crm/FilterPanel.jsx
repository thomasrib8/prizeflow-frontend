// Side panel for the CRM filters: short lists as pills, long lists (gifts…) as a searchable list that shows a few lines and
// "see the N others", every option with its number of leads, a sticky footer that says how many leads the filters keep.
//   sections: [{ key, title, options: [{ value, label, count }], selected: [], onToggle(value) }]
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const PILL_MAX = 8; // up to this many options: pills; beyond: searchable list
const SHOWN = 6;

function Section({ section }) {
  const { t } = useTranslation('admin');
  const { title, options, selected, onToggle } = section;
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const asList = options.length > PILL_MAX;
  const matching = useMemo(() => (q ? options.filter((o) => norm(o.label).includes(norm(q))) : options), [options, q]);
  const shown = !q && !all ? matching.slice(0, SHOWN) : matching;
  if (options.length === 0) return null;
  return (
    <div className="fp-sec">
      <div className="fp-sh"><span>{title}</span>{selected.length > 0 && <em>{t('history.chosenCount', { count: selected.length })}</em>}</div>
      {!asList ? (
        <div className="fp-pills">
          {options.map((o) => (
            <button key={o.value} type="button" className={`fp-pill${selected.includes(o.value) ? ' on' : ''}`} onClick={() => onToggle(o.value)} aria-pressed={selected.includes(o.value)}>
              {o.label}<b>{o.count}</b>
            </button>
          ))}
        </div>
      ) : (
        <>
          <input className="fp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('history.filterSearch')} />
          {shown.map((o) => (
            <button key={o.value} type="button" className={`fp-item${selected.includes(o.value) ? ' on' : ''}`} onClick={() => onToggle(o.value)} aria-pressed={selected.includes(o.value)}>
              <span className="cb">{selected.includes(o.value) ? '✓' : ''}</span><span className="t" title={o.label}>{o.label}</span><b>{o.count}</b>
            </button>
          ))}
          {matching.length === 0 && <div style={{ fontSize: 12, color: '#94A3B8', padding: '6px 4px' }}>{t('history.noOptionMatch')}</div>}
          {!q && matching.length > SHOWN && (
            <button type="button" className="fp-more" onClick={() => setAll((v) => !v)}>{all ? t('history.showLess') : t('history.showMore', { count: matching.length - SHOWN })}</button>
          )}
        </>
      )}
    </div>
  );
}

export default function FilterPanel({ sections, resultCount, activeCount, onClear, onClose }) {
  const { t } = useTranslation('admin');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fp-overlay" onClick={onClose}>
      <aside className="fp-panel" role="dialog" aria-modal="true" aria-label={t('pwa.filters')} onClick={(e) => e.stopPropagation()}>
        <div className="fp-head">
          <h3>{t('pwa.filters')}</h3>
          <button type="button" className="fp-x" onClick={onClose} aria-label={t('common.close')}>×</button>
        </div>
        <div className="fp-body">{sections.map((s) => <Section key={s.key} section={s} />)}</div>
        <div className="fp-foot">
          <button type="button" className="fp-clear" disabled={!activeCount} onClick={onClear}>{t('pwa.clearAll')}</button>
          <button type="button" className="fp-go" onClick={onClose}>{t('history.seeResults', { count: resultCount })}</button>
        </div>
      </aside>
    </div>
  );
}
