import { useTranslation } from 'react-i18next';
import { IconStar, IconUsers } from './PwaIcons';
import { avatarTone, formatWhen, initials, noteExcerpt, segmentChips } from '../../utils/pwaFormat';

export function Skel({ w = '100%', h = 14, r = 10, style }) {
  return <div className="pw-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function PersonSkeletons({ count = 3 }) {
  return (
    <div className="pw-people" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="pw-person" style={{ cursor: 'default' }}>
          <Skel w={44} h={44} r={22} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Skel w="55%" h={16} />
            <Skel w="35%" h={13} />
            <Skel w="80%" h={22} r={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span className="pw-stars" aria-label={`${rating}/3`}>
      {[1, 2, 3].map((n) => <IconStar key={n} filled={n <= rating} style={n > rating ? { opacity: 0.28 } : undefined} />)}
    </span>
  );
}

export function EmptyBlock({ icon: Icon = IconUsers, title, description, action }) {
  return (
    <div className="pw-empty">
      <div className="pw-empty-icon"><Icon /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorBlock({ onRetry }) {
  const { t } = useTranslation('admin');
  return (
    <EmptyBlock title={t('pwaApp.loadError')} action={<button type="button" className="pw-retry" onClick={onRetry}>{t('pwaApp.retryBtn')}</button>} />
  );
}

export function NoCampaign() {
  const { t } = useTranslation('admin');
  return <EmptyBlock title={t('pwa.noCampaignTitle')} description={t('pwa.noCampaignDescription')} />;
}

// One prospect/player row — shared by Home's "Last 20 players" and the
// Prospects tab so they look and behave identically. `p` is either a
// recent-players row or a CRM row (GET /rewards): both carry first_name,
// last_name, email, gift_name, created_at, note, lead_rating and segment.
export function PersonCard({ p, onOpen }) {
  const { t, i18n } = useTranslation('admin');
  const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || t('common.guestFallback');
  const tone = avatarTone(p.email || name);
  const chips = segmentChips(p.segment);
  const noGiftLabel = p.outcome === 'cancelled' ? t('pwa.noGiftCancelled') : p.outcome === 'skipped' ? t('pwa.noGiftSkipped') : t('pwa.noGift');
  const when = formatWhen(p.created_at, i18n.language);

  return (
    <button type="button" className="pw-person" onClick={onOpen}>
      <div className="pw-avatar" style={{ background: tone.bg, color: tone.fg }}>{initials(p.first_name, p.last_name)}</div>
      <div className="pw-person-body">
        <div className="pw-person-top">
          <div style={{ minWidth: 0 }}>
            <div className="pw-person-name">{name}</div>
            {p.gift_name
              ? <div className="pw-person-gift">{p.gift_name}</div>
              : <div className="pw-person-gift none">{noGiftLabel}</div>}
          </div>
          <div className="pw-person-right">
            <Stars rating={p.lead_rating} />
            {when && <span className="pw-person-time">{when}</span>}
          </div>
        </div>
        {(chips.length > 0 || p.email_missing) && (
          <div className="pw-person-tags">
            {p.email_missing && <span className="pw-chip warn">{t('pwaApp.noEmailBadge')}</span>}
            {chips.map((c, i) => <span key={`${c}-${i}`} className={`pw-chip t${i % 4}`}>{c}</span>)}
          </div>
        )}
        {p.note && <div className="pw-person-note">{noteExcerpt(p.note, 140)}</div>}
      </div>
    </button>
  );
}

// Shown by every tab while the active campaign itself is still loading.
export function CampaignLoading() {
  return (
    <div className="pw-stack" aria-hidden="true">
      <Skel h={76} r={20} />
      <Skel h={76} r={20} />
      <Skel h={120} r={20} />
    </div>
  );
}
