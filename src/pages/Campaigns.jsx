import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';
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
  const { isAdmin } = useAdmin();
  const [searchParams] = useSearchParams();
  // admin only: the campaigns handed to client accounts (the campaign itself is theirs now; this is the trace kept here)
  const [transfers, setTransfers] = useState(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') === 'transferred' ? 'transferred' : 'all');
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.listCampaigns().then(setCampaigns).catch(e => setError(e.message));
    if (isAdmin) api.listCampaignTransfers().then(setTransfers).catch(() => setTransfers([]));
  }, [isAdmin]);

  const needle = q.trim().toLowerCase();
  const filtered = campaigns?.filter(c => (statusFilter === 'all' || c.status === statusFilter) && (!needle || `${c.name} ${c.id}`.toLowerCase().includes(needle))) || [];
  const countOf = (f) => (campaigns || []).filter(c => f === 'all' || c.status === f).length;
  const statusLabel = (s) => t(`common.${STATUS_TKEY[s] || 'statusDraft'}`);
  const showTransfers = isAdmin && statusFilter === 'transferred';

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

      {campaigns && (campaigns.length > 0 || (transfers && transfers.length > 0)) && (
        <div className="cp-bar">
          <div className="crm-quick">
            {STATUS_FILTERS.map(f => (
              <button key={f} className={`crm-qp${statusFilter === f ? ' on' : ''}`} onClick={() => setStatusFilter(f)}>{statusLabel(f)} <b>{countOf(f)}</b></button>
            ))}
            {isAdmin && transfers && transfers.length > 0 && <button className={`crm-qp${showTransfers ? ' on' : ''}`} onClick={() => setStatusFilter('transferred')}>{t('transfer.filter')} <b>{transfers.length}</b></button>}
          </div>
          <input className="cp-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('campaigns.searchPlaceholder')} aria-label={t('campaigns.searchPlaceholder')} />
        </div>
      )}

      {showTransfers ? (
        <div className="cp-list">
          <div className="cp-head"><span>{t('campaigns.tableName')}</span><span>{t('transfer.colClient')}</span><span>{t('campaigns.tableStatus')}</span><span>{t('transfer.colDate')}</span><span /></div>
          {(transfers || []).filter((r) => !needle || `${r.name} ${r.campaignId} ${r.toName} ${r.toEmail} ${r.toCompany}`.toLowerCase().includes(needle)).map((r) => (
            <div key={r.id} className="cp-row" style={{ '--c': STATUS_COLOR[r.currentStatus] || '#94A3B8', cursor: 'default' }}>
              <div className="cp-name"><b>{r.name}</b><span>{r.campaignId}</span></div>
              <div className="cp-name"><b>{r.toCompany || r.toName || '—'}</b><span>{r.toEmail}</span></div>
              <div><Badge tone={STATUS_TONE[r.currentStatus] || 'neutral'}>{r.currentStatus ? statusLabel(r.currentStatus) : '—'}</Badge></div>
              <div className="cp-date">{new Date(r.transferredAt.replace(' ', 'T') + 'Z').toLocaleDateString()}</div>
              <div />
            </div>
          ))}
          <p className="ap-hint" style={{ margin: '10px 4px 0' }}>{t('transfer.filterHint')}</p>
        </div>
      ) : !campaigns ? (
        <Card><p className="page-subtitle">{t('common.loading')}</p></Card>
      ) : campaigns.length === 0 ? (
        <Card><EmptyState title={t('campaigns.emptyTitle')} description={t('campaigns.emptyDescription')}
          action={<Button onClick={() => navigate('/campaigns/new')}>{t('campaigns.newCampaignBtn')}</Button>} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState title={t('campaigns.emptyFilteredTitle', { status: statusLabel(statusFilter) })} description={t('campaigns.emptyFilteredDescription')} /></Card>
      ) : (
        <div className="cp-list">
          <div className="cp-head cp-6"><span>{t('campaigns.tableName')}</span><span>{t('campaigns.tableMode')}</span><span>{t('campaigns.tableStatus')}</span><span>{t('campaigns.tableDistributedTotal')}</span><span>{t('campaigns.tableCreated')}</span><span /></div>
          {filtered.map(c => {
            const pct = c.total_stock ? Math.min(100, Math.round((c.total_distributed / c.total_stock) * 100)) : 0;
            const open = () => navigate(`/campaigns/${c.id}`);
            return (
              <div key={c.id} className="cp-row cp-6" style={{ '--c': STATUS_COLOR[c.status] || '#0055F8' }} role="link" tabIndex={0} onClick={open} onKeyDown={e => { if (e.key === 'Enter') open(); }}>
                <div className="cp-name"><b>{c.name}</b><span>{c.id}</span></div>
                <div><span className={`cp-mode${c.distribution_mode === 'dynamic' ? ' dynamic' : ''}`}>{t(c.distribution_mode === 'dynamic' ? 'campaigns.modeDynamic' : 'campaigns.modeStatic')}</span></div>
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
