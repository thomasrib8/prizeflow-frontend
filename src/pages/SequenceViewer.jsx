import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAdmin } from '../hooks/useAdmin';
import { GiftPill } from '../components/ui';

const SLOT_COLORS = ['#2563EB','#10B981','#F59E0B','#9333EA','#E11D48','#15803D','#D97706','#4F46E5','#BE185D','#0D9488','#A16207','#7C3AED'];

export default function SequenceViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | pending | consumed

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    api.adminSequence(id).then(setData).catch(e => setError(e.message));
    // Refresh every 3s to track consumed slots live
    const interval = setInterval(() => {
      api.adminSequence(id).then(setData).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [id, isAdmin]);

  if (!isAdmin) return null;
  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="page-subtitle">Loading sequence…</p>;

  const filtered = data.sequence.filter(s => {
    if (filter === 'pending') return !s.consumed;
    if (filter === 'consumed') return s.consumed;
    return true;
  });

  // Count per slot
  const slotCounts = {};
  data.sequence.forEach(s => {
    if (!slotCounts[s.slotIndex]) slotCounts[s.slotIndex] = { total: 0, consumed: 0, name: s.giftName };
    slotCounts[s.slotIndex].total++;
    if (s.consumed) slotCounts[s.slotIndex].consumed++;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#FEF3C7', color: '#D97706', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em' }}>
              🧪 TEST MODE
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Admin only — not visible to operators</span>
          </div>
          <h1 className="page-title">{data.campaign.name} — Sequence</h1>
          <p className="page-subtitle">Full draw order · auto-refreshes every 3s</p>
        </div>
        <button onClick={() => navigate(`/campaigns/${id}`)} style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
        }}>← Back to campaign</button>
      </div>

      {/* Stats bar */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
        {[
          { label: 'Total draws', value: data.totalStock },
          { label: 'Consumed', value: data.distributed, accent: 'blue' },
          { label: 'Remaining', value: data.remaining, accent: 'orange' },
          { label: 'Next position', value: data.nextPosition ?? '—', accent: 'green' },
        ].map((s, i) => (
          <div className="card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value${s.accent ? ` accent-${s.accent}` : ''}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>

        {/* Main sequence table */}
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Draw sequence ({filtered.length} entries)</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all', 'pending', 'consumed'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  background: filter === f ? '#0F1C3F' : 'var(--border-light)',
                  color: filter === f ? 'white' : 'var(--text-muted)',
                }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <tr>
                  <th style={{ width: 60 }}>Position</th>
                  <th style={{ width: 50 }}>Case</th>
                  <th>Gift</th>
                  <th style={{ width: 90 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(step => (
                  <tr key={step.position} style={{
                    background: step.isCurrent ? '#EFF6FF' : undefined,
                    fontWeight: step.isCurrent ? 600 : undefined,
                  }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: step.isCurrent ? 'var(--blue)' : 'var(--text-muted)' }}>
                      {step.isCurrent ? '▶ ' : ''}{step.position}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {step.slotIndex}
                    </td>
                    <td>
                      <GiftPill slotIndex={step.slotIndex} name={step.giftName} />
                    </td>
                    <td>
                      {step.consumed ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)' }}>✓ Used</span>
                      ) : step.isCurrent ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>▶ Next</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-light)' }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slot breakdown sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 14 }}>Slot breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(slotCounts).map(([idx, info]) => {
                const pct = Math.round((info.consumed / info.total) * 100);
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <GiftPill slotIndex={Number(idx)} name={info.name} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {info.consumed}/{info.total}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${pct}%`,
                        background: SLOT_COLORS[Number(idx) % SLOT_COLORS.length],
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#D97706', marginBottom: 6 }}>⚠️ Test mode reminder</div>
            <div style={{ fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
              This campaign and its distributions are excluded from global dashboard stats. Disable test mode before going to production.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
