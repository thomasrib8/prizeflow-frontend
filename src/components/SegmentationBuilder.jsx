// Multi-category customer segmentation builder — an operator defines as
// many categories as they want (e.g. "Genre", "Budget"), each with its own
// set of options (e.g. "Homme"/"Femme"). `categories` is
// { name, options: string[] }[]; options entered as one comma-separated
// line, same pattern as CampaignFieldsBuilder.
export default function SegmentationBuilder({ categories, onChange }) {
  function updateCategory(i, patch) {
    onChange(categories.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addCategory() {
    onChange([...categories, { name: '', options: [] }]);
  }
  function removeCategory(i) {
    onChange(categories.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((c, i) => (
          <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Category name, e.g. Budget"
                value={c.name}
                onChange={(e) => updateCategory(i, { name: e.target.value })}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => removeCategory(i)} className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }}>Remove</button>
            </div>
            <input
              placeholder="Options, comma-separated — e.g. < 20 000€, 20-30 000€, > 30 000€"
              value={(c.options || []).join(', ')}
              onChange={(e) => updateCategory(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
        ))}
        {categories.length === 0 && <p className="page-subtitle" style={{ margin: 0 }}>No categories configured yet.</p>}
      </div>
      <button type="button" onClick={addCategory} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>+ Add category</button>
    </div>
  );
}
