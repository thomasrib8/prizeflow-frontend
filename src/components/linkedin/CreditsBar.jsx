// "72 / 100 crédits" with a horizontal bar showing what is left. Colour: accent while comfortable, amber when low
// (20 % or less), red when used up — kept subtle, the bar itself does the talking.
import { useTranslation } from 'react-i18next';

export default function CreditsBar({ credits, label, compact = false }) {
  const { t, i18n } = useTranslation('admin');
  if (!credits) return null;
  const nf = (n) => Number(n).toLocaleString(i18n.language);
  const pct = credits.total > 0 ? Math.round((credits.remaining / credits.total) * 100) : 0;
  return (
    <div className={`li-credits level-${credits.level}${compact ? ' compact' : ''}`}>
      <div className="li-credits-row">
        <span className="li-credits-label">{label || t('linkedin.creditsAvailable')}</span>
        <span className="li-credits-value"><strong>{nf(credits.remaining)}</strong> / {nf(credits.total)}</span>
      </div>
      <div className="li-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label || t('linkedin.creditsAvailable')}>
        <div className="li-bar-fill" style={{ width: `${credits.remaining > 0 ? Math.max(3, pct) : 0}%` }} />
      </div>
    </div>
  );
}
