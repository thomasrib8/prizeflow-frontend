import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Button } from './ui';
import DynamicFieldInput from './DynamicFieldInput';

// Chrome/Edge only (webkitSpeechRecognition) — Safari/Firefox don't support
// live transcription, so the record button simply doesn't render there
// rather than showing something broken.
const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const STARS = [1, 2, 3];

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

  const [salesFields, setSalesFields] = useState([]);
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

  useEffect(() => {
    if (!SpeechRecognitionCtor) return undefined;
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'fr-FR';
    rec.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      if (transcript.trim()) {
        setNote((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
      }
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* already stopped */ } };
  }, []);

  function toggleRecording() {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setRecording(true);
      } catch {
        // start() throws if already started (rapid double-click) — ignore
      }
    }
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>
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
                  <div style={{ fontSize: 13, color: '#64748B' }}>{guest.email}</div>
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

            <div style={{ padding: '14px 0' }}>
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
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>{guest.email}</p>

            {error && <div className="error-banner">{error}</div>}

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
                <button
                  type="button"
                  onClick={toggleRecording}
                  style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: recording ? '#EF4444' : '#F1F5F9', color: recording ? 'white' : '#334155',
                    border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {recording ? '⏺ Recording… tap to stop' : '🎙 Record voice note'}
                </button>
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
