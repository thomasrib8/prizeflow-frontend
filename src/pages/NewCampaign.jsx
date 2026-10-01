import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';
import { useAdmin } from '../hooks/useAdmin';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { posToAngle } from '../components/WheelSVG';
import WheelGiftPlanner from '../components/WheelGiftPlanner';
import { CASE_COUNT, isGiftReady } from '../components/giftPlanning';
import SegmentationBuilder from '../components/SegmentationBuilder';
import CampaignFieldsBuilder from '../components/CampaignFieldsBuilder';
import { SALES_FIELD_TYPES, GUEST_FIELD_TYPES } from '../components/fieldTypes';

// The 12 gifts are defined first and only afterwards dragged onto a case of
// the wheel: `id` is the gift's own fixed position in the list, `caseIndex`
// (0-11, or null while it hasn't been placed yet) is the wheel case it ended
// up on — that's what becomes the campaign slot's slotIndex on submit.
const EMPTY_GIFTS = Array.from({ length: CASE_COUNT }, (_, i) => ({ id: i, caseIndex: null, giftName: '', stock: 0, redeemMethod: 'qr', persoDelivery: 'qr', persoSubject: '', persoBody: '', persoAutoDistribute: false }));
// The language the *guest* sees throughout the play flow (form, queue,
// wheel, result screen, reward email) — independent of the admin panel's own
// per-account language (users.language). Defaults to English, matching
// campaigns.language's DB default, so a campaign an admin never touches this
// field for looks exactly like it always has.
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
];
const STEP_TKEYS = { 1: 'step1Label', 2: 'step2Label', 3: 'step3Label' };

// Three-step campaign creation wizard: (1) gifts + basic details, same as
// before, (2) customer segmentation categories + the sales rep's own
// "Autres informations" fields (filled in later from Launch/CRM — see
// ProspectCard.jsx), (3) the guest-facing pre-spin form's custom fields
// (GuestFlowScreen.jsx). Nothing is created until step 3's final submit —
// all three steps' state lives here and is sent together in one POST.
export default function NewCampaign() {
  const { t } = useTranslation('admin');
  const STEPS = [1, 2, 3].map((n) => ({ n, label: t(`newCampaign.${STEP_TKEYS[n]}`) }));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCampaignId = searchParams.get('from');
  const { isAdmin } = useAdmin();
  const [step, setStep] = useState(1);
  const [isTest, setIsTest] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventName, setEventName] = useState('');
  const [language, setLanguage] = useState('en');
  const [gifts, setGifts] = useState(EMPTY_GIFTS);
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

  const placedCount = gifts.filter((g) => g.caseIndex !== null).length;
  const previewCase = Math.floor((((previewAngle % 360) + 360) % 360) / 30) + 1;

  // Duplicate an existing campaign's slot/gift config — stock always starts
  // at 0 here, adjustable before creating (per roadmap: never a silent copy).
  // Everything else about each gift (redeem method, and for 'perso' its
  // delivery/subject/body/auto-distribute) carries over as-is, so a duplicate
  // is a real duplicate rather than just the gift names.
  useEffect(() => {
    if (!fromCampaignId) return;
    api.getCampaign(fromCampaignId).then((source) => {
      setName(t('newCampaign.copyOfPrefix', { name: source.name }));
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
  // template" (giftName only, see campaign_templates) — each incoming slot
  // becomes one gift, already placed on the same case it had in the source,
  // so a duplicate keeps the physical wheel's layout. Any field a caller
  // doesn't provide falls back to EMPTY_GIFTS' default.
  function applySlotConfig(configSlots) {
    setGifts(EMPTY_GIFTS.map((g, i) => {
      const src = configSlots[i];
      if (!src) return g;
      return {
        ...g,
        caseIndex: Number.isInteger(src.slotIndex) && src.slotIndex >= 0 && src.slotIndex < CASE_COUNT ? src.slotIndex : null,
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
    const configured = gifts.filter((g) => g.giftName.trim() && g.caseIndex !== null);
    if (configured.length === 0) { setError(t('newCampaign.placeGiftBeforeTemplateError')); return; }
    const templateName = window.prompt(t('newCampaign.nameTemplatePrompt'));
    if (!templateName) return;
    setSavingTemplate(true);
    try {
      await api.saveCampaignTemplate(templateName, configured.map((g) => ({ slotIndex: g.caseIndex, giftName: g.giftName })));
      setTemplates(await api.listCampaignTemplates());
      setTemplateMsg(t('newCampaign.templateSavedMsg'));
      setTimeout(() => setTemplateMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingTemplate(false);
    }
  }

  function validateStep1() {
    if (!name.trim()) return t('newCampaign.campaignNameRequiredError');
    const placed = gifts.filter((g) => g.caseIndex !== null);
    if (placed.length < CASE_COUNT) return t('newCampaign.placeAllGiftsError', { count: CASE_COUNT, placed: placed.length });
    for (const g of placed) {
      if (!isGiftReady(g)) return t('newCampaign.giftNeedsNameStockError', { n: g.caseIndex + 1 });
      if (g.redeemMethod === 'perso' && (!g.persoSubject.trim() || !g.persoBody.trim())) {
        return t('newCampaign.persoNeedsSubjectBodyError', { n: g.caseIndex + 1 });
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
      if (!cat.name.trim()) { setError(t('newCampaign.categoryNeedsNameError')); setStep(2); return; }
      if ((cat.options || []).length === 0) { setError(t('newCampaign.categoryNeedsOptionError', { name: cat.name })); setStep(2); return; }
    }
    for (const f of [...salesFields, ...guestFields]) {
      if (!f.label.trim()) { setError(t('newCampaign.fieldNeedsLabelError')); return; }
    }
    setError('');
    setSaving(true);
    const active = gifts.filter((g) => g.caseIndex !== null);
    try {
      const created = await api.createCampaign({
        name, description, eventName, language, isTest,
        slots: active.map(g => ({
          slotIndex: g.caseIndex,
          giftName: g.giftName,
          stock: Number(g.stock),
          redeemMethod: ['code', 'voucher', 'perso'].includes(g.redeemMethod) ? g.redeemMethod : 'qr',
          ...(g.redeemMethod === 'perso' ? { persoDelivery: g.persoDelivery, persoSubject: g.persoSubject, persoBody: g.persoBody, persoAutoDistribute: !!g.persoAutoDistribute } : {}),
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
          <h1 className="page-title">{t('newCampaign.pageTitle')}</h1>
          <p className="page-subtitle">{t('newCampaign.stepOf', { step, label: STEPS[step - 1].label })}</p>
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
            <Card title={t('newCampaign.campaignDetailsTitle')} className="mt-card">
              <div className="field">
                <label>{t('newCampaign.nameLabel')}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t('newCampaign.namePlaceholder')} required />
              </div>
              <div className="field">
                <label>{t('newCampaign.descriptionLabel')}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={t('newCampaign.descriptionPlaceholder')} />
              </div>
              <div className="field">
                <label>{t('newCampaign.eventNameLabel')}</label>
                <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder={t('newCampaign.eventNamePlaceholder')} />
              </div>
              <div className="field">
                <label>{t('newCampaign.guestLanguageLabel')}</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}>
                  {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                  {t('newCampaign.guestLanguageHint')}
                </div>
              </div>
              {templates && templates.length > 0 && (
                <div className="field">
                  <label>{t('newCampaign.startFromTemplateLabel')}</label>
                  <select defaultValue="" onChange={handleUseTemplate} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}>
                    <option value="">{t('newCampaign.selectTemplatePlaceholder')}</option>
                    {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name} {t('newCampaign.templateSlotsSuffix', { count: tpl.slotCount })}</option>)}
                  </select>
                </div>
              )}
              {isAdmin && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
                  <input type="checkbox" checked={isTest} onChange={e => setIsTest(e.target.checked)} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{t('newCampaign.testCampaignLabel')}</div>
                    <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>{t('newCampaign.testCampaignDesc')}</div>
                  </div>
                </label>
              )}
            </Card>

            <WheelGiftPlanner
              gifts={gifts}
              setGifts={setGifts}
              wheelProps={{ positionAngle: previewAngle, interactive: true, onRotate: handleManualRotate }}
              wheelCaption={(
                <>
                  {agentConnected && !manualOverride
                    ? t('newCampaign.wheelCaptionTracking')
                    : t('newCampaign.wheelCaptionLost')}
                  <div style={{ marginTop: 4 }}>{t('newCampaign.redCleatPointing')} <strong>{t('dashboard.caseLabel', { n: previewCase })}</strong></div>
                  {agentConnected && manualOverride && (
                    <button
                      type="button"
                      onClick={() => setManualOverride(false)}
                      style={{ background: 'none', border: 'none', padding: 0, marginTop: 6, color: '#002881', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                    >
                      {t('newCampaign.resyncBtn')}
                    </button>
                  )}
                </>
              )}
              headerAction={(
                <>
                  {templateMsg && <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>{templateMsg}</span>}
                  <button type="button" onClick={handleSaveTemplate} disabled={savingTemplate} className="btn btn-ghost btn-sm" style={{ cursor: savingTemplate ? 'not-allowed' : 'pointer' }}>
                    {savingTemplate ? t('common.saving') : t('newCampaign.saveAsTemplateBtn')}
                  </button>
                </>
              )}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Button type="button" onClick={() => goToStep(2)} disabled={placedCount < CASE_COUNT}>{t('newCampaign.nextBtn')}</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/campaigns')}>{t('common.cancel')}</Button>
              {placedCount < CASE_COUNT && (
                <span style={{ alignSelf: 'center', fontSize: 12, color: '#64748B' }}>
                  {t('newCampaign.placeAllGiftsHint', { count: CASE_COUNT, placed: placedCount })}
                </span>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Card title={t('campaignForm.segmentationTitle')} className="mt-card">
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
                {t('campaignForm.segmentationDesc')}
              </p>
              <SegmentationBuilder categories={segmentCategories} onChange={setSegmentCategories} />
            </Card>

            <Card title={t('campaignForm.salesFieldsTitle')} className="mt-card">
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
                {t('campaignForm.salesFieldsDesc')}
              </p>
              <CampaignFieldsBuilder fields={salesFields} onChange={setSalesFields} fieldTypes={SALES_FIELD_TYPES} />
            </Card>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Button type="button" onClick={() => goToStep(3)}>{t('newCampaign.nextBtn')}</Button>
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>{t('newCampaign.backBtn')}</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Card title={t('campaignForm.guestFormTitle')} className="mt-card">
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
                {t('campaignForm.guestFormDesc')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {[t('campaignForm.firstNameLabel'), t('campaignForm.lastNameLabel'), t('campaignForm.emailAddressLabel')].map((label) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#334155' }}>
                    {label} <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{t('campaignForm.alwaysRequiredBadge')}</span>
                  </div>
                ))}
              </div>
              <CampaignFieldsBuilder fields={guestFields} onChange={setGuestFields} fieldTypes={GUEST_FIELD_TYPES} showRequired />
            </Card>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Button type="submit" disabled={saving}>{saving ? t('newCampaign.creatingBtn') : t('newCampaign.createCampaignBtn')}</Button>
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>{t('newCampaign.backBtn')}</Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
