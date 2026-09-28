// One checkbox group inside a filter popup — shared by every page with a
// "Filters" button (History.jsx's CRM table, the Launch/PWA player lists).
export default function FilterGroup({ title, options, selected, onToggle }) {
  if (options.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          return (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', minHeight: 40, padding: '4px 0' }}>
              <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} style={{ width: 18, height: 18, flexShrink: 0 }} />
              {label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
