function formatRelative(s) {
  if (!s) return null;
  const then = new Date(s.replace(' ', 'T') + 'Z').getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 5) return "à l'instant";
  if (diffSec < 60) return `il y a ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}

/// Shared "Quota email" row table — rendered on the Dashboard (inline,
/// admin-only) and on the App Health page (inside a Card), so the exact same
/// fields/logic aren't duplicated between the two.
export default function EmailQuotaTable({ status }) {
  const etat = !status
    ? { icon: '⚪', label: '—' }
    : !status.configured
    ? { icon: '⚪', label: 'Non configuré' }
    : status.apiKeyValid
    ? { icon: '🟢', label: 'Connecté' }
    : { icon: '🔴', label: 'Déconnecté' };

  const apiKeyLabel = !status || !status.configured ? '—' : status.apiKeyValid ? 'Valide' : 'Invalide';
  const quotaLabel =
    status?.quotaTotal && status?.quotaUsed !== null && status?.quotaUsed !== undefined
      ? `${status.quotaUsed.toLocaleString()} / ${status.quotaTotal.toLocaleString()}`
      : status?.quotaRemaining !== null && status?.quotaRemaining !== undefined
      ? `${status.quotaRemaining.toLocaleString()} restants`
      : '—';

  const rows = [
    ['Etat', <span>{etat.icon} {etat.label}</span>],
    ['API Key', apiKeyLabel],
    ['Quota', quotaLabel],
    ["Emails aujourd'hui", status ? status.emailsToday : '—'],
    ["Taux d'ouverture", status?.openRatePct !== null && status?.openRatePct !== undefined ? `${status.openRatePct} %` : '—'],
    ['Dernier email', status ? (formatRelative(status.lastEmailAt) || '—') : '—'],
    ['Dernière erreur', status ? (status.lastError ? formatRelative(status.lastError.at) : 'Aucune') : '—'],
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
