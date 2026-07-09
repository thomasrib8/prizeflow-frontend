const STATUS_INFO = {
  active: { color: '#10B981', label: 'Valid — ready to distribute' },
  redeemed: { color: '#F59E0B', label: 'Already distributed' },
  expired: { color: '#EF4444', label: 'Expired' },
  cancelled: { color: '#EF4444', label: 'Cancelled' },
};

function formatDT(s) {
  if (!s) return null;
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString();
}

/// The reward status/details/actions block, shared between RedeemPage.jsx
/// (full-screen, reached by an external QR-code scan outside the app shell)
/// and Rewards.jsx (rendered inline within the app, sidebar still visible).
/// This component only renders the card's *content* — callers own the
/// surrounding layout (fixed overlay vs inline card).
export default function RewardCard({ reward, error, busy, onDistribute, onCancel, onUndo }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        color: 'white', background: STATUS_INFO[reward.status]?.color || '#64748B', marginBottom: 18,
      }}>
        {STATUS_INFO[reward.status]?.label || reward.status}
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#0F172A' }}>{reward.giftName}</h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 4px' }}>
        For {reward.firstName} {reward.lastName}
      </p>
      {reward.launchedAt && (
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 24px' }}>
          Wheel launched {formatDT(reward.launchedAt)}
        </p>
      )}

      {error && <div className="error-banner">{error}</div>}

      {reward.status === 'redeemed' && reward.distributedBy && (
        <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
          Distributed by {reward.distributedBy}{reward.distributedAt ? ` · ${formatDT(reward.distributedAt)}` : ''}
        </p>
      )}

      {reward.status === 'active' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onDistribute} disabled={busy} style={{
            flex: 1, background: '#0F1C3F', color: 'white', border: 'none',
            borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
          }}>
            {busy ? 'Confirming…' : 'Distribute'}
          </button>
          <button type="button" onClick={onCancel} disabled={busy} style={{
            flex: 1, background: 'white', color: '#EF4444', border: '1px solid #FCA5A5',
            borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
          }}>
            {busy ? 'Cancelling…' : 'Cancel'}
          </button>
        </div>
      )}

      {reward.status === 'redeemed' && (
        <button type="button" onClick={onUndo} disabled={busy} style={{
          width: '100%', background: 'white', color: '#EF4444', border: '1px solid #FCA5A5',
          borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
        }}>
          {busy ? 'Cancelling…' : 'Cancel distribution'}
        </button>
      )}

      {reward.status === 'cancelled' && (
        <button type="button" onClick={onUndo} disabled={busy} style={{
          width: '100%', background: 'white', color: '#0F1C3F', border: '1px solid #CBD5E1',
          borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
        }}>
          {busy ? 'Reactivating…' : 'Reactivate'}
        </button>
      )}
    </div>
  );
}
