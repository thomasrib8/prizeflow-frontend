// "Informations principales": the campaign's own qualification fields (what the guest answered, the
// segmentation categories, the sales fields) — read as a compact two-column grid, or edited in place.
import DynamicFieldInput from '../DynamicFieldInput';
import { formatFieldValue } from './useProspectCard';
import { IcList, IcPencil } from './icons';
import TagsField from './TagsField';
import { shortLinkedInUrl } from '../../utils/linkedin';

function Cell({ label, value, wide }) {
  return (
    <div className={`pc-cell${wide ? ' wide' : ''}`}>
      <div className="pc-cell-label">{label}</div>
      <div className={`pc-cell-value${value ? '' : ' empty'}`}>{value || '—'}</div>
    </div>
  );
}

export default function ProspectQualification({ c }) {
  const { t } = c;
  const segs = c.segmentCategories.map((cat) => ({ cat, value: c.segments[cat.name] }));
  return (
    <section className="pc-card">
      <div className="pc-card-head">
        <h3 className="pc-card-title"><IcList className="pc-title-ic" />{t('prospect.mainInfo')}</h3>
        {!c.editing && <button type="button" className="pc-editbtn" onClick={c.startEdit}><IcPencil />{t('prospect.edit')}</button>}
      </div>

      {c.editing ? (
        <div className="pc-grid edit">
          {c.segmentCategories.map((cat) => (
            <DynamicFieldInput
              key={cat.id}
              field={{ label: cat.name, fieldType: 'dropdown', options: cat.options.map((o) => o.label) }}
              value={c.segments[cat.name] || ''}
              onChange={(v) => c.setSegments((prev) => ({ ...prev, [cat.name]: v || undefined }))}
            />
          ))}
          {c.salesFields.map((f) => (
            <DynamicFieldInput key={f.id} field={f} value={c.customFields[f.label]} onChange={(v) => c.setCustomFields((prev) => ({ ...prev, [f.label]: v }))} />
          ))}
          {(c.linkedinEditable || c.linkedin) && (
            <div className="field pc-span">
              <label htmlFor="pc-linkedin">{t('linkedin.fieldLabel')}</label>
              {c.linkedinEditable || c.linkedinDraft === '' ? (
                <input id="pc-linkedin" type="url" inputMode="url" value={c.linkedinDraft} placeholder={t('linkedin.manualPlaceholder')} disabled={!c.linkedinEditable} onChange={(e) => c.setLinkedinDraft(e.target.value)} />
              ) : (
                <div className="pc-li-readonly">
                  <a href={c.linkedin.url} target="_blank" rel="noopener noreferrer">{shortLinkedInUrl(c.linkedin.url)}</a>
                  <button type="button" className="pc-linkbtn danger" onClick={() => c.setLinkedinDraft('')}>{t('linkedin.fieldClear')}</button>
                </div>
              )}
            </div>
          )}
          {/* tags: this card on the phone, the right column on desktop (same state) */}
          <div className="pc-only-mobile pc-span"><TagsField c={c} /></div>
        </div>
      ) : (
        <>
          <div className="pc-grid">
            {c.guestFields.map((f) => <Cell key={`g-${f.label}`} label={f.label} value={formatFieldValue(f, c.guestAnswers[f.label], t)} />)}
            {c.linkedin && c.linkedin.url && (
              <div className="pc-cell wide"><div className="pc-cell-label">{t('linkedin.fieldLabel')}</div><div className="pc-cell-value"><a href={c.linkedin.url} target="_blank" rel="noopener noreferrer">{shortLinkedInUrl(c.linkedin.url)}</a></div></div>
            )}
            {segs.map((s) => <Cell key={s.cat.id} label={s.cat.name} value={s.value} />)}
            {c.salesFields.map((f) => {
              const v = formatFieldValue(f, c.customFields[f.label], t);
              return <Cell key={f.id} label={f.label} value={v} wide={!!v && String(v).length > 28} />;
            })}
          </div>
          <div className="pc-only-mobile"><TagsField c={c} /></div>
        </>
      )}

      {c.consentInfo && (
        <p className="pc-consent">
          {t('prospectCard.consentLabel')} · {t('prospectCard.consentValue', { name: c.consentInfo.attestedBy || t('prospectCard.consentRepFallback'), date: String(c.consentInfo.attestedAt).slice(0, 10) })}
        </p>
      )}
    </section>
  );
}
