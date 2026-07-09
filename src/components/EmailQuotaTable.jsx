function formatRelative(s) {
  if (!s) return null;
  const then = new Date(s.replace(' ', 'T') + 'Z').getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d ago`;
}

/// Shared "Email quota" row table — rendered on the Dashboard (inline,
/// admin-only) and on the App Health page (inside a Card), so the exact same
/// fields/logic aren't duplicated between the two.
export default function EmailQuotaTable({ status }) {
  const state = !status
    ? { icon: '⚪', label: '—' }
    : !status.configured
    ? { icon: '⚪', label: 'Not configured' }
    : status.apiKeyValid
    ? { icon: '🟢', label: 'Connected' }
    : { icon: '🔴', label: 'Disconnected' };

  const apiKeyLabel = !status || !status.configured ? '—' : status.apiKeyValid ? 'Valid' : 'Invalid';
  const quotaLabel =
    status?.quotaTotal && status?.quotaUsed !== null && status?.quotaUsed !== undefined
      ? `${status.quotaUsed.toLocaleString()} / ${status.quotaTotal.toLocaleString()}`
      : status?.quotaRemaining !== null && status?.quotaRemaining !== undefined
      ? `${status.quotaRemaining.toLocaleString()} remaining`
      : '—';

  const rows = [
    ['State', <span>{state.icon} {state.label}</span>],
    ['API Key', apiKeyLabel],
    ['Quota', quotaLabel],
    ['Emails today', status ? status.emailsToday : '—'],
    ['Open rate', status?.openRatePct !== null && status?.openRatePct !== undefined ? `${status.openRatePct} %` : '—'],
    ['Last email', status ? (formatRelative(status.lastEmailAt) || '—') : '—'],
    ['Last error', status ? (status.lastError ? formatRelative(status.lastError.at) : 'None') : '—'],
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
