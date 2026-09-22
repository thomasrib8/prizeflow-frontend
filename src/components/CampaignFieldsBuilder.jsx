import { CHOICE_FIELD_TYPES } from './fieldTypes';

// Admin-facing builder for a list of custom fields — used both for a
// campaign's "Autres informations" (sales rep form, scope='sales') and its
// guest-facing pre-spin form (scope='guest', see fieldTypes.js for which
// types apply to which). `fields` is a flat array of
// { label, fieldType, options: string[], required }; options is only shown
// for choice-type fields, entered as one comma-separated line for simplicity.
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map((f, i) => (
          <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Field label, e.g. Budget max"
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                style={{ flex: '1 1 200px' }}
              />
              <select value={f.fieldType} onChange={(e) => updateField(i, { fieldType: e.target.value, options: CHOICE_FIELD_TYPES.has(e.target.value) ? f.options : [] })} style={{ flex: '0 0 160px' }}>
                {fieldTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button type="button" onClick={() => removeField(i)} className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }}>Remove</button>
            </div>
            {CHOICE_FIELD_TYPES.has(f.fieldType) && (
              <input
                placeholder="Options, comma-separated — e.g. < 20 000€, 20-30 000€, > 30 000€"
                value={(f.options || []).join(', ')}
                onChange={(e) => updateField(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                style={{ width: '100%', marginTop: 8 }}
              />
            )}
            {showRequired && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                Required
              </label>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={addField} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>+ Add field</button>
    </div>
  );
}
