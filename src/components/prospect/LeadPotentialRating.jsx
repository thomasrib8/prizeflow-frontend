// The lead-potential stars: 3 at most, "not rated" is its own state (never shown as a low score), and a tap
// changes the value — one component and one piece of state for the phone header and the desktop side card.
import { useTranslation } from 'react-i18next';

const STARS = [1, 2, 3];

export default function LeadPotentialRating({ value, onChange, size = 26 }) {
  const { t } = useTranslation('admin');
  return (
    <div className="pc-stars" role="group" aria-label={t('common.leadPotential')}>
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          className={`pc-star${value >= n ? ' on' : ''}`}
          onClick={() => onChange(n)}
          aria-label={t('prospect.starsAria', { count: n })}
          aria-pressed={value >= n}
          style={{ fontSize: size }}
        >
          {value >= n ? '★' : '☆'}
        </button>
      ))}
      {value == null && <span className="pc-notrated">{t('prospect.notRated')}</span>}
    </div>
  );
}
