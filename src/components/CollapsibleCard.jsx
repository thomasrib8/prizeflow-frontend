import { useState } from 'react';
import './collapsible.css';

// A settings section that folds: same look as <Card>, with a title bar that opens and closes it. Used on the campaign settings screens,
// where there are many sections and most are touched once.
export default function CollapsibleCard({ title, hint = null, children, className = '', defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`card cc ${open ? 'open' : ''} ${className}`}>
      <button type="button" className="cc-bar" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="cc-title">{title}</span>
        {hint && <span className="cc-hint">{hint}</span>}
        <span className="cc-chev" aria-hidden="true">▾</span>
      </button>
      {open && <div className="cc-body">{children}</div>}
    </div>
  );
}
