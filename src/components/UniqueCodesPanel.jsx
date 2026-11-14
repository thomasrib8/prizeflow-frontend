import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';

// The merchant's unique codes of ONE gift (a case or a variant): import (paste or CSV) with a preview, counters against the stock, and the
// list of codes. Before activation the list can be replaced; afterwards codes can only be added, corrected or removed one by one.
// Same split as the server's parser (a pasted list or a CSV): one code per line, several allowed with ; , or tab.
export function parseCodesLocally(text) {
  const items = []; let empty = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) { empty += 1; continue; }
    for (const part of line.split(/[;,\t]/)) { const c = part.trim().replace(/^["']|["']$/g, '').trim(); if (c) items.push(c); }
  }
  const seen = new Map(); const valid = []; const dups = [];
  for (const c of items) { const k = c.toLowerCase(); if (seen.has(k)) { seen.set(k, seen.get(k) + 1); continue; } seen.set(k, 1); valid.push(c); }
  for (const [k, n] of seen) if (n > 1) dups.push({ code: valid.find((c) => c.toLowerCase() === k), times: n });
  return { valid, dups, empty };
}

// Before the draft is saved the gift does not exist on the server yet: the list is only STAGED here and is imported as soon as the draft is saved.
function StagedCodes({ stock, label, staged, onStage }) {
  const { t } = useTranslation('admin');
  const r = parseCodesLocally(staged);
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onStage(String(reader.result || ''));
    reader.readAsText(f);
  };
  const ok = r.valid.length === stock && stock > 0 && r.dups.length === 0;
  return (
    <div className="uc-panel">
      <div className="uc-head">
        <b>{t('uniqueCodes.panelTitle', { label })}</b>
        <span className={`uc-count ${ok ? 'ok' : 'ko'}`}>{t('uniqueCodes.count', { imported: r.valid.length, stock })}</span>
      </div>
      <p className="ap-hint" style={{ margin: '2px 0 8px' }}>{t('uniqueCodes.stagedHelp', { stock })}</p>
      <textarea rows={5} value={staged || ''} placeholder={t('uniqueCodes.pastePlaceholder')} onChange={(e) => onStage(e.target.value)} style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
      <div className="uc-actions">
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>{t('uniqueCodes.chooseFile')}<input type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={onFile} /></label>
        {staged && <button type="button" className="uc-link" onClick={() => onStage('')}>{t('uniqueCodes.clear')}</button>}
      </div>
      {(staged || '').trim() && (
        <div className="uc-preview-box">
          <div><b>{r.valid.length}</b> {t('uniqueCodes.pvValid')}{r.valid.length > 0 && <span className="uc-sample"> ({r.valid.slice(0, 5).join(', ')}{r.valid.length > 5 ? '…' : ''})</span>}</div>
          {r.empty > 0 && <div className="uc-warn">{t('uniqueCodes.pvEmpty', { n: r.empty })}</div>}
          {r.dups.length > 0 && <div className="uc-bad">{t('uniqueCodes.pvDuplicates', { list: r.dups.map((d) => `${d.code} ×${d.times}`).join(', ') })}</div>}
          {r.valid.length !== stock && stock > 0 && <div className="uc-warn">{t('uniqueCodes.pvCountHint', { n: r.valid.length, stock })}</div>}
          <div className="uc-saveat">{t('uniqueCodes.willBeSaved')}</div>
        </div>
      )}
    </div>
  );
}

export default function UniqueCodesPanel({ campaignId, slotIndex, variantId = null, stock, label, draft, onChanged = () => {}, persisted = true, staged = '', onStage = () => {} }) {
  if (!persisted) return <StagedCodes stock={stock} label={label} staged={staged} onStage={onStage} />;
  return <PersistedCodes campaignId={campaignId} slotIndex={slotIndex} variantId={variantId} stock={stock} label={label} draft={draft} onChanged={onChanged} />;
}

function PersistedCodes({ campaignId, slotIndex, variantId = null, stock, label, draft, onChanged = () => {} }) {
  const { t } = useTranslation('admin');
  const [info, setInfo] = useState(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [codes, setCodes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await api.getCampaignCodes(campaignId);
      setInfo(r.targets.find((x) => x.slotIndex === slotIndex && (x.variantId || null) === (variantId || null)) || { imported: 0, available: 0, assigned: 0 });
      if (codes) setCodes((await api.listCampaignCodes(campaignId, slotIndex, variantId)).codes);
    } catch (e) { setError(e.message); }
  }, [campaignId, slotIndex, variantId, codes]);
  useEffect(() => { load(); }, [campaignId, slotIndex, variantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = (mode) => ({ slotIndex, variantId: variantId || undefined, text, mode });
  const wrap = async (fn) => { setBusy(true); setError(''); setDone(''); try { await fn(); } catch (e) { setError(e.message); if (e.analysis) setPreview(e.analysis); } finally { setBusy(false); } };

  const doPreview = () => wrap(async () => setPreview(await api.previewCampaignCodes(campaignId, body(draft ? 'replace' : 'add'))));
  const doImport = (mode) => wrap(async () => {
    const r = await api.importCampaignCodes(campaignId, body(mode));
    setText(''); setPreview(null); setDone(t('uniqueCodes.imported', { n: r.imported }));
    await load(); onChanged();
  });
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result || '')); setPreview(null); };
    reader.readAsText(f);
  };
  const toggleList = () => wrap(async () => { if (codes) setCodes(null); else setCodes((await api.listCampaignCodes(campaignId, slotIndex, variantId)).codes); });
  const saveEdit = () => wrap(async () => { await api.updateCampaignCode(campaignId, editing.id, editing.code); setEditing(null); await load(); });
  const remove = (c) => wrap(async () => { await api.deleteCampaignCode(campaignId, c.id); await load(); onChanged(); });

  const imported = info ? info.imported : 0;
  const ok = imported === stock && stock > 0;
  return (
    <div className="uc-panel">
      <div className="uc-head">
        <b>{t('uniqueCodes.panelTitle', { label })}</b>
        <span className={`uc-count ${ok ? 'ok' : 'ko'}`}>{t('uniqueCodes.count', { imported, stock })}</span>
        {info && info.assigned > 0 && <span className="uc-chip">{t('uniqueCodes.assignedN', { n: info.assigned })}</span>}
        {info && <span className="uc-chip">{t('uniqueCodes.availableN', { n: info.available })}</span>}
      </div>
      <p className="ap-hint" style={{ margin: '2px 0 8px' }}>{draft ? t('uniqueCodes.mustMatch', { stock }) : t('uniqueCodes.afterActivation')}</p>
      {error && <div className="error-banner" style={{ margin: '0 0 8px' }}>{error}</div>}
      {done && <div className="ap-info" style={{ margin: '0 0 8px', padding: '6px 10px' }}>{done}</div>}
      <textarea rows={4} value={text} placeholder={t('uniqueCodes.pastePlaceholder')} onChange={(e) => { setText(e.target.value); setPreview(null); }} style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
      <div className="uc-actions">
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>{t('uniqueCodes.chooseFile')}<input type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={onFile} /></label>
        <Button type="button" size="sm" variant="secondary" disabled={busy || !text.trim()} onClick={doPreview}>{t('uniqueCodes.previewBtn')}</Button>
      </div>
      {preview && (
        <div className="uc-preview-box">
          <div><b>{preview.validCount}</b> {t('uniqueCodes.pvValid')}{preview.sample.length > 0 && <span className="uc-sample"> ({preview.sample.join(', ')}{preview.validCount > preview.sample.length ? '…' : ''})</span>}</div>
          {preview.emptyLines > 0 && <div className="uc-warn">{t('uniqueCodes.pvEmpty', { n: preview.emptyLines })}</div>}
          {preview.duplicatesInList.length > 0 && <div className="uc-bad">{t('uniqueCodes.pvDuplicates', { list: preview.duplicatesInList.map((d) => `${d.code} ×${d.times}`).join(', ') })}</div>}
          {preview.alreadyLoaded.length > 0 && <div className="uc-bad">{t('uniqueCodes.pvLoaded', { list: preview.alreadyLoaded.slice(0, 8).join(', ') })}</div>}
          {preview.tooLong.length > 0 && <div className="uc-bad">{t('uniqueCodes.pvTooLong')}</div>}
          <div className="uc-actions" style={{ marginTop: 8 }}>
            {draft && <Button type="button" size="sm" disabled={busy || !preview.validCount || preview.duplicatesInList.length > 0 || preview.alreadyLoaded.length > 0} onClick={() => doImport('replace')}>{t('uniqueCodes.replaceBtn')}</Button>}
            <Button type="button" size="sm" variant={draft ? 'secondary' : 'primary'} disabled={busy || !preview.validCount || preview.duplicatesInList.length > 0 || preview.alreadyLoaded.length > 0} onClick={() => doImport('add')}>{t('uniqueCodes.addBtn')}</Button>
          </div>
        </div>
      )}
      <button type="button" className="uc-link" onClick={toggleList}>{codes ? t('uniqueCodes.hideList') : t('uniqueCodes.showList', { n: imported })}</button>
      {codes && (
        <table className="data-table uc-table">
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  {editing && editing.id === c.id ? <input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} style={{ width: 160 }} /> : c.code}
                </td>
                <td>{c.status === 'assigned' ? <span className="uc-chip ok">{t('uniqueCodes.given')}</span> : <span className="uc-chip">{t('uniqueCodes.free')}</span>}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.status === 'assigned' ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : (c.position === null ? t('uniqueCodes.unbound') : '')}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {c.status === 'available' && (editing && editing.id === c.id
                    ? <><Button type="button" size="sm" disabled={busy} onClick={saveEdit}>{t('common.save')}</Button> <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</Button></>
                    : <><button type="button" className="uc-link" onClick={() => setEditing({ id: c.id, code: c.code })}>{t('uniqueCodes.edit')}</button> <button type="button" className="uc-link danger" onClick={() => remove(c)}>{t('uniqueCodes.remove')}</button></>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
