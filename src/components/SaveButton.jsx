import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './save-button.css';

// The "Save" button of the whole app: it fills with green from left to right while the save runs, then turns green and says "Saved!".
// As soon as something is changed again it goes back to its original colour and text.
//
//   saving   true while the save is running (the page's own state)
//   failed   true when the save ended with an error: the button simply goes back to normal, nothing says "Saved"
//   dirty    optional, for pages that track their changes precisely: true = unsaved changes (the button resets). Without it, any typing,
//            choice or click in the page resets the button.
//   savingLabel / savedLabel  optional texts (default: "Saving…" / "Saved!")
//
// The fill cannot know the real progress of a request, so it advances quickly then slows down, and completes when the save does.
const MIN_FILL_MS = 600; // a save that ends instantly still shows the fill

export default function SaveButton({ saving = false, failed = false, dirty, savingLabel, savedLabel, variant = 'primary', size, className = '', style, children, disabled, onClick, ...props }) {
  const { t } = useTranslation('admin');
  const [phase, setPhase] = useState('idle'); // idle | saving | saved
  const startedAt = useRef(0);
  const timer = useRef(null);
  const failedRef = useRef(failed);
  failedRef.current = failed;
  const btn = useRef(null);
  const wasSaving = useRef(false);
  const [lockW, setLockW] = useState(null); // the button keeps its width while its text changes

  useEffect(() => {
    if (saving) {
      clearTimeout(timer.current);
      startedAt.current = Date.now();
      wasSaving.current = true;
      if (btn.current && phase === 'idle') setLockW(btn.current.offsetWidth);
      setPhase('saving');
    } else if (wasSaving.current) {
      wasSaving.current = false;
      const wait = Math.max(0, MIN_FILL_MS - (Date.now() - startedAt.current));
      timer.current = setTimeout(() => setPhase(failedRef.current ? 'idle' : 'saved'), wait);
    }
  }, [saving]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (phase === 'idle') setLockW(null); }, [phase]);

  // back to the original look when the page is modified again
  useEffect(() => {
    if (phase !== 'saved') return undefined;
    if (dirty !== undefined) { if (dirty) setPhase('idle'); return undefined; }
    const reset = (e) => { if (!btn.current || !btn.current.contains(e.target)) setPhase('idle'); };
    const click = (e) => {
      const el = e.target && e.target.closest ? e.target.closest('button, [role="radio"], [role="switch"], [role="checkbox"], .gift-handle') : null;
      if (el && btn.current && !btn.current.contains(el) && !el.closest('[data-keep-saved]')) setPhase('idle');
    };
    document.addEventListener('input', reset, true);
    document.addEventListener('change', reset, true);
    document.addEventListener('click', click, true);
    return () => { document.removeEventListener('input', reset, true); document.removeEventListener('change', reset, true); document.removeEventListener('click', click, true); };
  }, [phase, dirty]);

  const sz = size === 'sm' ? ' btn-sm' : '';
  const label = phase === 'saving' ? (savingLabel || t('common.saving')) : phase === 'saved' ? (savedLabel || t('common.savedBang')) : children;
  return (
    <button ref={btn} className={`btn btn-${variant}${sz} btn-save ${phase}${className ? ` ${className}` : ''}`} disabled={disabled} aria-live="polite" style={lockW ? { minWidth: lockW, ...(style || {}) } : style}
      onClick={phase === 'saving' ? undefined : onClick} {...props}>
      <span className="btn-save-fill" aria-hidden="true" />
      {phase === 'saved' && (
        <svg className="btn-save-check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      )}
      <span className="btn-save-label">{label}</span>
    </button>
  );
}
