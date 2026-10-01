import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';

const STATUS_TONE = { draft: 'neutral', active: 'green', paused: 'orange', completed: 'blue', archived: 'neutral' };
// 'all' plus every real campaign status — each maps to common.status* for
// both the filter pills and the table's status badge (see statusLabel below).
const STATUS_FILTERS = ['all', 'draft', 'active', 'paused', 'completed', 'archived'];
const STATUS_TKEY = { all: 'statusAll', draft: 'statusDraft', active: 'statusActive', paused: 'statusPaused', completed: 'statusCompleted', archived: 'statusArchived' };

export default function Campaigns() {
  const { t } = useTranslation('admin');
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.listCampaigns().then(setCampaigns).catch(e => setError(e.message));
  }, []);

  const filtered = campaigns?.filter(c => statusFilter === 'all' || c.status === statusFilter) || [];
  const statusLabel = (s) => t(`common.${STATUS_TKEY[s] || 'statusDraft'}`);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('campaigns.pageTitle')}</h1>
          <p className="page-subtitle">{t('campaigns.pageSubtitle')}</p>
        </div>
        <Button onClick={() => navigate('/campaigns/new')}>{t('campaigns.newCampaignBtn')}</Button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {campaigns && campaigns.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              background: statusFilter === f ? '#09B2FD' : '#F1F5F9',
              color: statusFilter === f ? '#03041A' : '#64748B',
            }}>{statusLabel(f)}</button>
          ))}
        </div>
      )}

      <Card>
        {!campaigns ? (
          <p className="page-subtitle">{t('common.loading')}</p>
        ) : campaigns.length === 0 ? (
          <EmptyState title={t('campaigns.emptyTitle')} description={t('campaigns.emptyDescription')}
            action={<Button onClick={() => navigate('/campaigns/new')}>{t('campaigns.newCampaignBtn')}</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t('campaigns.emptyFilteredTitle', { status: statusLabel(statusFilter) })} description={t('campaigns.emptyFilteredDescription')} />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>{t('campaigns.tableId')}</th><th>{t('campaigns.tableName')}</th><th>{t('campaigns.tableStatus')}</th><th>{t('campaigns.tableDistributedTotal')}</th><th>{t('campaigns.tableCreated')}</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{c.id}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><Badge tone={STATUS_TONE[c.status] || 'neutral'}>{statusLabel(c.status)}</Badge></td>
                  <td>{c.total_distributed} / {c.total_stock}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</td>
                  <td><Link to={`/campaigns/${c.id}`} className="btn btn-ghost btn-sm">{t('campaigns.viewLink')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
