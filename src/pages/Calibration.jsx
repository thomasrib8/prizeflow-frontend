import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
              background: i < recorded ? '#09B2FD' : '#CBD5E1',
              color: i < recorded ? 'white' : '#94A3B8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, transition: 'background 0.3s',
            }}>{i + 1}</div>
            {i < total - 1 && <div style={{ width: 12, height: 2, background: i < recorded - 1 ? '#09B2FD' : '#E2E8F0', borderRadius: 1 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal overlay wrapper ────────────────────────────────────────────────────
function Modal({ children, wide }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ '--modal-w': wide ? '700px' : '460px' }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', disabled }) {
  const styles = {
    primary: { background: '#09B2FD', color: '#03041A' },
    secondary: { background: 'white', color: '#03041A', border: '1px solid #E2E8F0' },
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
  const { t } = useTranslation('admin');
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
      setInterruptedMessage(t('calibration.interruptedMsgIndexInvalid'));
    } else if (droppedFrom === 'CalRun') {
      setInterruptedMessage(t('calibration.interruptedMsgCalRun'));
    } else {
      setInterruptedMessage(t('calibration.interruptedMsgDefault'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCalibration, wheelState]);

  // "Spin recorded" flash
  useEffect(() => {
    if (calLaunch > lastCalLaunch && wheelState === 'CalRun') {
      setLastCalLaunch(calLaunch);
      setSpinMsg(t('calibration.spinRecorded'));
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

  const stepTitles = { 1: t('calibration.step1Of4'), 2: t('calibration.step2Of4'), 3: t('calibration.step3Of4'), 4: t('calibration.step4Of4') };

  return (
    <div>
      {/* Page base — always visible behind modals */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('calibration.pageTitle')}</h1>
          <p className="page-subtitle">{t('calibration.pageSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`badge badge-${agentConnected ? 'green' : 'red'}`}>
            {agentConnected ? t('pwa.wheelReady') : t('pwa.wheelOffline')}
          </span>
          {(step > 0 || step === -1) && step < 5 && (
            <button onClick={handleExitRequest} style={{
              background: 'none', border: '1px solid #E2E8F0', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit',
            }}>{t('calibration.exitBtn')}</button>
          )}
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {/* ── STEP -1: Transitioning between states ── */}
      {step === -1 && (
        <Modal>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⟳</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: '#03041A' }}>{t('calibration.transitioningTitle')}</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 6px' }}>
              {t('calibration.transitioningDesc')}
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>{t('calibration.wheelStateLabel', { state: wheelState || '—' })}</p>
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
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: '#03041A' }}>{t('calibration.interruptedTitle')}</h2>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 28px' }}>
                  {interruptedMessage}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <Btn variant="secondary" onClick={() => { setInterruptedMessage(''); exit(); }}>{t('common.cancel')}</Btn>
                  <Btn onClick={handleConfirmEntry} disabled={busy || !agentConnected}>
                    {busy ? t('calibration.restartingBtn') : t('calibration.restartCalibrationBtn')}
                  </Btn>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#09B2FD" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="#09B2FD"/></svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: '#03041A' }}>{t('calibration.wheelCalibrationTitle')}</h2>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 28px' }}>
                  {t('calibration.entryDescPrefix')} <strong>{t('calibration.entryDescBold')}</strong> {t('calibration.entryDescSuffix')}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <Btn variant="secondary" onClick={() => exit()}>{t('common.cancel')}</Btn>
                  <Btn onClick={handleConfirmEntry} disabled={busy || !agentConnected}>
                    {busy ? t('calibration.startingBtn') : t('calibration.startCalibrationBtn')}
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
          <div className="cal-step-grid">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#09B2FD', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{stepTitles[1]} {t('calibration.definingSection1')}</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#03041A' }}>{t('calibration.positionCleatTitle')}</h2>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, margin: '0 0 28px' }}>
                {t('calibration.positionCleatDescPrefix')} <strong>{t('calibration.section1Bold')}</strong> {t('calibration.positionCleatDescMiddle')} <strong>{t('calibration.section1And12Bold')}</strong>.
                <br /><br />
                {t('calibration.verticalWarningPrefix')} <strong>{t('calibration.verticalBold')}</strong> {t('calibration.verticalWarningSuffix')}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Btn variant="secondary" onClick={handleExitRequest}>{t('common.cancel')}</Btn>
                <Btn onClick={handleStep1Confirm} disabled={busy}>
                  {busy ? '…' : t('calibration.confirmPositionBtn')}
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
          <div className="cal-step-grid">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#09B2FD', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{stepTitles[2]} {t('calibration.definingSection1')}</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#03041A' }}>{t('calibration.repositionCleatTitle')}</h2>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, margin: '0 0 28px' }}>
                {t('calibration.positionCleatDescPrefix')} <strong>{t('calibration.section1Bold')}</strong> {t('calibration.positionCleatDescMiddle')} <strong>{t('calibration.section1And2Bold')}</strong>.
                <br /><br />
                {t('calibration.verticalWarningPrefix')} <strong>{t('calibration.verticalBold')}</strong> {t('calibration.verticalWarningSuffix')}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Btn variant="secondary" onClick={handleExitRequest}>{t('common.cancel')}</Btn>
                <Btn onClick={handleStep2Confirm} disabled={busy}>
                  {busy ? '…' : t('calibration.confirmPositionBtn')}
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
            <div style={{ fontSize: 11, fontWeight: 700, color: '#09B2FD', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{stepTitles[3]}</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 4px', color: '#03041A', letterSpacing: '-0.01em' }}>1</h2>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 24px', color: '#03041A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t('calibration.spinClockwiseTitle')}</h3>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <WheelSVG positionAngle={posAngle} />
            </div>

            {isRecording && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                {t('calibration.recordingInProgress')}
              </div>
            )}
            {spinMsg && !isRecording && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                {spinMsg}
              </div>
            )}
            {!isRecording && !spinMsg && wheelState !== 'CalRun' && (
              <div style={{ fontSize: 12, color: '#EF4444', background: '#FEF2F2', padding: '6px 14px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                {t('calibration.waitingForCalMode', { state: wheelState || '—' })}
              </div>
            )}
            {!isRecording && !spinMsg && wheelState === 'CalRun' && (
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
                {t('calibration.spinHardClockwise')}
              </div>
            )}

            {/* Clockwise arrow */}
            <div style={{ marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#09B2FD" strokeWidth="2.5">
                <path d="M 28 8 A 14 14 0 1 0 32 20" strokeLinecap="round"/>
                <polyline points="28,3 28,9 34,9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SpinDots total={SPINS_PER_PHASE} recorded={phase1Recorded} label={t('calibration.phase1Label')} />
              <SpinDots total={SPINS_PER_PHASE} recorded={0} label={t('calibration.phase2Label')} />
            </div>

            <div style={{ marginTop: 24 }}>
              <Btn variant="secondary" onClick={handleExitRequest}>{t('calibration.exitBtn')}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── STEP 4: Phase 2 spins (FENETRE 4) ── */}
      {step === 4 && (
        <Modal wide>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#09B2FD', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{stepTitles[4]}</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 4px', color: '#03041A', letterSpacing: '-0.01em' }}>2</h2>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 24px', color: '#03041A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t('calibration.spinCounterClockwiseTitle')}</h3>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <WheelSVG positionAngle={posAngle} />
            </div>

            {isRecording && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                {t('calibration.recordingInProgress')}
              </div>
            )}
            {spinMsg && !isRecording && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '8px 18px', borderRadius: 20, display: 'inline-block', marginBottom: 14 }}>
                {spinMsg}
              </div>
            )}
            {!isRecording && !spinMsg && wheelState === 'CalRun' && (
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
                {t('calibration.spinHardCounterClockwise')}
              </div>
            )}

            {/* Counter-clockwise arrow */}
            <div style={{ marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#09B2FD" strokeWidth="2.5">
                <path d="M 12 8 A 14 14 0 1 1 8 20" strokeLinecap="round"/>
                <polyline points="12,3 12,9 6,9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SpinDots total={SPINS_PER_PHASE} recorded={SPINS_PER_PHASE} label={t('calibration.phase1ClockwiseDoneLabel')} />
              <SpinDots total={SPINS_PER_PHASE} recorded={phase2Recorded} label={t('calibration.phase2CounterClockwiseLabel')} />
            </div>

            <div style={{ marginTop: 24 }}>
              <Btn variant="secondary" onClick={handleExitRequest}>{t('calibration.exitBtn')}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── STEP 5: Done ── */}
      {step === 5 && (
        <Modal>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#03041A' }}>{t('calibration.calibrationCompleteTitle')}</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 20px' }}>
              {t('calibration.calibrationCompleteDesc')}
            </p>
            <div style={{
              textAlign: 'left', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
              padding: '14px 16px', marginBottom: 28, fontSize: 13, color: '#92400E', lineHeight: 1.6,
            }}>
              ⚠ <strong>{t('calibration.restartRequiredBold')}</strong> {t('calibration.restartRequiredText')}
            </div>
            <Btn onClick={() => { send('Free'); setInCalibration(false); exit(); }}>{t('calibration.backToDashboardBtn')}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Cancel warning popup ── */}
      {showCancelWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 36px', width: 420, maxWidth: '92vw', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#03041A' }}>{t('calibration.cancelCalibrationTitle')}</h3>
                <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                  {t('calibration.cancelCalibrationDesc')}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setShowCancelWarning(false)}>{t('calibration.continueCalibrationBtn')}</Btn>
              <Btn variant="danger" onClick={handleConfirmExit}>{t('calibration.cancelExitBtn')}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Background content (visible when no modal) */}
      {step === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', marginTop: 120 }}>
          <p style={{ color: '#64748B', fontSize: 14 }}>{t('calibration.confirmAboveHint')}</p>
        </div>
      )}
    </div>
  );
}