import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Button } from './ui';
import DynamicFieldInput from './DynamicFieldInput';
import EmailStatusBadge from './EmailStatusBadge';
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

function formatFieldValue(field, raw) {
  if (raw == null || raw === '') return null;
  if (field.fieldType === 'multi_choice') return Array.isArray(raw) ? raw.join(', ') : raw;
  if (field.fieldType === 'checkbox') return raw ? 'Yes' : null;
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
  const [segmentCategories, setSegmentCategories] = useState([]);

  const [note, setNote] = useState('');
  const [leadRating, setLeadRating] = useState(null); // 1-3, or null = not rated — never default this to 0/1 (see below)
  const [segments, setSegments] = useState({}); // { categoryName: optionLabel }
  const [tags, setTags] = useState('');
  const [customFields, setCustomFields] = useState({}); // { fieldLabel: value }

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

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.saveGuestNote({
        campaignId,
        email: guest.email,
        firstName: guest.firstName,
        lastName: guest.lastName,
        note: note.trim(),
        leadRating,
        segments,
        tags,
        customFields,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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

  function handleCancelEdit() {
    if (initialMode === 'view') {
      load(); // discard unsaved changes, restore what's actually saved
      setMode('view');
    } else {
      onClose();
    }
  }

  const displayName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
  const activeSegments = segmentCategories
    .map((cat) => ({ name: cat.name, value: segments[cat.name] }))
    .filter((s) => s.value);

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {loading ? (
          <p className="page-subtitle">Loading…</p>
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
                  <div style={{ fontSize: 13, color: '#64748B' }}>{emailMissing ? <em>No email yet</em> : <EmailStatusBadge variant="card" email={guest.email} status={emailVerification?.status} isCatchAll={emailVerification?.isCatchAll} isDisposable={emailVerification?.isDisposable} isRoleAccount={emailVerification?.isRoleAccount} />}</div>
                  {emailEnrichment && (
                    <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, marginTop: 2 }} title={emailEnrichment.score != null ? `Hunter confidence score: ${emailEnrichment.score}/100` : undefined}>
                      🔎 Found automatically via Hunter
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMode('edit')}
                title="Edit"
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
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>No email yet</div>
                <div style={{ fontSize: 12, color: '#B45309', margin: '2px 0 8px' }}>
                  {pendingGift
                    ? `🎁 Their gift (${pendingGift.giftName}) is on hold — it will be emailed as soon as you add their address.`
                    : "If they play, their gift is held until you add their address."}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
                  />
                  <Button type="button" disabled={addingEmail || !newEmail.trim()} onClick={handleAddEmail}>{addingEmail ? 'Saving…' : 'Add email'}</Button>
                </div>
              </div>
            )}

            <div style={{ padding: '14px 0' }}>
              {guestFields.map((f) => (
                <InfoRow key={`guest-${f.label}`} label={f.label} value={formatFieldValue(f, guestAnswers[f.label])} />
              ))}
              {activeSegments.map((s) => (
                <InfoRow key={s.name} label={s.name} value={s.value} />
              ))}
              {salesFields.map((f) => (
                <InfoRow key={f.label} label={f.label} value={formatFieldValue(f, customFields[f.label])} />
              ))}
              <InfoRow
                label="Potentiel commercial"
                value={leadRating ? '★'.repeat(leadRating) + '☆'.repeat(3 - leadRating) : null}
                fallback="Non évalué"
              />
              <InfoRow label="Tag" value={tags} />
              {consentInfo && (
                <InfoRow label="Consent" value={`Confirmed by ${consentInfo.attestedBy || 'sales rep'} · ${String(consentInfo.attestedAt).slice(0, 10)}`} />
              )}
            </div>

            {note && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Dernière note commerciale
                </div>
                <p style={{ fontSize: 14, color: '#334155', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                  « {note} »
                </p>
              </div>
            )}

            <Button variant="secondary" onClick={onClose} style={{ marginTop: 22 }}>Close</Button>
          </>
        ) : (
          <>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{displayName}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>{emailMissing ? <em>No email yet</em> : <EmailStatusBadge variant="card" email={guest.email} status={emailVerification?.status} isCatchAll={emailVerification?.isCatchAll} isDisposable={emailVerification?.isDisposable} isRoleAccount={emailVerification?.isRoleAccount} />}</p>

            {error && <div className="error-banner">{error}</div>}

            {emailMissing && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>No email yet</div>
                <div style={{ fontSize: 12, color: '#B45309', margin: '2px 0 8px' }}>
                  {pendingGift
                    ? `🎁 Their gift (${pendingGift.giftName}) is on hold — it will be emailed as soon as you add their address.`
                    : "If they play, their gift is held until you add their address."}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
                  />
                  <Button type="button" disabled={addingEmail || !newEmail.trim()} onClick={handleAddEmail}>{addingEmail ? 'Saving…' : 'Add email'}</Button>
                </div>
              </div>
            )}

            <div className="field">
              <label>Note</label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this guest…"
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
                        ⏹ Stop
                      </button>
                      <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                        ⏺ Recording… <span style={{ color: '#94A3B8', fontWeight: 500 }}>(stops after 8s of silence)</span>
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
                      🎙 Record voice note
                    </button>
                  )}
                </div>
              )}
            </div>

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
              <label>Potentiel du lead</label>
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
              {leadRating == null && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Not rated yet — this is different from a low rating.</div>}
            </div>

            <div className="field">
              <label>Tag</label>
              <input
                placeholder="A free label you can attach to this guest"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <Button type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Valider'}</Button>
              <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
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
