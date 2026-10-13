// Plays a tutorial's steps over the real app (tutorial mode only — mounted by App.jsx when ?demo=1).
// The parent page (pages/TutorialPlayer.jsx) sets the tutorial in the URL and talks to us with postMessage:
//   parent -> here: tuto:pause, tuto:resume, tuto:speed {value}
//   here -> parent: tuto:ready, tuto:meta {total}, tuto:step {index}, tuto:end
// Jumping to a step reloads the frame with ?from=N: the steps before N are replayed instantly (no cursor, no
// waiting) so the app is in exactly the state the viewer expects, then step N plays normally.
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_PARAMS } from './demo';
import { createGhost } from './ghost';
import { getTutorial } from './tutorials';

const CANCEL = Symbol('cancel');
const sleepRaw = (ms) => new Promise((r) => setTimeout(r, ms));

function nativeSet(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}

export default function TutorialRunner() {
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;

  useEffect(() => {
    const ghost = createGhost();
    let run = 0; let paused = false; let speed = DEMO_PARAMS.speed; let release = null;
    const post = (msg) => { try { window.parent.postMessage(msg, '*'); } catch { /* standalone */ } };

    const gate = async (id) => {
      if (id !== run) throw CANCEL;
      while (paused) { await new Promise((r) => { release = r; }); if (id !== run) throw CANCEL; }
    };

    function makeCtx(id, fast) {
      const sleep = async (ms) => { await gate(id); await sleepRaw(fast ? Math.min(ms, 40) : ms / speed); await gate(id); };
      const find = (target) => (typeof target === 'function' ? target() : document.querySelector(target));
      const waitFor = async (target, timeout = 6000) => {
        const t0 = Date.now();
        for (;;) {
          await gate(id);
          const el = find(target);
          if (el) return el;
          if (Date.now() - t0 > timeout) throw new Error(`[tutorial] element not found: ${typeof target === 'function' ? 'fn' : target}`);
          await sleepRaw(60);
        }
      };
      const ctx = {
        fast,
        sleep,
        waitFor,
        async go(path, settle = 500) { await gate(id); navRef.current(path); await sleep(settle); },
        async move(target, { dx = 0.5, dy = 0.55 } = {}) {
          const el = await waitFor(target);
          el.scrollIntoView({ block: 'center', behavior: fast ? 'auto' : 'smooth' });
          await sleep(fast ? 0 : 380);
          const r = el.getBoundingClientRect();
          ghost.highlight(fast ? null : r);
          await gate(id);
          await ghost.moveTo(r.left + r.width * dx, r.top + r.height * dy, { instant: fast, speed });
          return el;
        },
        // Shows an element without touching it (the ring pulses on it)
        async point(target, ms = 1400) { const el = await ctx.move(target); await sleep(ms); ghost.highlight(null); return el; },
        async click(target, opts) {
          const el = await ctx.move(target, opts);
          await gate(id);
          await ghost.click(fast);
          ghost.highlight(null);
          el.click();
          await sleep(350);
          return el;
        },
        async type(target, text, perChar = 45) {
          const el = await ctx.move(target);
          el.focus();
          if (fast) { nativeSet(el, text); return el; }
          let cur = '';
          for (const ch of text) { await gate(id); cur += ch; nativeSet(el, cur); await sleepRaw(perChar / speed); }
          await sleep(250);
          ghost.highlight(null);
          return el;
        },
        async select(target, value) {
          const el = await ctx.move(target);
          await ghost.click(fast);
          nativeSet(el, value);
          ghost.highlight(null);
          await sleep(300);
          return el;
        },
      };
      return ctx;
    }

    async function play(from) {
      const tuto = getTutorial(DEMO_PARAMS.tuto);
      if (!tuto) { console.warn(`[tutorial] unknown tutorial "${DEMO_PARAMS.tuto}"`); return; }
      const id = ++run;
      post({ type: 'tuto:meta', total: tuto.steps.length });
      try {
        for (let i = 0; i < tuto.steps.length; i += 1) {
          await gate(id);
          const fast = i < from;
          if (!fast) post({ type: 'tuto:step', index: i });
          const ctx = makeCtx(id, fast);
          try { await tuto.steps[i].run(ctx); } catch (e) { if (e === CANCEL) throw e; console.error(`[tutorial] step ${i} failed:`, e); }
          if (!fast) await ctx.sleep(700);
        }
        post({ type: 'tuto:end' });
      } catch (e) { if (e !== CANCEL) throw e; }
    }

    function onMessage(e) {
      const d = e.data || {};
      if (d.type === 'tuto:pause') paused = true;
      else if (d.type === 'tuto:resume') { paused = false; if (release) { const r = release; release = null; r(); } }
      else if (d.type === 'tuto:speed') speed = Math.min(4, Math.max(0.5, Number(d.value) || 1));
    }
    window.addEventListener('message', onMessage);
    post({ type: 'tuto:ready' });
    if (DEMO_PARAMS.autoplay) play(DEMO_PARAMS.from);
    else post({ type: 'tuto:step', index: DEMO_PARAMS.from });

    return () => { run += 1; window.removeEventListener('message', onMessage); if (release) release(); ghost.destroy(); };
  }, []);

  return null;
}
