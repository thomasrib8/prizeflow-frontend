// The "ghost" cursor and highlight ring drawn over the real screens in tutorial mode. Pure DOM (no React), so it
// survives route changes: one instance for the whole tutorial.
const CSS = `
#tuto-ghost { position: fixed; left: 0; top: 0; z-index: 2147483000; pointer-events: none; will-change: transform;
  transition: transform var(--tuto-dur, 600ms) cubic-bezier(.22,.8,.25,1); filter: drop-shadow(0 3px 5px rgba(3,4,26,.35)); }
#tuto-ghost svg { display: block; transition: transform .12s; transform-origin: 3px 2px; }
#tuto-ghost.pressed svg { transform: scale(.85); }
#tuto-ring { position: fixed; z-index: 2147482999; pointer-events: none; border: 3px solid #09B2FD; border-radius: 10px;
  box-shadow: 0 0 0 6px rgba(9,178,253,.22); opacity: 0; transition: left .3s, top .3s, width .3s, height .3s, opacity .25s; }
#tuto-ring.on { opacity: 1; animation: tuto-pulse 1.4s ease-in-out infinite; }
@keyframes tuto-pulse { 50% { box-shadow: 0 0 0 10px rgba(9,178,253,.08); } }
.tuto-ripple { position: fixed; z-index: 2147483001; pointer-events: none; width: 16px; height: 16px; border-radius: 50%;
  border: 3px solid #09B2FD; background: rgba(9,178,253,.25); transform: translate(-50%,-50%) scale(.4); opacity: .95; animation: tuto-ripple .6s ease-out forwards; }
@keyframes tuto-ripple { to { transform: translate(-50%,-50%) scale(3.4); opacity: 0; } }
`;
const ARROW = '<svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true"><path d="M3 2 L3 24 L9 19 L13 28 L17 26.5 L13 17.5 L21 17 Z" fill="#fff" stroke="#03041A" stroke-width="2" stroke-linejoin="round"/></svg>';

export function createGhost() {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const cursor = document.createElement('div'); cursor.id = 'tuto-ghost'; cursor.innerHTML = ARROW; document.body.appendChild(cursor);
  const ring = document.createElement('div'); ring.id = 'tuto-ring'; document.body.appendChild(ring);
  let x = window.innerWidth * 0.62; let y = window.innerHeight * 0.7;
  cursor.style.transition = 'none'; cursor.style.transform = `translate(${x - 3}px, ${y - 2}px)`;
  requestAnimationFrame(() => { cursor.style.transition = ''; });

  return {
    get pos() { return { x, y }; },
    // Moves the pointer tip to (nx, ny). Longer trips take a bit longer, like a hand would.
    async moveTo(nx, ny, { instant = false, speed = 1, dur: fixed = null } = {}) {
      const dist = Math.hypot(nx - x, ny - y);
      const dur = instant ? 0 : fixed !== null ? Math.round(fixed / speed) : Math.round(Math.min(1100, 320 + dist * 0.9) / speed);
      cursor.style.setProperty('--tuto-dur', `${dur}ms`);
      x = nx; y = ny;
      cursor.style.transform = `translate(${nx - 3}px, ${ny - 2}px)`;
      if (dur) await new Promise((r) => setTimeout(r, dur + 30));
    },
    // Holds the button down (drag) / lets go
    press(on) { cursor.classList.toggle('pressed', !!on); },
    async click(instant) {
      if (instant) return;
      cursor.classList.add('pressed');
      const r = document.createElement('div'); r.className = 'tuto-ripple'; r.style.left = `${x}px`; r.style.top = `${y}px`; document.body.appendChild(r);
      setTimeout(() => r.remove(), 700);
      await new Promise((res) => setTimeout(res, 140));
      cursor.classList.remove('pressed');
    },
    highlight(rect) {
      if (!rect) { ring.classList.remove('on'); return; }
      const pad = 4;
      ring.style.left = `${rect.left - pad}px`; ring.style.top = `${rect.top - pad}px`;
      ring.style.width = `${rect.width + pad * 2}px`; ring.style.height = `${rect.height + pad * 2}px`;
      ring.classList.add('on');
    },
    destroy() { cursor.remove(); ring.remove(); style.remove(); },
  };
}
