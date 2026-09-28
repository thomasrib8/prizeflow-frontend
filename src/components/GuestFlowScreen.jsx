import { useEffect, useRef, useState } from 'react';
import WheelSVG from './WheelSVG';
import DynamicFieldInput from './DynamicFieldInput';
import { API_BASE } from '../api/client';

const RETRY_MESSAGES = {
  SPIN_ABNORMAL_STOP: '⚠ An unexpected stop was detected during the spin. Please spin the wheel again.',
  SPIN_TOO_WEAK: "⚡ Please don't interact with the wheel — spin it again.",
  SPIN_TOO_SHORT: "⏱ The wheel didn't reach the right slot in time. Please spin again.",
};

const SOCIAL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: '📘' },
  { key: 'instagram', label: 'Instagram', icon: '📷' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { key: 'x', label: 'X', icon: '✖️' },
];

const fullScreenLayout = {
  position: 'fixed', inset: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  zIndex: 50, gap: 24, padding: '0 24px', textAlign: 'center',
};

const fullScreenBase = {
  ...fullScreenLayout,
  background: 'linear-gradient(160deg, #0055F8 0%, #266FF9 100%)',
};

// The live queue screen is deliberately a traffic light: red = you have to
// wait, green = you can spin. Solid colors (not gradients) so the change
// between them can be a smooth CSS transition — gradients can't be
// transitioned — with a constant soft highlight layered on top for depth.
const QUEUE_COLORS = { waiting: '#DC2626', active: '#16A34A' };
const queueScreenStyle = (state) => ({
  ...fullScreenLayout,
  backgroundColor: QUEUE_COLORS[state],
  backgroundImage: 'radial-gradient(circle at 50% 28%, rgba(255,255,255,0.20), rgba(255,255,255,0) 62%)',
  transition: 'background-color 0.6s ease',
});

// How long the optional "leave a Google review" screen stays up when it's
// placed BEFORE the game, if the guest neither taps the review button nor
// skips it. Google forbids conditioning a game or reward on leaving a
// review, so this can never block anyone: it just times out into the game.
const REVIEW_GATE_SECONDS = 15;
const REVIEW_OPENED_SAFETY_SECONDS = 180;

const SWIPE_CLOSE_THRESHOLD = 80; // px a 3-finger touch must travel downward to close

function averageTouchY(touches) {
  let sum = 0;
  for (let i = 0; i < touches.length; i++) sum += touches[i].clientY;
  return sum / touches.length;
}

// The optional pre-game review invite. The review page always opens in a
// NEW tab (a plain target=_blank link — the most reliable way to avoid
// popup blockers) so this game tab, and the guest's place in line, stays
// put. Not tapped: moves on by itself after REVIEW_GATE_SECONDS (with no
// visible countdown). Tapped: the timer stops (nothing should change under
// someone who's busy writing a review) and the guest continues as soon as
// they come back to this tab.
function ReviewGate({ url, onContinue }) {
  const [opened, setOpened] = useState(false);
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  useEffect(() => {
    if (opened) return undefined;
    const t = setTimeout(() => continueRef.current(), REVIEW_GATE_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [opened]);

  useEffect(() => {
    if (!opened) return undefined;
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') continueRef.current();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    // No button to fall back on once the review page is open, so if a
    // browser never reports the guest coming back, don't leave them stuck
    // on this screen forever: the game screen is where they'd land on
    // return anyway.
    const safety = setTimeout(() => continueRef.current(), REVIEW_OPENED_SAFETY_SECONDS * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(safety);
    };
  }, [opened]);

  return (
    <div style={fullScreenBase} key="review-gate">
      <style>{`@keyframes reviewFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxWidth: 440, animation: 'reviewFadeIn 0.4s ease' }}>
        <div style={{ fontSize: 44, letterSpacing: 4 }}>⭐⭐⭐⭐⭐</div>
        <div style={{ color: 'white', fontSize: 'clamp(26px, 7vw, 36px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Leave us a Google review!
        </div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 1.5 }}>
          It only takes a minute and helps us a lot. It's completely optional — you'll get to play either way.
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpened(true)}
          style={{
            display: 'inline-block', background: 'white', color: '#002881', textDecoration: 'none', borderRadius: 12,
            padding: '15px 30px', fontSize: 17, fontWeight: 800, fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >{opened ? 'Leave us a Google review' : 'Leave a review'}</a>

        {opened ? (
          <div style={{ color: 'white', fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>
            The review page opened in a new tab. Once you're done, come back to this tab — your game is waiting for you.
          </div>
        ) : (
          <button onClick={onContinue} style={{
            background: 'none', color: 'white', border: 'none', textDecoration: 'underline', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', padding: 8,
          }}>No thanks, continue</button>
        )}
      </div>
    </div>
  );
}

/// Renders the guest queue experience for a given useGuestFlow() state.
/// Shared by the public per-guest page (Guest.jsx) and the staff-triggered
/// kiosk overlay (LaunchCampaign.jsx) — onClose is only passed by the kiosk,
/// which needs a way to back out of the full-screen overlay. Guests aren't
/// meant to see an exit, so it's deliberately not obvious: a hover-only
/// button tucked in the bottom-right corner on desktop, a 3-finger swipe
/// down on touch devices.
export default function GuestFlowScreen({
  view, campaignInfo, form, setForm, error, busy, status, onSubmit, onRestart, onClose,
  onOpenReview, reviewPending = false, onDismissReview,
}) {
  const [hoveringCorner, setHoveringCorner] = useState(false);
  const [reviewClicked, setReviewClicked] = useState(false);

  // Reset the "thanks for reviewing" note once a new guest's form appears
  // (kiosk mode cycles through multiple guests in one overlay session).
  useEffect(() => {
    if (view === 'form') setReviewClicked(false);
  }, [view]);

  useEffect(() => {
    if (!onClose) return undefined;
    let startY = null;

    function handleTouchStart(e) {
      startY = e.touches.length === 3 ? averageTouchY(e.touches) : null;
    }
    function handleTouchMove(e) {
      if (startY === null || e.touches.length !== 3) return;
      if (averageTouchY(e.touches) - startY > SWIPE_CLOSE_THRESHOLD) {
        startY = null;
        onClose();
      }
    }
    function handleTouchEnd() { startY = null; }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClose]);

  const cornerCloseZone = onClose && (
    <div
      onMouseEnter={() => setHoveringCorner(true)}
      onMouseLeave={() => setHoveringCorner(false)}
      style={{
        position: 'fixed', bottom: 0, right: 0, width: 120, height: 120, zIndex: 60,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 18,
      }}
    >
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.95)', color: '#03041A', border: '1px solid #E2E8F0',
          borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          opacity: hoveringCorner ? 1 : 0, pointerEvents: hoveringCorner ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      >Close</button>
    </div>
  );

  if (view === 'loading') {
    return <div style={fullScreenBase}>{cornerCloseZone}<div style={{ color: 'white' }}>Loading…</div></div>;
  }

  if (view === 'no_campaign') {
    return (
      <div style={fullScreenBase}>
        {cornerCloseZone}
        <div style={{ color: 'white', fontSize: 20, fontWeight: 700, maxWidth: 420 }}>
          No campaign is currently running. Please check back later.
        </div>
      </div>
    );
  }

  if (view === 'expired') {
    const expiredMessage =
      status?.status === 'skipped'
        ? "You've been skipped — you can try again right away."
        : status?.status === 'cancelled'
        ? 'Your turn was cancelled by our team.'
        : 'Your turn has timed out.';
    return (
      <div style={fullScreenBase}>
        {cornerCloseZone}
        <div style={{ color: 'white', fontSize: 20, fontWeight: 700, maxWidth: 420, lineHeight: 1.4 }}>
          {expiredMessage}
        </div>
        <button onClick={onRestart} style={{
          background: 'white', color: '#002881', border: 'none', borderRadius: 10,
          padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>Try again</button>
      </div>
    );
  }

  // Pre-game Google review invite — sits on top of whatever the queue
  // state is (the guest is already in line server-side), and only after the
  // expired check above so a cancelled/skipped guest isn't held here.
  if (view === 'queue' && reviewPending && campaignInfo?.googleReviewUrl && onDismissReview) {
    return <ReviewGate url={campaignInfo.googleReviewUrl} onContinue={onDismissReview} />;
  }

  if (view === 'queue' && status) {
    if (status.status === 'done') {
      const result = status.result || {};
      // 'before' campaigns already showed the invite ahead of the game
      // (ReviewGate) — only 'after' ones (the default) show it here.
      const showReviewInvite = !!campaignInfo?.googleReviewRequired && !!campaignInfo?.googleReviewUrl
        && campaignInfo?.googleReviewPosition !== 'before';
      const activeSocialLinks = SOCIAL_PLATFORMS.filter((p) => campaignInfo?.socialLinks?.[p.key]);
      const showSocialInvite = !!campaignInfo?.socialMediaRequired && activeSocialLinks.length > 0;
      return (
        <div style={fullScreenBase} key="done">
          {cornerCloseZone}
          <style>{`
            @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            @keyframes confetti { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(-20px) rotate(15deg)} }
          `}</style>
          <div style={{ fontSize: 56, animation: 'confetti 0.6s ease-in-out infinite alternate' }}>🎉</div>
          <div style={{ color: 'white', maxWidth: 480, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#90DCFE', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Thank you{status.firstName ? `, ${status.firstName}` : ''}!
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.4 }}>
              You will receive an email with your gift.
            </div>
            {!!result.isTest && (
              <div style={{ marginTop: 20, fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', color: '#90DCFE' }}>
                {result.giftName}
              </div>
            )}
          </div>
          {!!result.isTest && <WheelSVG positionAngle={0} size={180} />}

          {/* Purely optional — the gift is already won, this never gates or
              delays anything. Google's review policies forbid conditioning
              any reward on leaving a review, even as an unverified gate. */}
          {showReviewInvite && (
            <div style={{
              marginTop: 12, padding: '16px 20px', borderRadius: 14,
              background: 'rgba(255,255,255,0.08)', maxWidth: 420,
            }}>
              <div style={{ color: 'white', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                ❤️ Did you enjoy your experience? Leave us a review on Google!
              </div>
              <button
                onClick={() => { onOpenReview(); setReviewClicked(true); }}
                style={{
                  background: reviewClicked ? 'rgba(255,255,255,0.15)' : 'white',
                  color: reviewClicked ? '#94A3B8' : '#002881', border: 'none', borderRadius: 10,
                  padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{reviewClicked ? 'Thanks! ✓' : 'Leave a review'}</button>
            </div>
          )}

          {/* Same non-blocking, purely optional treatment as the review
              invite above — only platforms with a link actually set ever
              show a button (see Settings.jsx's Social media tab). */}
          {showSocialInvite && (
            <div style={{
              marginTop: 12, padding: '16px 20px', borderRadius: 14,
              background: 'rgba(255,255,255,0.08)', maxWidth: 420,
            }}>
              <div style={{ color: 'white', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                👋 Follow us on social media!
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {activeSocialLinks.map((p) => (
                  <a
                    key={p.key}
                    href={campaignInfo.socialLinks[p.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'white', color: '#0F1C3F', textDecoration: 'none', borderRadius: 10,
                      padding: '11px 18px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                    }}
                  >{p.icon} {p.label}</a>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Waiting (red) and active (green) share ONE wrapper element on
    // purpose — same type, same position, same key — so React keeps the
    // DOM node alive across the status change and the background color
    // actually animates instead of the whole screen being swapped out.
    if (status.status === 'waiting' || status.status === 'active') {
      const isWaiting = status.status === 'waiting';
      return (
        <div style={queueScreenStyle(status.status)} key="queue-live">
          {cornerCloseZone}
          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes turnPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
            @keyframes queueFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>

          {isWaiting ? (
            <div key="waiting-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, animation: 'queueFadeIn 0.4s ease' }}>
              <img
                src="/stop-hand.svg"
                alt="Stop"
                style={{ width: 'min(52vw, 220px)', height: 'auto', filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.30))' }}
              />
              <div style={{ color: 'white', fontSize: 'clamp(30px, 8vw, 46px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1, maxWidth: 480 }}>
                Wait for your turn!
              </div>
              <div style={{ color: 'white', fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700, maxWidth: 420, lineHeight: 1.35, textWrap: 'balance' }}>
                You are number <span style={{ background: 'rgba(0,0,0,0.25)', padding: '2px 12px', borderRadius: 10, whiteSpace: 'nowrap' }}>#{status.position + 1}</span> in the queue
              </div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 500, maxWidth: 360, lineHeight: 1.5 }}>
                {status.activeFirstName ? `${status.activeFirstName} is currently playing. ` : ''}
                Keep this screen open — it will turn green when it's your turn.
              </div>
            </div>
          ) : (
            <div key="active-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, animation: 'queueFadeIn 0.4s ease' }}>
              {status.retryMessage && RETRY_MESSAGES[status.retryMessage] && (
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white', background: 'rgba(0,0,0,0.28)', padding: '10px 18px', borderRadius: 20, maxWidth: 420, lineHeight: 1.4 }}>
                  {RETRY_MESSAGES[status.retryMessage]}
                </div>
              )}
              {!status.launched ? (
                <>
                  <div style={{ color: 'white', fontSize: 'clamp(22px, 6vw, 32px)', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                    It's your turn!
                  </div>
                  <div style={{
                    color: 'white', fontSize: 'clamp(48px, 15vw, 104px)', fontWeight: 900, letterSpacing: '-0.03em',
                    lineHeight: 1.0, textTransform: 'uppercase', maxWidth: 720, textShadow: '0 6px 24px rgba(0,0,0,0.25)',
                    animation: 'turnPulse 1.4s ease-in-out infinite',
                  }}>
                    Spin the wheel
                  </div>
                </>
              ) : (
                <>
                  <img src="/logo-menu.svg" alt="" style={{ width: 84, height: 84, animation: 'spin 1.2s linear infinite' }} />
                  <div style={{ color: 'white', fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Please wait…
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      );
    }
  }

  // Joined but the first status poll hasn't come back yet (or a resumed
  // session is still being looked up) — without this the form below would
  // flash for a moment right after submitting.
  if (view === 'queue') {
    return <div style={fullScreenBase}>{cornerCloseZone}<div style={{ color: 'white' }}>Loading…</div></div>;
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      {cornerCloseZone}
      <div style={{
        background: 'white', borderRadius: 20, padding: 'clamp(24px, 6vw, 44px)', width: 460, maxWidth: '94vw',
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={campaignInfo?.guestFormLogoUrl ? `${API_BASE}${campaignInfo.guestFormLogoUrl}` : '/logo.svg'}
            alt=""
            style={{ maxWidth: 220, maxHeight: 88, width: 'auto', height: 'auto', marginBottom: 16, objectFit: 'contain' }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#0F172A' }}>Win your reward!</h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>Enter your details below to claim your gift.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>First name</label>
              <input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Last name</label>
              <input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Email address</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>

          {/* Fully customizable per campaign (see routes/campaigns.js's
              campaign_fields, scope='guest') — firstName/lastName/email
              above are the only fields that are always present and required. */}
          {(campaignInfo?.guestFields || []).map((f) => (
            <DynamicFieldInput
              key={f.id}
              field={f}
              value={form.customFields[f.label]}
              onChange={(v) => setForm({ ...form, customFields: { ...form.customFields, [f.label]: v } })}
            />
          ))}

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: '#64748B', cursor: 'pointer', margin: '12px 0 20px', lineHeight: 1.5 }}>
            <input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} style={{ marginTop: 2, flexShrink: 0 }} />
            I agree to receive my reward by email and consent to the processing of my personal data.
          </label>
          <button type="submit" disabled={busy} style={{
            width: '100%', background: '#09B2FD', color: '#03041A', border: 'none',
            borderRadius: 10, padding: '15px', fontSize: 15, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
            fontFamily: 'inherit', letterSpacing: '0.02em',
          }}>
            {busy ? 'PLEASE WAIT…' : 'CHECK AND SPIN THE WHEEL'}
          </button>
        </form>
      </div>
    </div>
  );
}
