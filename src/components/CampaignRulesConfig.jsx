import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';
import CollapsibleCard from './CollapsibleCard';
import SaveButton from './SaveButton';

const input = { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };
const FIELD_KEYS = { company: 'fieldCompany', legalForm: 'fieldLegalForm', registrationNumber: 'fieldRegistrationNumber', address: 'fieldAddress', city: 'fieldCity', email: 'fieldEmail' };
export const DEFAULT_RULES_CONFIG = { gameName: '', standName: '', adultOnly: true, terminalAvailable: true, eventPaid: false, hasNoPrizeCases: false, imageRights: false, startDate: '', endDate: '', claimDeadline: '', claimDelayDays: 30 };

// Campaign settings: what the game rules need beyond the gifts and the organiser's identity (dates, stand, options). The text itself is generated
// when the campaign starts and published at /rules/<campaign id>.
// `campaignId` null = the campaign does not exist yet (creation wizard): the form is kept by the parent through onStage(config).
export default function CampaignRulesConfig({ campaignId = null, status = 'draft', onStage = null }) {
  const { t } = useTranslation('admin');
  const staged = !campaignId;
  const [data, setData] = useState(staged ? { config: DEFAULT_RULES_CONFIG, missingOrganizer: [], published: null, publicUrl: '' } : null);
  const [cfg, setCfg] = useState(staged ? DEFAULT_RULES_CONFIG : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () => api.getRulesConfig(campaignId).then((r) => { setData(r); setCfg({ ...r.config }); }).catch((e) => setError(e.message));
  useEffect(() => { if (!staged) load(); }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (staged && onStage && cfg) onStage(cfg); }, [cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cfg || !data) return error ? <div className="error-banner">{error}</div> : null;
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const archived = status === 'archived';
  const running = !staged && (status === 'active' || status === 'paused' || status === 'completed');
  const check = (key, label, hint) => (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '8px 0', cursor: 'pointer' }}>
      <input type="checkbox" disabled={archived} checked={!!cfg[key]} onChange={(e) => set({ [key]: e.target.checked })} style={{ marginTop: 3 }} />
      <span style={{ fontSize: 13, color: '#334155' }}>{label}{hint && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-light)' }}>{hint}</span>}</span>
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
    try { await api.saveRulesConfig(campaignId, cfg); const doc = await api.previewRules(campaignId); const w = window.open('', '_blank'); if (w) { w.document.write(renderPreview(doc)); w.document.close(); } }
    catch (e) { setError(e.code === 'RULES_ORGANIZER_INFO' ? t('rulesConfig.missingOrganizer') : e.message); } finally { setBusy(false); }
  }
  const copyUrl = () => { try { navigator.clipboard.writeText(data.publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* no clipboard */ } };
  const missingLabels = data.missingOrganizer.map((k) => t(`settings.information.${FIELD_KEYS[k] || k}`)).join(', ');

  return (
    <CollapsibleCard title={t('rulesConfig.title')} className="mt-card">
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>{t('rulesConfig.intro')}</p>
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
        {[['startDate', t('rulesConfig.startPh')], ['endDate', t('rulesConfig.endPh')], ['claimDeadline', t('rulesConfig.claimPh')]].map(([k, ph]) => (
          <div className="field" key={k} style={{ margin: 0, flex: 1, minWidth: 170 }}>
            <label>{t(`rulesConfig.${k}`)}</label>
            <input type="date" disabled={archived} value={cfg[k]} onChange={(e) => set({ [k]: e.target.value })} style={input} />
            <small style={{ color: 'var(--text-light)', fontSize: 11.5 }}>{ph}</small>
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

      {!staged && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <SaveButton disabled={busy || archived} onClick={save} saving={busy} failed={!!error}>{t('rulesConfig.save')}</SaveButton>
          <Button variant="secondary" disabled={busy || archived} onClick={preview}>{t('rulesConfig.preview')}</Button>
          {running && <Button variant="secondary" disabled={busy || archived} onClick={publish}>{t('rulesConfig.publishNew')}</Button>}
          {msg && <span style={{ fontSize: 13, color: 'var(--green-text)', fontWeight: 600 }}>{msg}</span>}
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '10px 0 0' }}>{running ? t('rulesConfig.newVersionHint') : t('rulesConfig.autoAtStart')}</p>
    </CollapsibleCard>
  );
}

// A plain, self-contained page for the preview tab (nothing is published).
function renderPreview(doc) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const body = doc.articles.map((a) => `<h2>${esc(a.heading)}</h2>${a.blocks.map((b) => (b.type === 'list' ? `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : `<p>${esc(b.text)}</p>`)).join('')}`).join('');
  const rows = doc.annex.rows.map((r) => `<tr><td>${esc(r.case)}</td><td>${esc(r.gift)}</td><td>${esc(r.quantity)}</td><td>${esc(r.probability)}</td></tr>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>Aperçu du règlement</title><style>body{font:15px/1.65 system-ui;max-width:760px;margin:30px auto;padding:0 16px;color:#0F172A}h1{text-align:center}h2{font-size:16px;color:#002881;margin-top:26px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}.b{background:#FFF7E6;border:1px solid #FCD9A0;padding:8px 12px;border-radius:8px;font-size:13px}</style><p class="b">Aperçu — non publié</p><h1>${esc(doc.title)} « ${esc(doc.gameName)} »</h1><p style="text-align:center">${esc(doc.subtitle)}</p>${body}<h2>${esc(doc.annex.heading)}</h2><p>${esc(doc.annex.intro)}</p><table><tr>${doc.annex.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${rows}<tr><td colspan="3"><b>Total</b></td><td><b>${esc(doc.annex.total)}</b></td></tr></table>${doc.annex.note ? `<p>${esc(doc.annex.note)}</p>` : ''}`;
}
