// Admin: LinkedIn profile search (Apollo.io) for one client — the on/off switch, the credit allowance, how much is
// used, and the ledger of searches. The server is the only place credits change; this only asks for new values.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Badge } from './ui';
import CreditsBar from './linkedin/CreditsBar';
import LinkedInIcon from './linkedin/LinkedInIcon';
import './linkedin/linkedin.css';

const RESULT_TONE = { found: 'green', not_found: 'neutral', error: 'orange', reserved: 'blue' };

export default function LinkedInAdminCard({ userId }) {
  const { t, i18n } = useTranslation('admin');
  const [data, setData] = useState(null);
  const [quota, setQuota] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getUserLinkedin(userId).then((d) => { setData(d); setQuota(String(d.total)); }).catch((e) => setError(e.message));
  }, [userId]);

  async function update(payload) {
    setBusy(true); setError(''); setSaved(false);
    try {
      const d = await api.setUserLinkedin(userId, payload);
      setData(d); setQuota(String(d.total)); setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.code === 'QUOTA_BELOW_USED' ? t('linkedin.belowUsed', { used: data?.used ?? 0 }) : e.message);
    } finally {
      setBusy(false);
    }
  }

  const nf = (n) => Number(n).toLocaleString(i18n.language);
  const quotaNumber = Number(quota);
  const quotaValid = quota.trim() !== '' && Number.isInteger(quotaNumber) && quotaNumber >= 0;
  const when = (s) => new Date(`${String(s).replace(' ', 'T')}Z`).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><LinkedInIcon style={{ width: 18, height: 18 }} />{t('linkedin.adminTitle')}</span>} className="mt-card">
      {error && <div className="error-banner">{error}</div>}
      {!data && !error && <p className="page-subtitle">{t('common.loading')}</p>}
      {data && (
        <>
          {!data.apolloConfigured && <div className="error-banner" style={{ marginBottom: 14 }}>{t('linkedin.apolloMissing')}</div>}
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={data.enabled} disabled={busy} onChange={(e) => update({ enabled: e.target.checked })} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{t('linkedin.adminSwitch')}</span>
          </label>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '6px 0 0 28px' }}>{t('linkedin.adminHelp')}</p>

          {data.enabled && (
            <>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', margin: '18px 0 12px' }}>
                {[['assigned', data.total], ['used', data.used], ['remaining', data.remaining]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t(`linkedin.${k}`)}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{nf(v)}</div>
                  </div>
                ))}
              </div>
              <CreditsBar credits={data} label={t('linkedin.remaining')} />

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 18 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="li-quota">{t('linkedin.quotaLabel')}</label>
                  <input id="li-quota" type="number" min="0" step="1" value={quota} onChange={(e) => setQuota(e.target.value)} style={{ width: 140 }} />
                </div>
                <button type="button" className="li-btn primary" style={{ minHeight: 40 }} disabled={busy || !quotaValid || quotaNumber === data.total} onClick={() => update({ creditsTotal: quotaNumber })}>
                  {t('linkedin.saveQuota')}
                </button>
                {saved && <span style={{ fontSize: 13, color: '#047857', fontWeight: 600 }}>✓ {t('linkedin.saved')}</span>}
              </div>
            </>
          )}

          <h4 style={{ margin: '22px 0 8px', fontSize: 14 }}>{t('linkedin.historyTitle')}</h4>
          {data.history.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{t('linkedin.historyEmpty')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('linkedin.colDate')}</th><th>{t('linkedin.colCampaign')}</th><th>{t('linkedin.colProspect')}</th><th>{t('linkedin.colBy')}</th>
                    <th>{t('linkedin.colResult')}</th><th>{t('linkedin.colCredits')}</th><th>{t('linkedin.colApollo')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((h) => (
                    <tr key={h.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{when(h.at)}</td>
                      <td>{h.campaign || '—'}</td>
                      <td>{h.prospect || '—'}</td>
                      <td>{h.by || '—'}</td>
                      <td>
                        <Badge tone={RESULT_TONE[h.status] || 'neutral'}>{t(`linkedin.res_${h.status}`)}</Badge>
                        {h.decision && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{t(`linkedin.dec_${h.decision}`)}</span>}
                      </td>
                      <td>{h.credits}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.apolloBilling ? t(`linkedin.bill_${h.apolloBilling}`) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '10px 0 0' }}>{t('linkedin.apolloNote')}</p>
        </>
      )}
    </Card>
  );
}
