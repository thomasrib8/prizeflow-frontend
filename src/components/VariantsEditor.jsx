import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import UniqueCodesPanel from './UniqueCodesPanel';

// Gift variants of one case of the wheel: the case stays ONE segment, but can hand out several gifts, each with its own stock and delivery mode.
// In a draft everything is editable; once the campaign ran, only names and delivery modes can be corrected (stocks are the game's own business).

// Personalised e-mail fields (shared by a case and by a variant)
// A fake code in every preview: a real, still-available code is never shown as an example.
const PREVIEW_CODE = 'SPARK-A82X';
const fill = (text, vars) => String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));

export function PersoFields({ value, onChange, idPrefix = 'perso', uniqueCodeEditable = false, children = null }) {
  const { t } = useTranslation('admin');
  const set = (field) => (e) => onChange(field, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  const hasVar = /\{\{\s*unique_code\s*\}\}/.test(`${value.persoSubject} ${value.persoBody}`);
  const preview = fill(value.persoBody, { firstName: 'Camille', giftName: value.name || value.giftName || 'Cadeau', code: 'AB12CD34', unique_code: PREVIEW_CODE });
  return (
    <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, margin: '4px 0' }}>
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
        {value.persoDelivery === 'code' && <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>{t('editCampaign.codeAutoAddedNote', { code: '{{code}}' })}</p>}
      </div>
      {(uniqueCodeEditable || value.persoUniqueCode) && (
        <div className="uc-opt">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: uniqueCodeEditable ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={!!value.persoUniqueCode} disabled={!uniqueCodeEditable} onChange={set('persoUniqueCode')} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>{t('uniqueCodes.option')}</span>
          </label>
          {value.persoUniqueCode && (
            <>
              <p style={{ fontSize: 11.5, color: '#64748B', margin: '4px 0 6px' }}>{t('uniqueCodes.optionHelp')}</p>
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
          <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>{t('editCampaign.autoDistributeDesc')}</span>
        </span>
      </label>
    </div>
  );
}

export const emptyVariant = () => ({ id: null, name: '', stock: 0, stockRemaining: 0, redeemMethod: 'qr', persoDelivery: 'code', persoSubject: '', persoBody: '', persoAutoDistribute: false, persoUniqueCode: false, savedUnique: false });

export default function VariantsEditor({ slot, draft, onChange, campaignId = null, onCodesChanged = () => {} }) {
  const { t } = useTranslation('admin');
  const vs = slot.variants || [];
  const sum = vs.reduce((a, v) => a + (Number(v.stock) || 0), 0);
  const total = Number(slot.stockInitial) || 0;
  const diff = total - sum;
  const update = (i, field, value) => onChange({ variants: vs.map((v, k) => (k === i ? { ...v, [field]: value } : v)) });
  return (
    <div className="vr-box">
      {vs.map((v, i) => (
        <div key={v.id || `new-${i}`} className="vr-item">
          <div className="vr-row">
            <span className="vr-tag">{t('variants.variantN', { n: i + 1 })}</span>
            <input placeholder={t('variants.namePlaceholder')} value={v.name} onChange={(e) => update(i, 'name', e.target.value)} />
            {draft ? (
              <input type="number" min="0" step="1" value={v.stock} aria-label={t('variants.stock')} title={t('variants.stock')} style={{ width: 84 }}
                onChange={(e) => update(i, 'stock', e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value)) || 0))} />
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('editCampaign.stockLeftLabel', { remaining: v.stockRemaining, initial: v.stock })}</span>
            )}
            <select value={v.redeemMethod} title={t('editCampaign.redeemMethodTitle')} onChange={(e) => update(i, 'redeemMethod', e.target.value)}>
              <option value="qr">QR</option><option value="code">Code</option><option value="voucher">Voucher</option><option value="perso">Perso</option>
            </select>
            {draft && <button type="button" className="vr-del" onClick={() => onChange({ variants: vs.filter((_, k) => k !== i) })} aria-label={t('variants.remove')} title={t('variants.remove')}>×</button>}
          </div>
          {v.redeemMethod === 'perso' && (
            <PersoFields value={v} idPrefix={`var-${slot.slotIndex}-${i}`} uniqueCodeEditable={draft} onChange={(field, value) => update(i, field, value)}>
              {campaignId && v.savedUnique && v.id ? <UniqueCodesPanel campaignId={campaignId} slotIndex={slot.slotIndex} variantId={v.id} stock={Number(v.stock) || 0} label={v.name} draft={draft} onChanged={onCodesChanged} /> : (campaignId ? <p className="ap-hint">{t('uniqueCodes.saveFirst')}</p> : null)}
            </PersoFields>
          )}
        </div>
      ))}
      {draft && <Button type="button" size="sm" variant="secondary" onClick={() => onChange({ variants: [...vs, emptyVariant()] })}>{t('variants.add')}</Button>}
      <div className={`vr-sum ${diff === 0 && vs.length ? 'ok' : 'ko'}`}>
        <span>{t('variants.caseStock')} <b>{total}</b></span>
        <span>{t('variants.variantsTotal')} <b>{sum}</b></span>
        <span>{t('variants.difference')} <b>{diff}</b></span>
        <em>{!vs.length ? t('variants.needOne') : diff === 0 ? t('variants.consistent') : diff > 0 ? t('variants.missing', { n: diff }) : t('variants.tooMany', { n: -diff })}</em>
      </div>
    </div>
  );
}
