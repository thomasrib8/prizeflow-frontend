import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHOICE_FIELD_TYPES, PRESET_FIELD_TYPES } from './fieldTypes';
import OptionsEditor from './OptionsEditor';

const selectStyle = {
  flex: '0 0 170px', padding: '9px 10px', border: '1px solid var(--border, #E2E8F0)', borderRadius: 8,
  fontSize: 13, fontFamily: 'inherit', background: 'white',
};

// Admin-facing builder for a list of custom fields — used both for a
// campaign's "Autres informations" (sales rep form, scope='sales') and its
// guest-facing pre-spin form (scope='guest', see fieldTypes.js for which
// types apply to which). `fields` is a flat array of
// { label, fieldType, options: string[], required }; options only shown for
// choice-type fields.
// Paste a whole list (one value per line, e.g. copied from a spreadsheet column) instead of typing the options one by one
function PasteList({ onImport }) {
  const { t } = useTranslation('admin');
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!open) return <button type="button" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--link, #002881)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '0 0 8px', fontFamily: 'inherit' }}>{t('builders.pasteListBtn')}</button>;
  return (
    <div style={{ marginBottom: 10 }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={t('builders.pasteListPlaceholder')} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border, #E2E8F0)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => { onImport([...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))]); setText(''); setOpen(false); }}>{t('builders.pasteListImport')}</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>{t('wheelOps.cancel')}</button>
      </div>
    </div>
  );
}

export default function CampaignFieldsBuilder({ fields, onChange, fieldTypes, showRequired = false }) {
  const { t } = useTranslation('admin');
  function updateField(i, patch) {
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function addField() {
    onChange([...fields, { label: '', fieldType: fieldTypes[0].value, options: [], required: false }]);
  }
  function removeField(i) {
    onChange(fields.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fields.map((f, i) => (
          <div key={i} style={{ background: 'var(--surface-alt, #F8FAFC)', border: '1px solid var(--border, #E2E8F0)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: CHOICE_FIELD_TYPES.has(f.fieldType) ? 14 : 0 }}>
              <input
                placeholder={t('builders.fieldLabelPlaceholder')}
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                style={{
                  flex: '1 1 180px', padding: '9px 12px', border: '1px solid var(--border, #E2E8F0)', borderRadius: 8,
                  fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: 'white',
                }}
              />
              <select
                value={f.fieldType}
                onChange={(e) => updateField(i, { fieldType: e.target.value, options: CHOICE_FIELD_TYPES.has(e.target.value) ? (f.options?.length ? f.options : ['']) : [] })}
                style={selectStyle}
              >
                {fieldTypes.map((ft) => <option key={ft.value} value={ft.value}>{t(`builders.fieldTypes.${ft.tKey}`)}</option>)}
              </select>
              <button
                type="button"
                onClick={() => removeField(i)}
                title={t('builders.removeFieldTitle')}
                style={{
                  width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'white', border: '1px solid var(--border, #E2E8F0)', borderRadius: 8, color: '#EF4444', cursor: 'pointer',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            </div>

            {CHOICE_FIELD_TYPES.has(f.fieldType) && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light, #94A3B8)', marginBottom: 8 }}>
                  {t('builders.optionsLabel')}
                </div>
                {f.fieldType === 'search_choice' && <PasteList onImport={(list) => updateField(i, { options: [...(f.options || []).filter((o) => o.trim()), ...list] })} />}
                <OptionsEditor options={f.options || []} onChange={(options) => updateField(i, { options })} />
              </>
            )}
            {PRESET_FIELD_TYPES.has(f.fieldType) && (
              <p style={{ margin: '0 0 0', fontSize: 12, color: 'var(--text-light, #64748B)' }}>{t(f.fieldType === 'fr_department' ? 'builders.presetDepartmentHint' : 'builders.presetRegionHint')}</p>
            )}

            {showRequired && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                {t('builders.requiredOnGuestForm')}
              </label>
            )}
          </div>
        ))}
        {fields.length === 0 && <p className="page-subtitle" style={{ margin: 0 }}>{t('builders.noFieldsYet')}</p>}
      </div>
      <button
        type="button"
        onClick={addField}
        style={{
          marginTop: 14, width: '100%', padding: '11px', background: 'none',
          border: '1.5px dashed var(--border, #E2E8F0)', borderRadius: 10, color: 'var(--link, #002881)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >{t('builders.addFieldBtn')}</button>
    </div>
  );
}
