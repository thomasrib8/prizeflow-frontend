// Admin, on a client's page: "Mettre en service" — the step-by-step commissioning of a rental (wheel, Spark-Local Wi-Fi,
// wheel configuration, box activation, final checks + printable handover sheet). Every step reads the REAL state from the
// server, so closing the assistant and coming back resumes where things stand; nothing is kept in the browser.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { IS_DEMO } from '../tutorial/demo';
import { Button } from './ui';
import { useConfirm } from './ConfirmDialog';
import { SSID, SETUP_PAGE, wifiString } from './WifiQrSheet';
import './wifi-qr.css';
import './setup-wizard.css';

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4', 'step5'];
const PSK_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const WHEEL_COMMAND = "pbpaste | ssh pi@realtimepi.local 'bash -s'";

function suggestPassword() {
  const pick = (n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => PSK_ALPHABET[v % PSK_ALPHABET.length]).join('');
  return `Spark-${pick(4)}-${pick(4)}`;
}
const pwError = (pw, pw2, t) => {
  if (pw.length < 8 || pw.length > 63 || !/^[\x20-\x7e]+$/.test(pw)) return t('setupWizard.errLen');
  if (pw !== pw2) return t('setupWizard.errMatch');
  return '';
};
const fmt = (s) => (s ? new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

function Row({ selected, onClick, children }) {
  return (
    <div className={`sw-row${selected ? ' sel' : ''}`} onClick={onClick} role="radio" aria-checked={!!selected} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
      <span className="sw-radio" aria-hidden="true">{selected ? '●' : '○'}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Check({ ok, label, note }) {
  return (
    <div className="sw-check">
      <span className={ok ? 'ok' : 'wait'} aria-hidden="true">{ok ? '✓' : '…'}</span>
      <span>{label}</span>
      {!ok && note ? <span className="sw-note">{note}</span> : null}
    </div>
  );
}

export default function SetupWizard({ userId, onClose, onChanged, inline = false }) {
  const { t } = useTranslation('admin');
  const [confirm, confirmDialog] = useConfirm();
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [wheels, setWheels] = useState([]);
  const [me, setMe] = useState(null);
  const [info, setInfo] = useState(null);
  const [overview, setOverview] = useState(null);

  // step 1 — wheel
  const [mode, setMode] = useState(null); // keep | park | new
  const [pick, setPick] = useState('');
  const [showRented, setShowRented] = useState(false);
  const [newMode, setNewMode] = useState('gen');
  const [series, setSeries] = useState('1');
  const [typed, setTyped] = useState({ model: 'PF-ALPHA-V1', serial: '', key: '' });
  // step 2 — Wi-Fi
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwShow, setPwShow] = useState(false);
  const [pwExisting, setPwExisting] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  // step 3 / 4
  const [copied, setCopied] = useState('');
  const [script, setScript] = useState('');
  const [fresh, setFresh] = useState(null);
  const [qrWifi, setQrWifi] = useState('');
  const [qrSetup, setQrSetup] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const loadDetail = useCallback(async () => { const d = await api.getUserDetail(userId); if (alive.current) setDetail(d); return d; }, [userId]);
  const loadWheels = useCallback(async () => { const w = await api.listWheels(); if (alive.current) setWheels(w); return w; }, []);
  const loadInfo = useCallback(async () => { try { const i = await api.getBoxActivation(userId); if (alive.current) setInfo(i); } catch { /* shown by the next action */ } }, [userId]);
  const loadOverview = useCallback(async () => { try { const o = await api.getUserOverview(userId); if (alive.current) setOverview(o); } catch { /* idem */ } }, [userId]);

  useEffect(() => {
    (async () => {
      try {
        const [d, w] = await Promise.all([loadDetail(), loadWheels()]);
        api.getProfile().then((p) => alive.current && setMe(p && p.user ? p.user : p)).catch(() => {});
        loadOverview();
        // Resume where things stand: no wheel -> 1; no Wi-Fi password -> 2; box not activated -> 3; everything done -> checks
        let bi = null;
        try { bi = await api.getBoxActivation(userId); if (alive.current) setInfo(bi); } catch { /* the steps show it */ }
        if (alive.current && d.wheel_serial_number) setN(!(bi && bi.wifiSet) ? 1 : bi.state === 'activated' ? 4 : 2);
        setMode(d.wheel_serial_number ? 'keep' : (w.some((x) => x.status === 'available') ? 'park' : 'new'));
        const r = await api.getBoxWifiForClient(userId);
        if (!alive.current) return;
        if (r.password) { setPw(r.password); setPw2(r.password); setPwExisting(true); } else { const s = suggestPassword(); setPw(s); setPw2(s); }
      } catch (e) { setError(e.message); }
    })();
  }, [userId, loadDetail, loadWheels, loadInfo, loadOverview]);

  // live state while the person works on the wheel / the box
  useEffect(() => {
    if (n < 2) return undefined;
    const id = setInterval(() => { loadInfo(); loadOverview(); }, 4000);
    return () => clearInterval(id);
  }, [n, loadInfo, loadOverview]);

  useEffect(() => {
    if (inline) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, inline]);

  const serial = detail && detail.wheel_serial_number;
  const boxName = (info && info.boxName) || (serial && /(\d{6})$/.test(serial) ? `spark-box-${/(\d{6})$/.exec(serial)[1]}` : '');
  const owner = useCallback((w) => (w.owner ? (w.owner.company || w.owner.name || w.owner.email) : ''), []);
  const available = useMemo(() => wheels.filter((w) => w.status === 'available'), [wheels]);
  const rented = useMemo(() => wheels.filter((w) => w.status === 'rented' && (!w.owner || w.owner.id !== userId)), [wheels, userId]);
  const picked = wheels.find((w) => w.id === pick) || null;
  const clientLabel = detail ? (detail.company || detail.name || detail.email) : '';

  useEffect(() => {
    if (n !== 4 || !pw) return;
    QRCode.toDataURL(wifiString(SSID, pw), { errorCorrectionLevel: 'M', margin: 1, width: 720 }).then(setQrWifi).catch(() => {});
    QRCode.toDataURL(SETUP_PAGE, { errorCorrectionLevel: 'M', margin: 1, width: 720 }).then(setQrSetup).catch(() => {});
  }, [n, pw]);

  async function next() {
    setError('');
    if (n === 0) {
      setBusy(true);
      try {
        if (mode === 'park') {
          if (!picked) { setError(t('setupWizard.pickFirst')); return; }
          if (picked.owner && !(await confirm(t('park.confirmReassign', { from: owner(picked) }), { danger: true, confirmLabel: t('park.reassignBtn') }))) { setBusy(false); return; }
          await api.assignWheel(picked.id, userId);
        } else if (mode === 'new') {
          if (newMode === 'gen') await api.generateWheelIdentity(userId, series);
          else await api.recordWheelIdentity(userId, typed.model, typed.serial, typed.key);
        }
        await Promise.all([loadDetail(), loadWheels()]);
        loadInfo();
        onChanged && onChanged();
      } catch (e) { setError(e.message); return; } finally { setBusy(false); }
    }
    if (n === 1) {
      const m = pwError(pw, pw2, t);
      if (m) { setError(m); return; }
      setBusy(true);
      try { await api.setBoxWifiForClient(userId, pw); setPwExisting(true); await loadInfo(); } catch (e) { setError(e.message); return; } finally { setBusy(false); }
    }
    if (n === 4) { onChanged && onChanged(); if (!inline) onClose(); return; }
    setN((v) => Math.min(4, v + 1));
  }

  async function copyBlock() {
    setBusy(true); setError(''); setCopied('');
    try {
      const r = await api.getWheelScript(userId);
      setScript(r.script);
      if (IS_DEMO) setCopied('ok'); // tutorial mode: nothing is written to the viewer's clipboard
      else try { await navigator.clipboard.writeText(r.script); setCopied('ok'); } catch { setCopied('manual'); }
    } catch (e) { setError(e.code === 'NO_SERIAL' ? t('userDetail.boxActivation.noSerial') : e.message); } finally { setBusy(false); }
  }

  async function createCode() {
    setBusy(true); setError('');
    try { const r = await api.prepareBoxActivation(userId); setFresh({ code: r.code, expiresAt: r.expiresAt }); await loadInfo(); }
    catch (e) { setError(e.code === 'NO_SERIAL' ? t('userDetail.boxActivation.noSerial') : e.message); } finally { setBusy(false); }
  }

  const wheelConnected = !!(overview && overview.wheel && overview.wheel.connected);
  const liveSerial = overview && overview.wheel && overview.wheel.identity && overview.wheel.identity.serialNumber;
  const identityOk = wheelConnected && !!serial && liveSerial === serial;
  const state = info ? info.state : null;
  const activated = state === 'activated';
  const stage = activated ? 3 : state === 'delivered' ? 2 : state === 'pending' ? 1 : 0;
  const perr = pwTouched ? pwError(pw, pw2, t) : '';
  const phone = me && me.phone;

  return (
    <>
    {confirmDialog}
    <div className={inline ? 'sw-inline-wrap' : 'sw-overlay'} onMouseDown={inline ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={inline ? 'sw-card sw-card-inline' : 'sw-card'} role={inline ? undefined : 'dialog'} aria-modal={inline ? undefined : 'true'} aria-label={t('setupWizard.title')}>
        <div className="sw-head">
          <div>
            <div className="sw-title">{t('setupWizard.title')}</div>
            <div className="sw-sub">{clientLabel}{detail && detail.email && clientLabel !== detail.email ? ` · ${detail.email}` : ''}</div>
          </div>
          {!inline && <button type="button" className="sw-x" onClick={onClose} aria-label={t('park.closeBtn')}>✕</button>}
        </div>

        <div className="sw-steps">
          {STEP_KEYS.map((k, i) => (
            <button type="button" key={k} className={`sw-pill${i === n ? ' on' : i < n ? ' ok' : ''}`} onClick={() => { if (i < n) setN(i); }}>
              <b>{i < n ? '✓' : i + 1}</b> {t(`setupWizard.${k}`)}
            </button>
          ))}
        </div>

        <div className="sw-body">
          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
          {!detail && !error && <p className="page-subtitle">{t('common.loading')}</p>}

          {detail && n === 0 && (
            <>
              {serial && (
                <Row selected={mode === 'keep'} onClick={() => setMode('keep')}>
                  <div style={{ fontWeight: 500 }}>{t('setupWizard.keepWheel')}</div>
                  <div className="sw-mono">{serial}{boxName ? ` · ${boxName}` : ''}</div>
                </Row>
              )}
              <div className="sw-two">
                <Row selected={mode === 'park'} onClick={() => setMode('park')}>
                  <div style={{ fontWeight: 500 }}>{t('setupWizard.pathPark')}</div>
                  <div className="sw-sub">{t('setupWizard.pathParkSub')}</div>
                </Row>
                <Row selected={mode === 'new'} onClick={() => setMode('new')}>
                  <div style={{ fontWeight: 500 }}>{t('setupWizard.pathNew')}</div>
                  <div className="sw-sub">{t('setupWizard.pathNewSub')}</div>
                </Row>
              </div>

              {mode === 'park' && (
                <>
                  <div className="sw-label">{t('setupWizard.availableTitle')}</div>
                  {available.length === 0 && <p className="sw-sub">{t('setupWizard.noneAvailable')}</p>}
                  {available.map((w) => (
                    <Row key={w.id} selected={pick === w.id} onClick={() => setPick(w.id)}>
                      <div className="sw-mono">{w.serialNumber}</div>
                      <div className="sw-sub">{t('setupWizard.boxFree', { name: w.box ? w.box.name : '—' })}</div>
                    </Row>
                  ))}
                  <label className="sw-inline"><input type="checkbox" checked={showRented} onChange={(e) => setShowRented(e.target.checked)} /> {t('setupWizard.showRented')}</label>
                  {showRented && rented.map((w) => (
                    <div key={w.id}>
                      <Row selected={pick === w.id} onClick={() => setPick(w.id)}>
                        <div className="sw-mono">{w.serialNumber}</div>
                        <div className="sw-sub">{t('setupWizard.boxOf', { client: owner(w), name: w.box ? w.box.name : '—' })}</div>
                      </Row>
                      {pick === w.id && <div className="sw-warn">{t('setupWizard.rentedWarn', { client: owner(w) })}</div>}
                    </div>
                  ))}
                </>
              )}

              {mode === 'new' && (
                <>
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
              )}
            </>
          )}

          {detail && n === 1 && (
            <div className="sw-wifi">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sw-sub" style={{ marginBottom: 6 }}>{t('setupWizard.wifiIntro')}</div>
                {pwExisting && !pwTouched && <div className="sw-sub" style={{ color: 'var(--green)' }}>{t('setupWizard.alreadySet')}</div>}
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
                <div className="sw-sub">{activated ? t('setupWizard.changeWarn') : t('setupWizard.laterWarn')}</div>
              </div>
            </div>
          )}

          {detail && n === 2 && (
            <>
              <div className="sw-sub">{t('setupWizard.wheelIntro', { serial: serial || '—' })}</div>
              <div className="sw-label">{t('setupWizard.copyStep')}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" disabled={busy || !serial} onClick={copyBlock}>{copied === 'ok' ? t('setupWizard.copied') : t('setupWizard.copyBtn')}</Button>
                <span className="sw-sub">{t('setupWizard.secretWarn')}</span>
              </div>
              {copied === 'manual' && <div className="sw-warn">{t('setupWizard.copyManual')}</div>}
              {script && <pre className="sw-pre">{script}</pre>}
              <div className="sw-label">{t('setupWizard.runStep')}</div>
              <div className="sw-code">{WHEEL_COMMAND}</div>
              <div className="sw-label">{t('setupWizard.liveStep')}</div>
              <div className={`sw-status${identityOk ? ' ok' : wheelConnected ? ' bad' : ''}`}>
                {identityOk ? t('setupWizard.wheelOk') : wheelConnected ? t('setupWizard.wheelBadId', { serial: liveSerial || '?' }) : t('setupWizard.waiting')}
              </div>
              <div className="sw-sub" style={{ marginTop: 8 }}>{t('setupWizard.noReply')}</div>
            </>
          )}

          {detail && n === 3 && (
            <>
              <div className="sw-sub">{t('setupWizard.boxIntro', { name: boxName || '—' })}</div>
              {activated && <div className="sw-status ok" style={{ marginTop: 10 }}>{t('setupWizard.alreadyActive')}</div>}
              {fresh && !activated && (
                <div className="sw-codebox">
                  <div className="sw-codebig">{fresh.code}</div>
                  <div className="sw-sub">{t('setupWizard.codeOnce')} {t('setupWizard.validUntil', { date: fmt(fresh.expiresAt) })}</div>
                </div>
              )}
              {!fresh && !activated && ['pending', 'delivered'].includes(state) && <div className="sw-warn">{t('setupWizard.codeLost')}</div>}
              <div style={{ marginTop: 10 }}>
                <Button variant={activated ? 'secondary' : 'primary'} size="sm" disabled={busy || !serial} onClick={createCode}>
                  {activated ? t('setupWizard.redo') : fresh || ['pending', 'delivered'].includes(state) ? t('setupWizard.newCode') : t('setupWizard.createCode')}
                </Button>
              </div>
              {(fresh || ['pending', 'delivered'].includes(state)) && !activated && (
                <ul className="sw-ol">
                  <li>{t('setupWizard.instr1')}</li>
                  <li>{t('setupWizard.instr2')} <span className="sw-code inline">http://sparkoffline-box.local/activate</span></li>
                  <li>{t('setupWizard.instr3')}</li>
                </ul>
              )}
              <div className="sw-timeline">
                {['tl1', 'tl2', 'tl3'].map((k, i) => (
                  <span key={k} className={`sw-tag${stage >= i + 1 ? ' ok' : ''}`}>{stage >= i + 1 ? '✓ ' : ''}{t(`setupWizard.${k}`)}</span>
                ))}
              </div>
            </>
          )}

          {detail && n === 4 && (
            <>
              <Check ok={wheelConnected} label={t('setupWizard.checkWheel')} />
              <Check ok={identityOk} label={t('setupWizard.checkIdentity', { serial: serial || '—' })} />
              <Check ok={!!(info && info.wifiSet)} label={t('setupWizard.checkWifi')} />
              <Check ok={activated} label={t('setupWizard.checkBox', { name: boxName || '—' })} />
              <Check ok={!!(info && info.box && info.box.inSync)} label={t('setupWizard.checkSync')} note={t('setupWizard.syncPending')} />

              <div className="sw-label" style={{ marginTop: 16 }}>{t('setupWizard.sheetTitle')}</div>
              <div className="sw-sheet-row">
                <div id="handover-sheet" className="wq-sheet">
                  <div className="wq-sheet-brand">SPARK</div>
                  <h2>{clientLabel}</h2>
                  <div className="wq-qrs">
                    <figure>
                      <div className="wq-qr">{qrWifi ? <img src={qrWifi} alt="QR Wi-Fi" /> : null}</div>
                      <figcaption><b>1</b> {t('settings.offlineMode.sheetStep1')}</figcaption>
                    </figure>
                    <figure>
                      <div className="wq-qr">{qrSetup ? <img src={qrSetup} alt="QR" /> : null}</div>
                      <figcaption><b>2</b> {t('settings.offlineMode.sheetStep2')}</figcaption>
                    </figure>
                  </div>
                  <table className="wq-creds">
                    <tbody>
                      <tr><th>{t('setupWizard.sheetWheel')}</th><td className="wq-mono">{serial || '—'}</td></tr>
                      <tr><th>{t('setupWizard.sheetBox')}</th><td className="wq-mono">{boxName || '—'}</td></tr>
                      <tr><th>{t('settings.offlineMode.sheetNetwork')}</th><td>{SSID}</td></tr>
                      <tr><th>{t('settings.offlineMode.sheetPassword')}</th><td className="wq-mono">{pw || '—'}</td></tr>
                    </tbody>
                  </table>
                  <p className="wq-open">{t('setupWizard.sheetApp')} <strong>sparkoff.box</strong>{phone ? <> · {t('setupWizard.sheetSupport')} <strong>{phone}</strong></> : null}</p>
                </div>
                <div>
                  <Button variant="secondary" size="sm" type="button" onClick={() => window.print()}>{t('setupWizard.printBtn')}</Button>
                  {!phone && <div className="sw-sub" style={{ marginTop: 8 }}>{t('setupWizard.noPhone')}</div>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sw-foot">
          <Button variant="ghost" type="button" style={{ visibility: n ? 'visible' : 'hidden' }} onClick={() => { setError(''); setN((v) => Math.max(0, v - 1)); }}>{t('setupWizard.back')}</Button>
          <span className="sw-sub">{n === 2 && !identityOk ? t('setupWizard.continueAnyway') : ''}</span>
          <Button type="button" disabled={busy || !detail || (n === 0 && !mode)} onClick={next}>{n === 4 ? t('setupWizard.finish') : t('setupWizard.next')}</Button>
        </div>
      </div>
    </div>
    </>
  );
}
