import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import './crm.css';
import './campaigns.css';

const STATUS_COLOR = { draft: '#94A3B8', active: '#059669', paused: '#F59E0B', completed: '#09B2FD', archived: '#CBD5E1' };
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
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.listCampaigns().then(setCampaigns).catch(e => setError(e.message));
  }, []);

  const needle = q.trim().toLowerCase();
  const filtered = campaigns?.filter(c => (statusFilter === 'all' || c.status === statusFilter) && (!needle || `${c.name} ${c.id}`.toLowerCase().includes(needle))) || [];
  const countOf = (f) => (campaigns || []).filter(c => f === 'all' || c.status === f).length;
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
        <div className="cp-bar">
          <div className="crm-quick">
            {STATUS_FILTERS.map(f => (
              <button key={f} className={`crm-qp${statusFilter === f ? ' on' : ''}`} onClick={() => setStatusFilter(f)}>{statusLabel(f)} <b>{countOf(f)}</b></button>
            ))}
          </div>
          <input className="cp-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('campaigns.searchPlaceholder')} aria-label={t('campaigns.searchPlaceholder')} />
        </div>
      )}

      {!campaigns ? (
        <Card><p className="page-subtitle">{t('common.loading')}</p></Card>
      ) : campaigns.length === 0 ? (
        <Card><EmptyState title={t('campaigns.emptyTitle')} description={t('campaigns.emptyDescription')}
          action={<Button onClick={() => navigate('/campaigns/new')}>{t('campaigns.newCampaignBtn')}</Button>} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState title={t('campaigns.emptyFilteredTitle', { status: statusLabel(statusFilter) })} description={t('campaigns.emptyFilteredDescription')} /></Card>
      ) : (
        <div className="cp-list">
          <div className="cp-head"><span>{t('campaigns.tableName')}</span><span>{t('campaigns.tableStatus')}</span><span>{t('campaigns.tableDistributedTotal')}</span><span>{t('campaigns.tableCreated')}</span><span /></div>
          {filtered.map(c => {
            const pct = c.total_stock ? Math.min(100, Math.round((c.total_distributed / c.total_stock) * 100)) : 0;
            const open = () => navigate(`/campaigns/${c.id}`);
            return (
              <div key={c.id} className="cp-row" style={{ '--c': STATUS_COLOR[c.status] || '#0055F8' }} role="link" tabIndex={0} onClick={open} onKeyDown={e => { if (e.key === 'Enter') open(); }}>
                <div className="cp-name"><b>{c.name}</b><span>{c.id}</span></div>
                <div><Badge tone={STATUS_TONE[c.status] || 'neutral'}>{statusLabel(c.status)}</Badge></div>
                <div className="cp-prog">
                  <div className="cp-prog-top"><b>{c.total_distributed}</b><span> / {c.total_stock}</span><em>{pct} %</em></div>
                  <div className="cp-bar-track"><i style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="cp-date">{new Date(c.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</div>
                <div className="cp-go" aria-hidden="true">›</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
