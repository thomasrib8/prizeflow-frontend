import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Button } from './ui';

// Chrome/Edge only (webkitSpeechRecognition) — Safari/Firefox don't support
// live transcription, so the record button simply doesn't render there
// rather than showing something broken.
const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const STARS = [1, 2, 3];

// Click-a-name popup from the Launch page — notes/voice-note/lead rating/
// segment for one guest, upserted by (campaignId, email) regardless of
// whether they've actually finished their turn yet (see
// routes/account.js's PATCH /guest-notes and the guest_notes table).
export default function GuestNoteModal({ campaignId, guest, segments, onClose, onSaved }) {
  const [note, setNote] = useState(guest.note || '');
  const [leadRating, setLeadRating] = useState(guest.leadRating ?? guest.lead_rating ?? null);
  const [segment, setSegment] = useState(guest.segment || '');
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

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
        firstName: guest.firstName || guest.first_name,
        lastName: guest.lastName || guest.last_name,
        note: note.trim(),
        leadRating,
        segment: segment || null,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const displayName = `${guest.firstName || guest.first_name || ''} ${guest.lastName || guest.last_name || ''}`.trim();

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16, padding: 28, width: 440, maxWidth: '100%',
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{displayName || 'Guest'}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>{guest.email}</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label>Note</label>
          <textarea
            rows={5}
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
        </div>

        {segments && segments.length > 0 && (
          <div className="field">
            <label>Segment client</label>
            <select value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="">— None —</option>
              {segments.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Valider'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
