// One tutorial: the steps on the left, the real application replaying them on the right (an <iframe> of this very
// app in tutorial mode — see src/tutorial/). The frame is told what to play through its URL and reports its progress
// with postMessage; jumping to a step reloads the frame at that step.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../hooks/useAdmin';
import { getTutorial, tutorialText } from '../tutorial/tutorials';
import './tutorials.css';

const SIZES = { desktop: { w: 1280, h: 780 }, phone: { w: 390, h: 800 } };
const SPEEDS = [0.75, 1, 1.5, 2];

// **bold** only: the tutorial texts are our own fixed strings
function Rich({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

export default function TutorialPlayer() {
  const { id } = useParams();
  const { t, i18n } = useTranslation('admin');
  const { isAdmin } = useAdmin();
  const tuto = getTutorial(id);
  const lang = (i18n.language || 'fr').slice(0, 2);
  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(0.6);
  const [current, setCurrent] = useState(0);
  const [from, setFrom] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loaded, setLoaded] = useState(false);

  const size = SIZES[tuto?.device] || SIZES.desktop;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.min(1, el.clientWidth / size.w));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.w, tuto]);

  useEffect(() => {
    function onMessage(e) {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const d = e.data || {};
      if (d.type === 'tuto:step') { setCurrent(d.index); setEnded(false); }
      else if (d.type === 'tuto:end') { setEnded(true); setPlaying(false); }
      else if (d.type === 'tuto:ready') setLoaded(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const post = useCallback((msg) => { try { frameRef.current?.contentWindow?.postMessage(msg, '*'); } catch { /* frame not ready */ } }, []);

  const jump = useCallback((index) => { setFrom(index); setCurrent(index); setEnded(false); setPlaying(true); setLoaded(false); setRunKey((k) => k + 1); }, []);
  function togglePlay() {
    if (ended) { jump(0); return; }
    post({ type: playing ? 'tuto:pause' : 'tuto:resume' });
    setPlaying(!playing);
  }
  function changeSpeed(v) { setSpeed(v); post({ type: 'tuto:speed', value: v }); }

  if (!tuto || (tuto.admin && !isAdmin)) return <Navigate to="/tutorials" replace />;
  const txt = tutorialText(tuto, lang);
  const total = txt.steps.length;
  const src = `${tuto.start}?demo=1&lang=${i18n.language ? i18n.language.slice(0, 2) : 'fr'}&tuto=${tuto.id}&from=${from}&speed=${speed}${isAdmin && tuto.admin ? '&role=admin' : ''}`;

  return (
    <div className="tuto-player">
      <div className="tuto-top">
        <Link to="/tutorials" className="tuto-back">← {t('tutorials.backToList')}</Link>
        <h1 className="page-title" style={{ margin: '6px 0 2px' }}>{txt.title}</h1>
        <p className="page-subtitle">{txt.summary}</p>
      </div>

      <div className="tuto-layout">
        <aside className="tuto-steps" aria-label={t('tutorials.stepsLabel')}>
          <ol>
            {txt.steps.map((s, i) => (
              <li key={i} className={`tuto-step${i === current ? ' active' : ''}${i < current ? ' done' : ''}`}>
                <button type="button" onClick={() => jump(i)} aria-current={i === current ? 'step' : undefined}>
                  <span className="tuto-step-n">{i + 1}</span>
                  <span className="tuto-step-title">{s.title}</span>
                </button>
                {i === current && <p className="tuto-step-text"><Rich text={s.text} /></p>}
              </li>
            ))}
          </ol>
          {ended && <div className="tuto-finished">✓ {t('tutorials.finished')}</div>}
        </aside>

        <section className="tuto-stage-wrap">
          <div className="tuto-stage" ref={stageRef}>
            <div className={`tuto-browser tuto-${tuto.device}`} style={{ width: size.w * scale, height: size.h * scale }}>
              {!loaded && <div className="tuto-loading">{t('common.loading')}</div>}
              <iframe
                key={runKey}
                ref={frameRef}
                title={txt.title}
                src={src}
                style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: '0 0' }}
              />
            </div>
          </div>
          <div className="tuto-controls">
            <button type="button" className="tuto-btn" onClick={() => jump(Math.max(0, current - 1))} disabled={current === 0} aria-label={t('tutorials.previous')}>⏮</button>
            <button type="button" className="tuto-btn main" onClick={togglePlay} aria-label={ended ? t('tutorials.replay') : playing ? t('tutorials.pause') : t('tutorials.play')}>{ended ? '↻' : playing ? '⏸' : '▶'}</button>
            <button type="button" className="tuto-btn" onClick={() => jump(Math.min(total - 1, current + 1))} disabled={current >= total - 1} aria-label={t('tutorials.next')}>⏭</button>
            <span className="tuto-progress">{t('tutorials.stepOf', { n: current + 1, total })}</span>
            <select className="tuto-speed" value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} aria-label={t('tutorials.speed')}>
              {SPEEDS.map((v) => <option key={v} value={v}>{v}×</option>)}
            </select>
          </div>
          <p className="tuto-note">{t('tutorials.demoNote')}</p>
        </section>
      </div>
    </div>
  );
}
