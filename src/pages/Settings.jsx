import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import Calibration from './Calibration';

const MODULES = [
  { key: 'information', label: 'Information' },
  { key: 'google-review', label: 'Google review' },
  { key: 'email-templates', label: 'Reward emails' },
  { key: 'calibration', label: 'Calibration' },
];

const REDEEM_METHOD_TABS = [
  { key: 'qr', label: 'QR code' },
  { key: 'code', label: 'Code' },
  { key: 'voucher', label: 'Voucher' },
];

const PROFILE_FIELDS = [
  { key: 'lastName', label: 'Last name' },
  { key: 'firstName', label: 'First name' },
  { key: 'company', label: 'Company' },
  { key: 'industrySector', label: 'Industry sector' },
  { key: 'address', label: 'Address' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
];

function InformationModule() {
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
      setSaveMsg('Saved');
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
      setPwMsg('Password updated');
      setTimeout(() => setPwMsg(''), 2000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleRequestDeletion() {
    if (!confirm("Request that an admin delete your account? They'll be notified and can act on it — this doesn't delete it immediately.")) return;
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

  if (!profile) return <Card className="mt-card"><p className="page-subtitle">Loading…</p></Card>;

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <Card title="Your information" className="mt-card">
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {PROFILE_FIELDS.map((f) => (
              <div className="field" key={f.key} style={{ margin: 0 }}>
                <label>{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            {saveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{saveMsg}</span>}
          </div>
        </form>
      </Card>

      <Card title="Password" className="mt-card">
        <form onSubmit={handleChangePassword}>
          {pwError && <div className="error-banner">{pwError}</div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>Current password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} placeholder="At least 8 characters" />
            </div>
            <Button type="submit" disabled={pwSaving || !currentPassword || !newPassword}>
              {pwSaving ? 'Saving…' : 'Change password'}
            </Button>
          </div>
          {pwMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{pwMsg}</span>}
        </form>
      </Card>

      <Card title="Delete account" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
          You can't delete your own account directly — this sends a request to an admin, who can review and
          delete it (GDPR-compliant anonymization) from the Users page.
        </p>
        {deletionRequested ? (
          <p style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>Request sent — an admin has been notified.</p>
        ) : (
          <Button variant="ghost" disabled={deletionBusy} onClick={handleRequestDeletion} style={{ color: '#EF4444' }}>
            {deletionBusy ? 'Sending…' : 'Request account deletion'}
          </Button>
        )}
      </Card>
    </>
  );
}

function GoogleReviewModule() {
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    api.getAccountSettings()
      .then((res) => { setGoogleReviewUrl(res.googleReviewUrl); setSavedUrl(res.googleReviewUrl); })
      .catch((e) => setError(e.message));
    api.listCampaigns()
      .then(setCampaigns)
      .catch((e) => setError(e.message));
  }, []);

  async function handleSaveUrl(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.updateAccountSettings({ googleReviewUrl });
      setSavedUrl(googleReviewUrl);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReview(campaign) {
    setTogglingId(campaign.id);
    try {
      await api.setCampaignGoogleReview(campaign.id, !campaign.google_review_required);
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, google_review_required: c.google_review_required ? 0 : 1 } : c))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  const urlDirty = googleReviewUrl !== savedUrl;

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <Card title="Google review link" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 10px', lineHeight: 1.6 }}>
          Guests who won a gift are optionally invited to open this link afterwards. Paste the link to
          your Google page where people can leave a review.
        </p>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.7 }}>
          <strong>How to get it:</strong> search your business name on Google Search or Maps → open your
          business profile → click <strong>"Ask for reviews"</strong> (or the share icon next to your rating)
          → copy the link it gives you. It looks like <code>https://g.page/r/.../review</code>. Paste it below.
        </p>
        <form onSubmit={handleSaveUrl} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="url"
            placeholder="https://g.page/r/.../review"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
          />
          <Button type="submit" disabled={saving || !urlDirty}>{saving ? 'Saving…' : 'Save'}</Button>
          {saveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{saveMsg}</span>}
        </form>
        <button
          onClick={() => setShowVideo(true)}
          style={{
            fontSize: 12, color: '#2563EB', background: 'none', border: 'none', padding: 0,
            marginTop: 8, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
          }}
        >
          Not sure where to find it? Watch this quick video →
        </button>
      </Card>

      {showVideo && (
        <div
          onClick={() => setShowVideo(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, padding: 16, width: 720, maxWidth: '92vw',
              boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                onClick={() => setShowVideo(false)}
                style={{
                  background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '5px 12px',
                  fontSize: 13, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Close</button>
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

      <Card title="Invite for a Google review after spinning" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
          Per campaign — when enabled, guests see an optional "Leave us a review" button once their gift is
          already won. It's never a condition to play or to claim the reward — Google's policies prohibit
          tying a game or reward to leaving a review, even as an unverified gate.
        </p>
        {!campaigns && <p className="page-subtitle">Loading…</p>}
        {campaigns && campaigns.length === 0 && <p className="page-subtitle">No campaigns yet.</p>}
        {campaigns && campaigns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map((c) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', border: '1px solid #F1F5F9', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{c.name}</span>
                  <Badge tone={c.status === 'active' ? 'green' : 'neutral'}>{c.status}</Badge>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#64748B' }}>
                  <input
                    type="checkbox"
                    checked={!!c.google_review_required}
                    disabled={togglingId === c.id || !savedUrl}
                    onChange={() => handleToggleReview(c)}
                  />
                  Invite for review
                </label>
              </div>
            ))}
          </div>
        )}
        {!savedUrl && (
          <p style={{ fontSize: 12, color: '#EF4444', marginTop: 12 }}>
            Set a Google review link above before enabling this on a campaign.
          </p>
        )}
      </Card>
    </>
  );
}

function EmailTemplatesModule() {
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
      setSaveMsg('Saved');
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
      setBrandingSaveMsg('Saved');
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

  if (!templates) return <Card className="mt-card"><p className="page-subtitle">Loading…</p></Card>;

  const current = templates[method];
  const isCustomized = !!(current.subject || current.bodyText);

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <Card title="Header logo" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>
          Shown at the top of every reward-win email, all three types (QR / Code / Voucher) share the same one.
          PNG, JPEG, or WebP, up to 1MB. Leave unset to keep PrizeFlow's default logo.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 10, border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#F8FAFC',
          }}>
            {hasCustomLogo && logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Custom logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Default</span>
            )}
          </div>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', border: '1px solid #CBD5E1',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: logoBusy ? 'not-allowed' : 'pointer', color: '#0F1C3F',
          }}>
            {logoBusy ? 'Uploading…' : hasCustomLogo ? 'Replace logo' : 'Upload logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} disabled={logoBusy} style={{ display: 'none' }} />
          </label>
          {hasCustomLogo && (
            <Button variant="ghost" disabled={logoBusy} onClick={handleLogoRemove} style={{ color: '#EF4444' }}>
              Remove
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
              Use in pre-spin form
              <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>
                Shows this logo instead of PrizeFlow's on the guest form before they spin the wheel.
              </span>
            </span>
          </label>
        )}
      </Card>

      <Card title="Branding" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
          The header banner color, logo size, and footer line shown on every reward-win email. Leave blank
          to keep PrizeFlow's defaults.
        </p>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Header color</label>
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
            <label>Footer text</label>
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
          <label>Logo size in the email — {logoSize || brandingDefaults.logoSize}px</label>
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
          <Button onClick={handleSaveBranding} disabled={brandingSaving}>{brandingSaving ? 'Saving…' : 'Save'}</Button>
          {(headerColor || footerText || logoSize) && (
            <Button variant="ghost" onClick={resetBrandingToDefault} disabled={brandingSaving}>Reset to default</Button>
          )}
          {brandingSaveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{brandingSaveMsg}</span>}
        </div>
      </Card>

      <Card title="Message text" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
          Customize the subject and congratulations message for each reward type. The redemption instructions
          (QR code, code box, voucher notice) always stay as-is below your message, so a gift can never fail to
          be redeemable because of a wording change. Leave a type blank to keep PrizeFlow's default email for it.
          Available placeholders: <code>{'{{firstName}}'}</code>, <code>{'{{giftName}}'}</code>
          {method === 'code' && <> , <code>{'{{code}}'}</code></>}.
        </p>

        <div className="tabs" style={{ marginBottom: 16 }}>
          {REDEEM_METHOD_TABS.map((t) => (
            <button key={t.key} className={`tab${method === t.key ? ' active' : ''}`} onClick={() => setMethod(t.key)}>
              {t.label}
              {(templates[t.key].subject || templates[t.key].bodyText) && (
                <span style={{ marginLeft: 6 }}><Badge tone="green">Custom</Badge></span>
              )}
            </button>
          ))}
        </div>

        <div className="field" style={{ margin: '0 0 14px' }}>
          <label>Subject</label>
          <input
            type="text"
            value={current.subject}
            placeholder={defaults.subject}
            onChange={(e) => updateField('subject', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
          />
        </div>

        <div className="field" style={{ margin: '0 0 14px' }}>
          <label>Message</label>
          <textarea
            value={current.bodyText}
            placeholder={defaults.bodyText}
            onChange={(e) => updateField('bodyText', e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          {isCustomized && (
            <Button variant="ghost" onClick={resetToDefault} disabled={saving}>Reset to default</Button>
          )}
          {saveMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{saveMsg}</span>}
        </div>
      </Card>
    </>
  );
}

export default function Settings() {
  const [module, setModule] = useState('information');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile, the Google review invitation, reward emails, and wheel calibration</p>
        </div>
      </div>

      <div className="tabs">
        {MODULES.map((m) => (
          <button key={m.key} className={`tab${module === m.key ? ' active' : ''}`} onClick={() => setModule(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {module === 'information' && <InformationModule />}
      {module === 'google-review' && <GoogleReviewModule />}
      {module === 'email-templates' && <EmailTemplatesModule />}
      {module === 'calibration' && <Calibration onExit={() => setModule('information')} />}
    </div>
  );
}
