import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useWheelSocket } from '../hooks/useWheelSocket';

// Full rotation in position units (empirical — ~400 units = 360°)
const FULL_ROT = 400;
const SPINS_PER_PHASE = 10; // 10 spins × 2 phases = 20 total

// ─── Wheel SVG ───────────────────────────────────────────────────────────────
function WheelSVG({ positionAngle }) {
  const cx = 160, cy = 160, r = 130;
  const sections = 12;
  const sectionAngle = 360 / sections;

  // Build section paths (sections 1-12 clockwise, 1 at top)
  const paths = Array.from({ length: sections }, (_, i) => {
    const startAngle = (i * sectionAngle - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * sectionAngle - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return { x1, y1, x2, y2, startAngle, endAngle };
  });

  // Dot positions (on rim at each section boundary)
  const dots = Array.from({ length: sections }, (_, i) => {
    const a = (i * sectionAngle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  // Section number label positions (center of each section)
  const labels = Array.from({ length: sections }, (_, i) => {
    const a = ((i + 0.5) * sectionAngle - 90) * (Math.PI / 180);
    const lr = r * 0.68;
    return { x: cx + lr * Math.cos(a), y: cy + lr * Math.sin(a), num: i + 1 };
  });

  // Golden cleat: fixed at top, between section 12 and 1 (at -90° = top)
  const goldAngle = -90 * (Math.PI / 180);
  const goldOuter = { x: cx + (r + 20) * Math.cos(goldAngle), y: cy + (r + 20) * Math.sin(goldAngle) };
  const goldInner = { x: cx + (r - 10) * Math.cos(goldAngle), y: cy + (r - 10) * Math.sin(goldAngle) };
  const goldBall = { x: cx + (r + 8) * Math.cos(goldAngle), y: cy + (r + 8) * Math.sin(goldAngle) };

  // Red cleat: moves with positionAngle (degrees from top, clockwise)
  const redDeg = positionAngle != null ? positionAngle : 0;
  const redRad = (redDeg - 90) * (Math.PI / 180);
  const redOuter = { x: cx + (r + 20) * Math.cos(redRad), y: cy + (r + 20) * Math.sin(redRad) };
  const redInner = { x: cx + r * Math.cos(redRad), y: cy + r * Math.sin(redRad) };

  return (
    <svg viewBox="0 0 320 320" style={{ width: 220, height: 220 }}>
      {/* Wheel rim */}
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#111" strokeWidth="2" />

      {/* Section spokes */}
      {paths.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x1} y2={p.y1} stroke="#111" strokeWidth="1.5" />
      ))}

      {/* Section numbers */}
      {labels.map((l, i) => (
        <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central"
          fontSize="18" fontWeight="900" fontFamily="Arial Black, sans-serif" fill="#111"
          transform={`rotate(${(i + 0.5) * sectionAngle}, ${l.x}, ${l.y})`}>
          {l.num}
        </text>
      ))}

      {/* Rim dots at section boundaries */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="5" fill="#111" />
      ))}

      {/* Center hub */}
      <circle cx={cx} cy={cy} r="5" fill="#111" />

      {/* Golden cleat (fixed at top, between 12 and 1) */}
      <line x1={goldOuter.x} y1={goldOuter.y} x2={goldInner.x} y2={goldInner.y}
        stroke="#8B4513" strokeWidth="4" strokeLinecap="round" />
      <circle cx={goldBall.x} cy={goldBall.y} r="6" fill="#C9A84C" />

      {/* Red cleat (live position) */}
      <line x1={redOuter.x} y1={redOuter.y} x2={redInner.x} y2={redInner.y}
        stroke="#8B0000" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

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
export default function Calibration() {
  const navigate = useNavigate();
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [step, setStep] = useState(0); // 0=confirm, 1=step1, 2=step2, 3=phase1 spins, 4=phase2 spins, 5=done
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastCalLaunch, setLastCalLaunch] = useState(0);
  const [spinMsg, setSpinMsg] = useState('');

  // Convert currentPos to display angle (0° = top, clockwise)
  const posAngle = wheelStatus ? ((wheelStatus.currentPos % FULL_ROT) / FULL_ROT) * 360 : 0;

  // Track calLaunch changes to show "Spin recording" message
  const calLaunch = wheelStatus ? Number(wheelStatus.calLaunch) || 0 : 0;

  useEffect(() => {
    if (calLaunch > lastCalLaunch && step >= 3) {
      setLastCalLaunch(calLaunch);
      setSpinMsg('Spin recording…');
      const t = setTimeout(() => setSpinMsg(''), 1500);
      return () => clearTimeout(t);
    }
  }, [calLaunch, lastCalLaunch, step]);

  // Auto-advance phase 1 -> phase 2
  useEffect(() => {
    if (step === 3 && calLaunch >= SPINS_PER_PHASE) setStep(4);
  }, [calLaunch, step]);

  // Auto-advance phase 2 -> done
  useEffect(() => {
    if (step === 4 && calLaunch >= SPINS_PER_PHASE * 2) setStep(5);
  }, [calLaunch, step]);

  async function send(command) {
    setBusy(true);
    setError('');
    try { await api.wheelCommand(command); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function handleConfirmEntry() {
    await send('Cal');
    setStep(1);
  }

  async function handleStep1Confirm() {
    await send('CalIndex0');
    setStep(2);
  }

  async function handleStep2Confirm() {
    await send('CalIndex1');
    setLastCalLaunch(0);
    setStep(3);
  }

  function handleExitRequest() {
    if (step > 0 && step < 5) {
      setShowCancelWarning(true);
    } else {
      navigate('/');
    }
  }

  function handleConfirmExit() {
    send('Free');
    setShowCancelWarning(false);
    setStep(0);
    navigate('/');
  }

  // Phase dots: phase1 = spins 0-9, phase2 = spins 10-19
  const phase1Recorded = Math.min(calLaunch, SPINS_PER_PHASE);
  const phase2Recorded = Math.max(0, calLaunch - SPINS_PER_PHASE);

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
          {step > 0 && step < 5 && (
            <button onClick={handleExitRequest} style={{
              background: 'none', border: '1px solid #E2E8F0', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit',
            }}>Exit calibration</button>
          )}
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {/* ── STEP 0: Confirm entry popup ── */}
      {step === 0 && (
        <Modal>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="#2563EB"/></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>Wheel Calibration</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 28px' }}>
              You are about to start the calibration procedure. This operation takes approximately <strong>10 minutes</strong> and will recalibrate the wheel's section detection.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Btn variant="secondary" onClick={() => navigate('/')}>Cancel</Btn>
              <Btn onClick={handleConfirmEntry} disabled={busy || !agentConnected}>
                {busy ? 'Starting…' : 'Start calibration'}
              </Btn>
            </div>
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

            {spinMsg && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14, animation: 'fadeIn 0.2s ease' }}>
                ● Spin recording
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

            {spinMsg && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                ● Spin recording
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#0F1C3F" strokeWidth="2.5">
                <path d="M 28 8 A 14 14 0 1 0 32 20" strokeLinecap="round"/>
                <polyline points="28,3 28,9 34,9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SpinDots total={SPINS_PER_PHASE} recorded={SPINS_PER_PHASE} label="Phase 1" />
              <SpinDots total={SPINS_PER_PHASE} recorded={phase2Recorded} label="Phase 2" />
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
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 28px' }}>
              The wheel has been successfully calibrated. You can now return to the dashboard and start a campaign.
            </p>
            <Btn onClick={() => { setStep(0); navigate('/'); }}>Back to dashboard</Btn>
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
          <p style={{ color: '#64748B', fontSize: 14 }}>Click "Calibration" in the sidebar to start the calibration procedure.</p>
        </div>
      )}
    </div>
  );
}
