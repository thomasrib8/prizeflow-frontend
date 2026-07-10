import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Card, Badge } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

/// Revives the standalone wheel-control tool from the old webapp (before
/// PrizeFlow's campaign/guest layer existed): pick a case, it gets forced on
/// the wheel's next physical spin, or release the wheel back to free/neutral
/// play at any time.
///
/// Uses raw passthrough commands (Run;X / Free — the same primitives
/// Calibration.jsx and adminSequence.js already use) instead of the
/// promise-based /spin/demo: that endpoint waits for hub.js's guest-oriented
/// spin-confirmation heuristic (built around motor-driven spin speed curves)
/// to resolve, which blocks re-arming to a different case for up to 90s and
/// doesn't know how to react to a manual Free cutting in. Here every click
/// (force a case, force a different one, or free) fires immediately and is
/// never blocked by a previous one still "in flight".
///
/// Per Main.cpp, once a forced spin lands the wheel holds in RunWait forever
/// with no auto-Free — watched here via the live wheel_status stream so a
/// validated landing releases the wheel back to Free automatically.
export default function Magic() {
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [armedSlot, setArmedSlot] = useState(null);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');
  const armedSlotRef = useRef(null);
  armedSlotRef.current = armedSlot;

  const posAngle = posToAngle(wheelStatus?.currentPos ?? 0);
  const wheelState = wheelStatus?.state || '';
  const isForced = armedSlot !== null || (!!wheelState && wheelState !== 'Free');

  useEffect(() => {
    if (wheelState !== 'RunWait' || armedSlotRef.current === null) return;
    const target = armedSlotRef.current;
    if (wheelStatus?.currentIndex === target) {
      setArmedSlot(null);
      setLastResult(`Landed on Case ${target + 1}`);
      api.wheelCommand('Free').catch((e) => setError(e.message));
    } else {
      // Spin too weak/off — stay armed on the same target and let the
      // operator try again rather than falsely reporting a landing.
      setError(`Missed — landed on Case ${(wheelStatus?.currentIndex ?? 0) + 1}. Still forcing Case ${target + 1}, spin again.`);
      api.wheelCommand(`Run;${target}`).catch((e) => setError(e.message));
    }
  }, [wheelState]);

  async function handleSectionClick(slotIndex) {
    setError('');
    setLastResult('');
    setArmedSlot(slotIndex);
    try {
      await api.wheelCommand(`Run;${slotIndex}`);
    } catch (e) {
      setError(e.message);
      setArmedSlot(null);
    }
  }

  async function handleFree() {
    setError('');
    setLastResult('');
    setArmedSlot(null);
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
        <Badge tone={isForced ? 'orange' : 'green'}>{isForced ? 'FORCE' : 'FREE'}</Badge>
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
            onSectionClick={agentConnected ? handleSectionClick : undefined}
          />

          {armedSlot !== null && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '8px 18px', borderRadius: 20 }}>
              ⟳ Case {armedSlot + 1} armed — spin the wheel now
            </div>
          )}
          {armedSlot === null && lastResult && (
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
