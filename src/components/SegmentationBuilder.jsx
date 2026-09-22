import OptionsEditor from './OptionsEditor';

// Multi-category customer segmentation builder — an operator defines as
// many categories as they want (e.g. "Genre", "Budget"), each with its own
// set of options (e.g. "Homme"/"Femme"). `categories` is
// { name, options: string[] }[].
export default function SegmentationBuilder({ categories, onChange }) {
  function updateCategory(i, patch) {
    onChange(categories.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addCategory() {
    onChange([...categories, { name: '', options: [''] }]);
  }
  function removeCategory(i) {
    onChange(categories.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {categories.map((c, i) => (
          <div key={i} style={{ background: 'var(--surface-alt, #F8FAFC)', border: '1px solid var(--border, #E2E8F0)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <input
                placeholder="Category name — e.g. Budget"
                value={c.name}
                onChange={(e) => updateCategory(i, { name: e.target.value })}
                style={{
                  flex: 1, padding: '9px 12px', border: '1px solid var(--border, #E2E8F0)', borderRadius: 8,
                  fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: 'white',
                }}
              />
              <button
                type="button"
                onClick={() => removeCategory(i)}
                title="Remove category"
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light, #94A3B8)', marginBottom: 8 }}>
              Options
            </div>
            <OptionsEditor options={c.options || []} onChange={(options) => updateCategory(i, { options })} />
          </div>
        ))}
        {categories.length === 0 && <p className="page-subtitle" style={{ margin: 0 }}>No categories configured yet.</p>}
      </div>
      <button
        type="button"
        onClick={addCategory}
        style={{
          marginTop: 14, width: '100%', padding: '11px', background: 'none',
          border: '1.5px dashed var(--border, #E2E8F0)', borderRadius: 10, color: 'var(--link, #002881)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >+ Add category</button>
    </div>
  );
}
