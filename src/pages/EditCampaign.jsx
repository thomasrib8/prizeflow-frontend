import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import EventNameField, { EMPTY_PLACE, placeFromCampaign, placePayload } from '../components/EventNameField';
import { Card, Button } from '../components/ui';
import VariantsEditor, { PersoFields, MailWriterContext, emptyVariant } from '../components/VariantsEditor';
import UniqueCodesPanel from '../components/UniqueCodesPanel';
import DistributionModePicker from '../components/DistributionModePicker';
import DynamicCaseFields, { ProbabilityTotal, TopCaseWarning } from '../components/DynamicCaseFields';

// The language guests see throughout the play flow — see NewCampaign.jsx's
// LANGUAGE_OPTIONS for why this is separate from the admin panel's language.
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
];

// A DRAFT shows its 12 cases with free gifts and stocks (saved half-finished if needed). An already-launched campaign's gifts are edited in place — name, redeem method,
// and (for 'perso') its delivery/subject/body/auto-distribute. Deliberately
// excludes stock (shown read-only) and never adds/removes cases — only the
// slots already configured at creation can be edited here.
export default function EditCampaign() {
  const { t } = useTranslation('admin');
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventPlace, setEventPlace] = useState(EMPTY_PLACE);
  const [language, setLanguage] = useState('en');
  const [slots, setSlots] = useState([]);
  const [mode, setMode] = useState('static'); // distribution method: switchable while the campaign is a draft
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState('');

  const reloadCampaign = () => api.getCampaign(id).then((source) => {
      setName(source.name || '');
      setDescription(source.description || '');
      setEventName(source.event_name || '');
      setEventPlace(placeFromCampaign(source));
      setLanguage(source.language || 'en');
      setMode(source.distribution_mode === 'dynamic' ? 'dynamic' : 'static');
      if (source.status === 'archived') {
        setError(t('editCampaign.archivedReadOnlyError'));
        setCampaign(source);
        return;
      }
      setCampaign(source);
      // A draft (never ran): every one of the 12 cases is shown, gifts and stocks are freely editable. A launched campaign keeps its cases.
      const mk = (s) => ({
        slotIndex: s.slot_index,
        giftName: s.gift_name,
        stockInitial: s.stock_initial,
        stockRemaining: s.stock_remaining,
        probability: s.probability || 0, unlimited: !!s.unlimited,
        redeemMethod: ['code', 'voucher', 'perso'].includes(s.redeem_method) ? s.redeem_method : 'qr',
        persoDelivery: s.perso_delivery || 'qr',
        persoSubject: s.perso_subject || '',
        persoBody: s.perso_body || '',
        persoAutoDistribute: !!s.perso_auto_distribute,
        persoUniqueCode: !!s.perso_unique_code, savedUnique: !!s.perso_unique_code, pendingCodes: '',
        variantsEnabled: !!s.variants_enabled,
        variants: (s.variants || []).map((v) => ({
          id: v.id, name: v.name, stock: v.stock_initial, stockRemaining: v.stock_remaining,
          redeemMethod: ['code', 'voucher', 'perso'].includes(v.redeem_method) ? v.redeem_method : 'qr',
          persoDelivery: v.perso_delivery || 'code', persoSubject: v.perso_subject || '', persoBody: v.perso_body || '', persoAutoDistribute: !!v.perso_auto_distribute,
          persoUniqueCode: !!v.perso_unique_code, savedUnique: !!v.perso_unique_code, pendingCodes: '',
        })),
      });
      if (source.status === 'draft') {
        const byIndex = new Map(source.slots.map((s) => [s.slot_index, s]));
        setSlots(Array.from({ length: 12 }, (_, i) => (byIndex.has(i) ? mk(byIndex.get(i)) : { slotIndex: i, giftName: '', stockInitial: 0, stockRemaining: 0, probability: 0, unlimited: false, redeemMethod: 'qr', persoDelivery: 'code', persoSubject: '', persoBody: '', persoAutoDistribute: false, persoUniqueCode: false, savedUnique: false, variantsEnabled: false, variants: [] })));
      } else {
        setSlots(source.slots.map(mk));
      }
  }).catch((e) => setError(e.message));
  useEffect(() => { reloadCampaign(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateSlot(i, field, value) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }
  function patchSlot(i, patch) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSavedNote('');
    if (!name.trim()) return setError(t('newCampaign.campaignNameRequiredError'));
    const isDraft = campaign && campaign.status === 'draft';
    for (const s of isDraft ? [] : slots) {
      if (!s.giftName.trim()) return setError(t('editCampaign.giftNameRequiredError', { n: s.slotIndex + 1 }));
      if (!s.variantsEnabled && s.redeemMethod === 'perso' && (!s.persoSubject.trim() || !s.persoBody.trim())) {
        return setError(t('newCampaign.persoNeedsSubjectBodyError', { n: s.slotIndex + 1 }));
      }
    }
    setSaving(true);
    try {
      await api.updateCampaignDetails(id, { name, description, eventName, eventPlace: placePayload(eventPlace), language });
      if (isDraft) {
        // half-finished is fine: what is missing is listed on the campaign page and checked when it is activated
        await api.saveDraftSlots(id, slots.filter((s) => s.giftName.trim() || Number(s.stockInitial) > 0 || s.unlimited).map((s) => ({
          slotIndex: s.slotIndex, giftName: s.giftName, stock: mode === 'dynamic' && s.unlimited ? 0 : (Number(s.stockInitial) || 0), redeemMethod: s.redeemMethod,
          ...(mode === 'dynamic' ? { probability: Number(s.probability) || 0, unlimited: !!s.unlimited } : {}),
          variantsEnabled: !!s.variantsEnabled,
          ...(s.variantsEnabled ? { variants: s.variants.map((v) => ({ id: v.id || undefined, name: v.name, stock: Number(v.stock) || 0, redeemMethod: v.redeemMethod,
            ...(v.redeemMethod === 'perso' ? { persoDelivery: v.persoDelivery, persoSubject: v.persoSubject, persoBody: v.persoBody, persoAutoDistribute: !!v.persoAutoDistribute, persoUniqueCode: !!v.persoUniqueCode } : {}) })) } : {}),
          ...(s.redeemMethod === 'perso' ? { persoDelivery: s.persoDelivery, persoSubject: s.persoSubject, persoBody: s.persoBody, persoAutoDistribute: !!s.persoAutoDistribute, persoUniqueCode: !!s.persoUniqueCode && !s.variantsEnabled } : {}),
        })), mode);
        // The codes pasted before the first save were only staged: now that the gifts exist on the server, load them (replacing any previous list).
        const staged = [];
        slots.forEach((sl) => {
          if (sl.variantsEnabled) sl.variants.forEach((v, vi) => { if (v.persoUniqueCode && !v.savedUnique && (v.pendingCodes || '').trim()) staged.push({ slotIndex: sl.slotIndex, variantIndex: vi, text: v.pendingCodes }); });
          else if (sl.persoUniqueCode && !sl.savedUnique && (sl.pendingCodes || '').trim()) staged.push({ slotIndex: sl.slotIndex, variantIndex: null, text: sl.pendingCodes });
        });
        let note = t('editCampaign.draftSaved');
        if (staged.length) {
          const fresh = await api.getCampaign(id);
          let loaded = 0;
          for (const st of staged) {
            const fs = fresh.slots.find((x) => x.slot_index === st.slotIndex);
            const variantId = st.variantIndex === null ? undefined : (fs && fs.variants[st.variantIndex] ? fs.variants[st.variantIndex].id : null);
            if (variantId === null) continue;
            try { const r = await api.importCampaignCodes(id, { slotIndex: st.slotIndex, variantId, text: st.text, mode: 'replace' }); loaded += r.imported; }
            catch (err) { setError(`${t('dashboard.caseLabel', { n: st.slotIndex + 1 })} : ${err.message}`); }
          }
          if (loaded) note = `${note} ${t('uniqueCodes.imported', { n: loaded })}`;
        }
        setSavedNote(note);
        await reloadCampaign();
        return;
      }
      await api.updateCampaignSlots(id, {
        slots: slots.map((s) => ({
          slotIndex: s.slotIndex,
          giftName: s.giftName,
          redeemMethod: s.redeemMethod,
          ...(s.variantsEnabled ? { variants: s.variants.map((v) => ({ id: v.id, name: v.name, redeemMethod: v.redeemMethod,
            ...(v.redeemMethod === 'perso' ? { persoDelivery: v.persoDelivery, persoSubject: v.persoSubject, persoBody: v.persoBody, persoAutoDistribute: !!v.persoAutoDistribute } : {}) })) } : {}),
          ...(s.redeemMethod === 'perso'
            ? { persoDelivery: s.persoDelivery, persoSubject: s.persoSubject, persoBody: s.persoBody, persoAutoDistribute: !!s.persoAutoDistribute }
            : {}),
        })),
      });
      navigate(`/campaigns/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!campaign) return <p className="page-subtitle">{error || t('common.loading')}</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('editCampaign.pageTitle', { name: campaign.name })}</h1>
          <p className="page-subtitle">{t('editCampaign.pageSubtitle')}</p>
        </div>
      </div>
      {campaign.status !== 'archived' && (
        <MailWriterContext.Provider value={{ campaignName: name, eventName, language }}>
        <form onSubmit={handleSubmit}>
          <Card title={t('newCampaign.campaignDetailsTitle')} className="mt-card">
            <div className="field">
              <label>{t('newCampaign.nameLabel')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>{t('newCampaign.descriptionLabel')}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <EventNameField value={eventName} onChange={setEventName} place={eventPlace} onPlace={setEventPlace} />
            <div className="field">
              <label>{t('newCampaign.guestLanguageLabel')}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}>
                {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                {t('newCampaign.guestLanguageHint')}
              </div>
            </div>
          </Card>

          {campaign.status === 'draft' && <DistributionModePicker value={mode} onChange={setMode} />}

          <Card title={t('editCampaign.giftsTitle')} className="mt-card" action={mode === 'dynamic' ? <ProbabilityTotal values={slots.filter((s) => s.giftName.trim() || s.unlimited || Number(s.stockInitial) > 0).map((s) => s.probability)} /> : undefined}>
            {mode === 'dynamic' && campaign.status === 'draft' && <TopCaseWarning items={slots.map((s) => ({ used: !!s.giftName.trim(), probability: s.probability, unlimited: s.unlimited }))} />}
            <div className="slots-grid">
              {slots.map((s, i) => (
                <div key={s.slotIndex} style={{ display: 'contents' }}>
                  <div className="slot-row">
                    <div className="slot-index">{t('dashboard.caseLabel', { n: s.slotIndex + 1 })}</div>
                    <input placeholder={t('editCampaign.giftNamePlaceholder')} value={s.giftName} onChange={(e) => updateSlot(i, 'giftName', e.target.value)} />
                    {campaign.status === 'draft' ? (
                      <input type="number" min="0" step="1" value={mode === 'dynamic' && s.unlimited ? '' : s.stockInitial} placeholder={mode === 'dynamic' && s.unlimited ? t('dynamic.unlimitedShort') : undefined} disabled={mode === 'dynamic' && !!s.unlimited} title={t('editCampaign.stockInputTitle')} aria-label={t('editCampaign.stockInputTitle')}
                        onChange={(e) => updateSlot(i, 'stockInitial', e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value)) || 0))} style={{ width: 84 }} />
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {s.unlimited ? t('dynamic.unlimitedShort') : t('editCampaign.stockLeftLabel', { remaining: s.stockRemaining, initial: s.stockInitial })}
                      </div>
                    )}
                    {s.variantsEnabled ? (
                      <span className="vr-flag" title={t('variants.modeInVariants')}>{t('variants.modeInVariantsShort')}</span>
                    ) : (
                      <select value={s.redeemMethod} title={t('editCampaign.redeemMethodTitle')} onChange={(e) => updateSlot(i, 'redeemMethod', e.target.value)}>
                        <option value="qr">QR</option>
                        <option value="code">Code</option>
                        <option value="voucher">Voucher</option>
                        <option value="perso">Perso</option>
                      </select>
                    )}
                    <div className="slot-pct" />
                  </div>
                  {mode === 'dynamic' && (s.giftName.trim() || Number(s.stockInitial) > 0 || s.unlimited) && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <DynamicCaseFields probability={s.probability} unlimited={s.unlimited} readOnly={campaign.status !== 'draft'}
                        onProbability={(v) => updateSlot(i, 'probability', v)} onUnlimited={(v) => patchSlot(i, { unlimited: v, stockInitial: v ? 0 : s.stockInitial, variantsEnabled: v ? false : s.variantsEnabled })} />
                    </div>
                  )}
                  {campaign.status === 'draft' && !(mode === 'dynamic' && s.unlimited) && (s.giftName.trim() || Number(s.stockInitial) > 0) && (
                    <label className="vr-toggle">
                      <input type="checkbox" checked={!!s.variantsEnabled}
                        onChange={(e) => patchSlot(i, { variantsEnabled: e.target.checked, variants: e.target.checked && !(s.variants || []).length ? [emptyVariant()] : (s.variants || []) })} />
                      <span>{t('variants.enable')}</span>
                    </label>
                  )}
                  {!s.variantsEnabled && s.redeemMethod === 'perso' && (
                    <PersoFields value={s} idPrefix={`slot-${s.slotIndex}`} uniqueCodeEditable={campaign.status === 'draft'} onChange={(field, value) => updateSlot(i, field, value)}>
                      <UniqueCodesPanel campaignId={id} slotIndex={s.slotIndex} stock={Number(s.stockInitial) || 0} label={s.giftName || t('dashboard.caseLabel', { n: s.slotIndex + 1 })} draft={campaign.status === 'draft'} onChanged={reloadCampaign}
                        persisted={!!s.savedUnique} staged={s.pendingCodes || ''} onStage={(txt) => updateSlot(i, 'pendingCodes', txt)} />
                    </PersoFields>
                  )}
                  {s.variantsEnabled && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <VariantsEditor slot={s} draft={campaign.status === 'draft'} onChange={(patch) => patchSlot(i, patch)} campaignId={id} onCodesChanged={reloadCampaign} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('editCampaignSettings.saveChangesBtn')}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/campaigns/${id}`)}>{t('common.cancel')}</Button>
            {/* the confirmation sits next to the buttons, where the eyes are after clicking Save (the form is long) */}
            {savedNote && <div className="ap-info" role="status" style={{ margin: 0 }}>{savedNote} <button type="button" className="uc-link" onClick={() => navigate(`/campaigns/${id}`)}>{t('editCampaign.backToCampaign')}</button></div>}
          </div>
          {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
        </form>
        </MailWriterContext.Provider>
      )}
    </div>
  );
}
