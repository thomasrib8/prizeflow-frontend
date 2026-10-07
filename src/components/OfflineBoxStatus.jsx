import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Badge, Button } from './ui';

// Staff-facing, on the Launch page: is the offline event box following the
// cloud (so it could take over if the internet drops), and — after an outage —
// which spins were in the air when the link broke and need a human decision
// ("was a gift handed over?"). Renders nothing at all on a deployment where the
// box feature is not switched on (status.enabled is false).
const REFRESH_MS = 10000;

export function useOfflineBox() {
  const [status, setStatus] = useState(null);
  const [reviews, setReviews] = useState([]);

  const load = useCallback(async () => {
    try {
      const st = await api.getOfflineStatus();
      setStatus(st);
      if (st.pendingReviews > 0) setReviews((await api.getOfflineReviews()).filter((r) => !r.resolvedAt));
      else setReviews([]);
    } catch {
      /* not reachable right now: keep what we last knew */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { status, reviews, reload: load };
}

export function OfflineBoxBadge({ status }) {
  const { t } = useTranslation('admin');
  if (!status || !status.enabled) return null;
  if (!status.boxSeen) return <Badge tone="neutral">{t('offlineBox.notSeen')}</Badge>;
  if (status.inSync) return <Badge tone="green">{t('offlineBox.inSync')}</Badge>;
  if (status.lastPollSecondsAgo > 15) return <Badge tone="red">{t('offlineBox.silent', { seconds: status.lastPollSecondsAgo })}</Badge>;
  return <Badge tone="orange">{t('offlineBox.behind', { count: status.eventsBehind })}</Badge>;
}

export function OfflineReviews({ reviews, onChanged }) {
  const { t } = useTranslation('admin');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  if (!reviews.length) return null;

  async function settle(id, action) {
    setBusy(id);
    setError('');
    try {
      await api.resolveOfflineReview(id, action);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 800, color: '#92400E', marginBottom: 4 }}>{t('offlineBox.reviewsTitle')}</div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>{t('offlineBox.reviewsHelp')}</p>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reviews.map((r) => (
          <div key={r.id} style={{ background: 'white', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{r.giftName || t('offlineBox.unknownGift')}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{t('offlineBox.reviewQuestion')}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" disabled={busy === r.id} onClick={() => settle(r.id, 'given')}>{t('offlineBox.given')}</Button>
              <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => settle(r.id, 'not_given')}>{t('offlineBox.notGiven')}</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
