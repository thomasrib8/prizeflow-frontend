// "Quota e-mails" widget on the admin Health page: Resend's monthly and daily sending limits, how much is
// used, what is left and when it resets. The figures come from the backend (Resend's usage API, or SPARK's own
// count when the key cannot read it) — the API key never reaches the browser. Refreshes itself every 5 minutes.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card } from './ui';
import './resend-quota.css';

const REFRESH_MS = 5 * 60 * 1000;

function Meter({ q, label, estimated, dateOptions }) {
  const { t, i18n } = useTranslation('admin');
  const nf = (n) => Number(n).toLocaleString(i18n.language);
  const when = q.resetsAt ? new Date(q.resetsAt).toLocaleString(i18n.language, dateOptions) : null;
  return (
    <div className={`rq-meter tone-${q.tone}`}>
      <div className="rq-meter-label">{label}</div>
      <div className="rq-meter-value">
        <strong>{nf(q.used)}</strong>
        <span>{q.unlimited ? ` · ${t('resendQuota.unlimited')}` : ` / ${nf(q.limit)}`}</span>
      </div>
      {q.unlimited ? (
        <div className="rq-bar rq-bar-unlimited" aria-hidden="true" />
      ) : (
        <div className="rq-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={q.percent} aria-label={label}>
          <div className="rq-bar-fill" style={{ width: `${Math.max(q.used > 0 ? 2 : 0, q.percent)}%` }} />
        </div>
      )}
      <div className="rq-meter-meta">
        {q.unlimited ? (
          <span>{t('resendQuota.noCap')}</span>
        ) : (
          <span><b className="rq-pct">{t('resendQuota.percentUsed', { pct: q.percent })}</b> · {t('resendQuota.remaining', { count: q.remaining, n: nf(q.remaining) })}</span>
        )}
        {when && <span>{t(estimated ? 'resendQuota.resetsEstimated' : 'resendQuota.resets', { date: when })}</span>}
      </div>
    </div>
  );
}

export default function ResendQuotaCard({ initial }) {
  const { t, i18n } = useTranslation('admin');
  const [status, setStatus] = useState(initial || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [, setNow] = useState(0);

  const refresh = useCallback(async (manual) => {
    setBusy(true);
    try {
      setStatus(await api.getEmailStatus(manual));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => refresh(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);
  // re-render each minute so "updated 3 min ago" stays true
  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function ago(iso) {
    if (!iso) return '—';
    const then = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`).getTime();
    const sec = Math.round((then - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
    if (Math.abs(sec) < 60) return rtf.format(0, 'second');
    if (Math.abs(sec) < 3600) return rtf.format(Math.round(sec / 60), 'minute');
    if (Math.abs(sec) < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
    return rtf.format(Math.round(sec / 86400), 'day');
  }

  const refreshBtn = (
    <button type="button" className="rq-refresh" onClick={() => refresh(true)} disabled={busy} aria-label={t('resendQuota.refresh')}>
      <svg viewBox="0 0 24 24" className={busy ? 'spin' : ''} aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {busy ? t('resendQuota.refreshing') : t('resendQuota.refresh')}
    </button>
  );

  const action = <span className="rq-head-action"><span className="rq-provider">Resend</span>{refreshBtn}</span>;

  if (!status) {
    return <Card title={t('appHealth.emailQuotaTitle')} className="mt-card" action={action}>{error ? <div className="error-banner">{error}</div> : <p className="rq-muted">{t('common.loading')}</p>}</Card>;
  }

  const estimated = status.source !== 'api';
  const state = !status.configured
    ? { cls: 'idle', label: t('appHealth.notConfiguredState') }
    : status.source === 'api'
    ? { cls: 'ok', label: t('resendQuota.stateApi') }
    : { cls: 'warn', label: t('resendQuota.stateLocal') };
  const showWarning = status.tone !== 'green';

  return (
    <Card title={t('appHealth.emailQuotaTitle')} className="mt-card" action={action}>
      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{t('resendQuota.refreshFailed', { message: error })}</div>}
      {showWarning && (
        <div className={`rq-alert tone-${status.tone}`} role="alert">
          <span>{t(status.tone === 'red' ? 'resendQuota.warnRed' : 'resendQuota.warnOrange')}</span>
          <a className="rq-upgrade" href={status.usageUrl} target="_blank" rel="noopener noreferrer">{t('resendQuota.upgrade')}</a>
        </div>
      )}
      <div className="rq-meters">
        <Meter q={status.monthly} label={t('resendQuota.thisMonth')} estimated={estimated} dateOptions={{ dateStyle: 'long' }} />
        <Meter q={status.daily} label={t('resendQuota.today')} estimated={estimated} dateOptions={{ dateStyle: 'medium', timeStyle: 'short' }} />
      </div>
      <dl className="rq-facts">
        <div><dt>{t('appHealth.stateLabel')}</dt><dd><span className={`rq-dot ${state.cls}`} />{state.label}</dd></div>
        <div><dt>{t('resendQuota.lastEmail')}</dt><dd>{ago(status.lastEmailAt)}</dd></div>
        <div><dt>{t('resendQuota.lastError')}</dt><dd>{status.lastError ? ago(status.lastError.at) : t('resendQuota.none')}</dd></div>
      </dl>
      {status.configured && estimated && <p className="rq-note">{status.apiState === 'restricted' ? t('resendQuota.noteRestricted') : t('resendQuota.noteLocal')}</p>}
      <p className="rq-updated">{t('resendQuota.updated', { when: ago(status.checkedAt) })}</p>
    </Card>
  );
}
