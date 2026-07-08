import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';

/// Destination for the "unique code" redemption flow (see
/// campaign_slots.redeem_method): a guest's reward email shows an 8-char
/// code, and its QR opens this generic page instead of a direct reward
/// deep-link. An already-signed-in operator types the code in, and we
/// resolve it to the normal /redeem/:code page.
export default function Rewards() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      const { code: signedCode } = await api.getRewardCodeLookup(code.trim());
      navigate(`/redeem/${signedCode}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rewards</h1>
          <p className="page-subtitle">Enter a guest's 8-character code to open their reward</p>
        </div>
      </div>

      <Card className="mt-card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="e.g. K8Q7F3N2"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus
            maxLength={8}
            style={{
              flex: 1, padding: '11px 14px', border: '1px solid #E2E8F0', borderRadius: 8,
              fontSize: 16, letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase',
            }}
          />
          <Button type="submit" disabled={busy || !code.trim()}>
            {busy ? 'Looking up…' : 'Open reward'}
          </Button>
        </form>
        {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
      </Card>
    </div>
  );
}
