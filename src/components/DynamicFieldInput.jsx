// Renders the input control for one custom field definition (see
// fieldTypes.js) — shared by the guest-facing pre-spin form
// (GuestFlowScreen.jsx) and the sales rep's prospect form (ProspectCard.jsx).
// `value` / `onChange(value)` follow each type's natural JS shape:
// multi_choice -> string[], checkbox -> boolean, everything else -> string.
export default function DynamicFieldInput({ field, value, onChange }) {
  const { label, fieldType, options, required } = field;

  if (fieldType === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: '12px 0' }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span style={{ fontSize: 13 }}>{label}{required ? ' *' : ''}</span>
      </label>
    );
  }

  if (fieldType === 'dropdown') {
    return (
      <div className="field">
        <label>{label}{required ? ' *' : ''}</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (fieldType === 'single_choice') {
    return (
      <div className="field">
        <label>{label}{required ? ' *' : ''}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(options || []).map((o) => (
            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name={label} checked={value === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (fieldType === 'multi_choice') {
    const selected = Array.isArray(value) ? value : [];
    function toggle(o) {
      onChange(selected.includes(o) ? selected.filter((v) => v !== o) : [...selected, o]);
    }
    return (
      <div className="field">
        <label>{label}{required ? ' *' : ''}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(options || []).map((o) => (
            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }

  const inputType = fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text';
  return (
    <div className="field">
      <label>{label}{required ? ' *' : ''}</label>
      <input type={inputType} value={value || ''} onChange={(e) => onChange(e.target.value)} required={false} />
    </div>
  );
}
