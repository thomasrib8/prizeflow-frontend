import { useTranslation } from 'react-i18next';

/// Shared "Email quota" row table — rendered on the Dashboard (inline,
/// admin-only) and on the App Health page (inside a Card), so the exact same
/// fields/logic aren't duplicated between the two.
export default function EmailQuotaTable({ status }) {
  const { t } = useTranslation('admin');

  function formatRelative(s) {
    if (!s) return null;
    const then = new Date(s.replace(' ', 'T') + 'Z').getTime();
    const diffSec = Math.round((Date.now() - then) / 1000);
    if (diffSec < 5) return t('emailQuotaTable.justNow');
    if (diffSec < 60) return t('emailQuotaTable.secondsAgo', { n: diffSec });
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return t('emailQuotaTable.minutesAgo', { n: diffMin });
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return t('emailQuotaTable.hoursAgo', { n: diffH });
    const diffD = Math.round(diffH / 24);
    return t('emailQuotaTable.daysAgo', { n: diffD });
  }

  const state = !status
    ? { icon: '⚪', label: '—' }
    : !status.configured
    ? { icon: '⚪', label: t('appHealth.notConfiguredState') }
    : status.apiKeyValid
    ? { icon: '🟢', label: t('appHealth.connectedState') }
    : { icon: '🔴', label: t('emailQuotaTable.disconnectedState') };

  const apiKeyLabel = !status || !status.configured ? '—' : status.apiKeyValid ? t('emailQuotaTable.apiKeyValid') : t('emailQuotaTable.apiKeyInvalid');
  const quotaLabel =
    status?.quotaTotal && status?.quotaUsed !== null && status?.quotaUsed !== undefined
      ? `${status.quotaUsed.toLocaleString()} / ${status.quotaTotal.toLocaleString()}`
      : status?.quotaRemaining !== null && status?.quotaRemaining !== undefined
      ? t('emailQuotaTable.quotaRemainingLabel', { n: status.quotaRemaining.toLocaleString() })
      : '—';

  const rows = [
    [t('appHealth.stateLabel'), <span>{state.icon} {state.label}</span>],
    [t('emailQuotaTable.apiKeyLabel'), apiKeyLabel],
    [t('emailQuotaTable.quotaLabel'), quotaLabel],
    [t('emailQuotaTable.emailsTodayLabel'), status ? status.emailsToday : '—'],
    [t('emailQuotaTable.openRateLabel'), status?.openRatePct !== null && status?.openRatePct !== undefined ? `${status.openRatePct} %` : '—'],
    [t('emailQuotaTable.lastEmailLabel'), status ? (formatRelative(status.lastEmailAt) || '—') : '—'],
    [t('emailQuotaTable.lastErrorLabel'), status ? (status.lastError ? formatRelative(status.lastError.at) : t('emailQuotaTable.noneLabel')) : '—'],
  ];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i}>
            <td style={{ padding: '7px 0', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>{label}</td>
            <td style={{ padding: '7px 0', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
