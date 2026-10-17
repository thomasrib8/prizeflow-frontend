// Admin, Parc hardware: "Préparer un pack" — the one-time technical setup of a pack (wheel + offline box + TP-Link):
// identity, fixed Spark-Local password, wheel configuration block, box activation, then the manual TP-Link steps.
// Every step reads the REAL state from the server (api.getPackState), so closing the assistant and coming back resumes
// where things stand. Attribution to clients is a separate, much shorter flow (the client's page).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { IS_DEMO } from '../tutorial/demo';
import { Button } from './ui';
import { WHEEL_COMMAND, suggestPassword, pwError, fmt, Check } from './wizardParts';
import './setup-wizard.css';

// Screens in order. The box takes the kit's TP-Link Wi-Fi at its activation (the activation page has a "Wi-Fi du kit" field), so the
// TP-Link is prepared BEFORE the box is activated.
const STEPS = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'];
const ID = ['wheel', 'spark', 'tp1', 'block', 'tp2', 'box', 'final'];
const LAST = STEPS.length - 1;

// A screen of the TP-Link guidance: instructions with tick boxes, nothing is sent anywhere.
function Guide({ items, ticks, onTick, intro }) {
  return (
    <>
      {intro && <div className="sw-sub" style={{ marginBottom: 6 }}>{intro}</div>}
      {items.map((text, i) => (
        <label key={i} className="sw-row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={!!ticks[i]} onChange={(e) => onTick(i, e.target.checked)} style={{ marginTop: 2 }} />
          <div style={{ flex: 1 }}>{text}</div>
        </label>
      ))}
    </>
  );
}

export default function PackWizard({ wheelId: initialWheelId = null, onClose, onChanged, onLabel }) {
  const { t } = useTranslation('admin');
  const [wheelId, setWheelId] = useState(initialWheelId);
  const [wheel, setWheel] = useState(null);
  const [pack, setPack] = useState(null);
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // step 1 — creating the wheel
  const [newMode, setNewMode] = useState('gen');
  const [series, setSeries] = useState('1');
  const [typed, setTyped] = useState({ model: 'PF-ALPHA-V1', serial: '', key: '' });
  // step 2 — Spark-Local
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwShow, setPwShow] = useState(false);
  const [pwExisting, setPwExisting] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  // step 3 / 4
  const [copied, setCopied] = useState('');
  const [script, setScript] = useState('');
  const [fresh, setFresh] = useState(null);
  // steps 5-7 — TP-Link (manual), confirmed by the person
  const [ticks, setTicks] = useState({ tp1: [], tp2: [], box: [], final: [] });
  const [boxManual, setBoxManual] = useState(false);
  const [done, setDone] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const loadPack = useCallback(async (id = wheelId) => {
    if (!id) return null;
    try { const p = await api.getPackState(id); if (alive.current) setPack(p); return p; } catch (e) { if (alive.current) setError(e.message); return null; }
  }, [wheelId]);

  // Resume where things stand.
  useEffect(() => {
    if (!initialWheelId) return;
    (async () => {
      try {
        const [w, p, r] = await Promise.all([api.getWheel(initialWheelId), api.getPackState(initialWheelId), api.getPackWifi(initialWheelId)]);
        if (!alive.current) return;
        setWheel(w); setPack(p);
        if (r.password) { setPw(r.password); setPw2(r.password); setPwExisting(true); } else { const s = suggestPassword(); setPw(s); setPw2(s); }
        setN(!r.password ? 1 : p.boxActivated ? ID.indexOf('final') : 2);
        if (p.ready) { setN(LAST); setTicks({ tp1: Array(4).fill(true), tp2: Array(5).fill(true), box: Array(3).fill(true), final: [true, true, true] }); } // review of a finished pack
      } catch (e) { setError(e.message); }
    })();
  }, [initialWheelId]);

  // Live state while the person works on the wheel / the box.
  useEffect(() => {
    if (!wheelId || !['block', 'box'].includes(ID[n])) return undefined;
    const id = setInterval(() => loadPack(), 4000);
    return () => clearInterval(id);
  }, [n, wheelId, loadPack]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const serial = wheel && wheel.serialNumber;
  const boxName = (pack && pack.boxName) || (serial && /(\d{6})$/.test(serial) ? `spark-box-${/(\d{6})$/.exec(serial)[1]}` : '');
  const perr = pwTouched ? pwError(pw, pw2, t) : '';
  const activated = !!(pack && pack.boxActivated);
  const boxState = pack ? pack.box.state : null;
  const stage = activated ? 3 : boxState === 'delivered' ? 2 : boxState === 'pending' ? 1 : 0;
  const depot = pack ? pack.depot : null;
  const wheelSeen = !!(depot && depot.seenRecently);
  const identityOk = wheelSeen && depot.identityOk === true;

  const tick = (step, i, v) => setTicks((s) => { const arr = [...(s[step] || [])]; arr[i] = v; return { ...s, [step]: arr }; });
  const allTicked = (step, count) => Array.from({ length: count }, (_, i) => !!(ticks[step] || [])[i]).every(Boolean);

  const guides = {
    tp1: [t('packWizard.tp1a'), t('packWizard.tp1b'), t('packWizard.tp1c'), t('packWizard.tp1d')],
    tp2: [t('packWizard.tp2a'), t('packWizard.tp2b'), t('packWizard.tp2c'), t('packWizard.tp2d'), t('packWizard.tp2e')],
    box: [t('packWizard.tp3c'), t('packWizard.tp3d'), t('packWizard.tp3e')],
  };
  const tplinkConfirmed = ['tp1', 'tp2', 'box'].every((k) => allTicked(k, guides[k].length));

  async function next() {
    setError('');
    if (ID[n] === 'wheel') {
      if (!wheelId) {
        setBusy(true);
        try {
          const w = await api.createWheel(newMode === 'gen' ? { series } : { modelNumber: typed.model, serialNumber: typed.serial, securityKey: typed.key });
          const fullWheel = await api.getWheel(w.id);
          setWheelId(w.id); setWheel(fullWheel);
          const s = suggestPassword(); setPw(s); setPw2(s);
          await loadPack(w.id);
          onChanged && onChanged();
        } catch (e) { setError(e.message); return; } finally { setBusy(false); }
      }
    }
    if (ID[n] === 'spark') {
      const m = pwError(pw, pw2, t);
      if (m) { setError(m); return; }
      setBusy(true);
      try { await api.setPackWifi(wheelId, pw); setPwExisting(true); await loadPack(); } catch (e) { setError(e.message); return; } finally { setBusy(false); }
    }
    if (n === LAST) {
      setBusy(true);
      try { await api.markPackReady(wheelId, boxManual); await loadPack(); setDone(true); onChanged && onChanged(); } catch (e) { setError(e.message); } finally { setBusy(false); }
      return;
    }
    setN((v) => Math.min(LAST, v + 1));
  }

  async function copyBlock() {
    setBusy(true); setError(''); setCopied('');
    try {
      const r = await api.getPackWheelScript(wheelId);
      setScript(r.script);
      if (IS_DEMO) setCopied('ok'); // tutorial mode: nothing is written to the viewer's clipboard
      else try { await navigator.clipboard.writeText(r.script); setCopied('ok'); } catch { setCopied('manual'); }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function createCode() {
    setBusy(true); setError('');
    try { const r = await api.preparePackBox(wheelId); setFresh({ code: r.code, expiresAt: r.expiresAt }); await loadPack(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  // "Continuer" is blocked on the manual screens until everything is ticked, and on the first screen until the wheel can be made.
  const canNext = !busy && (
    ID[n] === 'wheel' ? (!!wheelId || (newMode === 'gen' ? !!series.trim() : !!(typed.serial.trim() && typed.key.trim()))) :
    ['tp1', 'tp2'].includes(ID[n]) ? allTicked(ID[n], guides[ID[n]].length) :
    ID[n] === 'box' ? (activated && allTicked('box', guides.box.length)) :
    ID[n] === 'final' ? (!!pack && pack.sparkPasswordSet && tplinkConfirmed && (activated || boxManual)) : true
  );

  return (
    <div className="sw-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sw-card" role="dialog" aria-modal="true" aria-label={t('packWizard.title')}>
        <div className="sw-head">
          <div>
            <div className="sw-title">{t('packWizard.title')}</div>
            <div className="sw-sub">{serial ? `${serial}${boxName ? ` · ${boxName}` : ''}` : t('packWizard.sub')}</div>
          </div>
          <button type="button" className="sw-x" onClick={onClose} aria-label={t('park.closeBtn')}>✕</button>
        </div>

        {!done && (
          <div className="sw-steps">
            {STEPS.map((k, i) => (
              <button type="button" key={k} className={`sw-pill${i === n ? ' on' : i < n ? ' ok' : ''}`} onClick={() => { if (i < n && wheelId) setN(i); }}>
                <b>{i < n ? '✓' : i + 1}</b> {t(`packWizard.${k}`)}
              </button>
            ))}
          </div>
        )}

        <div className="sw-body">
          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

          {done && (
            <div style={{ textAlign: 'center', padding: '14px 4px' }}>
              <div style={{ fontSize: 34 }} aria-hidden="true">✓</div>
              <div className="sw-title" style={{ marginTop: 6 }}>{t('packWizard.doneTitle')}</div>
              <p className="sw-sub" style={{ margin: '8px auto 0', maxWidth: 420 }}>{t('packWizard.doneText', { serial: serial || '—', box: boxName || '—' })}</p>
              {onLabel && wheel && <div style={{ marginTop: 14 }}><Button variant="secondary" size="sm" type="button" onClick={() => onLabel(wheel)}>{t('packWizard.labelBtn')}</Button></div>}
            </div>
          )}

          {!done && ID[n] === 'wheel' && (
            wheelId ? (
              <>
                <div className="sw-sub">{t('packWizard.existingIntro')}</div>
                <div className="sw-code" style={{ marginTop: 10 }}>{serial || '…'}{boxName ? ` · ${boxName}` : ''}</div>
              </>
            ) : (
              <>
                <div className="sw-sub">{t('packWizard.newIntro')}</div>
                <div className="sw-two" style={{ marginTop: 12 }}>
                  <button type="button" className={`sw-tab${newMode === 'gen' ? ' on' : ''}`} onClick={() => setNewMode('gen')}>{t('park.addGenerate')}</button>
                  <button type="button" className={`sw-tab${newMode === 'typed' ? ' on' : ''}`} onClick={() => setNewMode('typed')}>{t('park.addTyped')}</button>
                </div>
                {newMode === 'gen' ? (
                  <>
                    <div className="sw-label">{t('park.seriesLabel')}</div>
                    <input className="sw-input" value={series} inputMode="numeric" onChange={(e) => setSeries(e.target.value)} />
                    <div className="sw-sub" style={{ marginTop: 6 }}>{t('park.seriesHelp')}</div>
                  </>
                ) : (
                  <>
                    <div className="sw-sub" style={{ marginTop: 10 }}>{t('park.typedHelp')}</div>
                    <div className="sw-label">{t('park.modelLabel')}</div>
                    <input className="sw-input" value={typed.model} onChange={(e) => setTyped({ ...typed, model: e.target.value })} />
                    <div className="sw-label">{t('park.serialLabel')}</div>
                    <input className="sw-input sw-mono" value={typed.serial} placeholder="PF260000152" onChange={(e) => setTyped({ ...typed, serial: e.target.value })} />
                    <div className="sw-label">{t('park.keyLabel')}</div>
                    <input className="sw-input sw-mono" value={typed.key} placeholder="K8Q7F3" onChange={(e) => setTyped({ ...typed, key: e.target.value })} />
                  </>
                )}
              </>
            )
          )}

          {!done && ID[n] === 'spark' && (
            <div className="sw-wifi">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sw-sub" style={{ marginBottom: 6 }}>{t('packWizard.wifiIntro')}</div>
                {pwExisting && !pwTouched && <div className="sw-sub" style={{ color: 'var(--green)' }}>{t('packWizard.alreadySet')}</div>}
                <div className="sw-label">{t('setupWizard.pwLabel')}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="sw-input" style={{ flex: 1 }} type={pwShow ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={pw}
                    onChange={(e) => { setPw(e.target.value); setPwTouched(true); }} />
                  <Button variant="ghost" size="sm" type="button" onClick={() => setPwShow((v) => !v)}>{pwShow ? t('setupWizard.hide') : t('setupWizard.show')}</Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => { const s = suggestPassword(); setPw(s); setPw2(s); setPwTouched(true); }}>{t('setupWizard.generate')}</Button>
                </div>
                <div className="sw-label">{t('setupWizard.pwConfirm')}</div>
                <input className="sw-input" style={{ width: '100%' }} type={pwShow ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={pw2}
                  onChange={(e) => { setPw2(e.target.value); setPwTouched(true); }} />
                <div className="sw-err">{perr}</div>
                <div className="sw-sub">{activated ? t('packWizard.changeWarn') : t('packWizard.laterWarn')}</div>
              </div>
            </div>
          )}

          {!done && ID[n] === 'block' && (
            <>
              <div className="sw-sub">{t('packWizard.wheelIntro', { serial: serial || '—' })}</div>
              <div className="sw-label">{t('setupWizard.copyStep')}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" disabled={busy || !wheelId} onClick={copyBlock}>{copied === 'ok' ? t('setupWizard.copied') : t('setupWizard.copyBtn')}</Button>
                <span className="sw-sub">{t('packWizard.secretWarn')}</span>
              </div>
              {copied === 'manual' && <div className="sw-warn">{t('setupWizard.copyManual')}</div>}
              {script && <pre className="sw-pre">{script}</pre>}
              <div className="sw-label">{t('setupWizard.runStep')}</div>
              <div className="sw-code">{WHEEL_COMMAND}</div>
              <div className="sw-label">{t('setupWizard.liveStep')}</div>
              <div className={`sw-status${identityOk ? ' ok' : wheelSeen ? ' bad' : ''}`}>
                {identityOk ? t('packWizard.wheelOk') : wheelSeen ? t('packWizard.wheelBadId') : t('setupWizard.waiting')}
              </div>
              <div className="sw-sub" style={{ marginTop: 8 }}>{t('packWizard.depotNote')}</div>
              <div className="sw-sub" style={{ marginTop: 4 }}>{t('setupWizard.noReply')}</div>
            </>
          )}

          {!done && ID[n] === 'box' && (
            <>
              <div className="sw-sub">{t('packWizard.boxIntro', { name: boxName || '—' })}</div>
              {activated && <div className="sw-status ok" style={{ marginTop: 10 }}>{t('setupWizard.alreadyActive')}</div>}
              {fresh && !activated && (
                <div className="sw-codebox">
                  <div className="sw-codebig">{fresh.code}</div>
                  <div className="sw-sub">{t('setupWizard.codeOnce')} {t('setupWizard.validUntil', { date: fmt(fresh.expiresAt) })}</div>
                </div>
              )}
              {!fresh && !activated && ['pending', 'delivered'].includes(boxState) && <div className="sw-warn">{t('setupWizard.codeLost')}</div>}
              <div style={{ marginTop: 10 }}>
                <Button variant={activated ? 'secondary' : 'primary'} size="sm" disabled={busy || !wheelId} onClick={createCode}>
                  {activated ? t('setupWizard.redo') : fresh || ['pending', 'delivered'].includes(boxState) ? t('setupWizard.newCode') : t('setupWizard.createCode')}
                </Button>
              </div>
              {(fresh || ['pending', 'delivered'].includes(boxState)) && !activated && (
                <ul className="sw-ol">
                  <li>{t('setupWizard.instr1')}</li>
                  <li>{t('setupWizard.instr2')} <span className="sw-code inline">http://sparkoffline-box.local/activate</span></li>
                  <li>{t('setupWizard.instr3')}</li>
                </ul>
              )}
              <div className="sw-label">{t('packWizard.kitWifiTitle')}</div>
              <div className="sw-sub">{t('packWizard.tp3Intro')}</div>
              <div className="sw-timeline">
                {['tl1', 'tl2', 'tl3'].map((k, i) => (
                  <span key={k} className={`sw-tag${stage >= i + 1 ? ' ok' : ''}`}>{stage >= i + 1 ? '✓ ' : ''}{t(`setupWizard.${k}`)}</span>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <Guide items={guides.box} ticks={ticks.box || []} onTick={(i, v) => tick('box', i, v)} />
              </div>
            </>
          )}

          {!done && ID[n] === 'tp1' && <Guide intro={t('packWizard.tp1Intro')} items={guides.tp1} ticks={ticks.tp1 || []} onTick={(i, v) => tick('tp1', i, v)} />}
          {!done && ID[n] === 'tp2' && <Guide intro={t('packWizard.tp2Intro')} items={guides.tp2} ticks={ticks.tp2 || []} onTick={(i, v) => tick('tp2', i, v)} />}

          {!done && ID[n] === 'final' && (
            <>
              <Check ok={!!(pack && pack.sparkPasswordSet)} label={t('packWizard.checkWifi')} />
              <Check ok={identityOk} label={t('packWizard.checkWheelSeen')} note={t('packWizard.checkOptional')} />
              <Check ok={activated || boxManual} label={t('packWizard.checkBox', { name: boxName || '—' })} />
              <Check ok={tplinkConfirmed} label={t('packWizard.checkTplink')} note={t('packWizard.checkGoBack')} />
              {!activated && (
                <label className="sw-inline"><input type="checkbox" checked={boxManual} onChange={(e) => setBoxManual(e.target.checked)} /> {t('packWizard.boxManual')}</label>
              )}
              <div className="sw-label">{t('packWizard.finalChecks')}</div>
              <Guide items={[t('packWizard.fin1'), t('packWizard.fin2'), t('packWizard.fin3')]} ticks={ticks.final || []} onTick={(i, v) => tick('final', i, v)} />
            </>
          )}
        </div>

        <div className="sw-foot">
          {done
            ? <span />
            : <Button variant="ghost" type="button" style={{ visibility: n ? 'visible' : 'hidden' }} onClick={() => { setError(''); setN((v) => Math.max(0, v - 1)); }}>{t('setupWizard.back')}</Button>}
          <span className="sw-sub">{!done && ID[n] === 'block' && !identityOk ? t('setupWizard.continueAnyway') : ''}</span>
          {done
            ? <Button type="button" onClick={onClose}>{t('packWizard.close')}</Button>
            : <Button type="button" disabled={!canNext || (n === LAST && !allTicked('final', 3))} onClick={next}>{n === LAST ? t('packWizard.finishBtn') : t('setupWizard.next')}</Button>}
        </div>
      </div>
    </div>
  );
}
