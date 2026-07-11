import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Card, Badge } from '../components/ui';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

const CONFIRM_FLASH_MS = 5000;
// Same constants as hub.js's own proven guest-spin landing detection
// (ws/hub.js's pendingSpin stability check) — 5 consecutive near-identical
// currentPos readings before treating the wheel as physically stopped, and
// a 0.5 minimum move-away-from-start before evaluating anything at all (see
// MOVE_THRESHOLD below).
const STABLE_SAMPLES = 5;
const STABLE_EPSILON = 0.02;
const MOVE_THRESHOLD = 0.5;

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
/// Landing detection watches currentPos/currentIndex directly, the same way
/// hub.js's own working guest-spin confirmation does, rather than any
/// particular wheel state string — an earlier version keyed off a literal
/// "RunWait" state (inferred from a code comment, never confirmed against
/// real hardware) and it never fired on the real wheel. Crucially, it also
/// waits for the wheel to have moved at least MOVE_THRESHOLD away from
/// wherever it was sitting when armed before evaluating stability at all —
/// without that, a wheel already sitting motionless from a previous spin
/// looks instantly "stable" the moment a new case is armed, and falsely
/// reports a mismatch before the operator has even touched the wheel.
///
/// The wheel stays forced on the armed case indefinitely — spinning it again
/// should keep landing on the same case — until the operator either arms a
/// different one or explicitly frees it. A confirmed landing only flips the
/// inline banner green for a few seconds as a "yes, that worked"
/// confirmation; it never sends Free on its own.
export default function Magic() {
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [armedSlot, setArmedSlot] = useState(null);
  const [justLanded, setJustLanded] = useState(false);
  const [error, setError] = useState('');
  const armedSlotRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const trackingRef = useRef({ count: 0, lastPos: null, startPos: null, hasStartedMoving: false });
  armedSlotRef.current = armedSlot;

  const posAngle = posToAngle(wheelStatus?.currentPos ?? 0);
  const wheelState = wheelStatus?.state || '';
  const isForced = armedSlot !== null || (!!wheelState && wheelState !== 'Free');

  useEffect(() => {
    const target = armedSlotRef.current;
    if (target === null || !wheelStatus) return;

    const pos = wheelStatus.currentPos;
    const tr = trackingRef.current;

    if (tr.startPos === null) tr.startPos = pos;
    if (!tr.hasStartedMoving) {
      if (Math.abs(pos - tr.startPos) >= MOVE_THRESHOLD) tr.hasStartedMoving = true;
      tr.lastPos = pos;
      return; // don't evaluate landing until the wheel has genuinely moved
    }

    const posStable = tr.lastPos !== null && Math.abs(pos - tr.lastPos) < STABLE_EPSILON;
    tr.count = posStable ? tr.count + 1 : 0;
    tr.lastPos = pos;

    if (tr.count !== STABLE_SAMPLES) return;

    if (wheelStatus.currentIndex === target) {
      setJustLanded(true);
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setJustLanded(false), CONFIRM_FLASH_MS);
    } else {
      // Stopped, but not on the armed case (spin too weak/off) — silently
      // stay armed on the same target and let the operator try again; not
      // worth surfacing as an error, it's an expected part of manual testing.
      setJustLanded(false);
      api.wheelCommand(`Run;${target}`).catch(() => {});
      tr.count = 0; // don't keep re-firing while sitting on the wrong case
    }
  }, [wheelStatus]);

  useEffect(() => () => {
    clearTimeout(flashTimeoutRef.current);
    // Release the wheel when leaving this page — otherwise a case armed
    // here and never explicitly freed stays forced on the physical wheel
    // (RunWait holds forever, see the comment above), silently interfering
    // the next time the wheel is used from Sequence or a live campaign.
    if (armedSlotRef.current !== null) {
      api.wheelCommand('Free').catch(() => {});
    }
  }, []);

  async function handleSectionClick(slotIndex) {
    setError('');
    setJustLanded(false);
    clearTimeout(flashTimeoutRef.current);
    trackingRef.current = { count: 0, lastPos: null, startPos: null, hasStartedMoving: false };
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
    setJustLanded(false);
    clearTimeout(flashTimeoutRef.current);
    trackingRef.current = { count: 0, lastPos: null, startPos: null, hasStartedMoving: false };
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
            justLanded ? (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '8px 18px', borderRadius: 20 }}>
                ✓ Case {armedSlot + 1} forced
              </div>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '8px 18px', borderRadius: 20 }}>
                ⟳ Case {armedSlot + 1} armed — spin the wheel now
              </div>
            )
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
