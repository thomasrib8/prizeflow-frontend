import { CHOICE_FIELD_TYPES } from './fieldTypes';
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
export default function CampaignFieldsBuilder({ fields, onChange, fieldTypes, showRequired = false }) {
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
                placeholder="Field label — e.g. Budget max"
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
                {fieldTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => removeField(i)}
                title="Remove field"
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
                  Options
                </div>
                <OptionsEditor options={f.options || []} onChange={(options) => updateField(i, { options })} />
              </>
            )}

            {showRequired && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                Required on the guest form
              </label>
            )}
          </div>
        ))}
        {fields.length === 0 && <p className="page-subtitle" style={{ margin: 0 }}>No fields configured yet.</p>}
      </div>
      <button
        type="button"
        onClick={addField}
        style={{
          marginTop: 14, width: '100%', padding: '11px', background: 'none',
          border: '1.5px dashed var(--border, #E2E8F0)', borderRadius: 10, color: 'var(--link, #002881)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >+ Add field</button>
    </div>
  );
}
