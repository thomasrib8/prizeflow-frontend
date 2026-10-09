// The LinkedIn search dialog: confirm (with the credit balance) -> search -> the proposed profile, which the rep
// confirms or rejects -> saved. Used from the prospect card (prospect already saved) and the new-prospect form
// (prospect not saved yet: the confirmed result stays on the server and is attached when the form is saved).
// Nothing is searched until "Confirm search" is pressed, a double click cannot start two searches (the operation
// id is the same for the same attempt, and the button locks), and nothing here ever retries by itself.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { newOperationId, normalizeLinkedInUrl } from '../../utils/linkedin';
import LinkedInIcon from './LinkedInIcon';
import CreditsBar from './CreditsBar';
import './linkedin.css';

export default function LinkedInSearchDialog({ campaignId, person, prospectSaved, credits, onCredits, onClose, onLinked }) {
  const { t } = useTranslation('admin');
  const [step, setStep] = useState('confirm'); // confirm | searching | found | not_found | error | rejected | manual
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState('');
  const [busy, setBusy] = useState(false);
  const opIdRef = useRef(newOperationId());
  const lockRef = useRef(false);
  const empty = credits && credits.remaining <= 0;
  const locked = step === 'searching' || busy;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !lockRef.current) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function startSearch() {
    if (lockRef.current || empty) return;
    lockRef.current = true;
    setStep('searching');
    try {
      const res = await api.linkedinSearch({
        campaignId, operationId: opIdRef.current,
        email: person.email, firstName: person.firstName, lastName: person.lastName, company: person.company,
      });
      if (res.balance) onCredits?.(res.balance);
      setResult(res);
      if (res.status === 'found' && res.previouslyRejected) { setMessage(t('linkedin.previouslyRejected')); setStep('rejected'); }
      else if (res.status === 'found') setStep('found');
      else if (res.status === 'not_found') setStep('not_found');
      else { setMessage(t('linkedin.errorText')); setStep('error'); opIdRef.current = newOperationId(); /* the next attempt is a new, explicitly confirmed one */ }
    } catch (err) {
      // A refusal from the server (quota, already linked…) or the network dropping: say which, keep the same
      // operation id after a network failure so pressing "Try again" can only ever replay the same operation.
      const key = err.code && `linkedin.err_${err.code}`;
      setMessage(key && t(key) !== key ? t(key) : err.code === 'INSUFFICIENT_INFO' ? t('linkedin.needMoreInfo') : t('linkedin.errorText'));
      if (err.code === 'QUOTA_EXHAUSTED' && credits) onCredits?.({ ...credits, remaining: 0, level: 'empty' });
      if (err.code) opIdRef.current = newOperationId();
      setStep('error');
    } finally {
      lockRef.current = false;
    }
  }

  async function decide(decision) {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    try {
      const res = await api.linkedinDecision(result.operationId, decision);
      if (decision === 'confirm') {
        onLinked?.({ url: result.candidate.url, source: 'apollo', operationId: res.attached ? null : result.operationId });
        onClose();
      } else {
        setMessage(t('linkedin.rejectedText'));
        setStep('rejected');
      }
    } catch (err) {
      const key = err.code && `linkedin.err_${err.code}`;
      setMessage(key && t(key) !== key ? t(key) : t('linkedin.errorText'));
      setStep('error');
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  }

  async function saveManual() {
    const url = normalizeLinkedInUrl(manual);
    if (!url) { setManualError(t('linkedin.manualInvalid')); return; }
    setManualError('');
    if (!prospectSaved) { onLinked?.({ url, source: 'manual', operationId: null }); onClose(); return; }
    setBusy(true);
    try {
      const res = await api.setLinkedinUrl({ campaignId, email: person.email, url });
      onLinked?.({ url: res.linkedin.url, source: 'manual', operationId: null });
      onClose();
    } catch (err) {
      setManualError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const manualBox = (
    <div className="li-manual">
      <label htmlFor="li-manual-url">{t('linkedin.manualLabel')}</label>
      <input id="li-manual-url" type="url" inputMode="url" value={manual} placeholder={t('linkedin.manualPlaceholder')} onChange={(e) => setManual(e.target.value)} autoFocus />
      {manualError && <div className="li-manual-error">{manualError}</div>}
      <div className="li-actions">
        <button type="button" className="li-btn ghost" onClick={onClose} disabled={busy}>{t('linkedin.close')}</button>
        <button type="button" className="li-btn primary" onClick={saveManual} disabled={busy || !manual.trim()}>{t('linkedin.manualSave')}</button>
      </div>
    </div>
  );

  return (
    <div className="li-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !locked) onClose(); }}>
      <div className="li-dialog" role="dialog" aria-modal="true" aria-labelledby="li-title">
        <div className="li-icon"><LinkedInIcon /></div>

        {step === 'confirm' && (
          <>
            <h3 id="li-title">{t('linkedin.confirmTitle')}</h3>
            <p className="li-text">{t('linkedin.confirmText')}</p>
            {name && <p className="li-person">{name}{person.company ? ` · ${person.company}` : ''}</p>}
            <p className="li-cost">{t('linkedin.confirmCost')}</p>
            <CreditsBar credits={credits} />
            {empty && <p className="li-warn">{t('linkedin.exhausted')}</p>}
            <div className="li-actions">
              <button type="button" className="li-btn ghost" onClick={onClose}>{t('linkedin.cancel')}</button>
              <button type="button" className="li-btn primary" onClick={startSearch} disabled={empty}>{t('linkedin.confirmBtn')}</button>
            </div>
          </>
        )}

        {step === 'searching' && (
          <>
            <h3 id="li-title">{t('linkedin.searching')}</h3>
            <div className="li-spinner" role="status" aria-live="polite" />
            <div className="li-actions"><button type="button" className="li-btn primary" disabled>{t('linkedin.confirmBtn')}</button></div>
          </>
        )}

        {step === 'found' && result && (
          <>
            <h3 id="li-title">{t('linkedin.foundTitle')}</h3>
            <p className="li-text">{t('linkedin.foundAsk')}</p>
            <div className="li-candidate">
              <strong>{result.candidate.name || name}</strong>
              {(result.candidate.title || result.candidate.company) && <span>{[result.candidate.title, result.candidate.company].filter(Boolean).join(' · ')}</span>}
              <a href={result.candidate.url} target="_blank" rel="noopener noreferrer">{t('linkedin.viewProfile')} ↗</a>
            </div>
            {result.candidate.uncertain && <p className="li-warn">{t('linkedin.uncertain')}</p>}
            <p className="li-fine">{t('linkedin.creditUsed')}</p>
            <div className="li-actions">
              <button type="button" className="li-btn ghost" onClick={() => decide('reject')} disabled={busy}>{t('linkedin.rejectProfile')}</button>
              <button type="button" className="li-btn primary" onClick={() => decide('confirm')} disabled={busy}>{t('linkedin.confirmProfile')}</button>
            </div>
          </>
        )}

        {step === 'not_found' && (
          <>
            <h3 id="li-title">{t('linkedin.notFoundTitle')}</h3>
            <p className="li-text">{t('linkedin.notFoundText')}</p>
            <p className="li-fine">{t('linkedin.creditNone')}</p>
            <div className="li-actions">
              <button type="button" className="li-btn ghost" onClick={() => setStep('manual')}>{t('linkedin.manualEnter')}</button>
              <button type="button" className="li-btn primary" onClick={onClose}>{t('linkedin.close')}</button>
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <h3 id="li-title">{t('linkedin.errorTitle')}</h3>
            <p className="li-text">{message}</p>
            <p className="li-fine">{t('linkedin.creditNone')}</p>
            <div className="li-actions">
              <button type="button" className="li-btn ghost" onClick={onClose}>{t('linkedin.close')}</button>
              {!empty && <button type="button" className="li-btn primary" onClick={() => setStep('confirm')}>{t('linkedin.retry')}</button>}
            </div>
          </>
        )}

        {step === 'rejected' && (
          <>
            <h3 id="li-title">{t('linkedin.rejectedTitle')}</h3>
            <p className="li-text">{message}</p>
            {manualBox}
          </>
        )}

        {step === 'manual' && (
          <>
            <h3 id="li-title">{t('linkedin.manualEnter')}</h3>
            {manualBox}
          </>
        )}
      </div>
    </div>
  );
}
