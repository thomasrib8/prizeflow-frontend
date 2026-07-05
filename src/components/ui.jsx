import './ui.css';

const PILL_COLORS = ['gift-pill-0','gift-pill-1','gift-pill-2','gift-pill-3','gift-pill-4','gift-pill-5','gift-pill-6','gift-pill-7','gift-pill-8','gift-pill-9','gift-pill-10','gift-pill-11'];

export function Card({ title, action, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          {title && <h3 className="card-title">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, accent, pct }) {
  const fillClass = accent ? `fill-${accent}` : 'fill-gray';
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${accent ? ` accent-${accent}` : ''}`}>{value}</div>
      {pct !== undefined && (
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: accent === 'blue' ? 'var(--blue)' : accent === 'green' ? 'var(--green)' : accent === 'orange' ? 'var(--orange)' : 'var(--text-light)' }} />
        </div>
      )}
    </div>
  );
}

export function Button({ variant = 'primary', size, children, ...props }) {
  const sz = size === 'sm' ? ' btn-sm' : '';
  return <button className={`btn btn-${variant}${sz}`} {...props}>{children}</button>;
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function GiftPill({ slotIndex, name }) {
  const cls = PILL_COLORS[slotIndex % PILL_COLORS.length];
  return <span className={`gift-pill ${cls}`}>{name}</span>;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {description && <p className="empty-desc">{description}</p>}
      {action}
    </div>
  );
}

export function MiniBar({ pct, color = 'var(--blue)' }) {
  return (
    <div className="mini-bar">
      <div className="mini-fill" style={{ width: `${Math.min(100, pct || 0)}%`, background: color }} />
    </div>
  );
}
