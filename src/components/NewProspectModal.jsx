import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Button } from './ui';
import DynamicFieldInput from './DynamicFieldInput';
import { prepareScanImage } from '../utils/scanImage';

const STARS = [1, 2, 3];
const EMPTY_FORM = { firstName: '', lastName: '', email: '' };

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
  // { state: 'idle' | 'searching' | 'found' | 'not_found', email, score } —
  // live Hunter.io lookup, so the rep sees a result (and can review/correct
  // it) before saving, instead of only finding out afterwards via a toast.
  const [hunterSearch, setHunterSearch] = useState({ state: 'idle' });
  const hunterSignatureRef = useRef(''); // last "first|last|company" combo actually searched — never search the same one twice
  const hunterRequestIdRef = useRef(0); // bumped per request so a late response from an older search is ignored
  const emailRef = useRef(form.email); // always current, read inside the async .then() below where `form` itself would be stale
  emailRef.current = form.email;

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
        setScan({ state: 'error', message: "Couldn't find any contact details on this photo. Try again with better light, or fill the form in by hand." });
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

  // Live Hunter.io search: once first name, last name and company are all
  // known (typically right after a scan) and there's no email yet, look one
  // up automatically — debounced, so typing a company by hand doesn't fire a
  // request per keystroke, and never twice for the same combination.
  useEffect(() => {
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    const comp = company.trim();
    if (!first || !last || !comp) return undefined;
    const signature = `${first.toLowerCase()}|${last.toLowerCase()}|${comp.toLowerCase()}`;
    if (signature === hunterSignatureRef.current) return undefined;

    const timer = setTimeout(() => {
      hunterSignatureRef.current = signature;
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
          } else {
            setHunterSearch({ state: 'not_found' });
          }
        })
        .catch(() => {
          if (requestId !== hunterRequestIdRef.current) return;
          // Disabled (no HUNTER_API_KEY) or a genuine provider error — fail
          // quiet, same as any other optional enrichment in this app.
          setHunterSearch({ state: 'idle' });
        });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.firstName, form.lastName, company]);

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
      });
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
  const doubtHint = (key) => doubtful(key) && <div style={{ fontSize: 11, color: '#B45309', marginTop: 3 }}>Please check this one — it was hard to read.</div>;
  const noEmailOnBadge = scan.state === 'done' && !form.email;

  return (
    <div className="modal-overlay">
      <form ref={formRef} className="modal-card" style={{ '--modal-w': '560px' }} onSubmit={(e) => e.preventDefault()}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>New prospect</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
          Add someone to <strong>{campaign.name}</strong> without them filling in anything.
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
              {scan.state === 'reading' ? 'Reading the photo…' : scan.state === 'done' ? '📷 Scan another' : '📷 Scan a badge or business card'}
            </Button>
            {scan.state === 'idle' && (
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>Take a photo and the details below are filled in for you.</div>
            )}
            {scan.state === 'done' && (
              <div style={{ fontSize: 12, color: '#047857', marginTop: 8, fontWeight: 600 }}>
                ✓ {scan.source === 'qr' ? 'Details read from the QR code.' : 'Details read from the photo.'}{' '}
                <span style={{ color: '#64748B', fontWeight: 500 }}>Check them before saving.</span>
              </div>
            )}
            {scan.state === 'error' && <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 8 }}>{scan.message}</div>}
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>First name *</label>
            <input required value={form.firstName} style={flagStyle('firstName')} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            {doubtHint('firstName')}
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Last name *</label>
            <input required value={form.lastName} style={flagStyle('lastName')} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            {doubtHint('lastName')}
          </div>
        </div>
        <div className="field">
          <label>Email address</label>
          <input
            type="email"
            value={form.email}
            style={flagStyle('email')}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); setHunterSearch({ state: 'idle' }); }}
          />
          {doubtHint('email')}
          {hunterSearch.state === 'searching' && (
            <>
              <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 5, fontWeight: 600 }}>🔍 Searching for their email via Hunter.io…</div>
              <div className="hunter-search-bar" />
            </>
          )}
          {hunterSearch.state === 'found' && (
            <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 3, fontWeight: 600 }}>
              ✓ Found automatically via Hunter.io{hunterSearch.score != null ? ` (confidence ${hunterSearch.score}/100)` : ''} — check it before saving.
            </div>
          )}
          {hunterSearch.state === 'not_found' && (
            <div style={{ fontSize: 11, color: '#B45309', marginTop: 3 }}>
              Hunter.io couldn't find an email for them. You can add one by hand, or leave it blank — their gift is held until you do.
            </div>
          )}
          {hunterSearch.state === 'idle' && !form.email && (
            <div style={{ fontSize: 11, color: noEmailOnBadge ? '#B45309' : '#64748B', marginTop: 3 }}>
              {noEmailOnBadge ? 'No email on this badge. ' : ''}
              {company.trim()
                ? "We'll try to find their email automatically from their company. If we can't, their gift is held until you add one."
                : 'Add their company below and we’ll try to find their email automatically — or add it later; if they win, their gift is held until you do.'}
            </div>
          )}
        </div>
        <div className="field">
          <label>Company</label>
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
              Sales info
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

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#334155', cursor: 'pointer', margin: '16px 0 4px', lineHeight: 1.45 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, width: 18, height: 18 }} />
          <span>This person agreed to be contacted and to receive their gift by email. <span style={{ color: '#94A3B8' }}>(Recorded with your name.)</span></span>
        </label>

        {duplicate && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginTop: 12, fontSize: 13, color: '#92400E' }}>
            {duplicate.message}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Button type="button" size="sm" disabled={saving} onClick={() => submit(duplicate.addToQueue, true)}>It's someone else — add anyway</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setDuplicate(null)}>Let me check</Button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          {canQueue && <Button type="button" disabled={saving || !consent} onClick={() => submit(true)}>{saving ? 'Adding…' : 'Save & add to queue'}</Button>}
          <Button type="button" variant={canQueue ? 'secondary' : 'primary'} disabled={saving || !consent} onClick={() => submit(false)}>Save only</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
        {!consent && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Tick the box above to save.</div>}
      </form>
    </div>
  );
}
