import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge } from './ui';

// Campaign page: where the merchant's unique codes stand (imported, available, given, e-mails sent / in error) and who got which code.
export default function UniqueCodesSummary({ campaignId }) {
  const { t } = useTranslation('admin');
  const [targets, setTargets] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api.getCampaignCodes(campaignId).then((r) => setTargets(r.targets)).catch(() => setTargets([]));
    api.getCampaignCodesHistory(campaignId).then((r) => setHistory(r.history)).catch(() => {});
  }, [campaignId]);
  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, [load]);
  if (!targets || targets.length === 0) return null;

  async function resend(rewardId) {
    setBusy(rewardId); setError('');
    try { await api.resendRewardEmail(rewardId); setTimeout(load, 800); } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  const sum = (k) => targets.reduce((a, x) => a + x[k], 0);
  return (
    <Card title={t('uniqueCodes.summaryTitle')} className="mt-card">
      {error && <div className="error-banner">{error}</div>}
      <div className="uc-kpis">
        {[['imported', 'kImported'], ['available', 'kAvailable'], ['assigned', 'kAssigned'], ['emailsSent', 'kSent'], ['emailsError', 'kError']].map(([k, label]) => (
          <div key={k} className={`uc-kpi${k === 'emailsError' && sum(k) > 0 ? ' bad' : ''}`}><span>{t(`uniqueCodes.${label}`)}</span><b>{sum(k)}</b></div>
        ))}
      </div>
      <table className="data-table" style={{ marginTop: 12 }}>
        <thead><tr><th>{t('common.gift')}</th><th>{t('uniqueCodes.kImported')}</th><th>{t('uniqueCodes.kAvailable')}</th><th>{t('uniqueCodes.kAssigned')}</th><th>{t('uniqueCodes.kSent')}</th><th>{t('uniqueCodes.kError')}</th><th /></tr></thead>
        <tbody>
          {targets.map((x) => (
            <tr key={`${x.slotIndex}-${x.variantId || ''}`}>
              <td style={{ fontWeight: 600 }}>{x.variantId ? `${x.caseName} · ${x.label}` : x.label}</td>
              <td>{x.imported} / {x.stock} {x.matchesStock ? '' : <Badge tone="red">{t('uniqueCodes.mismatch')}</Badge>}</td>
              <td>{x.available}</td><td>{x.assigned}</td><td>{x.emailsSent}</td>
              <td style={{ color: x.emailsError ? '#B91C1C' : undefined, fontWeight: x.emailsError ? 700 : undefined }}>{x.emailsError}</td>
              <td style={{ textAlign: 'right' }}><Link to={`/campaigns/${campaignId}/edit`} className="uc-link">{t('uniqueCodes.manage')}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {history.length > 0 && (
        <>
          <div className="ap-section-title" style={{ marginTop: 16 }}>{t('uniqueCodes.historyTitle')}</div>
          <table className="data-table">
            <thead><tr><th>{t('uniqueCodes.code')}</th><th>{t('uniqueCodes.participant')}</th><th>{t('common.gift')}</th><th>{t('uniqueCodes.assignedAt')}</th><th>{t('uniqueCodes.email')}</th><th /></tr></thead>
            <tbody>
              {history.slice(0, 100).map((h) => (
                <tr key={h.rewardId}>
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>{h.code}</td>
                  <td>{`${h.firstName || ''} ${h.lastName || ''}`.trim() || '—'}<div className="ap-sub">{h.email}</div></td>
                  <td>{h.giftName}</td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{h.assignedAt}</td>
                  <td><Badge tone={h.emailStatus === 'sent' ? 'green' : h.emailStatus === 'error' ? 'red' : 'orange'}>{t(`uniqueCodes.email_${h.emailStatus}`)}</Badge></td>
                  <td style={{ textAlign: 'right' }}>{h.emailStatus !== 'sent' && <Button size="sm" variant="secondary" disabled={busy === h.rewardId} onClick={() => resend(h.rewardId)}>{t('uniqueCodes.resend')}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ap-hint">{t('uniqueCodes.responsibility')}</p>
        </>
      )}
    </Card>
  );
}
