import { createContext, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAiAssistant } from '../hooks/useAiAssistant';
import { Button } from './ui';
import UniqueCodesPanel from './UniqueCodesPanel';

// Gift variants of one case of the wheel: the case stays ONE segment, but can hand out several gifts, each with its own stock and delivery mode.
// In a draft everything is editable; once the campaign ran, only names and delivery modes can be corrected (stocks are the game's own business).

// Personalised e-mail fields (shared by a case and by a variant)
// A fake code in every preview: a real, still-available code is never shown as an example.
const PREVIEW_CODE = 'SPARK-A82X';
const fill = (text, vars) => String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));

// What the e-mail writer knows about the campaign being edited (the page wraps its form with the provider).
export const MailWriterContext = createContext({ campaignName: '', eventName: '', language: '' });

export function PersoFields({ value, onChange, idPrefix = 'perso', uniqueCodeEditable = false, children = null }) {
  const { t } = useTranslation('admin');
  const aiOn = useAiAssistant();
  const mailCtx = useContext(MailWriterContext);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiHint, setAiHint] = useState('');
  const giftLabel = String(value.name || value.giftName || '').trim();
  async function generate() {
    if (!giftLabel || aiBusy) return;
    if ((value.persoSubject.trim() || value.persoBody.trim()) && !window.confirm(t('editCampaign.aiOverwriteConfirm'))) return;
    setAiBusy(true); setAiError('');
    try {
      const r = await api.writePersoMail({ giftName: giftLabel, delivery: value.persoDelivery, language: mailCtx.language || undefined, campaignName: mailCtx.campaignName, eventName: mailCtx.eventName, hint: aiHint.trim() || undefined });
      onChange('persoSubject', r.subject);
      onChange('persoBody', r.body);
    } catch (e) {
      setAiError(t('editCampaign.aiError'));
    } finally { setAiBusy(false); }
  }
  const set = (field) => (e) => onChange(field, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  const hasVar = /\{\{\s*unique_code\s*\}\}/.test(`${value.persoSubject} ${value.persoBody}`);
  const preview = fill(value.persoBody, { firstName: 'Camille', giftName: value.name || value.giftName || 'Cadeau', code: 'AB12CD34', unique_code: PREVIEW_CODE });
  return (
    <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, margin: '4px 0' }}>
      {aiOn && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button type="button" size="sm" variant="secondary" disabled={aiBusy || !giftLabel} onClick={generate}>{aiBusy ? t('editCampaign.aiWriting') : `✨ ${t('editCampaign.aiWriteBtn')}`}</Button>
            <input style={{ flex: '1 1 220px', minWidth: 0, fontSize: 12 }} maxLength={300} placeholder={t('editCampaign.aiHintPlaceholder')} value={aiHint} onChange={(e) => setAiHint(e.target.value)} aria-label={t('editCampaign.aiHintPlaceholder')} />
          </div>
          {!giftLabel && <p style={{ fontSize: 11, color: 'var(--text-light)', margin: '4px 0 0' }}>{t('editCampaign.aiNeedGift')}</p>}
          {giftLabel && <p style={{ fontSize: 11, color: 'var(--text-light)', margin: '4px 0 0' }}>{t('editCampaign.aiNote')}</p>}
          {aiError && <div className="error-banner" style={{ marginTop: 6 }} role="alert">{aiError}</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0, flex: '0 0 180px' }}>
          <label style={{ fontSize: 11 }}>{t('editCampaign.deliversLabel')}</label>
          <select value={value.persoDelivery} onChange={set('persoDelivery')}>
            <option value="code">{t('editCampaign.deliversCode')}</option>
            <option value="qr">{t('editCampaign.deliversQr')}</option>
            <option value="text">{t('editCampaign.deliversText')}</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0, flex: '1 1 260px' }}>
          <label style={{ fontSize: 11 }}>{t('settings.emailTemplates.subjectLabel')}</label>
          <input id={`${idPrefix}-subject`} placeholder={t('editCampaign.subjectPlaceholder')} value={value.persoSubject} onChange={set('persoSubject')} />
        </div>
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label style={{ fontSize: 11 }}>{t('editCampaign.messageLabel', { vars: `{{firstName}} / {{giftName}}${value.persoDelivery === 'code' ? ' / {{code}}' : ''}` })}</label>
        <textarea id={`${idPrefix}-body`} rows={2} placeholder={t('editCampaign.messagePlaceholder')} value={value.persoBody} onChange={set('persoBody')} />
        {value.persoDelivery === 'code' && <p style={{ fontSize: 11, color: 'var(--text-light)', margin: '4px 0 0' }}>{t('editCampaign.codeAutoAddedNote', { code: '{{code}}' })}</p>}
      </div>
      {(uniqueCodeEditable || value.persoUniqueCode) && (
        <div className="uc-opt">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: uniqueCodeEditable ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!value.persoUniqueCode} disabled={!uniqueCodeEditable} onChange={set('persoUniqueCode')} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>{t('uniqueCodes.option')}</span>
          </label>
          {value.persoUniqueCode && (
            <>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 6px' }}>{t('uniqueCodes.optionHelp')}</p>
              {!hasVar && <div className="ap-warn" style={{ margin: '0 0 6px', padding: '6px 10px', fontSize: 12 }}>{t('uniqueCodes.variableMissing')}</div>}
              <button type="button" className="uc-ins" onClick={() => onChange('persoBody', `${value.persoBody}${value.persoBody && !/\s$/.test(value.persoBody) ? ' ' : ''}{{unique_code}}`)}>{t('uniqueCodes.insertVariable')}</button>
              {children}
            </>
          )}
        </div>
      )}
      {value.persoUniqueCode && value.persoBody && (
        <div className="uc-preview"><b>{t('uniqueCodes.preview')}</b>{preview}</div>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value.persoAutoDistribute} onChange={set('persoAutoDistribute')} />
        <span style={{ fontSize: 12, color: '#334155' }}>
          {t('editCampaign.autoDistributeLabel')}
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-light)' }}>{t('editCampaign.autoDistributeDesc')}</span>
        </span>
      </label>
    </div>
  );
}

export const emptyVariant = () => ({ id: null, name: '', stock: 0, stockRemaining: 0, redeemMethod: 'qr', persoDelivery: 'code', persoSubject: '', persoBody: '', persoAutoDistribute: false, persoUniqueCode: false, savedUnique: false, pendingCodes: '' });

export default function VariantsEditor({ slot, draft, onChange, campaignId = null, onCodesChanged = () => {} }) {
  const { t } = useTranslation('admin');
  const vs = slot.variants || [];
  const sum = vs.reduce((a, v) => a + (Number(v.stock) || 0), 0);
  const total = Number(slot.stockInitial) || 0;
  const diff = total - sum;
  const update = (i, field, value) => onChange({ variants: vs.map((v, k) => (k === i ? { ...v, [field]: value } : v)) });
  return (
    <div className="vr-box">
      <div className="vr-title">{t('variants.boxTitle')}</div>
      {vs.map((v, i) => (
        <div key={v.id || `new-${i}`} className="vr-card">
          <div className="vr-grid">
            <span className="vr-num">{i + 1}</span>
            <label className="vr-f"><span>{t('variants.nameLabel')}</span>
              <input placeholder={t('variants.namePlaceholder')} value={v.name} onChange={(e) => update(i, 'name', e.target.value)} />
            </label>
            <label className="vr-f"><span>{t('variants.stockLabel')}</span>
              {draft ? (
                <input type="number" min="0" step="1" value={v.stock} aria-label={t('variants.stock')}
                  onChange={(e) => update(i, 'stock', e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value)) || 0))} />
              ) : (
                <input readOnly value={t('editCampaign.stockLeftLabel', { remaining: v.stockRemaining, initial: v.stock })} />
              )}
            </label>
            <label className="vr-f"><span>{t('variants.modeLabel')}</span>
              <select value={v.redeemMethod} title={t('editCampaign.redeemMethodTitle')} onChange={(e) => update(i, 'redeemMethod', e.target.value)}>
                <option value="qr">QR</option><option value="code">Code</option><option value="voucher">Voucher</option><option value="perso">Perso</option>
              </select>
            </label>
            {draft ? (
              <button type="button" className="vr-del" onClick={() => onChange({ variants: vs.filter((_, k) => k !== i) })} aria-label={t('variants.remove')} title={t('variants.remove')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
              </button>
            ) : <span />}
          </div>
          {v.redeemMethod === 'perso' && (
            <PersoFields value={v} idPrefix={`var-${slot.slotIndex}-${i}`} uniqueCodeEditable={draft} onChange={(field, value) => update(i, field, value)}>
              {<UniqueCodesPanel campaignId={campaignId} slotIndex={slot.slotIndex} variantId={v.id} stock={Number(v.stock) || 0} label={v.name || t('variants.variantN', { n: i + 1 })} draft={draft} onChanged={onCodesChanged}
                persisted={!!(v.savedUnique && v.id)} staged={v.pendingCodes || ''} onStage={(txt) => update(i, 'pendingCodes', txt)} />}
            </PersoFields>
          )}
        </div>
      ))}
      {draft && <button type="button" className="vr-add" onClick={() => onChange({ variants: [...vs, emptyVariant()] })}>{t('variants.add')}</button>}
      <div className={`vr-sum ${diff === 0 && vs.length ? 'ok' : 'ko'}`}>
        <span className="vr-chip">{t('variants.caseStock')} <b>{total}</b></span>
        <span className="vr-chip">{t('variants.variantsTotal')} <b>{sum}</b></span>
        <span className="vr-chip">{t('variants.difference')} <b>{diff}</b></span>
        <em>{!vs.length ? t('variants.needOne') : diff === 0 ? t('variants.consistent') : diff > 0 ? t('variants.missing', { n: diff }) : t('variants.tooMany', { n: -diff })}</em>
      </div>
    </div>
  );
}
