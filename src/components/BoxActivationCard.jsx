// Admin, on a client's page: prepare a one-time code to activate that client's event box (see backend routes/boxActivation.js).
// The code is shown once, right after it is created (only a hash is kept on the server).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button } from './ui';

const BOX_ASSISTANT_URL = 'http://sparkoffline-box.local/activate';

function CopyField({ value, label }) {
  const { t } = useTranslation('admin');
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <code style={{ flex: 1, padding: '9px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, wordBreak: 'break-all' }}>{value}</code>
        <Button variant="ghost" onClick={copy}>{done ? t('userDetail.copiedLabel') : t('userDetail.copyLabel')}</Button>
      </div>
    </div>
  );
}

export default function BoxActivationCard({ userId }) {
  const { t } = useTranslation('admin');
  const [info, setInfo] = useState(null);
  const [fresh, setFresh] = useState(null); // { code, expiresAt } — only in memory, right after creation
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wheelScript, setWheelScript] = useState('');
  const [wheelNote, setWheelNote] = useState('');

  const load = useCallback(async () => {
    try { setInfo(await api.getBoxActivation(userId)); } catch (e) { setError(e.message); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  // While a code is waiting, follow what the box does with it.
  useEffect(() => {
    if (!info || !['pending', 'delivered'].includes(info.state)) return undefined;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [info, load]);

  async function prepare() {
    setBusy(true); setError('');
    try { const r = await api.prepareBoxActivation(userId); setFresh({ code: r.code, expiresAt: r.expiresAt }); await load(); }
    catch (e) { setError(e.code === 'NO_SERIAL' ? t('userDetail.boxActivation.noSerial') : e.message); }
    finally { setBusy(false); }
  }
  async function copyWheelBlock() {
    setBusy(true); setError(''); setWheelNote('');
    try {
      const r = await api.getWheelScript(userId);
      try { await navigator.clipboard.writeText(r.script); setWheelNote('copied'); } catch { setWheelNote('manual'); }
      setWheelScript(r.script);
    } catch (e) { setError(e.code === 'NO_SERIAL' ? t('userDetail.boxActivation.noSerial') : e.message); } finally { setBusy(false); }
  }
  async function revoke() {
    setBusy(true); setError('');
    try { await api.revokeBoxActivation(userId); setFresh(null); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const state = info ? info.state : null;
  const expires = info && info.expiresAt ? new Date(String(info.expiresAt).replace(' ', 'T') + 'Z').toLocaleString() : '';
  const badge = { none: ['#64748B', 'stateNone'], pending: ['#92400E', 'statePending'], delivered: ['#92400E', 'stateDelivered'], activated: ['#047857', 'stateActivated'], expired: ['#991B1B', 'stateExpired'], revoked: ['#64748B', 'stateRevoked'] }[state] || ['#64748B', 'stateNone'];

  return (
    <Card title={t('userDetail.boxActivation.title')} className="mt-card">
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px', lineHeight: 1.55 }}>{t('userDetail.boxActivation.desc')}</p>
      {error && <div className="error-banner">{error}</div>}
      {info && !info.hasSerial && <p style={{ fontSize: 13, color: '#92400E', margin: '0 0 12px' }}>{t('userDetail.boxActivation.noSerial')}</p>}
      {info && (
        <p style={{ fontSize: 13, margin: '0 0 6px' }}>
          <strong style={{ color: badge[0] }}>{t(`userDetail.boxActivation.${badge[1]}`)}</strong>
          {info.boxName ? <span style={{ color: '#64748B' }}> · {info.boxName}</span> : null}
          {['pending', 'delivered'].includes(state) && expires ? <span style={{ color: '#64748B' }}> · {t('userDetail.boxActivation.validUntil', { date: expires })}</span> : null}
        </p>
      )}

      {fresh && ['pending', 'delivered'].includes(state) && (
        <div style={{ margin: '12px 0', padding: '14px 16px', background: '#EEF3FF', border: '1px solid #D8E1F3', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>{t('userDetail.boxActivation.codeLabel')}</div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 26, fontWeight: 800, letterSpacing: '0.08em', color: '#0B1437', margin: '4px 0 6px' }}>{fresh.code}</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{t('userDetail.boxActivation.codeOnce')}</div>
        </div>
      )}

      {['pending', 'delivered'].includes(state) && (
        <p style={{ fontSize: 13, margin: '10px 0 0', lineHeight: 1.55 }}>
          {t('userDetail.boxActivation.openHint')}{' '}
          <a href={BOX_ASSISTANT_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#002881', fontWeight: 700 }}>{t('userDetail.boxActivation.openLink')}</a>
        </p>
      )}

      {state === 'activated' && info.fallbackLine && (
        <>
          <p style={{ fontSize: 13, color: '#047857', margin: '8px 0 0' }}>{t('userDetail.boxActivation.activatedHelp')}</p>
          <CopyField value={info.fallbackLine} label={t('userDetail.boxActivation.fallbackLabel')} />
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <Button disabled={busy || (info && !info.hasSerial)} onClick={prepare}>
          {state === 'activated' ? t('userDetail.boxActivation.reactivateBtn') : ['pending', 'delivered'].includes(state) ? t('userDetail.boxActivation.newCodeBtn') : t('userDetail.boxActivation.prepareBtn')}
        </Button>
        {['pending', 'delivered'].includes(state) && <Button variant="secondary" disabled={busy} onClick={revoke}>{t('userDetail.boxActivation.revokeBtn')}</Button>}
      </div>
      {state === 'activated' && <p style={{ fontSize: 12, color: '#94A3B8', margin: '10px 0 0' }}>{t('userDetail.boxActivation.reactivateHint')}</p>}

      <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 16, paddingTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#03041A', marginBottom: 4 }}>{t('userDetail.boxActivation.wheelTitle')}</div>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 10px', lineHeight: 1.55 }}>{t('userDetail.boxActivation.wheelDesc')}</p>
        <Button variant="secondary" disabled={busy || (info && !info.hasSerial)} onClick={copyWheelBlock}>{t('userDetail.boxActivation.wheelBtn')}</Button>
        {wheelNote === 'copied' && <p style={{ fontSize: 12, color: '#047857', margin: '8px 0 0' }}>{t('userDetail.boxActivation.wheelCopied')}</p>}
        {wheelNote === 'manual' && <p style={{ fontSize: 12, color: '#92400E', margin: '8px 0 0' }}>{t('userDetail.boxActivation.wheelManual')}</p>}
        {wheelScript && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 12, color: '#64748B', cursor: 'pointer' }}>{t('userDetail.boxActivation.wheelShow')}</summary>
            <pre style={{ background: '#03041A', color: '#E2E8F0', padding: '10px 12px', borderRadius: 8, fontSize: 11.5, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{wheelScript}</pre>
          </details>
        )}
      </div>
    </Card>
  );
}
