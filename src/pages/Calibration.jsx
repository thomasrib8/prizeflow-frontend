import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

const SPINS_PER_PHASE = 10;


// ─── Spin dots progress ───────────────────────────────────────────────────────
function SpinDots({ total, recorded, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: i < recorded ? '#0F1C3F' : '#CBD5E1',
              color: i < recorded ? 'white' : '#94A3B8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, transition: 'background 0.3s',
            }}>{i + 1}</div>
            {i < total - 1 && <div style={{ width: 12, height: 2, background: i < recorded - 1 ? '#0F1C3F' : '#E2E8F0', borderRadius: 1 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal overlay wrapper ────────────────────────────────────────────────────
function Modal({ children, wide }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '36px 40px',
        width: wide ? 700 : 460, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
      }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', disabled }) {
  const styles = {
    primary: { background: '#0F1C3F', color: 'white' },
    secondary: { background: 'white', color: '#0F172A', border: '1px solid #E2E8F0' },
    danger: { background: '#EF4444', color: 'white' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], border: 'none', borderRadius: 8, padding: '11px 24px',
      fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1, fontFamily: 'inherit',
      ...(styles[variant].border ? { border: styles[variant].border } : {}),
    }}>{children}</button>
  );
}

// ─── Main Calibration component ───────────────────────────────────────────────
export default function Calibration({ onExit }) {
  const navigate = useNavigate();
  // Default (standalone /calibration route): navigate to the dashboard.
  // When embedded elsewhere (e.g. inside Settings.jsx's Calibration tab),
  // the caller passes its own onExit — navigating to a URL the app is
  // already on is a no-op, so a tab-switching page can't rely on the URL
  // changing to know the user backed out.
  const exit = onExit || (() => navigate('/'));
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [inCalibration, setInCalibration] = useState(false); // true once Cal is sent
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastCalLaunch, setLastCalLaunch] = useState(0);
  const [baseCalLaunch, setBaseCalLaunch] = useState(0);
  const [spinMsg, setSpinMsg] = useState('');
  const [spinPhase, setSpinPhase] = useState(3); // 3 = CW, 4 = CCW
  const [interruptedMessage, setInterruptedMessage] = useState(''); // shown in the step-0 popup instead of the normal entry copy
  const lastCalStateRef = useRef(''); // last genuine CalIndex0/CalIndex1/CalRun state seen, survives transient Error/WaitIndex/WaitFree hops

  const posAngle = posToAngle(wheelStatus?.currentPos || 0);
  const calLaunch = wheelStatus ? Number(wheelStatus.calLaunch) || 0 : 0;
  const calState = wheelStatus?.calState || '';
  const wheelState = wheelStatus?.state || '';

  // ── Step derived ENTIRELY from wheel state (like original app) ──────────────
  // -1 = transitioning (inCalibration=true, waiting for wheel to change state)
  //  0 = confirm entry popup
  //  1 = step1 (wheel in CalIndex0)
  //  2 = step2 (wheel in CalIndex1)
  //  3 = CW spins (wheel in CalRun, calState = CW)
  //  4 = CCW spins (wheel in CalRun, calState = CCW)
  //  5 = done (wheel in CalDone)
  const step = (() => {
    if (!inCalibration) return 0;
    if (wheelState === 'CalDone') return 5;
    if (wheelState === 'CalRun') return spinPhase;
    if (wheelState === 'CalIndex1') return 2;
    if (wheelState === 'CalIndex0') return 1;
    return -1; // inCalibration but transitioning (Free/WaitFree between states)
  })();

  const relativeProgress = Math.max(0, calLaunch - baseCalLaunch);
  const phase1Recorded = Math.min(relativeProgress, SPINS_PER_PHASE);
  const phase2Recorded = Math.max(0, relativeProgress - SPINS_PER_PHASE);
  const isRecording = calState === 'Run' && wheelState === 'CalRun';

  // Transition CW → CCW
  useEffect(() => {
    if (wheelState === 'CalRun' && calState === 'CCW' && spinPhase === 3) {
      setSpinPhase(4);
    }
  }, [calState, wheelState, spinPhase]);

  // Recover if the wheel drops back to Free mid-calibration (per Main.cpp,
  // this only happens via Error -> WaitIndex -> WaitFree -> Free). Without
  // this the UI would spin forever at step -1 waiting for a transition that
  // will never come, since resuming requires re-sending Cal from scratch.
  //
  // We track the LAST GENUINE calibration state seen (CalIndex0/CalIndex1/
  // CalRun) in a ref that is only updated while wheelState is one of those —
  // it is left untouched while wheelState is Error/WaitIndex/WaitFree, which
  // are transient hops on the way back to Free and may or may not each get
  // their own broadcast (Main.cpp's Socket::task() only fires every ~50ms,
  // so how many of these hops are individually visible is timing-dependent).
  // Comparing only against the immediately-previous state was unreliable —
  // any visible Error/WaitIndex hop would overwrite that memory before we
  // ever got to check it against Free. This tracks the last real state
  // regardless of how many transient hops happen in between.
  useEffect(() => {
    if (['CalIndex0', 'CalIndex1', 'CalRun'].includes(wheelState)) {
      lastCalStateRef.current = wheelState;
      return;
    }

    if (!inCalibration) return;
    if (wheelState !== 'Free') return;

    const droppedFrom = lastCalStateRef.current;
    if (!droppedFrom) return; // never actually reached a live Cal state yet — e.g. the brief Free at entry

    lastCalStateRef.current = '';
    setInCalibration(false);
    setBaseCalLaunch(0);
    setSpinPhase(3);

    if (droppedFrom === 'CalIndex0' || droppedFrom === 'CalIndex1') {
      setInterruptedMessage(
        "Position du taquet non validée par la roue à l'étape 2 : l'écart mesuré entre les positions " +
        "des étapes 1 et 2 est hors de la plage acceptée. Repositionnez le taquet le plus précisément " +
        "possible sur la goupille (toujours le même bord de taquet aux deux étapes) et recommencez la calibration."
      );
    } else if (droppedFrom === 'CalRun') {
      setInterruptedMessage(
        "La communication avec le moteur a été interrompue pendant l'enregistrement des lancers. " +
        "Veuillez recommencer la calibration depuis le début."
      );
    } else {
      setInterruptedMessage('La calibration a été interrompue de façon inattendue par la roue. Veuillez recommencer.');
    }
  }, [inCalibration, wheelState]);

  // "Spin recorded" flash
  useEffect(() => {
    if (calLaunch > lastCalLaunch && wheelState === 'CalRun') {
      setLastCalLaunch(calLaunch);
      setSpinMsg('✓ Spin recorded!');
      const t = setTimeout(() => setSpinMsg(''), 2000);
      return () => clearTimeout(t);
    }
  }, [calLaunch, lastCalLaunch, wheelState]);

  // Record baseline when CalRun first starts
  useEffect(() => {
    if (wheelState === 'CalRun' && baseCalLaunch === 0) {
      setBaseCalLaunch(calLaunch);
      setLastCalLaunch(calLaunch);
    }
  }, [wheelState]);

  async function send(command) {
    setBusy(true);
    setError('');
    try { await api.wheelCommand(command); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function handleConfirmEntry() {
    setInterruptedMessage('');
    // If wheel is in WaitFree from a previous spin, clear it first.
    // Cal is only accepted in Free state (C++ state machine).
    if (wheelState === 'WaitFree' || wheelState === 'Run') {
      await send('Free');
      // Give the wheel 300ms to process Free and transition to Free state
      await new Promise(r => setTimeout(r, 300));
    }
    await send('Cal');
    setInCalibration(true);
  }

  async function handleStep1Confirm() {
    await send('CalIndex0');
    // UI advances automatically when wheel responds with CalIndex1 state
  }

  async function handleStep2Confirm() {
    await send('CalIndex1');
    // UI advances automatically when wheel responds with CalRun state
  }

  function handleExitRequest() {
    if (inCalibration && step < 5) {
      setShowCancelWarning(true);
    } else {
      exit();
    }
  }

  function handleConfirmExit() {
    send('Free');
    setShowCancelWarning(false);
    setInCalibration(false);
    setBaseCalLaunch(0);
    setSpinPhase(3);
    exit();
  }

  const stepTitles = { 1: 'Step 1 of 4', 2: 'Step 2 of 4', 3: 'Step 3 of 4', 4: 'Step 4 of 4' };

  return (
    <div>
      {/* Page base — always visible behind modals */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Calibration</h1>
          <p className="page-subtitle">Guided wheel calibration procedure</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`badge badge-${agentConnected ? 'green' : 'red'}`}>
            {agentConnected ? 'Wheel connected' : 'Wheel offline'}
          </span>
          {(step > 0 || step === -1) && step < 5 && (
            <button onClick={handleExitRequest} style={{
              background: 'none', border: '1px solid #E2E8F0', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit',
            }}>Exit calibration</button>
          )}
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {/* ── STEP -1: Transitioning between states ── */}
      {step === -1 && (
        <Modal>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⟳</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>Calibration in progress</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 6px' }}>
              Waiting for the wheel to transition to the next step…
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>Wheel state: {wheelState || '—'}</p>
          </div>
        </Modal>
      )}

      {/* ── STEP 0: Confirm entry popup, or interrupted-calibration popup ── */}
      {step === 0 && (
        <Modal>
          <div style={{ textAlign: 'center' }}>
            {interruptedMessage ? (
              <>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>Calibration interrompue</h2>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 28px' }}>
                  {interruptedMessage}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <Btn variant="secondary" onClick={() => { setInterruptedMessage(''); exit(); }}>Cancel</Btn>
                  <Btn onClick={handleConfirmEntry} disabled={busy || !agentConnected}>
                    {busy ? 'Restarting…' : 'Restart calibration'}
                  </Btn>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="#2563EB"/></svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>Wheel Calibration</h2>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 28px' }}>
                  You are about to start the calibration procedure. This operation takes approximately <strong>10 minutes</strong> and will recalibrate the wheel's section detection.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <Btn variant="secondary" onClick={() => exit()}>Cancel</Btn>
                  <Btn onClick={handleConfirmEntry} disabled={busy || !agentConnected}>
                    {busy ? 'Starting…' : 'Start calibration'}
                  </Btn>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── STEP 1: Place cleat near 1-12 boundary (FENETRE 1) ── */}
      {step === 1 && (
        <Modal wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{stepTitles[1]} — Defining section 1</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>Position the cleat</h2>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, margin: '0 0 28px' }}>
                Place the cleat in <strong>section n°1</strong> as close as possible to the pin joining <strong>section n°1 and n°12</strong>.
                <br /><br />
                The cleat must remain <strong>vertical</strong> and must not be stressed in any way.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Btn variant="secondary" onClick={handleExitRequest}>Cancel</Btn>
                <Btn onClick={handleStep1Confirm} disabled={busy}>
                  {busy ? '…' : 'Confirm position'}
                </Btn>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <WheelSVG positionAngle={0} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── STEP 2: Place cleat near 1-2 boundary (FENETRE 2) ── */}
      {step === 2 && (
        <Modal wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{stepTitles[2]} — Defining section 1</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>Reposition the cleat</h2>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, margin: '0 0 28px' }}>
                Place the cleat in <strong>section n°1</strong> as close as possible to the pin joining <strong>section n°1 and n°2</strong>.
                <br /><br />
                The cleat must remain <strong>vertical</strong> and must not be stressed in any way.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Btn variant="secondary" onClick={handleExitRequest}>Cancel</Btn>
                <Btn onClick={handleStep2Confirm} disabled={busy}>
                  {busy ? '…' : 'Confirm position'}
                </Btn>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <WheelSVG positionAngle={30} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── STEP 3: Phase 1 spins (FENETRE 3) ── */}
      {step === 3 && (
        <Modal wide>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{stepTitles[3]}</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 4px', color: '#0F172A', letterSpacing: '-0.01em' }}>1</h2>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 24px', color: '#0F172A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Spin the wheel clockwise direction</h3>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <WheelSVG positionAngle={posAngle} />
            </div>

            {isRecording && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                ⟳ Recording in progress — do not touch the wheel
              </div>
            )}
            {spinMsg && !isRecording && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                {spinMsg}
              </div>
            )}
            {!isRecording && !spinMsg && wheelState !== 'CalRun' && (
              <div style={{ fontSize: 12, color: '#EF4444', background: '#FEF2F2', padding: '6px 14px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                ⚠ Waiting for calibration mode… (wheel state: {wheelState || '—'})
              </div>
            )}
            {!isRecording && !spinMsg && wheelState === 'CalRun' && (
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
                Spin the wheel hard in the clockwise direction
              </div>
            )}

            {/* Clockwise arrow */}
            <div style={{ marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#0F1C3F" strokeWidth="2.5">
                <path d="M 28 8 A 14 14 0 1 0 32 20" strokeLinecap="round"/>
                <polyline points="28,3 28,9 34,9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SpinDots total={SPINS_PER_PHASE} recorded={phase1Recorded} label="Phase 1" />
              <SpinDots total={SPINS_PER_PHASE} recorded={0} label="Phase 2" />
            </div>

            <div style={{ marginTop: 24 }}>
              <Btn variant="secondary" onClick={handleExitRequest}>Exit calibration</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── STEP 4: Phase 2 spins (FENETRE 4) ── */}
      {step === 4 && (
        <Modal wide>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{stepTitles[4]}</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 4px', color: '#0F172A', letterSpacing: '-0.01em' }}>2</h2>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 24px', color: '#0F172A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Spin the wheel clockwise direction</h3>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <WheelSVG positionAngle={posAngle} />
            </div>

            {isRecording && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                ⟳ Recording in progress — do not touch the wheel
              </div>
            )}
            {spinMsg && !isRecording && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                {spinMsg}
              </div>
            )}
            {!isRecording && !spinMsg && wheelState === 'CalRun' && (
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
                Spin the wheel hard in the counter-clockwise direction
              </div>
            )}

            {/* Counter-clockwise arrow */}
            <div style={{ marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#0F1C3F" strokeWidth="2.5">
                <path d="M 12 8 A 14 14 0 1 1 8 20" strokeLinecap="round"/>
                <polyline points="12,3 12,9 6,9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SpinDots total={SPINS_PER_PHASE} recorded={SPINS_PER_PHASE} label="Phase 1 — Clockwise ✓" />
              <SpinDots total={SPINS_PER_PHASE} recorded={phase2Recorded} label="Phase 2 — Counter-clockwise" />
            </div>

            <div style={{ marginTop: 24 }}>
              <Btn variant="secondary" onClick={handleExitRequest}>Exit calibration</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── STEP 5: Done ── */}
      {step === 5 && (
        <Modal>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>Calibration complete</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 20px' }}>
              The wheel has calculated and saved the new calibration.
            </p>
            <div style={{
              textAlign: 'left', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
              padding: '14px 16px', marginBottom: 28, fontSize: 13, color: '#92400E', lineHeight: 1.6,
            }}>
              ⚠ <strong>Restart required before launching a campaign.</strong> The wheel's control program will
              silently refuse every spin until it is restarted. Unplug and replug the wheel's power (or power-cycle
              the Raspberry Pi) now, then wait for it to reconnect before starting a campaign.
            </div>
            <Btn onClick={() => { send('Free'); setInCalibration(false); exit(); }}>Back to dashboard</Btn>
          </div>
        </Modal>
      )}

      {/* ── Cancel warning popup ── */}
      {showCancelWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 36px', width: 420, boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#0F172A' }}>Cancel calibration?</h3>
                <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                  Returning to the home page will cancel the calibration procedure. All progress will be lost.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setShowCancelWarning(false)}>Continue calibration</Btn>
              <Btn variant="danger" onClick={handleConfirmExit}>Cancel & exit</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Background content (visible when no modal) */}
      {step === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', marginTop: 120 }}>
          <p style={{ color: '#64748B', fontSize: 14 }}>Confirm above to start the calibration procedure.</p>
        </div>
      )}
    </div>
  );
}