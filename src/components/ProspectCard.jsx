import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';
import DynamicFieldInput from './DynamicFieldInput';
import EmailStatusBadge from './EmailStatusBadge';
import AISuggestionsPanel from './AISuggestionsPanel';
import { useAuth } from '../context/AuthContext';
import { isPlaceholderEmail } from '../utils/placeholderEmail';

// Chrome/Edge only (webkitSpeechRecognition) — Safari/Firefox don't support
// live transcription, so the record button simply doesn't render there
// rather than showing something broken.
const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const STARS = [1, 2, 3];

// A voice note stops on its own after this long without any speech, so a
// rep who forgets to tap stop doesn't leave the mic open indefinitely.
const SILENCE_TIMEOUT_MS = 8000;

function formatFieldValue(field, raw, t) {
  if (raw == null || raw === '') return null;
  if (field.fieldType === 'multi_choice') return Array.isArray(raw) ? raw.join(', ') : raw;
  if (field.fieldType === 'checkbox') return raw ? t('common.yes') : null;
  return String(raw);
}

// The prospect's own "fiche client" — the sales rep's view of one guest
// within one campaign. Two entry points feed this same component:
// LaunchCampaign.jsx (click a name -> opens straight into edit mode, so the
// rep can fill it in on the spot) and History.jsx's CRM tab (click a name
// -> opens the read-only card first, with a pencil to edit). Both cases
// fetch their own data here (the campaign's field/segment definitions, plus
// whatever's already saved) instead of relying on the caller to pass
// everything down, so both entry points always show the exact same
// up-to-date info regardless of how stale the caller's own list was.
export default function ProspectCard({ campaignId, guest, initialMode = 'edit', onClose, onSaved }) {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const [salesFields, setSalesFields] = useState([]);
  const [guestFields, setGuestFields] = useState([]);
  const [guestAnswers, setGuestAnswers] = useState({});
  const [emailVerification, setEmailVerification] = useState(null);
  const [emailEnrichment, setEmailEnrichment] = useState(null); // { source: 'hunter', score } — email found automatically, not typed by anyone
  const [pendingGift, setPendingGift] = useState(null); // { giftName } — won, but no email to send it to yet
  const [consentInfo, setConsentInfo] = useState(null); // { attestedAt, attestedBy } for rep-added contacts
  const emailMissing = isPlaceholderEmail(guest.email);
  const [newEmail, setNewEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [segmentCategories, setSegmentCategories] = useState([]);

  const [note, setNote] = useState('');
  const [leadRating, setLeadRating] = useState(null); // 1-3, or null = not rated — never default this to 0/1 (see below)
  const [segments, setSegments] = useState({}); // { categoryName: optionLabel }
  const [tags, setTags] = useState('');
  const [customFields, setCustomFields] = useState({}); // { fieldLabel: value }

  // AI assistant (services/salesAssistant) — last analysis of this
  // prospect's note, if any. aiAnalyzedNote is a snapshot of the exact note
  // text that analysis came from, so AISuggestionsPanel can tell "still
  // current" apart from "note changed since" without an extra request.
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiAnalyzedNote, setAiAnalyzedNote] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([api.getCampaign(campaignId), api.getGuestNote(campaignId, guest.email)])
      .then(([campaign, guestNote]) => {
        setSalesFields((campaign.fields || []).filter((f) => f.scope === 'sales'));
        setGuestFields((campaign.fields || []).filter((f) => f.scope === 'guest'));
        setGuestAnswers(guestNote.guestAnswers || {});
        setEmailVerification(guestNote.emailVerification || null);
        setEmailEnrichment(guestNote.emailEnrichment || null);
        setPendingGift(guestNote.pendingGift || null);
        setConsentInfo(guestNote.consent || null);
        setSegmentCategories(campaign.segmentCategories || []);
        setNote(guestNote.note || '');
        setLeadRating(guestNote.leadRating ?? null);
        setSegments(guestNote.segments || {});
        setTags(guestNote.tags || '');
        setCustomFields(guestNote.customFields || {});
        setAiSuggestions(guestNote.aiSuggestions || null);
        setAiAnalyzedNote(guestNote.aiAnalyzedNote ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [campaignId, guest.email]);

  // The email check runs in the background after the contact is saved, so a
  // card opened right away can still say "Checking…" — quietly look again a
  // few times until it settles.
  const emailStatus = emailVerification?.status;
  useEffect(() => {
    if (emailStatus !== 'pending') return undefined;
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      api.getGuestNote(campaignId, guest.email)
        .then((n) => { if (n.emailVerification) setEmailVerification(n.emailVerification); })
        .catch(() => {});
      if (tries >= 10) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [emailStatus, campaignId, guest.email]);

  // Read inside the SpeechRecognition callbacks below, which close over the
  // component's very first render (the effect that creates `rec` only runs
  // once) — these always hold the current value instead.
  const noteRef = useRef(note);
  noteRef.current = note;
  const aiAnalyzedNoteRef = useRef(aiAnalyzedNote);
  aiAnalyzedNoteRef.current = aiAnalyzedNote;
  const aiAssistantEnabledRef = useRef(user?.aiAssistantEnabled);
  aiAssistantEnabledRef.current = user?.aiAssistantEnabled;
  const handleAnalyzeRef = useRef(null);

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  // Any sign of speech (interim or final) pushes the auto-stop back; only
  // true silence for SILENCE_TIMEOUT_MS ends the recording on its own.
  function armSilenceTimer() {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    }, SILENCE_TIMEOUT_MS);
  }

  useEffect(() => {
    if (!SpeechRecognitionCtor) return undefined;
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    // Interim results are only used as a "still talking" signal for the
    // silence timer — just the final ones are appended to the note.
    rec.interimResults = true;
    rec.lang = 'fr-FR';
    rec.onresult = (e) => {
      armSilenceTimer();
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
      }
      if (transcript.trim()) {
        setNote((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
      }
    };
    rec.onspeechstart = armSilenceTimer;
    rec.onerror = () => { clearSilenceTimer(); setRecording(false); };
    rec.onend = () => {
      clearSilenceTimer();
      setRecording(false);
      // As soon as the voice note is done and transcribed into the note,
      // kick off the AI assistant on its own — no need to wait for the rep
      // to hit Save first. Skipped if nothing actually changed since the
      // last analysis (e.g. the mic was opened and closed with no speech).
      const trimmedNote = noteRef.current.trim();
      if (aiAssistantEnabledRef.current && trimmedNote && trimmedNote !== (aiAnalyzedNoteRef.current || '').trim()) {
        handleAnalyzeRef.current?.();
      }
    };
    recognitionRef.current = rec;
    return () => { clearSilenceTimer(); try { rec.stop(); } catch { /* already stopped */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRecording() {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setRecording(true);
      armSilenceTimer();
    } catch {
      // start() throws if already started (rapid double-click) — ignore
    }
  }

  function stopRecording() {
    clearSilenceTimer();
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    setRecording(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const trimmedNote = note.trim();
      await api.saveGuestNote({
        campaignId,
        email: guest.email,
        firstName: guest.firstName,
        lastName: guest.lastName,
        note: trimmedNote,
        leadRating,
        segments,
        tags,
        customFields,
      });
      // Fire-and-forget: the card is about to close (this popup's whole flow
      // is a fast tap-through at a booth), so the analysis isn't awaited or
      // shown here — it finishes in the background and is already waiting,
      // stored on the note, the next time anyone opens this prospect's card.
      if (user?.aiAssistantEnabled && trimmedNote && trimmedNote !== aiAnalyzedNote) {
        api.analyzeGuestNote({ campaignId, email: guest.email }).catch(() => {});
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Triggered from AISuggestionsPanel's own link, the dedicated "Analyse IA"
  // button below the note, or automatically right when a voice note finishes
  // recording (see the SpeechRecognition effect above). Updates local state
  // directly from the response rather than reloading the whole card.
  //
  // Saves the current note + fields first: the backend's analyze endpoint
  // always reads the note from the database, never from this request, so
  // skipping this step would either analyze a stale note or fail outright
  // for a prospect whose note was only just dictated/typed and never saved
  // via the main Save button yet.
  async function handleAnalyze() {
    setAnalyzing(true);
    setError('');
    try {
      const trimmedNote = note.trim();
      await api.saveGuestNote({
        campaignId, email: guest.email, firstName: guest.firstName, lastName: guest.lastName,
        note: trimmedNote, leadRating, segments, tags, customFields,
      });
      const result = await api.analyzeGuestNote({ campaignId, email: guest.email });
      setAiSuggestions(result);
      setAiAnalyzedNote(trimmedNote);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }
  handleAnalyzeRef.current = handleAnalyze;

  // Accepting a proposal both marks it applied (mirrors the backend, so it
  // drops out of AISuggestionsPanel's pending list) and merges the accepted
  // value into this card's own edit-mode state, so the rep sees it reflected
  // immediately without reopening the card. Ignoring just marks it dismissed.
  function markSuggestionStatus(suggestionId, status) {
    setAiSuggestions((prev) => {
      if (!prev) return prev;
      const mapItem = (i) => (i.id === suggestionId ? { ...i, status } : i);
      return {
        ...prev,
        fieldUpdates: prev.fieldUpdates.map(mapItem),
        segmentUpdates: prev.segmentUpdates.map(mapItem),
        leadRating: prev.leadRating?.id === suggestionId ? { ...prev.leadRating, status } : prev.leadRating,
        suggestedTag: prev.suggestedTag?.id === suggestionId ? { ...prev.suggestedTag, status } : prev.suggestedTag,
      };
    });
  }

  async function handleApplySuggestion(suggestionId) {
    const fieldItem = aiSuggestions.fieldUpdates.find((i) => i.id === suggestionId);
    const segmentItem = aiSuggestions.segmentUpdates.find((i) => i.id === suggestionId);
    const isRating = aiSuggestions.leadRating?.id === suggestionId;
    const isTag = aiSuggestions.suggestedTag?.id === suggestionId;
    try {
      await api.applyAiSuggestion({ campaignId, email: guest.email, suggestionId });
      markSuggestionStatus(suggestionId, 'applied');
      if (fieldItem) setCustomFields((prev) => ({ ...prev, [fieldItem.fieldLabel]: fieldItem.value }));
      else if (segmentItem) setSegments((prev) => ({ ...prev, [segmentItem.categoryName]: segmentItem.optionLabel }));
      else if (isRating) setLeadRating(aiSuggestions.leadRating.value);
      else if (isTag) setTags((prev) => (prev.trim() ? `${prev.trim()}, ${aiSuggestions.suggestedTag.tag}` : aiSuggestions.suggestedTag.tag));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDismissSuggestion(suggestionId) {
    try {
      await api.dismissAiSuggestion({ campaignId, email: guest.email, suggestionId });
      markSuggestionStatus(suggestionId, 'dismissed');
    } catch (err) {
      setError(err.message);
    }
  }

  // Swaps the placeholder for a real address everywhere it's used and sends
  // the gift email that was being held back, if they already won. The card
  // closes afterwards: it was opened under the old key, and the lists behind
  // it refresh from onSaved.
  async function handleAddEmail() {
    setAddingEmail(true);
    setError('');
    try {
      const res = await api.setProspectEmail({ campaignId, oldEmail: guest.email, newEmail });
      onSaved?.();
      onClose();
      return res;
    } catch (err) {
      setError(err.message);
      setAddingEmail(false);
    }
  }

  // No email ever came (Hunter tried and failed, or the rep never got one)
  // for a gift this person already won — invalidates that win and restores
  // its stock, since it was never actually going to be delivered. The
  // reward stays in the CRM/History, marked "Cancelled — no email" (see
  // History.jsx), rather than vanishing — a record of what happened during
  // the event. The card closes afterwards: onSaved refreshes the list behind it.
  async function handleVoidReward() {
    setVoiding(true);
    setError('');
    try {
      await api.voidPendingReward({ campaignId, email: guest.email });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setVoiding(false);
    }
  }

  function handleCancelEdit() {
    if (initialMode === 'view') {
      load(); // discard unsaved changes, restore what's actually saved
      setMode('view');
    } else {
      onClose();
    }
  }

  const displayName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || t('common.guestFallback');
  const activeSegments = segmentCategories
    .map((cat) => ({ name: cat.name, value: segments[cat.name] }))
    .filter((s) => s.value);

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {loading ? (
          <p className="page-subtitle">{t('common.loading')}</p>
        ) : mode === 'view' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--blue-pale, #EBF9FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue, #09B2FD)" strokeWidth="1.8" width="22" height="22">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{displayName}</div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>{emailMissing ? <em>{t('common.noEmailYet')}</em> : <EmailStatusBadge variant="card" email={guest.email} status={emailVerification?.status} isCatchAll={emailVerification?.isCatchAll} isDisposable={emailVerification?.isDisposable} isRoleAccount={emailVerification?.isRoleAccount} />}</div>
                  {emailEnrichment && (
                    <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, marginTop: 2 }} title={emailEnrichment.score != null ? t('prospectCard.hunterConfidenceTitle', { score: emailEnrichment.score }) : undefined}>
                      {t('prospectCard.foundViaHunterAuto')}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMode('edit')}
                title={t('prospectCard.editTitle')}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.8" width="16" height="16">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9' }} />

            {emailMissing && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{t('common.noEmailYet')}</div>
                <div style={{ fontSize: 12, color: '#B45309', margin: '2px 0 8px' }}>
                  {pendingGift
                    ? t('prospectCard.playedWonHold', { date: new Date(pendingGift.playedAt.replace(' ', 'T') + 'Z').toLocaleString(), gift: pendingGift.giftName })
                    : t('prospectCard.ifTheyPlayHold')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder={t('common.emailPlaceholder')}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
                  />
                  <Button type="button" disabled={addingEmail || !newEmail.trim()} onClick={handleAddEmail}>{addingEmail ? t('common.saving') : t('common.addEmail')}</Button>
                </div>
                {pendingGift && !confirmVoid && (
                  <button
                    type="button"
                    onClick={() => setConfirmVoid(true)}
                    style={{ background: 'none', border: 'none', padding: 0, marginTop: 10, fontSize: 12, color: '#991B1B', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {t('prospectCard.invalidatePlayer')}
                  </button>
                )}
                {pendingGift && confirmVoid && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #FDE68A' }}>
                    <div style={{ fontSize: 12, color: '#991B1B', marginBottom: 8 }}>
                      {t('prospectCard.voidConfirmText', { gift: pendingGift.giftName })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button type="button" size="sm" variant="secondary" disabled={voiding} onClick={handleVoidReward} style={{ color: '#991B1B' }}>
                        {voiding ? t('prospectCard.voiding') : t('prospectCard.confirmVoidBtn')}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={voiding} onClick={() => setConfirmVoid(false)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: '14px 0' }}>
              {guestFields.map((f) => (
                <InfoRow key={`guest-${f.label}`} label={f.label} value={formatFieldValue(f, guestAnswers[f.label], t)} />
              ))}
              {activeSegments.map((s) => (
                <InfoRow key={s.name} label={s.name} value={s.value} />
              ))}
              {salesFields.map((f) => (
                <InfoRow key={f.label} label={f.label} value={formatFieldValue(f, customFields[f.label], t)} />
              ))}
              <InfoRow
                label={t('prospectCard.salesPotential')}
                value={leadRating ? '★'.repeat(leadRating) + '☆'.repeat(3 - leadRating) : null}
                fallback={t('prospectCard.notRatedFallback')}
              />
              <InfoRow label={t('common.tagLabel')} value={tags} />
              {consentInfo && (
                <InfoRow label={t('prospectCard.consentLabel')} value={t('prospectCard.consentValue', { name: consentInfo.attestedBy || t('prospectCard.consentRepFallback'), date: String(consentInfo.attestedAt).slice(0, 10) })} />
              )}
            </div>

            {note && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  {t('prospectCard.latestSalesNote')}
                </div>
                <p style={{ fontSize: 14, color: '#334155', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                  {t('prospectCard.noteQuote', { note })}
                </p>
              </div>
            )}

            {user?.aiAssistantEnabled && note && (
              <AISuggestionsPanel
                suggestions={aiSuggestions}
                analyzedNote={aiAnalyzedNote}
                currentNote={note}
                analyzing={analyzing}
                onAnalyze={handleAnalyze}
                onApply={handleApplySuggestion}
                onDismiss={handleDismissSuggestion}
              />
            )}

            <Button variant="secondary" onClick={onClose} style={{ marginTop: 22 }}>{t('common.close')}</Button>
          </>
        ) : (
          <>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{displayName}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>{emailMissing ? <em>{t('common.noEmailYet')}</em> : <EmailStatusBadge variant="card" email={guest.email} status={emailVerification?.status} isCatchAll={emailVerification?.isCatchAll} isDisposable={emailVerification?.isDisposable} isRoleAccount={emailVerification?.isRoleAccount} />}</p>

            {error && <div className="error-banner">{error}</div>}

            {emailMissing && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{t('common.noEmailYet')}</div>
                <div style={{ fontSize: 12, color: '#B45309', margin: '2px 0 8px' }}>
                  {pendingGift
                    ? t('prospectCard.playedWonHold', { date: new Date(pendingGift.playedAt.replace(' ', 'T') + 'Z').toLocaleString(), gift: pendingGift.giftName })
                    : t('prospectCard.ifTheyPlayHold')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder={t('common.emailPlaceholder')}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
                  />
                  <Button type="button" disabled={addingEmail || !newEmail.trim()} onClick={handleAddEmail}>{addingEmail ? t('common.saving') : t('common.addEmail')}</Button>
                </div>
                {pendingGift && !confirmVoid && (
                  <button
                    type="button"
                    onClick={() => setConfirmVoid(true)}
                    style={{ background: 'none', border: 'none', padding: 0, marginTop: 10, fontSize: 12, color: '#991B1B', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {t('prospectCard.invalidatePlayer')}
                  </button>
                )}
                {pendingGift && confirmVoid && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #FDE68A' }}>
                    <div style={{ fontSize: 12, color: '#991B1B', marginBottom: 8 }}>
                      {t('prospectCard.voidConfirmText', { gift: pendingGift.giftName })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button type="button" size="sm" variant="secondary" disabled={voiding} onClick={handleVoidReward} style={{ color: '#991B1B' }}>
                        {voiding ? t('prospectCard.voiding') : t('prospectCard.confirmVoidBtn')}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={voiding} onClick={() => setConfirmVoid(false)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="field">
              <label>{t('common.noteLabel')}</label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('prospectCard.notePlaceholder')}
                style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
              />
              {SpeechRecognitionCtor && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {recording ? (
                    <>
                      <button
                        type="button"
                        onClick={stopRecording}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36,
                          background: '#EF4444', color: 'white', border: 'none', borderRadius: 20,
                          padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {t('prospectCard.stopRecording')}
                      </button>
                      <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                        {t('prospectCard.recordingLabel')} <span style={{ color: '#94A3B8', fontWeight: 500 }}>{t('prospectCard.recordingSilenceHint')}</span>
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36,
                        background: '#F1F5F9', color: '#334155', border: 'none', borderRadius: 20,
                        padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {t('prospectCard.recordVoiceNote')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Explicit fallback for whenever the automatic trigger (on Save,
                or right when a voice note finishes recording) didn't fire —
                e.g. the note was typed rather than dictated. */}
            {user?.aiAssistantEnabled && note.trim() && (
              <Button type="button" variant="secondary" size="sm" disabled={analyzing} onClick={handleAnalyze} style={{ marginTop: 10 }}>
                {analyzing ? t('aiSuggestionsPanel.analyzing') : t('prospectCard.analyzeNowBtn')}
              </Button>
            )}

            {user?.aiAssistantEnabled && note && (
              <AISuggestionsPanel
                suggestions={aiSuggestions}
                analyzedNote={aiAnalyzedNote}
                currentNote={note}
                analyzing={analyzing}
                onAnalyze={handleAnalyze}
                onApply={handleApplySuggestion}
                onDismiss={handleDismissSuggestion}
              />
            )}

            {segmentCategories.map((cat) => (
              <DynamicFieldInput
                key={cat.id}
                field={{ label: cat.name, fieldType: 'dropdown', options: cat.options.map((o) => o.label) }}
                value={segments[cat.name] || ''}
                onChange={(v) => setSegments((prev) => ({ ...prev, [cat.name]: v || undefined }))}
              />
            ))}

            {salesFields.map((f) => (
              <DynamicFieldInput
                key={f.id}
                field={f}
                value={customFields[f.label]}
                onChange={(v) => setCustomFields((prev) => ({ ...prev, [f.label]: v }))}
              />
            ))}

            <div className="field">
              <label>{t('common.leadPotential')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {STARS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setLeadRating(leadRating === n ? null : n)}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    style={{
                      background: 'none', border: 'none', fontSize: 30, cursor: 'pointer', lineHeight: 1, padding: 0,
                      color: leadRating >= n ? '#F59E0B' : '#CBD5E1',
                    }}
                  >
                    {leadRating >= n ? '★' : '☆'}
                  </button>
                ))}
              </div>
              {leadRating == null && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('common.notRatedHint')}</div>}
            </div>

            <div className="field">
              <label>{t('common.tagLabel')}</label>
              <input
                placeholder={t('prospectCard.tagPlaceholder')}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <Button type="button" onClick={handleSave} disabled={saving}>{saving ? t('common.saving') : t('prospectCard.saveBtn')}</Button>
              <Button type="button" variant="secondary" onClick={handleCancelEdit}>{t('common.cancel')}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, fallback = '—' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid #F8FAFC', fontSize: 13 }}>
      <span style={{ color: '#64748B' }}>{label}</span>
      <span style={{ fontWeight: 600, color: value ? '#03041A' : '#94A3B8' }}>{value || fallback}</span>
    </div>
  );
}
