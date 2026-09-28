import { useState } from 'react';
import { api } from '../api/client';
import { Button } from './ui';
import DynamicFieldInput from './DynamicFieldInput';

const STARS = [1, 2, 3];

// Lets a sales rep add someone to the CRM by hand — a prospect who never
// played (met at the booth, no phone, ...) — from the Launch page. One
// popup with everything: what a guest would fill in themselves (the fixed
// first name / last name / email + this campaign's own guest-form fields)
// and what the rep fills in about them (segments, note, rating, tag and the
// sales form's fields). Only the three fixed fields are actually required;
// the campaign's other guest-form fields are shown without their "required"
// marker because a rep entering a contact at speed shouldn't be blocked by
// something that's only mandatory for a guest on their own phone.
export default function NewProspectModal({ campaign, onClose, onCreated }) {
  const guestFields = (campaign.fields || []).filter((f) => f.scope === 'guest');
  const salesFields = (campaign.fields || []).filter((f) => f.scope === 'sales');
  const segmentCategories = campaign.segmentCategories || [];

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [guestAnswers, setGuestAnswers] = useState({});
  const [note, setNote] = useState('');
  const [leadRating, setLeadRating] = useState(null); // 1-3, null = not rated — never a default 1
  const [segments, setSegments] = useState({});
  const [tags, setTags] = useState('');
  const [customFields, setCustomFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createProspect({
        campaignId: campaign.id,
        ...form,
        guestAnswers,
        note,
        leadRating,
        segments,
        tags,
        customFields,
      });
      onCreated?.(`${form.firstName.trim()} ${form.lastName.trim()}`.trim());
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <form className="modal-card" style={{ '--modal-w': '560px' }} onSubmit={handleSubmit}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>New prospect</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
          Add someone to the CRM of <strong>{campaign.name}</strong> without them playing.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>First name *</label>
            <input required autoFocus value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Last name *</label>
            <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Email address *</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        {guestFields.map((f) => (
          <DynamicFieldInput
            key={f.id}
            field={{ ...f, required: false }}
            value={guestAnswers[f.label]}
            onChange={(v) => setGuestAnswers((prev) => ({ ...prev, [f.label]: v }))}
          />
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: '20px 0 8px' }}>Sales info</div>
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
          <label>Note</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this prospect…"
            style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
          />
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
          {leadRating == null && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Not rated yet — this is different from a low rating.</div>}
        </div>

        <div className="field">
          <label>Tag</label>
          <input placeholder="A free label you can attach to this prospect" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add prospect'}</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
