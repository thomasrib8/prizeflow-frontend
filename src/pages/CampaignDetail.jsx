import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAdmin } from '../hooks/useAdmin';
import { Card, Button, Badge, GiftPill, MiniBar } from '../components/ui';
import { SLOT_COLORS } from '../components/slotColors';

const STATUS_TONE = { draft: 'neutral', active: 'green', paused: 'orange', completed: 'blue', archived: 'neutral' };
const STATUS_TKEY = { draft: 'statusDraft', active: 'statusActive', paused: 'statusPaused', completed: 'statusCompleted', archived: 'statusArchived' };

export default function CampaignDetail() {
  const { t } = useTranslation('admin');
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sequence, setSequence] = useState(null);
  const [seqLoading, setSeqLoading] = useState(false);
  const [showSeq, setShowSeq] = useState(false);
  const [seqFilter, setSeqFilter] = useState('all'); // all | remaining | consumed
  const [reportBusy, setReportBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = () => api.getCampaign(id).then(setCampaign).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);

  async function handleDownloadReport() {
    setReportBusy(true);
    setError('');
    try {
      await api.downloadCampaignReport(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setReportBusy(false);
    }
  }

  async function handleExportGiftDistribution() {
    setExportBusy(true);
    setError('');
    try {
      await api.exportCampaignGiftDistribution(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setExportBusy(false);
    }
  }

  async function runAction(fn) {
    setBusy(true); setError('');
    try { await fn(); load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function handleDelete() {
    setDeleting(true); setError('');
    try {
      await api.deleteCampaign(campaign.id);
      navigate('/campaigns');
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  }

  async function loadSequence() {
    setSeqLoading(true);
    try {
      const data = await api.getCampaignSequence(id);
      setSequence(data);
      setShowSeq(true);
    } catch (e) { setError(e.message); } finally { setSeqLoading(false); }
  }

  function refreshSequence() {
    if (!showSeq) return;
    api.getCampaignSequence(id).then(setSequence).catch(() => {});
  }

  useEffect(() => {
    if (showSeq) {
      const t = setInterval(refreshSequence, 3000);
      return () => clearInterval(t);
    }
  }, [showSeq]);

  if (!campaign) return <p className="page-subtitle">{error || t('common.loading')}</p>;
  const statusLabel = (s) => t(`common.${STATUS_TKEY[s] || 'statusDraft'}`);
  const total = campaign.total_stock || 1;

  const filteredSeq = sequence?.sequence?.filter(s => {
    if (seqFilter === 'remaining') return !s.consumed;
    if (seqFilter === 'consumed') return s.consumed;
    return true;
  }) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {campaign.name}
            {campaign.is_test ? (
              <span style={{ fontSize: 12, fontWeight: 700, background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 6, padding: '3px 8px' }}>🔧 TEST</span>
            ) : null}
          </h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{campaign.id}</span>
            <Badge tone={STATUS_TONE[campaign.status] || 'neutral'}>{statusLabel(campaign.status)}</Badge>
            {campaign.event_name && <span>· {campaign.event_name}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {campaign.status === 'draft' && <Button disabled={busy} onClick={() => runAction(() => api.startCampaign(campaign.id))}>{t('campaignDetail.startCampaignBtn')}</Button>}
          {campaign.status === 'active' && <>
            <Button variant="secondary" disabled={busy} onClick={() => runAction(() => api.pauseCampaign(campaign.id))}>{t('campaignDetail.pauseBtn')}</Button>
            <Button variant="danger" disabled={busy} onClick={() => runAction(() => api.endCampaign(campaign.id))}>{t('campaignDetail.endCampaignBtn')}</Button>
            <Button onClick={() => navigate('/launch')}>{t('campaignDetail.goToLaunchBtn')}</Button>
          </>}
          {campaign.status === 'paused' && <Button disabled={busy} onClick={() => runAction(() => api.startCampaign(campaign.id))}>{t('campaignDetail.resumeBtn')}</Button>}
          {campaign.status === 'completed' && <Button variant="secondary" disabled={busy} onClick={() => runAction(() => api.archiveCampaign(campaign.id))}>{t('campaignDetail.archiveBtn')}</Button>}
          {campaign.status !== 'archived' && (
            <Button variant="secondary" onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}>{t('campaignDetail.editGiftsBtn')}</Button>
          )}
          {campaign.status !== 'archived' && (
            <Button variant="secondary" onClick={() => navigate(`/campaigns/${campaign.id}/edit-settings`)}>{t('campaignDetail.editSegmentationBtn')}</Button>
          )}
          {campaign.status !== 'archived' && (
            <Button variant="secondary" onClick={() => navigate(`/campaigns/new?from=${campaign.id}`)}>{t('campaignDetail.duplicateBtn')}</Button>
          )}
          {isAdmin && !!campaign.is_test && (
            <Button variant="secondary" onClick={showSeq ? () => setShowSeq(false) : loadSequence} disabled={seqLoading}>
              {seqLoading ? t('common.loading') : showSeq ? t('campaignDetail.hideSequenceBtn') : t('campaignDetail.viewSequenceBtn')}
            </Button>
          )}
          <Button variant="secondary" disabled={exportBusy} onClick={handleExportGiftDistribution}>
            {exportBusy ? t('campaignDetail.exportingBtn') : t('campaignDetail.exportGiftDistBtn')}
          </Button>
          <Button variant="secondary" disabled={reportBusy} onClick={handleDownloadReport}>
            {reportBusy ? t('launchCampaign.generatingBtn') : t('campaignDetail.downloadPdfReportBtn')}
          </Button>
          {campaign.status !== 'active' && (
            <button
              onClick={() => { setDeleteConfirmText(''); setDeleteOpen(true); }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #FCA5A5',
                background: 'transparent', color: '#DC2626', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t('campaignDetail.deleteCampaignBtn')}
            </button>
          )}
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {campaign.status === 'archived' && (
        <div style={{
          background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 16px',
          fontSize: 13, color: '#64748B', marginBottom: 16,
        }}>
          {t('campaignDetail.archivedNotice')}
        </div>
      )}

      {/* Gift distribution */}
      <Card title={t('campaignDetail.giftDistributionTitle')}>
        <table className="data-table">
          <thead>
            <tr><th>{t('campaignDetail.tableCase')}</th><th>{t('common.gift')}</th><th>{t('campaignDetail.tableStock')}</th><th>{t('campaignDetail.tablePct')}</th><th>{t('campaignDetail.tableRemaining')}</th><th>{t('campaignDetail.tableRedeem')}</th><th>{t('campaignDetail.tableProgress')}</th></tr>
          </thead>
          <tbody>
            {campaign.slots.map(s => {
              const pct = s.stock_initial ? Math.round(((s.stock_initial - s.stock_remaining) / s.stock_initial) * 100) : 0;
              return (
                <tr key={s.slot_index}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{s.slot_index + 1}</td>
                  <td><GiftPill slotIndex={s.slot_index} name={s.gift_name} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.stock_initial}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{((s.stock_initial / total) * 100).toFixed(1)}%</td>
                  <td style={{ fontWeight: 600 }}>{s.stock_remaining}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.redeem_method === 'code' ? t('campaignDetail.redeemCode') : s.redeem_method === 'voucher' ? t('campaignDetail.redeemVoucher') : s.redeem_method === 'perso' ? t('campaignDetail.redeemPerso') : t('campaignDetail.redeemQr')}</td>
                  <td><MiniBar pct={pct} color={SLOT_COLORS[s.slot_index % SLOT_COLORS.length]} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Sequence viewer — admin + test only */}
      {showSeq && sequence && (
        <div className="card mt-card" style={{ marginTop: 12 }}>
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 className="card-title">{t('campaignDetail.fullSequenceTitle')}</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {t('campaignDetail.consumedCountLabel', { consumed: sequence.sequence.filter(s => s.consumed).length, total: sequence.sequence.length })}
                {sequence.nextPosition !== null ? t('campaignDetail.nextPositionSuffix', { pos: sequence.nextPosition }) : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'all', tKey: 'seqFilterAll' },
                { key: 'remaining', tKey: 'seqFilterRemaining' },
                { key: 'consumed', tKey: 'seqFilterConsumed' },
              ].map(f => (
                <button key={f.key} onClick={() => setSeqFilter(f.key)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: seqFilter === f.key ? '#09B2FD' : '#F1F5F9',
                  color: seqFilter === f.key ? '#03041A' : '#64748B',
                }}>{t(`campaignDetail.${f.tKey}`)}</button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: 8 }}>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <tr>
                  <th>{t('campaignDetail.seqTableNum')}</th>
                  <th>{t('campaignDetail.tableCase')}</th>
                  <th>{t('common.gift')}</th>
                  <th>{t('campaignDetail.seqTableStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSeq.map(s => (
                  <tr key={s.position} style={{
                    background: s.isNext ? '#EFF6FF' : s.consumed ? '#FAFBFC' : 'white',
                    fontWeight: s.isNext ? 700 : 400,
                  }}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: s.consumed ? '#CBD5E1' : '#64748B' }}>
                      {s.isNext ? '👉 ' : ''}{s.position}
                    </td>
                    <td style={{ color: s.consumed ? '#CBD5E1' : undefined }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{t('dashboard.caseLabel', { n: s.slotIndex + 1 })}</span>
                    </td>
                    <td>
                      {s.consumed
                        ? <span style={{ color: '#CBD5E1', textDecoration: 'line-through' }}>{s.giftName}</span>
                        : <GiftPill slotIndex={s.slotIndex} name={s.giftName} />
                      }
                    </td>
                    <td>
                      {s.isNext
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: '#09B2FD' }}>{t('campaignDetail.nextLabel')}</span>
                        : s.consumed
                          ? <span style={{ fontSize: 11, color: '#10B981' }}>{t('campaignDetail.doneLabel')}</span>
                          : <span style={{ fontSize: 11, color: '#94A3B8' }}>{t('campaignDetail.pendingLabel')}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
            {t('campaignDetail.autoRefreshNote')}
          </p>
        </div>
      )}

      {deleteOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ '--modal-w': '480px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#DC2626' }}>{t('campaignDetail.deleteCampaignTitle')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {t('campaignDetail.deleteWarningPrefix')} <strong>{campaign.name}</strong> {t('campaignDetail.deleteWarningSuffix')}
            </p>
            <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
              {t('campaignDetail.typeToConfirm')}
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={campaign.name}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="secondary" disabled={deleting} onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
              <Button
                variant="danger"
                disabled={deleting || deleteConfirmText !== campaign.name}
                onClick={handleDelete}
              >
                {deleting ? t('campaignDetail.deletingBtn') : t('campaignDetail.deletePermanentlyBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}