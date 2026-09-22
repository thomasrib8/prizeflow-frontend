// One option per row, each with its own remove button, plus a "+ Add
// option" button — replaces the old comma-separated single input (fiddly to
// edit, easy to mis-type a separator). Shared by SegmentationBuilder (a
// category's options) and CampaignFieldsBuilder (a choice-type field's
// options).
export default function OptionsEditor({ options, onChange }) {
  function updateOption(i, value) {
    onChange(options.map((o, idx) => (idx === i ? value : o)));
  }
  function addOption() {
    onChange([...options, '']);
  }
  function removeOption(i) {
    onChange(options.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 20, textAlign: 'center', color: 'var(--text-light, #94A3B8)', fontSize: 12, flexShrink: 0 }}>{i + 1}</span>
            <input
              value={o}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border, #E2E8F0)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              aria-label="Remove option"
              style={{
                width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', borderRadius: 6, color: '#94A3B8', cursor: 'pointer', fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        style={{
          marginTop: 8, marginLeft: 28, display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', padding: '4px 0', color: 'var(--link, #002881)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >+ Add option</button>
    </div>
  );
}
