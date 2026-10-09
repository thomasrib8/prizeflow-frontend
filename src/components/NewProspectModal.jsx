import { useEffect, useRef, useState } from 'react';
import { IS_BOX_BUILD } from '../utils/boxMode';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';
import DynamicFieldInput from './DynamicFieldInput';
import { prepareScanImage } from '../utils/scanImage';
import LinkedInIcon from './linkedin/LinkedInIcon';
import LinkedInSearchDialog from './linkedin/LinkedInSearchDialog';
import { useLinkedInStatus } from '../hooks/useLinkedInStatus';
import { canSearchLinkedIn, shortLinkedInUrl } from '../utils/linkedin';

// Chrome/Edge only (webkitSpeechRecognition) — same as ProspectCard.jsx, see
// there for why this doesn't render anywhere else.
const SpeechRecognitionCtor =
  typeof window !== 'undefined' && window.isSecureContext && !IS_BOX_BUILD ? window.SpeechRecognition || window.webkitSpeechRecognition : null; // needs HTTPS and the internet

const STARS = [1, 2, 3];
const EMPTY_FORM = { firstName: '', lastName: '', email: '' };
// A voice note stops on its own after this long without any speech, so a
// rep who forgets to tap stop doesn't leave the mic open indefinitely.
const SILENCE_TIMEOUT_MS = 8000;

// Lets a sales rep put someone in the CRM from the Launch page without that
// person filling in anything — typed by hand, or pre-filled from a photo of
// their badge / business card (or the vCard QR some badges carry).
//
// The photo only ever PRE-FILLS this form: the rep always sees what was read,
// fields the reader wasn't sure about are highlighted, and nothing is saved
// until they confirm. Badges often show no email, so email is optional — a
// person without one still gets a CRM card and can still play; their gift is
// held until a real address is added (see the prospect card).
//
// Only first and last name are required. The campaign's other guest-form
// fields are shown without their "required" marker: a rep entering a contact
// at speed shouldn't be blocked by something that's only mandatory for a guest
// on their own phone. Since the person ticked nothing themselves, the rep
// attests they agreed to be contacted and to get their gift by email.
export default function NewProspectModal({ campaign, initialFile = null, scanEnabled = false, onClose, onCreated }) {
  const { t } = useTranslation('admin');
  const guestFields = (campaign.fields || []).filter((f) => f.scope === 'guest');
  const salesFields = (campaign.fields || []).filter((f) => f.scope === 'sales');
  const segmentCategories = campaign.segmentCategories || [];
  const canQueue = campaign.status === 'active';

  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const startedRef = useRef(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [company, setCompany] = useState('');
  const [guestAnswers, setGuestAnswers] = useState({});
  const [note, setNote] = useState('');
  const [leadRating, setLeadRating] = useState(null); // 1-3, null = not rated — never a default 1
  const [segments, setSegments] = useState({});
  const [tags, setTags] = useState('');
  const [customFields, setCustomFields] = useState({});
  // Defaults to checked: the rep is the one filling this in (not the
  // prospect), so ticking it is the expected case, not an opt-in they should
  // have to remember every time — they can still untick it if genuinely needed.
  const [consent, setConsent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null); // { message, addToQueue }
  // { state: 'idle' | 'reading' | 'done' | 'error', message, source: 'qr' | 'photo', confidence }
  const [scan, setScan] = useState({ state: 'idle' });

  // LinkedIn profile (Apollo): a rep-started search. The confirmed result stays on the server while this form is
  // open and is attached to the prospect when the form is saved (linkedinOperationId); a typed link goes along as is.
  const li = useLinkedInStatus(campaign.id);
  const [linkedin, setLinkedin] = useState(null); // { url, source, operationId }
  const [liDialog, setLiDialog] = useState(false);
  const [liNotice, setLiNotice] = useState('');
  const liOffered = !!campaign.linkedin_search_enabled && (IS_BOX_BUILD || !!(li.status && li.status.available));
  const liBlocked = li.offline ? t('linkedin.offline') : li.status && li.status.credits.remaining <= 0 ? t('linkedin.exhausted') : '';
  function openLinkedIn() {
    if (!canSearchLinkedIn({ firstName: form.firstName, lastName: form.lastName, email: form.email, company })) { setLiNotice(t('linkedin.needMoreInfo')); return; }
    setLiNotice('');
    setLiDialog(true);
  }
  // { state: 'idle' | 'searching' | 'found' | 'not_found', email, score } —
  // live Hunter.io lookup, so the rep sees a result (and can review/correct
  // it) before saving, instead of only finding out afterwards via a toast.
  const [hunterSearch, setHunterSearch] = useState({ state: 'idle' });
  const hunterSignatureRef = useRef(''); // last "first|last|company" combo actually searched — never search the same one twice
  const hunterRequestIdRef = useRef(0); // bumped per request so a late response from an older search is ignored
  const emailRef = useRef(form.email); // always current, read inside the async .then() below where `form` itself would be stale
  emailRef.current = form.email;

  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

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
    rec.onend = () => { clearSilenceTimer(); setRecording(false); };
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

  function applyReading({ fields, customFields: fromCampaign = {}, confidence }, source) {
    setForm({ firstName: fields.firstName || '', lastName: fields.lastName || '', email: fields.email || '' });
    setCompany(fields.company || '');

    const answers = { ...fromCampaign };
    // A phone number the campaign has a place for but the reader didn't route
    // there goes straight into that field; with no such field, it still
    // shouldn't be silently dropped — it rides along in the note instead,
    // same as job title below.
    const phoneField = guestFields.find((f) => f.fieldType === 'phone' && !answers[f.label]);
    const phoneWentToField = !!(phoneField && fields.phone);
    if (phoneWentToField) answers[phoneField.label] = fields.phone;
    setGuestAnswers(answers);

    // Job title has no field of its own unless the campaign made one — keep
    // it in the note rather than throw it away. Company now has its own
    // field (see the Company input below — it also doubles as what Hunter
    // searches on when there's no email), so it no longer needs to ride
    // along in free text too.
    const usedElsewhere = (v) => v && Object.values(answers).includes(v);
    const noteParts = [];
    if (fields.jobTitle && !usedElsewhere(fields.jobTitle)) noteParts.push(fields.jobTitle);
    if (fields.phone && !phoneWentToField) noteParts.push(`Tel: ${fields.phone}`);
    setNote(noteParts.join(' · '));

    setScan({ state: 'done', source, confidence: confidence || {} });
    setError('');
    setDuplicate(null);
  }

  async function handleFile(file) {
    if (!file) return;
    setScan({ state: 'reading' });
    setError('');
    try {
      const { blob, contact } = await prepareScanImage(file);
      if (contact) {
        // A vCard / MECARD QR is exact — no need to send the photo anywhere.
        const high = { firstName: 'high', lastName: 'high', email: contact.email ? 'high' : 'none' };
        applyReading({ fields: contact, confidence: high }, 'qr');
        return;
      }
      const result = await api.scanProspectImage(campaign.id, blob);
      if (result.documentType === 'unreadable' || (!result.fields.firstName && !result.fields.lastName && !result.fields.email)) {
        setScan({ state: 'error', message: t('newProspectModal.scanUnreadable') });
        return;
      }
      applyReading(result, 'photo');
    } catch (err) {
      setScan({ state: 'error', message: err.message });
    }
  }

  // The header's "Scan badge" button hands over a photo it already took.
  useEffect(() => {
    if (initialFile && !startedRef.current) {
      startedRef.current = true;
      handleFile(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared by the auto-search effect below and the manual "Find email"
  // button next to the field — same request, two ways to trigger it. The
  // button always re-runs even for a combination already searched (the rep
  // clicking it is an explicit "try again", e.g. after a transient error).
  function runHunterSearch(first, last, comp) {
    hunterSignatureRef.current = `${first.toLowerCase()}|${last.toLowerCase()}|${comp.toLowerCase()}`;
    const requestId = ++hunterRequestIdRef.current;
    setHunterSearch({ state: 'searching' });
    api
      .findEmailViaHunter({ firstName: first, lastName: last, company: comp })
      .then((res) => {
        if (requestId !== hunterRequestIdRef.current) return; // a newer search superseded this one
        if (res.found && !emailRef.current.trim()) {
          setForm((f) => (f.email.trim() ? f : { ...f, email: res.email }));
          setHunterSearch({ state: 'found', email: res.email, score: res.score });
        } else if (res.found) {
          // The rep already typed their own email while this was in
          // flight — don't override it or credit it to Hunter.
          setHunterSearch({ state: 'idle' });
        } else if (res.error) {
          // The lookup itself failed (timeout, quota, bad key) — distinct
          // from Hunter genuinely finding nobody (see the route's comment).
          setHunterSearch({ state: 'error' });
        } else {
          setHunterSearch({ state: 'not_found' });
        }
      })
      .catch(() => {
        if (requestId !== hunterRequestIdRef.current) return;
        setHunterSearch({ state: 'error' });
      });
  }

  // Live Hunter.io search: once first name, last name and company are all
  // known (typically right after a scan) and there's no email yet, look one
  // up automatically — debounced, so typing a company by hand doesn't fire a
  // request per keystroke, and never twice for the same combination. Never
  // fires at all once an email is already known (typed by the rep, or read
  // straight off the badge) — there is nothing to look up, and it would only
  // burn a Hunter.io credit for a result that gets thrown away.
  useEffect(() => {
    if (IS_BOX_BUILD) return undefined; // e-mail search needs the internet: not on the event box
    if (form.email.trim()) return undefined;
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    const comp = company.trim();
    if (!first || !last || !comp) return undefined;
    const signature = `${first.toLowerCase()}|${last.toLowerCase()}|${comp.toLowerCase()}`;
    if (signature === hunterSignatureRef.current) return undefined;
    const timer = setTimeout(() => runHunterSearch(first, last, comp), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.firstName, form.lastName, company, form.email]);

  async function submit(addToQueue, confirmDuplicate = false) {
    if (!formRef.current.reportValidity()) return;
    setSaving(true);
    setError('');
    try {
      const emailIsHunterFind = hunterSearch.state === 'found' && hunterSearch.email === form.email.trim().toLowerCase();
      const res = await api.createProspect({
        campaignId: campaign.id,
        ...form,
        company: company.trim(),
        guestAnswers,
        note,
        leadRating,
        segments,
        tags,
        customFields,
        consentAttested: consent,
        addToQueue,
        confirmDuplicate,
        emailFoundViaHunter: emailIsHunterFind,
        hunterScore: emailIsHunterFind ? hunterSearch.score : undefined,
        linkedinOperationId: linkedin && linkedin.operationId ? linkedin.operationId : undefined,
        linkedinUrl: linkedin && !linkedin.operationId ? linkedin.url : undefined,
      });
      // Fire-and-forget, same as ProspectCard.jsx's own save: the note (typed
      // or dictated) only exists in the database from this point on — the
      // assistant's analyze endpoint always reads it from there, so this is
      // the earliest moment analysis can actually run for a prospect that
      // didn't exist a moment ago. The modal closes right after, so nothing
      // here is awaited or shown — the result is just waiting on this
      // prospect's card the next time anyone opens it.
      if (campaign.ai_assistant_enabled && note.trim() && res.email) {
        api.analyzeGuestNote({ campaignId: campaign.id, email: res.email }).catch(() => {});
      }
      onCreated?.({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        queued: res.queued,
        emailMissing: res.emailMissing,
        prospectId: res.prospectId,
        emailEnrichment: res.emailEnrichment,
      });
      onClose();
    } catch (err) {
      if (err.code === 'POSSIBLE_DUPLICATE') setDuplicate({ message: err.message, addToQueue });
      else setError(err.message);
      setSaving(false);
    }
  }

  // Fields the reader wasn't sure about get an amber outline.
  const doubtful = (key) => scan.state === 'done' && ['low', 'medium'].includes(scan.confidence?.[key]);
  const flagStyle = (key) => (doubtful(key) ? { borderColor: '#F59E0B', background: '#FFFBEB' } : undefined);
  const doubtHint = (key) => doubtful(key) && <div style={{ fontSize: 11, color: '#B45309', marginTop: 3 }}>{t('newProspectModal.checkFieldHint')}</div>;
  const noEmailOnBadge = scan.state === 'done' && !form.email;

  return (
    <div className="modal-overlay">
      <form ref={formRef} className="modal-card" style={{ '--modal-w': '560px' }} onSubmit={(e) => e.preventDefault()}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{t('newProspectModal.title')}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
          {t('newProspectModal.subtitlePrefix')} <strong>{campaign.name}</strong> {t('newProspectModal.subtitleSuffix')}
        </p>

        {scanEnabled && (
          <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleFile(f); }}
            />
            <Button type="button" variant="secondary" disabled={scan.state === 'reading' || saving} onClick={() => fileInputRef.current?.click()}>
              {scan.state === 'reading' ? t('newProspectModal.scanReading') : scan.state === 'done' ? t('newProspectModal.scanAnother') : t('newProspectModal.scanBadgeOrCard')}
            </Button>
            {scan.state === 'idle' && (
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>{t('newProspectModal.scanIdleHint')}</div>
            )}
            {scan.state === 'done' && (
              <div style={{ fontSize: 12, color: '#047857', marginTop: 8, fontWeight: 600 }}>
                ✓ {scan.source === 'qr' ? t('newProspectModal.scanDoneQr') : t('newProspectModal.scanDonePhoto')}{' '}
                <span style={{ color: '#64748B', fontWeight: 500 }}>{t('newProspectModal.scanDoneCheckHint')}</span>
              </div>
            )}
            {scan.state === 'error' && <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 8 }}>{scan.message}</div>}
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>{t('newProspectModal.contactSectionTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('newProspectModal.firstNameLabel')}</label>
            <input required value={form.firstName} style={flagStyle('firstName')} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            {doubtHint('firstName')}
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('newProspectModal.lastNameLabel')}</label>
            <input required value={form.lastName} style={flagStyle('lastName')} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            {doubtHint('lastName')}
          </div>
        </div>
        <div className="field">
          <label>{t('newProspectModal.emailLabel')}</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input
              type="email"
              value={form.email}
              style={{ ...flagStyle('email'), flex: 1, minWidth: 0 }}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setHunterSearch({ state: 'idle' }); }}
            />
            {/* Hunter.io is only ever worth it when there's no email yet —
                once one is known (typed, or already on the badge), there's
                nothing to look up and no reason to spend a credit on it. */}
            {!IS_BOX_BUILD && !form.email.trim() && (
              <Button
                type="button"
                variant="secondary"
                disabled={hunterSearch.state === 'searching' || !form.firstName.trim() || !form.lastName.trim() || !company.trim()}
                onClick={() => runHunterSearch(form.firstName.trim(), form.lastName.trim(), company.trim())}
                title={!company.trim() ? t('newProspectModal.fillCompanyFirstTitle') : undefined}
                style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {hunterSearch.state === 'searching' ? t('newProspectModal.searchingBtn') : t('newProspectModal.findEmailBtn')}
              </Button>
            )}
          </div>
          {doubtHint('email')}
          {hunterSearch.state === 'searching' && (
            <>
              <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 5, fontWeight: 600 }}>{t('newProspectModal.searchingHunter')}</div>
              <div className="hunter-search-bar" />
            </>
          )}
          {hunterSearch.state === 'found' && (
            <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 3, fontWeight: 600 }}>
              {hunterSearch.score != null ? t('newProspectModal.hunterFoundWithScore', { score: hunterSearch.score }) : t('newProspectModal.hunterFound')}
            </div>
          )}
          {hunterSearch.state === 'not_found' && !form.email.trim() && (
            <div style={{ fontSize: 11, color: '#B45309', marginTop: 3 }}>
              {t('newProspectModal.hunterNotFound')}
            </div>
          )}
          {hunterSearch.state === 'error' && !form.email.trim() && (
            <div style={{ fontSize: 11, color: '#B45309', marginTop: 3 }}>
              {t('newProspectModal.hunterError')}
            </div>
          )}
          {liOffered && (
            <div className="li-field">
              {linkedin ? (
                <div className="li-field-linked">
                  <LinkedInIcon />
                  <a href={linkedin.url} target="_blank" rel="noopener noreferrer">{shortLinkedInUrl(linkedin.url)}</a>
                  <button type="button" onClick={() => setLinkedin(null)}>{t('linkedin.fieldClear')}</button>
                </div>
              ) : (
                <>
                  <Button type="button" variant="secondary" onClick={openLinkedIn} disabled={!!liBlocked} title={liBlocked || undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <LinkedInIcon style={{ width: 18, height: 18 }} />{t('linkedin.buttonSearch')}
                  </Button>
                  {(liBlocked || liNotice) && <div className="li-field-note">{liBlocked || liNotice}</div>}
                </>
              )}
            </div>
          )}
          {hunterSearch.state === 'idle' && !form.email && (
            <div style={{ fontSize: 11, color: noEmailOnBadge ? '#B45309' : '#64748B', marginTop: 3 }}>
              {noEmailOnBadge ? t('newProspectModal.noEmailOnBadge') : ''}
              {company.trim()
                ? t('newProspectModal.willTryFindCompany')
                : t('newProspectModal.addCompanyHint')}
            </div>
          )}
        </div>
        <div className="field">
          <label>{t('newProspectModal.companyLabel')}</label>
          <input value={company} style={flagStyle('company')} onChange={(e) => setCompany(e.target.value)} />
          {doubtHint('company')}
        </div>
        {guestFields.map((f) => (
          <DynamicFieldInput
            key={f.id}
            field={{ ...f, required: false }}
            value={guestAnswers[f.label]}
            onChange={(v) => setGuestAnswers((prev) => ({ ...prev, [f.label]: v }))}
          />
        ))}

        {(segmentCategories.length > 0 || salesFields.length > 0) && (
          <details style={{ margin: '20px 0 4px' }}>
            <summary
              style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none',
              }}
            >
              {t('newProspectModal.salesInfoSummary')}
            </summary>
            <div style={{ marginTop: 12 }}>
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
            </div>
          </details>
        )}

        <div className="field">
          <label>{t('common.noteLabel')}</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('newProspectModal.notePlaceholder')}
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
          <input placeholder={t('prospectCard.tagPlaceholder')} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#334155', cursor: 'pointer', margin: '16px 0 4px', lineHeight: 1.45 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, width: 18, height: 18 }} />
          <span>{t('newProspectModal.consentText')} <span style={{ color: '#94A3B8' }}>{t('newProspectModal.consentRecordedNote')}</span></span>
        </label>

        {duplicate && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginTop: 12, fontSize: 13, color: '#92400E' }}>
            {duplicate.message}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Button type="button" size="sm" disabled={saving} onClick={() => submit(duplicate.addToQueue, true)}>{t('newProspectModal.duplicateAddAnyway')}</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setDuplicate(null)}>{t('newProspectModal.duplicateLetMeCheck')}</Button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          {canQueue && <Button type="button" disabled={saving || !consent} onClick={() => submit(true)}>{saving ? t('newProspectModal.addingBtn') : t('newProspectModal.saveAddToQueueBtn')}</Button>}
          <Button type="button" variant={canQueue ? 'secondary' : 'primary'} disabled={saving || !consent} onClick={() => submit(false)}>{t('newProspectModal.saveOnlyBtn')}</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        </div>
        {!consent && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>{t('newProspectModal.tickToSaveHint')}</div>}
      </form>
      {liDialog && (
        <LinkedInSearchDialog
          campaignId={campaign.id}
          person={{ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), company: company.trim() }}
          prospectSaved={false}
          credits={li.status && li.status.credits}
          onCredits={li.setCredits}
          onClose={() => setLiDialog(false)}
          onLinked={(r) => setLinkedin(r)}
        />
      )}
    </div>
  );
}
