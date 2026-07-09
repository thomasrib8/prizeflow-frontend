import { useState } from 'react';
import { api } from '../api/client';
import { Card, Badge } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

/// Revives the standalone wheel-control tool from the old webapp (before
/// PrizeFlow's campaign/guest layer existed): pick a case, it gets forced on
/// the wheel's next physical spin, or release the wheel back to free/neutral
/// play. Deliberately reuses the exact same primitives as everywhere else —
/// api.spinDemo (Run;X, awaits a confirmed landing, logs a "Demo" row in
/// History so a force-test never gets mistaken for a real distribution) and
/// api.wheelCommand('Free') (the same raw passthrough Calibration.jsx uses).
/// The FORCE/FREE badge is read straight off the wheel's own live-reported
/// state rather than tracked separately, so it always reflects reality.
export default function Magic() {
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [armedSlot, setArmedSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');

  const posAngle = posToAngle(wheelStatus?.currentPos ?? 0);
  const wheelState = wheelStatus?.state || '';
  const isFree = !wheelState || wheelState === 'Free';

  async function handleSectionClick(slotIndex) {
    if (busy) return;
    setBusy(true);
    setError('');
    setLastResult('');
    setArmedSlot(slotIndex);
    try {
      await api.spinDemo(slotIndex);
      setLastResult(`Landed on Case ${slotIndex + 1}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setArmedSlot(null);
    }
  }

  async function handleFree() {
    setError('');
    try {
      await api.wheelCommand('Free');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Magic</h1>
          <p className="page-subtitle">Click a case to force it on the wheel's next spin</p>
        </div>
        <Badge tone={isFree ? 'green' : 'orange'}>{isFree ? 'FREE' : 'FORCE'}</Badge>
      </div>

      {!agentConnected && (
        <div className="error-banner" style={{ marginBottom: 12 }}>Wheel agent is not connected.</div>
      )}
      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

      <Card className="mt-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <WheelSVG
            positionAngle={posAngle}
            size={280}
            highlightSection={armedSlot}
            onSectionClick={agentConnected && !busy ? handleSectionClick : undefined}
          />

          {busy && armedSlot !== null && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '8px 18px', borderRadius: 20 }}>
              ⟳ Case {armedSlot + 1} armed — spin the wheel now
            </div>
          )}
          {!busy && lastResult && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '8px 18px', borderRadius: 20 }}>
              ✓ {lastResult}
            </div>
          )}

          <button
            type="button"
            onClick={handleFree}
            disabled={!agentConnected}
            style={{
              width: '100%', maxWidth: 280, background: 'white', color: '#0F1C3F', border: '1px solid #CBD5E1',
              borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
              cursor: agentConnected ? 'pointer' : 'not-allowed', opacity: agentConnected ? 1 : 0.5, fontFamily: 'inherit',
            }}
          >
Free the wheel
          </button>
        </div>
      </Card>
    </div>
  );
}
