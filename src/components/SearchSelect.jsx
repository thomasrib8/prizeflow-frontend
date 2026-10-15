// A text box that filters a long list as you type ("Rhône", "69", "69003"…) with the matching choices listed right under it.
// Used by the "Liste avec recherche", "Département" and "Région" field types (guest form, sales rep form, PWA).
// `search(query)` returns the choices as [{ value, label, hint }]; the chosen `value` is what is stored.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const BOX = { position: 'relative' };
const LIST = {
  position: 'absolute', zIndex: 40, left: 0, right: 0, top: 'calc(100% + 4px)', maxHeight: 232, overflowY: 'auto', background: '#fff',
  border: '1px solid #D4DEF5', borderRadius: 12, boxShadow: '0 14px 30px -12px rgba(0, 40, 129, 0.35)', padding: 4, margin: 0, listStyle: 'none',
};

export default function SearchSelect({ value, onChange, search, placeholder }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const results = useMemo(() => (open ? search(q).slice(0, 200) : []), [open, q, search]);

  useEffect(() => { setActive(0); }, [q, open]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, [open]);
  useEffect(() => {
    const el = listRef.current && listRef.current.children[active];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function pick(r) { onChange(r.value); setQ(''); setOpen(false); }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && open && results[active]) { e.preventDefault(); pick(results[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={rootRef} style={BOX}>
      {value && !open ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--border, #E2E8F0)', borderRadius: 10, background: '#fff' }}>
          <span style={{ flex: 1, fontSize: 14 }}>{value}</span>
          <button type="button" aria-label={t('field.searchClear', { defaultValue: 'Effacer' })} onClick={() => { onChange(''); setOpen(true); }}
            style={{ border: 'none', background: 'none', color: '#94A3B8', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      ) : (
        <input
          type="text" role="combobox" aria-expanded={open} aria-autocomplete="list" autoComplete="off" autoCorrect="off" spellCheck={false}
          value={q} placeholder={placeholder || t('field.searchPlaceholder', { defaultValue: 'Tapez pour rechercher…' })}
          onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onKeyDown={onKey}
        />
      )}
      {open && (
        <ul ref={listRef} role="listbox" style={LIST}>
          {results.length === 0 && <li style={{ padding: '10px 12px', fontSize: 13, color: '#94A3B8' }}>{t('field.searchNoResults', { defaultValue: 'Aucun résultat' })}</li>}
          {results.map((r, i) => (
            <li key={r.value} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(r); }} onMouseEnter={() => setActive(i)}
              style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 10, background: i === active ? '#EAF1FF' : 'transparent', color: '#03041A' }}>
              <span>{r.label}</span>{r.hint && <span style={{ color: '#8A97B8', fontSize: 11.5, marginLeft: 'auto' }}>{r.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
