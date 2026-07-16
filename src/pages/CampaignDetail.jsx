import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAdmin } from '../hooks/useAdmin';
import { Card, Button, Badge, GiftPill, MiniBar } from '../components/ui';

const STATUS_TONE = { draft: 'neutral', active: 'green', paused: 'orange', completed: 'blue', archived: 'neutral' };
const SLOT_COLORS = ['#2563EB','#10B981','#F59E0B','#9333EA','#E11D48','#15803D','#D97706','#4F46E5','#BE185D','#0D9488','#A16207','#7C3AED'];

export default function CampaignDetail() {
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

  if (!campaign) return <p className="page-subtitle">{error || 'Loading…'}</p>;
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
            <Badge tone={STATUS_TONE[campaign.status] || 'neutral'}>{campaign.status}</Badge>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {campaign.status === 'draft' && <Button disabled={busy} onClick={() => runAction(() => api.startCampaign(campaign.id))}>Start campaign</Button>}
          {campaign.status === 'active' && <>
            <Button variant="secondary" disabled={busy} onClick={() => runAction(() => api.pauseCampaign(campaign.id))}>Pause</Button>
            <Button variant="danger" disabled={busy} onClick={() => runAction(() => api.endCampaign(campaign.id))}>End campaign</Button>
            <Button onClick={() => navigate('/launch')}>Go to Launch →</Button>
          </>}
          {campaign.status === 'paused' && <Button disabled={busy} onClick={() => runAction(() => api.startCampaign(campaign.id))}>Resume</Button>}
          {campaign.status === 'completed' && <Button variant="secondary" disabled={busy} onClick={() => runAction(() => api.archiveCampaign(campaign.id))}>Archive</Button>}
          {campaign.status !== 'archived' && (
            <Button variant="secondary" onClick={() => navigate(`/campaigns/new?from=${campaign.id}`)}>Duplicate</Button>
          )}
          {isAdmin && !!campaign.is_test && (
            <Button variant="secondary" onClick={showSeq ? () => setShowSeq(false) : loadSequence} disabled={seqLoading}>
              {seqLoading ? 'Loading…' : showSeq ? 'Hide sequence' : '🔧 View sequence'}
            </Button>
          )}
          <Button variant="secondary" disabled={exportBusy} onClick={handleExportGiftDistribution}>
            {exportBusy ? 'Exporting…' : 'Export gift distribution (CSV)'}
          </Button>
          <Button variant="secondary" disabled={reportBusy} onClick={handleDownloadReport}>
            {reportBusy ? 'Generating…' : 'Download PDF report'}
          </Button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {campaign.status === 'archived' && (
        <div style={{
          background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 16px',
          fontSize: 13, color: '#64748B', marginBottom: 16,
        }}>
          📦 This campaign is archived and read-only. Its distribution history remains available below.
        </div>
      )}

      {/* Gift distribution */}
      <Card title="Gift distribution">
        <table className="data-table">
          <thead>
            <tr><th>Case</th><th>Gift</th><th>Stock</th><th>%</th><th>Remaining</th><th>Redeem</th><th>Progress</th></tr>
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
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.redeem_method === 'code' ? 'Code' : s.redeem_method === 'voucher' ? 'Voucher' : 'QR'}</td>
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
              <h3 className="card-title">🔧 Full sequence</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {sequence.sequence.filter(s => s.consumed).length} / {sequence.sequence.length} consumed
                {sequence.nextPosition !== null ? ` · next: position #${sequence.nextPosition}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'remaining', 'consumed'].map(f => (
                <button key={f} onClick={() => setSeqFilter(f)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: seqFilter === f ? '#0F1C3F' : '#F1F5F9',
                  color: seqFilter === f ? 'white' : '#64748B',
                }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: 8 }}>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <tr>
                  <th>#</th>
                  <th>Case</th>
                  <th>Gift</th>
                  <th>Status</th>
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
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Case {s.slotIndex + 1}</span>
                    </td>
                    <td>
                      {s.consumed
                        ? <span style={{ color: '#CBD5E1', textDecoration: 'line-through' }}>{s.giftName}</span>
                        : <GiftPill slotIndex={s.slotIndex} name={s.giftName} />
                      }
                    </td>
                    <td>
                      {s.isNext
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>→ Next</span>
                        : s.consumed
                          ? <span style={{ fontSize: 11, color: '#10B981' }}>✓ Done</span>
                          : <span style={{ fontSize: 11, color: '#94A3B8' }}>Pending</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
            Auto-refresh every 3s · Admin only · Not visible in production
          </p>
        </div>
      )}
    </div>
  );
}