// A confirmation in the app's own colours, centred on screen — replaces the browser's native confirm() box.
//   const [confirm, confirmDialog] = useConfirm();
//   if (!(await confirm(message, { danger: true }))) return;
//   ... and render {confirmDialog} somewhere in the component.
// In the tutorials (demo mode) the answer is always "yes" so a replay never stops on a dialog.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_DEMO } from '../tutorial/demo';
import { Button } from './ui';

function Dialog({ message, title, danger, confirmLabel, onAnswer }) {
  const { t } = useTranslation('admin');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onAnswer(false); else if (e.key === 'Enter') onAnswer(true); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onAnswer]);
  const tone = danger ? { bg: '#FDECEC', fg: '#B42323' } : { bg: '#EAF1FF', fg: '#0055F8' };
  return (
    <div className="modal-overlay" style={{ zIndex: 500 }} onClick={() => onAnswer(false)}>
      <div className="modal-card" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ '--modal-w': '420px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: tone.bg, color: tone.fg, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>{danger ? '!' : '?'}</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#03041A' }}>{title || t('common.confirmTitle')}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => onAnswer(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => onAnswer(true)} style={danger ? { background: '#E24B4A', borderColor: '#E24B4A' } : undefined}>{confirmLabel || t('common.confirm')}</Button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [pending, setPending] = useState(null);
  const confirm = useCallback((message, opts = {}) => {
    if (IS_DEMO && !window.__showConfirm) return Promise.resolve(true); // (__showConfirm: lets a designer see the dialog in demo mode)
    return new Promise((resolve) => setPending({ message, opts, resolve }));
  }, []);
  const answer = useCallback((ok) => { setPending((p) => { if (p) p.resolve(ok); return null; }); }, []);
  const dialog = pending ? <Dialog message={pending.message} title={pending.opts.title} danger={pending.opts.danger} confirmLabel={pending.opts.confirmLabel} onAnswer={answer} /> : null;
  return [confirm, dialog];
}
