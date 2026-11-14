import { useCallback } from 'react';
import { useState } from 'react';
import SearchSelect from './SearchSelect';
import { ratingMax } from './fieldTypes';
import './rating-field.css';
import { deptLabel, norm, searchDepartments, searchRegions } from '../data/frGeo';
// Renders the input control for one custom field definition (see
// fieldTypes.js) — shared by the guest-facing pre-spin form
// (GuestFlowScreen.jsx) and the sales rep's prospect form (ProspectCard.jsx,
// NewProspectModal.jsx). `value` / `onChange(value)` follow each type's
// natural JS shape: multi_choice -> string[], checkbox -> boolean,
// everything else -> string. `field.label`/`field.options` are the admin's
// own text and are never translated regardless of caller — only this
// component's one bit of fixed chrome (the dropdown's empty-option text) is,
// and only when the caller passes it (GuestFlowScreen does, following the
// campaign's language; the admin-side callers don't, so they keep the
// English default — the admin panel itself isn't translated yet, see the
// "Multilingue" plan's Phase 2).
// Radio buttons and checkboxes sit inside a `.field`, whose global input style (full width, padded box) would stretch them across the row
// and push the text to the far right: they keep their natural size, and the answer labels stay regular weight.
const CHOICE_INPUT = { width: 'auto', padding: 0, margin: 0, flexShrink: 0, boxShadow: 'none' };
const CHOICE_LABEL = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 400, margin: 0, padding: '6px 0', minHeight: 34, cursor: 'pointer', color: 'var(--text-primary, #0F172A)' }; // a whole row to tap, not just the 16px circle

const toResult = (o) => ({ value: o, label: o });
const deptResult = (d) => ({ value: deptLabel(d), label: deptLabel(d), hint: d.region });

export default function DynamicFieldInput({ field, value, onChange, selectPlaceholder = '— Select —' }) {
  const { label, fieldType, options, required } = field;

  if (fieldType === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: '12px 0' }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span style={{ fontSize: 13 }}>{label}{required ? ' *' : ''}</span>
      </label>
    );
  }

  if (fieldType === 'rating') {
    return (
      <div className="field">
        <label>{label}{required ? ' *' : ''}</label>
        <StarRating max={ratingMax(options)} value={value} onChange={onChange} />
      </div>
    );
  }

  if (fieldType === 'dropdown') {
    return (
      <div className="field">
        <label>{label}{required ? ' *' : ''}</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">{selectPlaceholder}</option>
          {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (fieldType === 'search_choice' || fieldType === 'fr_department' || fieldType === 'fr_region') {
    return (
      <div className="field">
        <label>{label}{required ? ' *' : ''}</label>
        <SearchField fieldType={fieldType} options={options} value={value} onChange={onChange} />
      </div>
    );
  }

  if (fieldType === 'single_choice') {
    return (
      <div className="field">
        <label>{label}{required ? ' *' : ''}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(options || []).map((o) => (
            <label key={o} style={CHOICE_LABEL}>
              <input type="radio" name={label} style={CHOICE_INPUT} checked={value === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (fieldType === 'multi_choice') {
    const selected = Array.isArray(value) ? value : [];
    function toggle(o) {
      onChange(selected.includes(o) ? selected.filter((v) => v !== o) : [...selected, o]);
    }
    return (
      <div className="field">
        <label>{label}{required ? ' *' : ''}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(options || []).map((o) => (
            <label key={o} style={CHOICE_LABEL}>
              <input type="checkbox" style={CHOICE_INPUT} checked={selected.includes(o)} onChange={() => toggle(o)} />
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }

  const inputType = fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : fieldType === 'datetime' ? 'datetime-local' : 'text';
  return (
    <div className="field">
      <label>{label}{required ? ' *' : ''}</label>
      <input type={inputType} value={value || ''} onChange={(e) => onChange(e.target.value)} required={false} />
    </div>
  );
}

function SearchField({ fieldType, options, value, onChange }) {
  const search = useCallback((q) => {
    if (fieldType === 'fr_department') return searchDepartments(q).map(deptResult);
    if (fieldType === 'fr_region') return searchRegions(q).map(toResult);
    const s = norm(q);
    const all = options || [];
    if (!s) return all.map(toResult);
    const starts = []; const inside = [];
    for (const o of all) { const n = norm(o); if (n.startsWith(s)) starts.push(o); else if (n.includes(s)) inside.push(o); }
    return [...starts, ...inside].map(toResult);
  }, [fieldType, options]);
  return <SearchSelect value={value || ''} onChange={onChange} search={search} />;
}

// 0 to N stars. Nothing is selected until the visitor answers; "0" is a real answer (no star).
const STAR = 'M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5L2.5 9.5l6.6-.9L12 2.6z';
function StarRating({ max, value, onChange }) {
  const answered = value !== undefined && value !== null && value !== '';
  const current = answered ? Number(value) : -1;
  const [hover, setHover] = useState(0);
  const shown = hover || (current > 0 ? current : 0);
  const key = (e, n) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(String(Math.min(max, n + 1))); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(String(Math.max(0, n - 1))); }
  };
  return (
    <div className={`star-rating${max > 7 ? ' dense' : ''}`} role="radiogroup" onMouseLeave={() => setHover(0)}>
      <button type="button" role="radio" aria-checked={current === 0} aria-label={`0 / ${max}`} className={`star-zero${current === 0 ? ' on' : ''}`}
        onClick={() => onChange('0')} onKeyDown={(e) => key(e, 0)} tabIndex={current <= 0 ? 0 : -1}>0</button>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={current === n} aria-label={`${n} / ${max}`} className={`star${n <= shown ? ' on' : ''}`}
          onClick={() => onChange(String(n))} onMouseEnter={() => setHover(n)} onFocus={() => setHover(0)} onKeyDown={(e) => key(e, n)} tabIndex={current === n || (current < 1 && n === 1 && current !== 0) ? 0 : -1}>
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d={STAR} /></svg>
        </button>
      ))}
    </div>
  );
}
