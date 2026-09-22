import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';
import { useAdmin } from '../hooks/useAdmin';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';
import SegmentationBuilder from '../components/SegmentationBuilder';
import CampaignFieldsBuilder from '../components/CampaignFieldsBuilder';
import { SALES_FIELD_TYPES, GUEST_FIELD_TYPES } from '../components/fieldTypes';

const EMPTY_SLOTS = Array.from({ length: 12 }, (_, i) => ({ slotIndex: i, giftName: '', stock: 0, redeemMethod: 'qr', persoDelivery: 'qr', persoSubject: '', persoBody: '', persoAutoDistribute: false }));
const STEPS = [
  { n: 1, label: 'Gifts' },
  { n: 2, label: 'Segmentation & sales form' },
  { n: 3, label: 'Guest form' },
];

// Three-step campaign creation wizard: (1) gifts + basic details, same as
// before, (2) customer segmentation categories + the sales rep's own
// "Autres informations" fields (filled in later from Launch/CRM — see
// ProspectCard.jsx), (3) the guest-facing pre-spin form's custom fields
// (GuestFlowScreen.jsx). Nothing is created until step 3's final submit —
// all three steps' state lives here and is sent together in one POST.
export default function NewCampaign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCampaignId = searchParams.get('from');
  const { isAdmin } = useAdmin();
  const [step, setStep] = useState(1);
  const [isTest, setIsTest] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventName, setEventName] = useState('');
  const [slots, setSlots] = useState(EMPTY_SLOTS);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewAngle, setPreviewAngle] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [templateMsg, setTemplateMsg] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [segmentCategories, setSegmentCategories] = useState([]);
  const [salesFields, setSalesFields] = useState([]);
  const [guestFields, setGuestFields] = useState([]);
  const { wheelStatus, agentConnected } = useWheelSocket();

  // Mirror the real physical wheel live whenever it's connected — the on-screen
  // cleat should visibly move together with the real one instead of sitting
  // wherever it was last dragged. Manual dragging (below) is only meant as a
  // fallback for when no wheel is connected, or to nudge it back in sync if the
  // operator ever needs to; "Resync with live wheel" clears the override.
  useEffect(() => {
    if (manualOverride) return;
    if (!agentConnected || !wheelStatus) return;
    setPreviewAngle(posToAngle(wheelStatus.currentPos));
  }, [agentConnected, wheelStatus, manualOverride]);

  function handleManualRotate(angle) {
    setManualOverride(true);
    setPreviewAngle(angle);
  }

  const previewCase = Math.floor((((previewAngle % 360) + 360) % 360) / 30) + 1;
  const totalStock = slots.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);

  // Duplicate an existing campaign's slot/gift config — stock always starts
  // at 0 here, adjustable before creating (per roadmap: never a silent copy).
  // Everything else about each gift (redeem method, and for 'perso' its
  // delivery/subject/body/auto-distribute) carries over as-is, so a duplicate
  // is a real duplicate rather than just the gift names.
  useEffect(() => {
    if (!fromCampaignId) return;
    api.getCampaign(fromCampaignId).then((source) => {
      setName(`Copy of ${source.name}`);
      applySlotConfig(source.slots.map((s) => ({
        slotIndex: s.slot_index,
        giftName: s.gift_name,
        redeemMethod: s.redeem_method,
        persoDelivery: s.perso_delivery,
        persoSubject: s.perso_subject,
        persoBody: s.perso_body,
        persoAutoDistribute: s.perso_auto_distribute,
      })));
    }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCampaignId]);

  useEffect(() => {
    api.listCampaignTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  // Shared by campaign duplication (full slot config) and "start from
  // template" (giftName only, see campaign_templates) — any field a caller
  // doesn't provide simply falls back to EMPTY_SLOTS' default for that slot.
  function applySlotConfig(configSlots) {
    const byIndex = new Map(configSlots.map((s) => [s.slotIndex, s]));
    setSlots(EMPTY_SLOTS.map((s) => {
      const src = byIndex.get(s.slotIndex);
      if (!src) return s;
      return {
        ...s,
        giftName: src.giftName || '',
        redeemMethod: ['code', 'voucher', 'perso'].includes(src.redeemMethod) ? src.redeemMethod : 'qr',
        persoDelivery: src.persoDelivery || 'qr',
        persoSubject: src.persoSubject || '',
        persoBody: src.persoBody || '',
        persoAutoDistribute: !!src.persoAutoDistribute,
      };
    }));
  }

  async function handleUseTemplate(e) {
    const id = e.target.value;
    e.target.value = '';
    if (!id) return;
    try {
      const template = await api.getCampaignTemplate(id);
      applySlotConfig(template.slots);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveTemplate() {
    const configured = slots.filter((s) => s.giftName.trim());
    if (configured.length === 0) { setError('Configure at least one gift name before saving a template.'); return; }
    const templateName = window.prompt('Name this template:');
    if (!templateName) return;
    setSavingTemplate(true);
    try {
      await api.saveCampaignTemplate(templateName, configured.map((s) => ({ slotIndex: s.slotIndex, giftName: s.giftName })));
      setTemplates(await api.listCampaignTemplates());
      setTemplateMsg('Template saved');
      setTimeout(() => setTemplateMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingTemplate(false);
    }
  }

  function updateSlot(i, field, value) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function validateStep1() {
    const active = slots.filter(s => s.giftName.trim() && Number(s.stock) > 0);
    if (!name.trim()) return 'Campaign name is required';
    if (active.length === 0) return 'Configure at least one gift with stock > 0';
    for (const s of active) {
      if (s.redeemMethod === 'perso' && (!s.persoSubject.trim() || !s.persoBody.trim())) {
        return `Case ${s.slotIndex + 1}: a Perso gift needs both a subject and a message`;
      }
    }
    return '';
  }

  function goToStep(n) {
    if (n > step && step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    setError('');
    setStep(n);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const step1Error = validateStep1();
    if (step1Error) { setError(step1Error); setStep(1); return; }
    for (const cat of segmentCategories) {
      if (!cat.name.trim()) { setError('Every segmentation category needs a name'); setStep(2); return; }
      if ((cat.options || []).length === 0) { setError(`Category "${cat.name}" needs at least one option`); setStep(2); return; }
    }
    for (const f of [...salesFields, ...guestFields]) {
      if (!f.label.trim()) { setError('Every custom field needs a label'); return; }
    }
    setError('');
    setSaving(true);
    const active = slots.filter(s => s.giftName.trim() && Number(s.stock) > 0);
    try {
      const created = await api.createCampaign({
        name, description, eventName, isTest,
        slots: active.map(s => ({
          slotIndex: s.slotIndex,
          giftName: s.giftName,
          stock: Number(s.stock),
          redeemMethod: ['code', 'voucher', 'perso'].includes(s.redeemMethod) ? s.redeemMethod : 'qr',
          ...(s.redeemMethod === 'perso' ? { persoDelivery: s.persoDelivery, persoSubject: s.persoSubject, persoBody: s.persoBody, persoAutoDistribute: !!s.persoAutoDistribute } : {}),
        })),
        segmentCategories: segmentCategories.filter((c) => c.name.trim() && (c.options || []).length),
        fields: [
          ...salesFields.filter((f) => f.label.trim()).map((f) => ({ ...f, scope: 'sales' })),
          ...guestFields.filter((f) => f.label.trim()).map((f) => ({ ...f, scope: 'guest' })),
        ],
      });
      navigate(`/campaigns/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">New campaign</h1>
          <p className="page-subtitle">Step {step} of 3 — {STEPS[step - 1].label}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {STEPS.map((s) => (
          <div key={s.n} style={{
            flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: s.n === step ? 'var(--blue, #09B2FD)' : s.n < step ? 'var(--blue-pale, #EBF9FF)' : '#F1F5F9',
            color: s.n === step ? '#03041A' : s.n < step ? 'var(--blue, #09B2FD)' : '#94A3B8',
          }}>
            {s.n}. {s.label}
          </div>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <>
            <Card title="Campaign details" className="mt-card">
              <div className="field">
                <label>Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Summer 2026" required />
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Short note…" />
              </div>
              <div className="field">
                <label>Event name (optional)</label>
                <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Salon de l'Habitat Paris 2026" />
              </div>
              {templates && templates.length > 0 && (
                <div className="field">
                  <label>Start from a saved template (optional)</label>
                  <select defaultValue="" onChange={handleUseTemplate} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}>
                    <option value="">— Select a template —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slotCount} slots)</option>)}
                  </select>
                </div>
              )}
              {isAdmin && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
                  <input type="checkbox" checked={isTest} onChange={e => setIsTest(e.target.checked)} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>🔧 Test campaign (admin only)</div>
                    <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>Full sequence visible · Excluded from global stats · Remove before production.</div>
                  </div>
                </label>
              )}
            </Card>

            <Card title="Wheel orientation helper" className="mt-card">
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
                {agentConnected && !manualOverride
                  ? 'Tracking the physical wheel live — the red cleat moves together with the real one.'
                  : 'Lost track of which physical case is which? Drag the red cleat below to match what you see on the real wheel.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <WheelSVG positionAngle={previewAngle} size={200} interactive onRotate={handleManualRotate} />
                <div style={{ fontSize: 14, color: '#334155' }}>
                  Red cleat is pointing at <strong>Case {previewCase}</strong>
                  {agentConnected && manualOverride && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => setManualOverride(false)}
                        style={{ background: 'none', border: 'none', padding: 0, color: '#002881', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                      >
                        Resync with live wheel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Products (12 wheel slots)" className="mt-card"
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {templateMsg && <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>{templateMsg}</span>}
                  <button type="button" onClick={handleSaveTemplate} disabled={savingTemplate} className="btn btn-ghost btn-sm" style={{ cursor: savingTemplate ? 'not-allowed' : 'pointer' }}>
                    {savingTemplate ? 'Saving…' : 'Save as template'}
                  </button>
                  <span className="badge badge-blue">Total stock: {totalStock}</span>
                </div>
              }>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>
                "Redeem" chooses how the guest confirms their gift: <b>QR</b> links straight to it, <b>Code</b> emails an 8-character code to type in on the Rewards page, <b>Voucher</b> just tells the guest to see a staff member for their physical voucher, <b>Perso</b> sends this gift's own custom email (choose what it delivers below).
              </p>
              <div className="slots-grid">
                {slots.map((s, i) => {
                  const pct = totalStock ? ((Number(s.stock) || 0) / totalStock) * 100 : 0;
                  return (
                    <div key={i} style={{ display: 'contents' }}>
                      <div className="slot-row">
                        <div className="slot-index">Case {i + 1}</div>
                        <input placeholder="Gift name" value={s.giftName} onChange={e => updateSlot(i, 'giftName', e.target.value)} />
                        <input type="number" min="0" placeholder="Stock" value={s.stock || ''} onChange={e => updateSlot(i, 'stock', e.target.value)} />
                        <select value={s.redeemMethod} title="How the guest confirms their gift" onChange={e => updateSlot(i, 'redeemMethod', e.target.value)}>
                          <option value="qr">QR</option>
                          <option value="code">Code</option>
                          <option value="voucher">Voucher</option>
                          <option value="perso">Perso</option>
                        </select>
                        <div className="slot-pct">{pct ? `${pct.toFixed(1)}%` : '—'}</div>
                      </div>
                      {s.redeemMethod === 'perso' && (
                        <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, margin: '-2px 0 4px' }}>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                            <div className="field" style={{ margin: 0, flex: '0 0 180px' }}>
                              <label style={{ fontSize: 11 }}>Delivers</label>
                              <select value={s.persoDelivery} onChange={e => updateSlot(i, 'persoDelivery', e.target.value)}>
                                <option value="code">A code</option>
                                <option value="qr">A QR</option>
                                <option value="text">Just text</option>
                              </select>
                            </div>
                            <div className="field" style={{ margin: 0, flex: '1 1 260px' }}>
                              <label style={{ fontSize: 11 }}>Subject</label>
                              <input placeholder="e.g. You won a free coffee!" value={s.persoSubject} onChange={e => updateSlot(i, 'persoSubject', e.target.value)} />
                            </div>
                          </div>
                          <div className="field" style={{ margin: 0 }}>
                            <label style={{ fontSize: 11 }}>
                              Message ({'{{firstName}}'} / {'{{giftName}}'}{s.persoDelivery === 'code' ? ' / {{code}}' : ''} available)
                            </label>
                            <textarea rows={2} placeholder="Custom message shown in the email…" value={s.persoBody} onChange={e => updateSlot(i, 'persoBody', e.target.value)} style={{ width: '100%', fontFamily: 'inherit' }} />
                            {s.persoDelivery === 'code' && (
                              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                                The code, QR and redemption instructions are always added automatically below your message — no need to insert {'{{code}}'} yourself unless you also want to mention it in your own sentence.
                              </p>
                            )}
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!s.persoAutoDistribute} onChange={e => updateSlot(i, 'persoAutoDistribute', e.target.checked)} />
                            <span style={{ fontSize: 12, color: '#334155' }}>
                              Mark this gift as automatically distributed
                              <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>Skips manual confirmation in Rewards — use only when there's nothing to hand over in person.</span>
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Button type="button" onClick={() => goToStep(2)}>Next →</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/campaigns')}>Cancel</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Card title="Segmentation client" className="mt-card">
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
                Define as many categories as you need (e.g. "Genre", "Budget"), each with its own set of options.
                Your team picks one option per category when they fill in a guest's sales form from the Launch page.
                Optional — leave empty to skip segmentation for this campaign.
              </p>
              <SegmentationBuilder categories={segmentCategories} onChange={setSegmentCategories} />
            </Card>

            <Card title="Autres informations" className="mt-card">
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
                Extra fields your sales team can fill in on a guest's form (Launch page / CRM tab) — never required,
                filled in whenever there's time. Add as many as you need.
              </p>
              <CampaignFieldsBuilder fields={salesFields} onChange={setSalesFields} fieldTypes={SALES_FIELD_TYPES} />
            </Card>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Button type="button" onClick={() => goToStep(3)}>Next →</Button>
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>← Back</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Card title="Formulaire prospect" className="mt-card">
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
                What the guest fills in on their own phone before spinning. First name, last name and email are
                always required and can't be removed. Add any other fields you need — text, email, phone, dropdown,
                single/multiple choice, checkbox, date, or number — and choose whether each one is required.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {['First name', 'Last name', 'Email address'].map((label) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#334155' }}>
                    {label} <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>ALWAYS REQUIRED</span>
                  </div>
                ))}
              </div>
              <CampaignFieldsBuilder fields={guestFields} onChange={setGuestFields} fieldTypes={GUEST_FIELD_TYPES} showRequired />
            </Card>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create campaign'}</Button>
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>← Back</Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
