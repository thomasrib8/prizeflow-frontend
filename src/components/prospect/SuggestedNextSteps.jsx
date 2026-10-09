// What the assistant suggests doing next. Informational: these are recommendations written by the assistant,
// not buttons wired to actions SPARK does not have, so nothing here pretends to be clickable.
import { IcSteps } from './icons';

export default function SuggestedNextSteps({ c, variant = 'card' }) {
  const { t } = c;
  if (!c.aiOn || c.nextActions.length === 0) return null;
  const list = (
    <ul className="pc-steps-list">
      {c.nextActions.map((a, i) => (
        <li key={i}>
          <span className="pc-step-ic"><IcSteps /></span>
          <span><strong>{a.title}</strong>{a.description ? <span className="pc-step-desc">{a.description}</span> : null}</span>
        </li>
      ))}
    </ul>
  );
  if (variant === 'inline') return <div className="pc-steps-inline">{list}</div>;
  return (
    <section className="pc-card pc-ai">
      <h3 className="pc-card-title ai">{t('prospect.nextSteps')}</h3>
      {list}
    </section>
  );
}
