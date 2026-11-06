import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button } from './ui';

const input = { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };
const FIELD_KEYS = { company: 'fieldCompany', legalForm: 'fieldLegalForm', registrationNumber: 'fieldRegistrationNumber', address: 'fieldAddress', city: 'fieldCity', email: 'fieldEmail' };

// Campaign settings: what the game rules need beyond the gifts and the organiser's identity (dates, stand, value of each gift, options).
// The text itself is generated when the campaign starts and published at /rules/<campaign id>.
export default function CampaignRulesConfig({ campaignId, status }) {
  const { t } = useTranslation('admin');
  const [data, setData] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () => api.getRulesConfig(campaignId).then((r) => { setData(r); setCfg({ ...r.config, values: { ...r.config.values } }); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cfg || !data) return error ? <div className="error-banner">{error}</div> : null;
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const archived = status === 'archived';
  const running = status === 'active' || status === 'paused' || status === 'completed';
  const check = (key, label, hint) => (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '8px 0', cursor: 'pointer' }}>
      <input type="checkbox" disabled={archived} checked={!!cfg[key]} onChange={(e) => set({ [key]: e.target.checked })} style={{ marginTop: 3 }} />
      <span style={{ fontSize: 13, color: '#334155' }}>{label}{hint && <span style={{ display: 'block', fontSize: 11.5, color: '#94A3B8' }}>{hint}</span>}</span>
    </label>
  );

  async function save() {
    setBusy(true); setError(''); setMsg('');
    try { await api.saveRulesConfig(campaignId, cfg); setMsg(t('common.saved')); setTimeout(() => setMsg(''), 2500); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function publish() {
    setBusy(true); setError(''); setMsg('');
    try { await api.saveRulesConfig(campaignId, cfg); const r = await api.generateRules(campaignId); setMsg(t('rulesConfig.published', { version: r.version })); await load(); }
    catch (e) { setError(e.code === 'RULES_ORGANIZER_INFO' ? t('rulesConfig.missingOrganizer') : e.message); } finally { setBusy(false); }
  }
  async function preview() {
    setBusy(true); setError('');
    try { await api.saveRulesConfig(campaignId, cfg); const doc = await api.previewRules(campaignId); window.__rulesPreview = doc; const w = window.open('', '_blank'); if (w) { w.document.write(renderPreview(doc)); w.document.close(); } }
    catch (e) { setError(e.code === 'RULES_ORGANIZER_INFO' ? t('rulesConfig.missingOrganizer') : e.message); } finally { setBusy(false); }
  }
  const copyUrl = () => { try { navigator.clipboard.writeText(data.publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* no clipboard */ } };
  const missingLabels = data.missingOrganizer.map((k) => t(`settings.information.${FIELD_KEYS[k] || k}`)).join(', ');
  const filled = data.slots.filter((s) => cfg.values[String(s.slotIndex)] !== undefined && cfg.values[String(s.slotIndex)] !== '');
  // optional: the warning only appears when SOME gifts have a value and others do not
  const missingValues = filled.length === 0 ? [] : data.slots.filter((s) => !filled.includes(s));

  return (
    <Card title={t('rulesConfig.title')} className="mt-card">
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px', lineHeight: 1.6 }}>{t('rulesConfig.intro')}</p>
      {error && <div className="error-banner">{error}</div>}
      {data.missingOrganizer.length > 0 && (
        <div className="ap-warn" style={{ marginBottom: 12 }}>{t('rulesConfig.organizerMissing', { fields: missingLabels })} <Link to="/settings">{t('rulesConfig.openInformation')}</Link></div>
      )}
      {data.published && (
        <div className="ap-info" style={{ marginBottom: 12 }}>
          {t('rulesConfig.publishedAt', { version: data.published.version })}{' '}
          <a href={data.publicUrl} target="_blank" rel="noopener noreferrer">{data.publicUrl}</a>{' '}
          <button type="button" className="uc-link" onClick={copyUrl}>{copied ? t('rulesConfig.copied') : t('rulesConfig.copy')}</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0, flex: 2, minWidth: 220 }}>
          <label>{t('rulesConfig.gameName')}</label>
          <input type="text" maxLength={200} disabled={archived} value={cfg.gameName} placeholder={t('rulesConfig.gameNamePh')} onChange={(e) => set({ gameName: e.target.value })} style={input} />
        </div>
        <div className="field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>{t('rulesConfig.stand')}</label>
          <input type="text" maxLength={120} disabled={archived} value={cfg.standName} placeholder="B12" onChange={(e) => set({ standName: e.target.value })} style={input} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '12px 0' }}>
        {[['startDate', 'startDate', t('rulesConfig.startPh')], ['endDate', 'endDate', t('rulesConfig.endPh')], ['claimDeadline', 'claimDeadline', t('rulesConfig.claimPh')]].map(([k, label, ph]) => (
          <div className="field" key={k} style={{ margin: 0, flex: 1, minWidth: 170 }}>
            <label>{t(`rulesConfig.${label}`)}</label>
            <input type="date" disabled={archived} value={cfg[k]} onChange={(e) => set({ [k]: e.target.value })} style={input} />
            <small style={{ color: '#94A3B8', fontSize: 11.5 }}>{ph}</small>
          </div>
        ))}
        <div className="field" style={{ margin: 0, width: 130 }}>
          <label>{t('rulesConfig.claimDelay')}</label>
          <input type="number" min="1" max="365" disabled={archived} value={cfg.claimDelayDays} onChange={(e) => set({ claimDelayDays: Number(e.target.value) })} style={input} />
        </div>
      </div>

      {check('adultOnly', t('rulesConfig.adultOnly'))}
      {check('terminalAvailable', t('rulesConfig.terminal'), t('rulesConfig.terminalHint'))}
      {check('hasNoPrizeCases', t('rulesConfig.noPrize'), t('rulesConfig.noPrizeHint'))}
      {check('eventPaid', t('rulesConfig.eventPaid'))}
      {check('imageRights', t('rulesConfig.imageRights'), t('rulesConfig.imageRightsHint'))}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '12px 0' }}>
        <div className="field" style={{ margin: 0, flex: 1, minWidth: 220 }}>
          <label>{t('rulesConfig.bailiff')}</label>
          <input type="text" maxLength={200} disabled={archived} value={cfg.bailiffName} placeholder={t('rulesConfig.bailiffPh')} onChange={(e) => set({ bailiffName: e.target.value })} style={input} />
        </div>
        <div className="field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>{t('rulesConfig.bailiffCity')}</label>
          <input type="text" maxLength={120} disabled={archived} value={cfg.bailiffCity} onChange={(e) => set({ bailiffCity: e.target.value })} style={input} />
        </div>
        <div className="field" style={{ margin: 0, flex: 2, minWidth: 220 }}>
          <label>{t('rulesConfig.mediator')}</label>
          <input type="text" maxLength={300} disabled={archived} value={cfg.mediator} placeholder={t('rulesConfig.mediatorPh')} onChange={(e) => set({ mediator: e.target.value })} style={input} />
        </div>
      </div>

      <h4 style={{ margin: '16px 0 6px', fontSize: 13 }}>{t('rulesConfig.valuesTitle')}</h4>
      <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 8px' }}>{t('rulesConfig.valuesHint')}</p>
      {data.slots.length === 0 ? <p className="ap-hint">{t('rulesConfig.noGifts')}</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {data.slots.map((s) => (
            <label key={s.slotIndex} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('dashboard.caseLabel', { n: s.slotIndex + 1 })} · {s.giftName}</span>
              <input type="number" min="0" step="0.01" disabled={archived} value={cfg.values[String(s.slotIndex)] ?? ''} placeholder="0" onChange={(e) => set({ values: { ...cfg.values, [String(s.slotIndex)]: e.target.value } })} style={{ ...input, width: 96, textAlign: 'right' }} />
              <span style={{ fontSize: 12, color: '#64748B' }}>€</span>
            </label>
          ))}
        </div>
      )}
      {missingValues.length > 0 && data.slots.length > 0 && <p className="dyn-short" style={{ fontSize: 12.5, margin: '8px 0 0' }}>{t('rulesConfig.valuesMissing', { count: missingValues.length })}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <Button disabled={busy || archived} onClick={save}>{busy ? t('common.saving') : t('rulesConfig.save')}</Button>
        <Button variant="secondary" disabled={busy || archived} onClick={preview}>{t('rulesConfig.preview')}</Button>
        {running && <Button variant="secondary" disabled={busy || archived} onClick={publish}>{t('rulesConfig.publishNew')}</Button>}
        {msg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{msg}</span>}
      </div>
      {!running && <p style={{ fontSize: 12, color: '#94A3B8', margin: '10px 0 0' }}>{t('rulesConfig.autoAtStart')}</p>}
    </Card>
  );
}

// A plain, self-contained page for the preview tab (nothing is published).
function renderPreview(doc) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const body = doc.articles.map((a) => `<h2>${esc(a.heading)}</h2>${a.blocks.map((b) => (b.type === 'list' ? `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : `<p>${esc(b.text)}</p>`)).join('')}`).join('');
  const rows = doc.annex.rows.map((r) => `<tr><td>${esc(r.case)}</td><td>${esc(r.gift)}</td><td>${esc(r.quantity)}</td>${r.value !== undefined ? `<td>${esc(r.value)}</td>` : ''}<td>${esc(r.probability)}</td></tr>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>Aperçu du règlement</title><style>body{font:15px/1.65 system-ui;max-width:760px;margin:30px auto;padding:0 16px;color:#0F172A}h1{text-align:center}h2{font-size:16px;color:#002881;margin-top:26px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}.b{background:#FFF7E6;border:1px solid #FCD9A0;padding:8px 12px;border-radius:8px;font-size:13px}</style><p class="b">Aperçu — non publié</p><h1>${esc(doc.title)} « ${esc(doc.gameName)} »</h1><p style="text-align:center">${esc(doc.subtitle)}</p>${body}<h2>${esc(doc.annex.heading)}</h2><p>${esc(doc.annex.intro)}</p><table><tr>${doc.annex.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${rows}<tr><td colspan="${doc.annex.columns.length - 1}"><b>Total</b></td><td><b>${esc(doc.annex.total)}</b></td></tr></table>${doc.annex.note ? `<p>${esc(doc.annex.note)}</p>` : ''}`;
}
