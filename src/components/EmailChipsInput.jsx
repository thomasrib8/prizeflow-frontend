import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './email-chips-input.css';

// Several e-mail addresses in one field, shown as bubbles: type an address and press Enter (or comma, semicolon, Tab, or just leave the field)
// and it becomes a bubble; click a bubble to edit it; the little cross removes it; Backspace on an empty field takes the last bubble back for editing.
// The value is a plain string "a@x.fr, b@y.fr" (the same shape the server stores), so nothing else in the screens changes.
// Same rule as the server (email.js cleanReplyTo): one to five valid addresses.
const ADDRESS_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/;
export const MAX_ADDRESSES = 5;
const split = (v) => String(v || '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

export default function EmailChipsInput({ value, onChange, disabled = false, placeholder = '', max = MAX_ADDRESSES, ariaLabel }) {
  const { t } = useTranslation('admin');
  const chips = split(value);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [editAt, setEditAt] = useState(null); // index the address being edited came from (it is put back at the same place)
  const [editOriginal, setEditOriginal] = useState('');
  const input = useRef(null);

  const push = (list) => onChange(list.join(', '));

  // Adds what is typed (one or several addresses). Returns true when the field can be emptied.
  function commit(raw = text, { silent = false } = {}) {
    const parts = split(raw);
    if (!parts.length) {
      if (editAt !== null) { const next = [...chips]; next.splice(editAt, 0, editOriginal); push(next); setEditAt(null); setEditOriginal(''); } // nothing typed: the address being edited is kept
      setText(''); setError('');
      return true;
    }
    const bad = parts.find((a) => a.length > 120 || !ADDRESS_RE.test(a));
    if (bad) { if (!silent) setError(t('settings.emailTemplates.replyToBad', { address: bad })); return false; }
    const next = [...chips];
    let at = editAt !== null ? editAt : next.length;
    for (const a of parts) {
      if (next.some((c) => c.toLowerCase() === a.toLowerCase())) continue;
      if (next.length >= max) { setError(t('settings.emailTemplates.replyToMax', { max })); push(next); setText(''); setEditAt(null); return true; }
      next.splice(at, 0, a); at += 1;
    }
    push(next); setText(''); setError(''); setEditAt(null); setEditOriginal('');
    return true;
  }

  function edit(i) {
    if (disabled) return;
    if (text.trim() && !commit(text)) return; // finish (or refuse) what is being typed first
    const addr = chips[i];
    const next = chips.filter((_, k) => k !== i);
    push(next);
    setEditAt(i); setEditOriginal(addr); setText(addr); setError('');
    setTimeout(() => { const el = input.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
  }

  function remove(i) {
    if (disabled) return;
    push(chips.filter((_, k) => k !== i));
    setError('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Tab' && text.trim()) {
      if (!commit()) e.preventDefault();
    } else if (e.key === 'Backspace' && !text && chips.length && editAt === null) {
      e.preventDefault();
      edit(chips.length - 1);
    } else if (e.key === 'Escape' && editAt !== null) {
      e.preventDefault();
      setText(''); commit('');
    }
  }

  function onPaste(e) {
    const pasted = e.clipboardData && e.clipboardData.getData('text');
    if (pasted && /[,;\s]/.test(pasted.trim())) { e.preventDefault(); commit(`${text} ${pasted}`); }
  }

  const full = chips.length >= max && editAt === null;
  return (
    <div>
      <div className={`chips-field${disabled ? ' disabled' : ''}${error ? ' invalid' : ''}`} onClick={() => input.current && input.current.focus()}>
        {chips.map((a, i) => (
          <span className="chip" key={`${a}-${i}`}>
            <button type="button" className="chip-text" disabled={disabled} onClick={(e) => { e.stopPropagation(); edit(i); }} title={t('settings.emailTemplates.replyToEdit', { address: a })} aria-label={t('settings.emailTemplates.replyToEdit', { address: a })}>{a}</button>
            <button type="button" className="chip-x" disabled={disabled} onClick={(e) => { e.stopPropagation(); remove(i); }} title={t('settings.emailTemplates.replyToRemove', { address: a })} aria-label={t('settings.emailTemplates.replyToRemove', { address: a })}>×</button>
          </span>
        ))}
        {!full && (
          <input ref={input} type="text" inputMode="email" autoComplete="off" spellCheck={false} disabled={disabled} value={text} maxLength={254}
            aria-label={ariaLabel} aria-invalid={!!error}
            placeholder={chips.length ? t('settings.emailTemplates.replyToMore') : placeholder}
            onChange={(e) => { setText(e.target.value); if (error) setError(''); }} onKeyDown={onKeyDown} onPaste={onPaste}
            onBlur={() => { if (text.trim()) commit(text); else if (editAt !== null) commit(''); }} />
        )}
      </div>
      {error ? <div className="chips-msg bad" role="alert">{error}</div> : <div className="chips-msg">{t('settings.emailTemplates.replyToHint', { max })}</div>}
    </div>
  );
}
