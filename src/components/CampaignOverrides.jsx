import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';
import CollapsibleCard from './CollapsibleCard';
import './campaign-overrides-test.css';
import SaveButton from './SaveButton';
import EmailChipsInput from './EmailChipsInput';
const Card = CollapsibleCard; // every section folds

const METHODS = [['qr', 'redeemTabQr'], ['code', 'redeemTabCode'], ['voucher', 'redeemTabVoucher']];
const input = { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };
const triToValue = (v) => (v === null || v === undefined ? '' : v ? 'yes' : 'no');
const valueToTri = (v) => (v === 'yes' ? true : v === 'no' ? false : null);

// Campaign settings, second part: what the Settings menu holds as the ACCOUNT defaults (reward e-mail, privacy; the social links are in the social card of the settings form) can be decided
// for this campaign only. Left empty, the account's value is used (shown as the placeholder of each field).
// `campaignId` null = the campaign does not exist yet (creation wizard): the form starts from the account's values, keeps what is typed in the
// parent through onStage(payload, logoFile), and the parent applies it right after the campaign is created.
export default function CampaignOverrides({ campaignId = null, archived = false, onStage = null }) {
  const staged = !campaignId;
  const { t } = useTranslation('admin');
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [method, setMethod] = useState('qr');
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null); // staged mode: uploaded after the campaign is created
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [testNote, setTestNote] = useState(null); // { ok, text }

  const apply = (res) => {
    setData(res);
    setForm({ ...res.own, guestFormLogoEnabled: triToValue(res.own.guestFormLogoEnabled), marketingConsentEnabled: triToValue(res.own.marketingConsentEnabled), logoSize: res.own.logoSize || '' });
  };
  const loadLogo = () => api.getCampaignLogoPreviewUrl(campaignId).then((u) => setLogoUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return u; }));
  useEffect(() => {
    (staged ? api.getCampaignOverridesDefaults() : api.getCampaignOverrides(campaignId)).then((res) => { apply(res); if (!staged && res.own.hasLogo) loadLogo(); }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);
  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);

  const payloadOf = (f) => ({
    senderName: f.senderName, replyTo: f.replyTo, headerColor: f.headerColor, footerText: f.footerText,
    logoSize: f.logoSize === '' ? null : Number(f.logoSize),
    guestFormLogoEnabled: valueToTri(f.guestFormLogoEnabled),
    privacyPolicyUrl: f.privacyPolicyUrl, marketingConsentEnabled: valueToTri(f.marketingConsentEnabled),
    templates: f.templates,
  });
  // staged: the parent always holds the latest form (nothing is saved until the campaign exists)
  useEffect(() => { if (staged && form && onStage) onStage(payloadOf(form), logoFile); }, [form, logoFile]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!form || !data) return error ? <div className="error-banner">{error}</div> : null;
  const d = data.defaults; const b = data.builtIn;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setTemplate = (field, value) => setForm((f) => ({ ...f, templates: { ...f.templates, [method]: { ...f.templates[method], [field]: value } } }));
  const defaultTpl = d.templates[method] || { subject: '', bodyText: '' };

  async function save() {
    setBusy(true); setError(''); setMsg('');
    try {
      const res = await api.updateCampaignOverrides(campaignId, payloadOf(form));
      apply(res);
      setMsg(t('common.saved')); setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setError(e.code === 'BAD_REPLY_TO' ? t('settings.emailTemplates.replyToInvalid') : e.message);
    } finally { setBusy(false); }
  }
  async function sendTest() {
    setTestBusy(true); setTestNote(null);
    try {
      const r = await api.sendCampaignTestEmail(campaignId, { ...payloadOf(form), method });
      setTestNote({ ok: true, text: t('campaignOverrides.testSent', { to: r.to }) });
    } catch (e) {
      setTestNote({ ok: false, text: e.code === 'MAIL_NOT_CONFIGURED' ? t('campaignOverrides.testNotConfigured') : e.status === 429 ? t('campaignOverrides.testTooMany') : t('campaignOverrides.testFailed') });
    } finally { setTestBusy(false); }
  }
  async function uploadLogo(e) {
    const file = e.target.files[0]; if (!file) return;
    if (staged) { // kept here, sent once the campaign exists
      setLogoFile(file); setLogoUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); }); setForm((f) => ({ ...f, hasLogo: true })); e.target.value = ''; return;
    }
    setLogoBusy(true); setError('');
    try { await api.uploadCampaignLogo(campaignId, file); const res = await api.getCampaignOverrides(campaignId); setData(res); setForm((f) => ({ ...f, hasLogo: true })); await loadLogo(); }
    catch (err) { setError(err.message); } finally { setLogoBusy(false); e.target.value = ''; }
  }
  async function removeLogo() {
    if (staged) { setLogoFile(null); setLogoUrl((p) => { if (p) URL.revokeObjectURL(p); return null; }); setForm((f) => ({ ...f, hasLogo: false })); return; }
    setLogoBusy(true); setError('');
    try { await api.deleteCampaignLogo(campaignId); setForm((f) => ({ ...f, hasLogo: false })); setLogoUrl((p) => { if (p) URL.revokeObjectURL(p); return null; }); }
    catch (err) { setError(err.message); } finally { setLogoBusy(false); }
  }
  const dis = archived || busy;
  const triLabel = (on) => t(on ? 'campaignOverrides.yes' : 'campaignOverrides.no');

  return (
    <>
      <div className="ap-info" style={{ marginTop: 18 }}>
        {staged ? t('campaignOverrides.introStaged') : t('campaignOverrides.intro')} <Link to="/settings">{t('campaignOverrides.openDefaults')}</Link>
      </div>
      {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}

      <Card title={t('campaignOverrides.emailTitle')} className="mt-card">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>{t('campaignOverrides.emailDesc')}</p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <label>{t('settings.emailTemplates.senderNameLabel')}</label>
            <input type="text" maxLength={60} disabled={dis} value={form.senderName} placeholder={d.senderName ? `${t('campaignOverrides.defaultPrefix')} ${d.senderName}` : t('settings.emailTemplates.senderNamePh')} onChange={(e) => set({ senderName: e.target.value })} style={input} />
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <label>{t('settings.emailTemplates.replyToLabel')}</label>
            <EmailChipsInput disabled={dis} value={form.replyTo} onChange={(v) => set({ replyTo: v })} placeholder={d.replyTo ? `${t('campaignOverrides.defaultPrefix')} ${d.replyTo}` : 'contact@votre-entreprise.fr'} ariaLabel={t('settings.emailTemplates.replyToLabel')} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('settings.emailTemplates.headerColorLabel', { defaultValue: 'Header colour' })}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" disabled={dis} value={/^#[0-9a-fA-F]{6}$/.test(form.headerColor) ? form.headerColor : (/^#[0-9a-fA-F]{6}$/.test(d.headerColor) ? d.headerColor : b.headerColor)} onChange={(e) => set({ headerColor: e.target.value })} style={{ width: 46, height: 38, padding: 2, border: '1px solid #E2E8F0', borderRadius: 8 }} />
              <input type="text" disabled={dis} value={form.headerColor} placeholder={d.headerColor || b.headerColor} onChange={(e) => set({ headerColor: e.target.value })} style={{ ...input, width: 120 }} />
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('campaignOverrides.logoSize')}</label>
            <input type="number" min={b.minLogoSize} max={b.maxLogoSize} disabled={dis} value={form.logoSize} placeholder={String(d.logoSize || b.logoSize)} onChange={(e) => set({ logoSize: e.target.value === '' ? '' : Number(e.target.value) })} style={{ ...input, width: 110 }} />
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <label>{t('campaignOverrides.footer')}</label>
            <input type="text" maxLength={500} disabled={dis} value={form.footerText} placeholder={d.footerText || b.footerText} onChange={(e) => set({ footerText: e.target.value })} style={input} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', margin: '14px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#F8FAFC' }}>
            {form.hasLogo && logoUrl ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: 'var(--text-light)', textAlign: 'center' }}>{d.hasLogo ? t('campaignOverrides.accountLogo') : t('settings.emailTemplates.defaultLabel')}</span>}
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: logoBusy || archived ? 'not-allowed' : 'pointer', color: '#0F1C3F' }}>
            {logoBusy ? t('settings.emailTemplates.uploadingBtn') : form.hasLogo ? t('settings.emailTemplates.replaceLogoBtn') : t('settings.emailTemplates.uploadLogoBtn')}
            <input type="file" accept="image/png,image/jpeg,image/webp" disabled={logoBusy || archived} onChange={uploadLogo} style={{ display: 'none' }} />
          </label>
          {form.hasLogo && <Button variant="ghost" disabled={logoBusy} onClick={removeLogo} style={{ color: 'var(--red-text)' }}>{t('settings.emailTemplates.removeBtn')}</Button>}
          <div className="field" style={{ margin: 0 }}>
            <label>{t('settings.emailTemplates.useInPreSpinFormLabel')}</label>
            <select disabled={dis} value={form.guestFormLogoEnabled} onChange={(e) => set({ guestFormLogoEnabled: e.target.value })} style={{ ...input, width: 'auto' }}>
              <option value="">{t('campaignOverrides.useDefault', { value: triLabel(d.guestFormLogoEnabled) })}</option>
              <option value="yes">{t('campaignOverrides.yes')}</option>
              <option value="no">{t('campaignOverrides.no')}</option>
            </select>
          </div>
        </div>

        <div className="tabs" style={{ marginTop: 8 }}>
          {METHODS.map(([m, key]) => <button type="button" key={m} className={`tab${method === m ? ' active' : ''}`} onClick={() => setMethod(m)}>{t(`settings.emailTemplates.${key}`)}</button>)}
        </div>
        <div className="field">
          <label>{t('settings.emailTemplates.subjectLabel')}</label>
          <input type="text" maxLength={300} disabled={dis} value={form.templates[method].subject} placeholder={defaultTpl.subject || data.builtIn.defaultSubject || ''} onChange={(e) => setTemplate('subject', e.target.value)} style={input} />
        </div>
        <div className="field">
          <label>{t('campaignOverrides.message')}</label>
          <textarea rows={4} maxLength={5000} disabled={dis} value={form.templates[method].bodyText} placeholder={defaultTpl.bodyText || data.builtIn.defaultBodyText || ''} onChange={(e) => setTemplate('bodyText', e.target.value)} style={{ ...input, resize: 'vertical' }} />
          <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '4px 0 0' }}>{t('campaignOverrides.messageHint', { vars: '{{firstName}} / {{giftName}} / {{code}} / {{unique_code}}' })}</p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-light)', margin: 0 }}>{t('campaignOverrides.persoNote')}</p>
        <div className="co-test">
          <Button type="button" variant="secondary" disabled={testBusy} onClick={sendTest}>{testBusy ? t('campaignOverrides.testSending') : t('campaignOverrides.testBtn')}</Button>
          <span className="co-test-hint">{t('campaignOverrides.testHint', { kind: t(`settings.emailTemplates.${METHODS.find(([m]) => m === method)[1]}`) })}</span>
          {testNote && <span className={`co-test-note ${testNote.ok ? 'ok' : 'bad'}`} role="status">{testNote.text}</span>}
        </div>
      </Card>

      <Card title={t('campaignOverrides.privacyTitle')} className="mt-card">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>{t('campaignOverrides.privacyDesc')}</p>
        <div className="field">
          <label>{t('campaignOverrides.policyUrl')}</label>
          <input type="url" disabled={dis} value={form.privacyPolicyUrl} placeholder={d.privacyPolicyUrl ? `${t('campaignOverrides.defaultPrefix')} ${d.privacyPolicyUrl}` : 'https://votre-site.fr/confidentialite'} onChange={(e) => set({ privacyPolicyUrl: e.target.value })} style={input} />
        </div>
        <div className="field">
          <label>{t('campaignOverrides.marketingConsent')}</label>
          <select disabled={dis} value={form.marketingConsentEnabled} onChange={(e) => set({ marketingConsentEnabled: e.target.value })} style={{ ...input, width: 'auto' }}>
            <option value="">{t('campaignOverrides.useDefault', { value: triLabel(d.marketingConsentEnabled) })}</option>
            <option value="yes">{t('campaignOverrides.yes')}</option>
            <option value="no">{t('campaignOverrides.no')}</option>
          </select>
        </div>
      </Card>

      {!staged && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <SaveButton disabled={dis} onClick={save} saving={busy} failed={!!error}>{t('campaignOverrides.save')}</SaveButton>
          {msg && <span style={{ fontSize: 13, color: 'var(--green-text)', fontWeight: 600 }}>{msg}</span>}
        </div>
      )}
    </>
  );
}
