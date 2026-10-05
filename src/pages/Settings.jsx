import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import Calibration from './Calibration';

// Social platform names are proper nouns (Facebook/Instagram/LinkedIn/X) —
// never translated. Profile field keys map to settings.information.field*.
const SOCIAL_PLATFORMS = [
  { key: 'facebookUrl', label: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/yourpage' },
  { key: 'instagramUrl', label: 'Instagram', icon: '📷', placeholder: 'https://instagram.com/yourpage' },
  { key: 'linkedinUrl', label: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/company/yourpage' },
  { key: 'xUrl', label: 'X', icon: '✖️', placeholder: 'https://x.com/yourpage' },
];

const PROFILE_FIELD_KEYS = [
  { key: 'lastName', tKey: 'fieldLastName' },
  { key: 'firstName', tKey: 'fieldFirstName' },
  { key: 'company', tKey: 'fieldCompany' },
  { key: 'industrySector', tKey: 'fieldIndustrySector' },
  { key: 'address', tKey: 'fieldAddress' },
  { key: 'email', tKey: 'fieldEmail', type: 'email' },
  { key: 'phone', tKey: 'fieldPhone', type: 'tel' },
];

function InformationModule() {
  const { t } = useTranslation('admin');
  const { updateStoredUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);

  useEffect(() => {
    api.getProfile().then(({ user: u }) => {
      setProfile(u);
      setForm({
        lastName: u.last_name || '', firstName: u.first_name || '', company: u.company || '',
        industrySector: u.industry_sector || '', address: u.address || '', email: u.email || '', phone: u.phone || '',
      });
    }).catch((e) => setError(e.message));
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveMsg('');
    try {
      const { user: updated } = await api.updateProfile(form);
      setProfile(updated);
      updateStoredUser({ name: updated.name });
      setSaveMsg(t('common.saved'));
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwSaving(true);
    setPwError('');
    setPwMsg('');
    try {
      await api.updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPwMsg(t('settings.information.passwordUpdated'));
      setTimeout(() => setPwMsg(''), 2000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleRequestDeletion() {
    if (!confirm(t('settings.information.deletionRequestConfirm'))) return;
    setDeletionBusy(true);
    setError('');
    try {
      await api.requestAccountDeletion();
      setDeletionRequested(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletionBusy(false);
    }
  }

  if (!profile) return <Card className="mt-card"><p className="page-subtitle">{t('common.loading')}</p></Card>;

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <Card title={t('settings.information.yourInformationTitle')} className="mt-card">
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {PROFILE_FIELD_KEYS.map((f) => (
              <div className="field" key={f.key} style={{ margin: 0 }}>
                <label>{t(`settings.information.${f.tKey}`)}</label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
            {saveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{saveMsg}</span>}
          </div>
        </form>
      </Card>

      <Card title={t('settings.information.passwordTitle')} className="mt-card">
        <form onSubmit={handleChangePassword}>
          {pwError && <div className="error-banner">{pwError}</div>}
          <div className="password-row">
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>{t('settings.information.currentPasswordLabel')}</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>{t('settings.information.newPasswordLabel')}</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} placeholder={t('settings.information.newPasswordPlaceholder')} />
            </div>
            <Button type="submit" disabled={pwSaving || !currentPassword || !newPassword}>
              {pwSaving ? t('common.saving') : t('settings.information.changePasswordBtn')}
            </Button>
          </div>
          {pwMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{pwMsg}</span>}
        </form>
      </Card>

      <Card title={t('settings.information.deleteAccountTitle')} className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
          {t('settings.information.deleteAccountDescription')}
        </p>
        {deletionRequested ? (
          <p style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{t('settings.information.deletionRequestSent')}</p>
        ) : (
          <Button variant="ghost" disabled={deletionBusy} onClick={handleRequestDeletion} style={{ color: '#EF4444' }}>
            {deletionBusy ? t('settings.information.sendingBtn') : t('settings.information.requestAccountDeletionBtn')}
          </Button>
        )}
      </Card>
    </>
  );
}

function GoogleReviewModule() {
  const { t } = useTranslation('admin');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    api.getAccountSettings()
      .then((res) => { setGoogleReviewUrl(res.googleReviewUrl); setSavedUrl(res.googleReviewUrl); })
      .catch((e) => setError(e.message));
  }, []);

  async function handleSaveUrl(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.updateAccountSettings({ googleReviewUrl });
      setSavedUrl(googleReviewUrl);
      setSaveMsg(t('common.saved'));
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const urlDirty = googleReviewUrl !== savedUrl;

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <Card title={t('settings.googleReview.googleReviewLinkTitle')} className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 10px', lineHeight: 1.6 }}>
          {t('settings.googleReview.googleReviewLinkDesc1')}
        </p>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.7 }}>
          <strong>{t('settings.googleReview.howToGetItLabel')}</strong> {t('settings.googleReview.howToGetItText1')} <strong>{t('settings.googleReview.askForReviewsLabel')}</strong> {t('settings.googleReview.howToGetItText2')} <code>https://g.page/r/.../review</code>. {t('settings.googleReview.howToGetItText3')}
        </p>
        <form onSubmit={handleSaveUrl} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="url"
            placeholder="https://g.page/r/.../review"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
          />
          <Button type="submit" disabled={saving || !urlDirty}>{saving ? t('common.saving') : t('common.save')}</Button>
          {saveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{saveMsg}</span>}
        </form>
        <button
          onClick={() => setShowVideo(true)}
          style={{
            fontSize: 12, color: '#002881', background: 'none', border: 'none', padding: 0,
            marginTop: 8, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
          }}
        >
          {t('settings.googleReview.watchVideoLink')}
        </button>
      </Card>

      {showVideo && (
        <div
          onClick={() => setShowVideo(false)}
          className="modal-overlay"
          style={{ zIndex: 300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-card"
            style={{ padding: 16, '--modal-w': '720px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                onClick={() => setShowVideo(false)}
                style={{
                  background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '5px 12px',
                  fontSize: 13, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{t('common.close')}</button>
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src="https://www.youtube.com/embed/JC0GybvQDts"
                title="Where to find your Google review link"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SocialMediaModule() {
  const { t } = useTranslation('admin');
  const [urls, setUrls] = useState({ facebookUrl: '', instagramUrl: '', linkedinUrl: '', xUrl: '' });
  const [savedUrls, setSavedUrls] = useState({ facebookUrl: '', instagramUrl: '', linkedinUrl: '', xUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAccountSettings()
      .then((res) => {
        const loaded = { facebookUrl: res.facebookUrl, instagramUrl: res.instagramUrl, linkedinUrl: res.linkedinUrl, xUrl: res.xUrl };
        setUrls(loaded);
        setSavedUrls(loaded);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.updateAccountSettings(urls);
      setSavedUrls(urls);
      setSaveMsg(t('common.saved'));
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const dirty = SOCIAL_PLATFORMS.some((p) => urls[p.key] !== savedUrls[p.key]);

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <Card title={t('settings.socialMedia.socialLinksTitle')} className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
          {t('settings.socialMedia.socialLinksDesc')}
        </p>
        <form onSubmit={handleSave}>
          {SOCIAL_PLATFORMS.map((p) => (
            <div className="field" key={p.key}>
              <label>{p.icon} {p.label}</label>
              <input
                type="url"
                placeholder={p.placeholder}
                value={urls[p.key]}
                onChange={(e) => setUrls((prev) => ({ ...prev, [p.key]: e.target.value }))}
              />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button type="submit" disabled={saving || !dirty}>{saving ? t('common.saving') : t('common.save')}</Button>
            {saveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{saveMsg}</span>}
          </div>
        </form>
      </Card>
    </>
  );
}

const REDEEM_METHOD_TAB_KEYS = [
  { key: 'qr', tKey: 'redeemTabQr' },
  { key: 'code', tKey: 'redeemTabCode' },
  { key: 'voucher', tKey: 'redeemTabVoucher' },
];

function EmailTemplatesModule() {
  const { t } = useTranslation('admin');
  const [templates, setTemplates] = useState(null);
  const [defaults, setDefaults] = useState({ subject: '', bodyText: '' });
  const [method, setMethod] = useState('qr');
  const [hasCustomLogo, setHasCustomLogo] = useState(false);
  const [guestFormLogoEnabled, setGuestFormLogoEnabled] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);

  const [headerColor, setHeaderColor] = useState('');
  const [footerText, setFooterText] = useState('');
  const [logoSize, setLogoSize] = useState(null);
  const [brandingDefaults, setBrandingDefaults] = useState({ headerColor: '', footerText: '', logoSize: 120, min: 40, max: 220 });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaveMsg, setBrandingSaveMsg] = useState('');

  function loadLogoPreview() {
    api.getEmailLogoPreviewUrl().then((url) => setLogoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    }));
  }

  useEffect(() => {
    api.getEmailTemplates()
      .then((res) => {
        setTemplates(res.templates);
        setDefaults({ subject: res.defaultSubject, bodyText: res.defaultBodyText });
        setHasCustomLogo(res.hasCustomLogo);
        setGuestFormLogoEnabled(!!res.guestFormLogoEnabled);
        setHeaderColor(res.headerColor || '');
        setFooterText(res.footerText || '');
        setLogoSize(res.logoSize || null);
        setBrandingDefaults({
          headerColor: res.defaultHeaderColor,
          footerText: res.defaultFooterText,
          logoSize: res.defaultLogoSize,
          min: res.minLogoSize,
          max: res.maxLogoSize,
        });
        if (res.hasCustomLogo) loadLogoPreview();
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl); }, [logoPreviewUrl]);

  function updateField(field, value) {
    setTemplates((prev) => ({ ...prev, [method]: { ...prev[method], [field]: value } }));
  }

  function resetToDefault() {
    setTemplates((prev) => ({ ...prev, [method]: { subject: '', bodyText: '' } }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaveMsg('');
    try {
      await api.updateEmailTemplates({ templates });
      setSaveMsg(t('common.saved'));
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBranding() {
    setBrandingSaving(true);
    setError('');
    setBrandingSaveMsg('');
    try {
      await api.updateEmailTemplates({ templates: {}, headerColor, footerText, logoSize });
      setBrandingSaveMsg(t('common.saved'));
      setTimeout(() => setBrandingSaveMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBrandingSaving(false);
    }
  }

  function resetBrandingToDefault() {
    setHeaderColor('');
    setFooterText('');
    setLogoSize(null);
  }

  // Immediate save (like the upload/remove buttons below), not batched into
  // the "Branding" card's Save button — this toggle lives with the logo
  // itself, not the reward-email styling.
  async function handleToggleGuestFormLogo(checked) {
    setGuestFormLogoEnabled(checked);
    setError('');
    try {
      await api.updateEmailTemplates({ templates: {}, guestFormLogoEnabled: checked });
    } catch (err) {
      setGuestFormLogoEnabled(!checked);
      setError(err.message);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLogoBusy(true);
    setError('');
    try {
      await api.uploadEmailLogo(file);
      setHasCustomLogo(true);
      loadLogoPreview();
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoBusy(false);
      e.target.value = '';
    }
  }

  async function handleLogoRemove() {
    setLogoBusy(true);
    setError('');
    try {
      await api.deleteEmailLogo();
      setHasCustomLogo(false);
      setLogoPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoBusy(false);
    }
  }

  if (!templates) return <Card className="mt-card"><p className="page-subtitle">{t('common.loading')}</p></Card>;

  const current = templates[method];
  const isCustomized = !!(current.subject || current.bodyText);

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <Card title={t('settings.emailTemplates.headerLogoTitle')} className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>
          {t('settings.emailTemplates.headerLogoDesc')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 10, border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#F8FAFC',
          }}>
            {hasCustomLogo && logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Custom logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{t('settings.emailTemplates.defaultLabel')}</span>
            )}
          </div>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', border: '1px solid #CBD5E1',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: logoBusy ? 'not-allowed' : 'pointer', color: '#0F1C3F',
          }}>
            {logoBusy ? t('settings.emailTemplates.uploadingBtn') : hasCustomLogo ? t('settings.emailTemplates.replaceLogoBtn') : t('settings.emailTemplates.uploadLogoBtn')}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} disabled={logoBusy} style={{ display: 'none' }} />
          </label>
          {hasCustomLogo && (
            <Button variant="ghost" disabled={logoBusy} onClick={handleLogoRemove} style={{ color: '#EF4444' }}>
              {t('settings.emailTemplates.removeBtn')}
            </Button>
          )}
        </div>
        {hasCustomLogo && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={guestFormLogoEnabled}
              onChange={(e) => handleToggleGuestFormLogo(e.target.checked)}
            />
            <span style={{ fontSize: 13, color: '#334155' }}>
              {t('settings.emailTemplates.useInPreSpinFormLabel')}
              <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>
                {t('settings.emailTemplates.useInPreSpinFormDesc')}
              </span>
            </span>
          </label>
        )}
      </Card>

      <Card title={t('settings.emailTemplates.brandingTitle')} className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
          {t('settings.emailTemplates.brandingDesc')}
        </p>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>{t('settings.emailTemplates.headerColorLabel')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={headerColor || brandingDefaults.headerColor || '#2563EB'}
                onChange={(e) => setHeaderColor(e.target.value)}
                style={{ width: 40, height: 38, padding: 0, border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}
              />
              <input
                type="text"
                value={headerColor}
                placeholder={brandingDefaults.headerColor}
                onChange={(e) => setHeaderColor(e.target.value)}
                style={{ width: 110, padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
              />
            </div>
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <label>{t('settings.emailTemplates.footerTextLabel')}</label>
            <input
              type="text"
              value={footerText}
              placeholder={brandingDefaults.footerText}
              onChange={(e) => setFooterText(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
            />
          </div>
        </div>
        <div className="field" style={{ margin: '0 0 14px' }}>
          <label>{t('settings.emailTemplates.logoSizeLabel', { size: logoSize || brandingDefaults.logoSize })}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <input
              type="range"
              min={brandingDefaults.min}
              max={brandingDefaults.max}
              value={logoSize || brandingDefaults.logoSize}
              onChange={(e) => setLogoSize(Number(e.target.value))}
              style={{ flex: 1, maxWidth: 320 }}
            />
            {hasCustomLogo && logoPreviewUrl && (
              <img
                src={logoPreviewUrl}
                alt="Logo size preview"
                style={{
                  width: logoSize || brandingDefaults.logoSize,
                  height: logoSize || brandingDefaults.logoSize,
                  objectFit: 'contain',
                  borderRadius: 8,
                  background: headerColor || brandingDefaults.headerColor,
                  padding: 8,
                  transition: 'width 0.1s, height 0.1s',
                }}
              />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button onClick={handleSaveBranding} disabled={brandingSaving}>{brandingSaving ? t('common.saving') : t('common.save')}</Button>
          {(headerColor || footerText || logoSize) && (
            <Button variant="ghost" onClick={resetBrandingToDefault} disabled={brandingSaving}>{t('settings.emailTemplates.resetToDefaultBtn')}</Button>
          )}
          {brandingSaveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{brandingSaveMsg}</span>}
        </div>
      </Card>

      <Card title={t('settings.emailTemplates.messageTextTitle')} className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
          {t('settings.emailTemplates.messageTextDesc')} <code>{'{{firstName}}'}</code>, <code>{'{{giftName}}'}</code>
          {method === 'code' && <> , <code>{'{{code}}'}</code></>}.
        </p>

        <div className="tabs" style={{ marginBottom: 16 }}>
          {REDEEM_METHOD_TAB_KEYS.map((tab) => (
            <button key={tab.key} className={`tab${method === tab.key ? ' active' : ''}`} onClick={() => setMethod(tab.key)}>
              {t(`settings.emailTemplates.${tab.tKey}`)}
              {(templates[tab.key].subject || templates[tab.key].bodyText) && (
                <span style={{ marginLeft: 6 }}><Badge tone="green">{t('settings.emailTemplates.customBadge')}</Badge></span>
              )}
            </button>
          ))}
        </div>

        <div className="field" style={{ margin: '0 0 14px' }}>
          <label>{t('settings.emailTemplates.subjectLabel')}</label>
          <input
            type="text"
            value={current.subject}
            placeholder={defaults.subject}
            onChange={(e) => updateField('subject', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
          />
        </div>

        <div className="field" style={{ margin: '0 0 14px' }}>
          <label>{t('settings.emailTemplates.messageLabel')}</label>
          <textarea
            value={current.bodyText}
            placeholder={defaults.bodyText}
            onChange={(e) => updateField('bodyText', e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button onClick={handleSave} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
          {isCustomized && (
            <Button variant="ghost" onClick={resetToDefault} disabled={saving}>{t('settings.emailTemplates.resetToDefaultBtn')}</Button>
          )}
          {saveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{saveMsg}</span>}
        </div>
      </Card>
    </>
  );
}

function AIAssistantModule() {
  const { t } = useTranslation('admin');
  const [mode, setMode] = useState('supervised');
  const [savedMode, setSavedMode] = useState('supervised');
  const [configured, setConfigured] = useState(null); // null = loading, then true/false
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAccountSettings()
      .then((res) => {
        setMode(res.aiAssistantMode);
        setSavedMode(res.aiAssistantMode);
      })
      .catch((e) => setError(e.message));
    api.getAiAssistantStatus().then((res) => setConfigured(res.configured)).catch(() => setConfigured(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.updateAccountSettings({ aiAssistantMode: mode });
      setSavedMode(mode);
      setSaveMsg(t('common.saved'));
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const dirty = mode !== savedMode;

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <Card title={t('settings.aiAssistant.title')} className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
          {t('settings.aiAssistant.description')}
        </p>

        {configured === false && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: '#92400E' }}>
            {t('settings.aiAssistant.notConfiguredWarning')}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="field">
            <label>{t('settings.aiAssistant.modeLabel')}</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="supervised">{t('settings.aiAssistant.modeSupervised')}</option>
              <option value="automatic">{t('settings.aiAssistant.modeAutomatic')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button type="submit" disabled={saving || !dirty}>{saving ? t('common.saving') : t('common.save')}</Button>
            {saveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{saveMsg}</span>}
          </div>
        </form>
      </Card>
    </>
  );
}

const MODULE_KEYS = [
  { key: 'information', tKey: 'tabInformation' },
  { key: 'google-review', tKey: 'tabGoogleReview' },
  { key: 'social-media', tKey: 'tabSocialMedia' },
  { key: 'email-templates', tKey: 'tabEmailTemplates' },
  { key: 'ai-assistant', tKey: 'tabAiAssistant' },
  { key: 'calibration', tKey: 'tabCalibration' },
];

export default function Settings() {
  const { t } = useTranslation('admin');
  const [module, setModule] = useState('information');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings.pageTitle')}</h1>
          <p className="page-subtitle">{t('settings.pageSubtitle')}</p>
        </div>
      </div>

      <div className="tabs">
        {MODULE_KEYS.map((m) => (
          <button key={m.key} className={`tab${module === m.key ? ' active' : ''}`} onClick={() => setModule(m.key)}>
            {t(`settings.${m.tKey}`)}
          </button>
        ))}
      </div>

      {module === 'information' && <InformationModule />}
      {module === 'google-review' && <GoogleReviewModule />}
      {module === 'social-media' && <SocialMediaModule />}
      {module === 'email-templates' && <EmailTemplatesModule />}
      {module === 'ai-assistant' && <AIAssistantModule />}
      {module === 'calibration' && <Calibration onExit={() => setModule('information')} />}
    </div>
  );
}
