// All the data and behaviour of one prospect's card (the sales rep's "fiche client" for one guest in one
// campaign) — shared by the phone and desktop layouts, which only differ in how they arrange it.
// Logic moved here unchanged from the former single-file ProspectCard: loading, saving, the AI analysis
// (which fills the CRM fields itself and never touches the original note), voice dictation, adding a
// missing e-mail, cancelling a gift that can no longer be delivered.
//
// New here: derived AI states (fresh / stale / reworked text / next steps), a "dirty" check so nothing
// is lost silently, and history-aware closing so the phone's Back button closes the card instead of
// leaving the app.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { IS_BOX_BUILD } from '../../utils/boxMode';
import { isPlaceholderEmail } from '../../utils/placeholderEmail';

// Chrome/Edge only, HTTPS only, needs the internet (the browser sends the audio to its own service).
export const SpeechRecognitionCtor =
  typeof window !== 'undefined' && window.isSecureContext && !IS_BOX_BUILD ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// A voice note stops on its own after this long without any speech.
const SILENCE_TIMEOUT_MS = 8000;

const PHONE_LABEL_RE = /^(phone|telephone|téléphone|tel\.?|tél\.?|mobile|portable|gsm)$/i;

export function formatFieldValue(field, raw, t) {
  if (raw == null || raw === '') return null;
  if (field.fieldType === 'multi_choice') return Array.isArray(raw) ? raw.join(', ') : raw;
  if (field.fieldType === 'checkbox') return raw ? t('common.yes') : null;
  if (field.fieldType === 'datetime') {
    const d = new Date(raw); // "YYYY-MM-DDTHH:MM" = the rep's wall-clock time, parsed as local
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
  return String(raw);
}

export function useProspectCard({ campaignId, guest, initialMode, onClose, onSaved }) {
  const { t } = useTranslation('admin');
  const [editing, setEditing] = useState(initialMode === 'edit');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const [salesFields, setSalesFields] = useState([]);
  const [guestFields, setGuestFields] = useState([]);
  const [guestAnswers, setGuestAnswers] = useState({});
  const [phoneFromForm, setPhoneFromForm] = useState(null);
  const [emailVerification, setEmailVerification] = useState(null);
  const [emailEnrichment, setEmailEnrichment] = useState(null);
  const [pendingGift, setPendingGift] = useState(null);
  const [consentInfo, setConsentInfo] = useState(null);
  const emailMissing = isPlaceholderEmail(guest.email);
  const [newEmail, setNewEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [segmentCategories, setSegmentCategories] = useState([]);

  const [note, setNote] = useState('');
  const [leadRating, setLeadRating] = useState(null); // 1-3, or null = not rated — never default this to 0/1
  const [segments, setSegments] = useState({});
  const [tags, setTags] = useState('');
  const [customFields, setCustomFields] = useState({});

  // AI assistant (services/salesAssistant). aiAnalyzedNote = the exact note text the analysis came from.
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiAnalyzedNote, setAiAnalyzedNote] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiEnabledCampaign, setAiEnabledCampaign] = useState(false);
  // The assistant needs the internet: never on the event box, whatever the campaign says.
  const aiOn = aiEnabledCampaign && !IS_BOX_BUILD;

  // Right-hand column: dated history and the other campaigns (cloud only — the box has neither), manual notes (both).
  const [history, setHistory] = useState(null);
  const [otherCampaigns, setOtherCampaigns] = useState(null);
  const [manualNotes, setManualNotes] = useState(null);
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  const baselineRef = useRef('');
  const snapshot = (n, r, s, tg, cf) => JSON.stringify({ n: (n || '').trim(), r, s, tg: tg || '', cf });

  function load() {
    setLoading(true);
    setError('');
    Promise.all([api.getCampaign(campaignId), api.getGuestNote(campaignId, guest.email)])
      .then(([campaign, guestNote]) => {
        setSalesFields((campaign.fields || []).filter((f) => f.scope === 'sales'));
        setGuestFields((campaign.fields || []).filter((f) => f.scope === 'guest'));
        setGuestAnswers(guestNote.guestAnswers || {});
        setPhoneFromForm(guestNote.phone || null);
        setEmailVerification(guestNote.emailVerification || null);
        setEmailEnrichment(guestNote.emailEnrichment || null);
        setPendingGift(guestNote.pendingGift || null);
        setConsentInfo(guestNote.consent || null);
        setSegmentCategories(campaign.segmentCategories || []);
        setAiEnabledCampaign(!!campaign.ai_assistant_enabled);
        setNote(guestNote.note || '');
        setLeadRating(guestNote.leadRating ?? null);
        setSegments(guestNote.segments || {});
        setTags(guestNote.tags || '');
        setCustomFields(guestNote.customFields || {});
        setAiSuggestions(guestNote.aiSuggestions || null);
        setAiAnalyzedNote(guestNote.aiAnalyzedNote ?? null);
        baselineRef.current = snapshot(guestNote.note, guestNote.leadRating ?? null, guestNote.segments || {}, guestNote.tags, guestNote.customFields || {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [campaignId, guest.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Side data loads on its own: a failure here must never stop the card itself from opening.
  function loadExtras() {
    if (!IS_BOX_BUILD) {
      api.getProspectHistory(campaignId, guest.email).then((r) => setHistory(r.events || [])).catch(() => setHistory([]));
      api.getProspectCampaigns(guest.email).then((r) => setOtherCampaigns(r.campaigns || [])).catch(() => setOtherCampaigns([]));
    }
    api.getProspectNotes(campaignId, guest.email).then((r) => setManualNotes(r.notes || [])).catch(() => setManualNotes([]));
  }
  useEffect(loadExtras, [campaignId, guest.email]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addManualNote(body) {
    const text = (body || '').trim();
    if (!text) return false;
    setAddingNote(true);
    setNoteError('');
    try {
      const { note: created } = await api.addProspectNote({ campaignId, email: guest.email, body: text });
      setManualNotes((prev) => [created, ...(prev || [])]);
      if (!IS_BOX_BUILD) api.getProspectHistory(campaignId, guest.email).then((r) => setHistory(r.events || [])).catch(() => {});
      return true;
    } catch (err) {
      setNoteError(err.message);
      return false;
    } finally {
      setAddingNote(false);
    }
  }

  // The e-mail check runs in the background after the contact is saved: look again a few times until it settles.
  const emailStatus = emailVerification?.status;
  useEffect(() => {
    if (emailStatus !== 'pending') return undefined;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      api.getGuestNote(campaignId, guest.email).then((n) => { if (n.emailVerification) setEmailVerification(n.emailVerification); }).catch(() => {});
      if (tries >= 10) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [emailStatus, campaignId, guest.email]);

  const dirty = !loading && baselineRef.current !== '' && snapshot(note, leadRating, segments, tags, customFields) !== baselineRef.current;

  // ── closing, with the phone's Back button ────────────────────────────────
  // Opening the card adds one history entry; Back (or the arrow) removes it and closes the card — the app
  // itself is never left. Closing with unsaved changes asks first.
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const discardMsgRef = useRef(''); discardMsgRef.current = t('prospect.discardConfirm');
  const pushedRef = useRef(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!(window.history.state && window.history.state.prospectCard)) {
      window.history.pushState({ prospectCard: true }, '');
      pushedRef.current = true;
    }
    const onPop = () => {
      if (!pushedRef.current) return;
      pushedRef.current = false;
      if (!closingRef.current && dirtyRef.current && !window.confirm(discardMsgRef.current)) {
        window.history.pushState({ prospectCard: true }, ''); // stay on the card
        pushedRef.current = true;
        return;
      }
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function closeNow() {
    if (pushedRef.current) { closingRef.current = true; window.history.back(); } else onCloseRef.current();
  }
  // From the arrow / X / backdrop: ask before throwing unsaved work away.
  function requestClose() {
    if (dirty && !window.confirm(t('prospect.discardConfirm'))) return;
    closingRef.current = true; // already confirmed
    closeNow();
  }

  // ── voice dictation (unchanged) ──────────────────────────────────────────
  const noteRef = useRef(note); noteRef.current = note;
  const aiAnalyzedNoteRef = useRef(aiAnalyzedNote); aiAnalyzedNoteRef.current = aiAnalyzedNote;
  const aiOnRef = useRef(false); aiOnRef.current = aiOn;
  const handleAnalyzeRef = useRef(null);

  function clearSilenceTimer() {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }
  function armSilenceTimer() {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => { try { recognitionRef.current?.stop(); } catch { /* already stopped */ } }, SILENCE_TIMEOUT_MS);
  }

  useEffect(() => {
    if (!SpeechRecognitionCtor) return undefined;
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'fr-FR';
    rec.onresult = (e) => {
      armSilenceTimer();
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
      if (transcript.trim()) setNote((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
    };
    rec.onspeechstart = armSilenceTimer;
    rec.onerror = () => { clearSilenceTimer(); setRecording(false); };
    rec.onend = () => {
      clearSilenceTimer();
      setRecording(false);
      // Voice note finished and transcribed: let the assistant work on it right away (if on, and the text changed).
      const trimmed = noteRef.current.trim();
      if (aiOnRef.current && trimmed && trimmed !== (aiAnalyzedNoteRef.current || '').trim()) handleAnalyzeRef.current?.();
    };
    recognitionRef.current = rec;
    return () => { clearSilenceTimer(); try { rec.stop(); } catch { /* already stopped */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRecording() {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.start(); setRecording(true); armSilenceTimer(); } catch { /* already started */ }
  }
  function stopRecording() {
    clearSilenceTimer();
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    setRecording(false);
  }

  const payload = (over = {}) => ({
    campaignId, email: guest.email, firstName: guest.firstName, lastName: guest.lastName,
    note: note.trim(), leadRating, segments, tags, customFields, ...over,
  });

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const trimmed = note.trim();
      await api.saveGuestNote(payload());
      baselineRef.current = snapshot(note, leadRating, segments, tags, customFields);
      // Fire-and-forget: the card is about to close, the analysis finishes in the background and fills the record.
      if (aiOn && trimmed && trimmed !== aiAnalyzedNote) {
        api.analyzeGuestNote({ campaignId, email: guest.email }).then(() => onSaved?.()).catch(() => {});
      }
      onSaved?.();
      dirtyRef.current = false;
      closingRef.current = true;
      closeNow();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Stars straight from the header: in view mode a tap saves at once; while editing it only changes the draft.
  async function setRating(n) {
    const next = leadRating === n ? null : n;
    setLeadRating(next);
    if (editing) return;
    try {
      await api.saveGuestNote(payload({ leadRating: next }));
      baselineRef.current = snapshot(note, next, segments, tags, customFields);
      onSaved?.();
    } catch (err) {
      setLeadRating(leadRating);
      setError(err.message);
    }
  }

  // Saves the current note first (the backend analyses what is in the database), then analyses. The ORIGINAL
  // note is never replaced: the result is stored beside it and only decides what the card shows.
  async function handleAnalyze() {
    setAnalyzing(true);
    setAiError('');
    try {
      const trimmed = note.trim();
      await api.saveGuestNote(payload());
      const { analysis, values } = await api.analyzeGuestNote({ campaignId, email: guest.email });
      setSegments(values.segments || {});
      setCustomFields(values.customFields || {});
      setLeadRating(values.leadRating ?? null);
      setTags(values.tags || '');
      setAiSuggestions(analysis);
      setAiAnalyzedNote(trimmed);
      baselineRef.current = snapshot(note, values.leadRating ?? null, values.segments || {}, values.tags || '', values.customFields || {});
      onSaved?.();
    } catch (err) {
      setAiError(err.message || t('prospect.analysisFailed'));
    } finally {
      setAnalyzing(false);
    }
  }
  handleAnalyzeRef.current = handleAnalyze;

  async function handleAddEmail() {
    setAddingEmail(true);
    setError('');
    try {
      await api.setProspectEmail({ campaignId, oldEmail: guest.email, newEmail });
      onSaved?.();
      closingRef.current = true;
      closeNow();
    } catch (err) {
      setError(err.message);
      setAddingEmail(false);
    }
  }

  async function handleVoidReward() {
    setVoiding(true);
    setError('');
    try {
      await api.voidPendingReward({ campaignId, email: guest.email });
      onSaved?.();
      closingRef.current = true;
      closeNow();
    } catch (err) {
      setError(err.message);
      setVoiding(false);
    }
  }

  function startEdit() { setEditing(true); }
  function cancelEdit() {
    if (dirty && !window.confirm(t('prospect.discardConfirm'))) return;
    if (initialMode === 'edit') { closingRef.current = true; closeNow(); return; }
    load(); // discard the draft, back to what is actually saved
    setEditing(false);
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const displayName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || t('common.guestFallback');
  const initials = (`${(guest.firstName || '').trim()[0] || ''}${(guest.lastName || '').trim()[0] || ''}`.toUpperCase()) || '?';

  // An analysis only counts for the note it was made from: when the note changed, the old result is not shown as current.
  const hasAnalysis = aiOn && !!aiSuggestions && aiAnalyzedNote != null;
  const analysisFresh = hasAnalysis && aiAnalyzedNote.trim() === note.trim();
  const analysisStale = hasAnalysis && !analysisFresh;
  const unmapped = analysisFresh ? aiSuggestions.unmappedInfo || [] : [];
  const reworkedStored = analysisFresh && typeof aiSuggestions.reworkedNote === 'string' ? aiSuggestions.reworkedNote.trim() : null;
  // The rewritten note exists only for an analysis made by the current assistant (or older ones that listed leftover points).
  const hasReworked = analysisFresh && (reworkedStored !== null || unmapped.length > 0);
  const reworkedText = hasReworked ? (reworkedStored || unmapped.join(' ')).trim() : '';
  const toCheck = analysisFresh ? aiSuggestions.toCheck || [] : [];
  const nextActions = analysisFresh ? aiSuggestions.nextActions || [] : [];

  const phone = phoneFromForm || Object.entries(guestAnswers).find(([label, v]) => PHONE_LABEL_RE.test(label.trim()) && v)?.[1] || null;

  // Up to 3 facts for the header, taken from what this campaign actually collects (never hard-coded names).
  const facts = [
    ...guestFields.map((f) => ({ label: f.label, value: formatFieldValue(f, guestAnswers[f.label], t), skip: PHONE_LABEL_RE.test(f.label.trim()) })),
    ...salesFields.map((f) => ({ label: f.label, value: formatFieldValue(f, customFields[f.label], t) })),
  ].filter((x) => x.value && !x.skip).slice(0, 3);

  return {
    t, guest, loading, error, setError, saving, editing, startEdit, cancelEdit, dirty,
    displayName, initials, emailMissing, phone, facts,
    emailVerification, emailEnrichment, pendingGift, consentInfo,
    salesFields, guestFields, guestAnswers, segmentCategories,
    note, setNote, leadRating, setRating, segments, setSegments, tags, setTags, customFields, setCustomFields,
    aiOn, analyzing, aiError, analysisFresh, analysisStale, hasReworked, reworkedText, toCheck, nextActions, aiSuggestions,
    handleAnalyze, handleSave, requestClose,
    history, otherCampaigns, manualNotes, addManualNote, addingNote, noteError, campaignId,
    recording, startRecording, stopRecording, canDictate: !!SpeechRecognitionCtor,
    newEmail, setNewEmail, addingEmail, handleAddEmail, confirmVoid, setConfirmVoid, voiding, handleVoidReward,
  };
}
