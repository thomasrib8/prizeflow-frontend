import { useEffect, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let scriptLoadingPromise = null;

function loadGsiScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return scriptLoadingPromise;
}

// Google's ID token is a JWT — decoding the payload client-side is fine here
// since we only use it to prefill the form (not for access control), so no
// server-side signature verification is needed.
function decodeIdToken(credential) {
  const payload = credential.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

/// Purely a convenience prefill — not required to play. Google gives us a
/// verified name/email, saving the guest from typing it, but they can always
/// fill the form manually instead. Renders nothing if VITE_GOOGLE_CLIENT_ID
/// isn't configured (see .env.example for setup instructions).
export default function GoogleSignInButton({ onCredential }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID || !buttonRef.current) return;
    let cancelled = false;

    loadGsiScript().then(() => {
      if (cancelled || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onCredential(decodeIdToken(response.credential)),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard', theme: 'outline', size: 'large', width: 260, text: 'continue_with',
      });
    }).catch(() => {
      // Google's script failed to load (offline, blocked, etc.) — the guest
      // still has the manual form, so just leave the button area empty.
    });

    return () => { cancelled = true; };
  }, [onCredential]);

  if (!CLIENT_ID) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div ref={buttonRef} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        <span style={{ fontSize: 12, color: '#94A3B8' }}>or fill in manually</span>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
      </div>
    </div>
  );
}
