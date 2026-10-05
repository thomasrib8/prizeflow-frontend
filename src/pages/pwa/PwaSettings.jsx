import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_LANGUAGE_OPTIONS } from '../../components/Layout';
import CampaignSettingsForm, { DEFAULT_CAMPAIGN_SETTINGS, settingsFromCampaign } from '../../components/CampaignSettingsForm';
import { IconGlobe, IconLogout, IconUser, IconWheel } from '../../components/pwa/PwaIcons';
import { CampaignLoading, NoCampaign, Skel } from '../../components/pwa/PwaParts';
import { usePwa } from './PwaContext';

// Settings: the active campaign's own settings — the same "Settings" step as
// campaign creation (Google review, social media, AI assistant), through the
// same form component and the same PATCH /campaigns/:id/settings the desktop
// "Edit settings" page uses — plus the few things a rep needs on the phone:
// wheel status, language, and signing out.
export default function PwaSettings() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { user, logout, updateStoredUser } = useAuth();
  const { q, agentConnected, showDiagnostics } = usePwa();
  const campaignId = q.campaign?.id;
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [changingLanguage, setChangingLanguage] = useState(false);

  useEffect(() => {
    if (!campaignId) return undefined;
    let cancelled = false;
    setSettings(null);
    setDirty(false);
    api.getCampaign(campaignId)
      .then((c) => { if (!cancelled) setSettings(settingsFromCampaign(c)); })
      .catch((e) => { if (!cancelled) { setSettings(DEFAULT_CAMPAIGN_SETTINGS); setError(e.message); } });
    return () => { cancelled = true; };
  }, [campaignId]);

  async function handleSave() {
    if (settings.googleReviewMode !== 'off' && !settings.googleReviewUrl.trim()) {
      setError(t('campaignSettings.googleReviewLinkRequiredError'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.updateCampaignSettings(campaignId, { ...settings, googleReviewUrl: settings.googleReviewUrl.trim() });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleLanguageChange(language) {
    setChangingLanguage(true);
    api.updateAccountSettings({ language })
      .then(() => updateStoredUser({ language }))
      .catch(() => {})
      .finally(() => setChangingLanguage(false));
  }

  return (
    <div>
      <h1 className="pw-page-title">{t('pwaApp.settingsTitle')}</h1>

      {q.campaign === undefined && <CampaignLoading />}
      {q.campaign === null && <NoCampaign />}

      {q.campaign && (
        <>
          <div className="pw-card pw-campaign-card">
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--pw-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('pwaApp.activeCampaign')}</p>
              <h2 style={{ overflowWrap: 'anywhere' }}>{q.campaign.name}</h2>
            </div>
          </div>

          <div className="pw-group-title">{t('pwaApp.campaignOptionsTitle')}</div>
          {!settings && <Skel h={160} r={20} />}
          {settings && (
            <div className="pw-settings-form">
              <CampaignSettingsForm
                value={settings}
                onChange={(patch) => { setSettings((s) => ({ ...s, ...patch })); setDirty(true); setSaved(false); }}
              />
              {error && <div className="error-banner" style={{ marginTop: 14 }}>{error}</div>}
              <button type="button" className="pw-save" disabled={saving || !dirty} onClick={handleSave}>
                {saving ? t('common.saving') : t('pwaApp.saveBtn')}
              </button>
              {saved && <div className="pw-saved" role="status">{t('common.saved')}</div>}
            </div>
          )}
        </>
      )}

      <div className="pw-group-title">{t('pwaApp.wheelTitle')}</div>
      <div className="pw-card pw-list">
        <button type="button" className="pw-row" onClick={showDiagnostics}>
          <IconWheel className="pw-row-icon" />
          <span className="pw-row-label">{t('pwaApp.connectionStatus')}</span>
          <span className="pw-row-value">
            <i style={{ background: agentConnected ? '#10B981' : '#EF4444' }} />
            {agentConnected ? t('pwaApp.online') : t('pwaApp.offline')}
          </span>
        </button>
      </div>

      <div className="pw-group-title">{t('pwaApp.accountTitle')}</div>
      <div className="pw-card pw-list">
        <div className="pw-row" style={{ cursor: 'default' }}>
          <IconUser className="pw-row-icon" />
          <span className="pw-row-label">{t('pwaApp.signedInAs')}</span>
          <span className="pw-row-value">{user?.name || user?.email}</span>
        </div>
        <label className="pw-row">
          <IconGlobe className="pw-row-icon" />
          <span className="pw-row-label">{t('pwaApp.languageLabel')}</span>
          <select value={user?.language || 'en'} disabled={changingLanguage} onChange={(e) => handleLanguageChange(e.target.value)}>
            {ADMIN_LANGUAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button type="button" className="pw-row danger" onClick={() => { logout(); navigate('/login'); }}>
          <IconLogout className="pw-row-icon" style={{ color: 'inherit' }} />
          <span className="pw-row-label">{t('pwa.signOut')}</span>
        </button>
      </div>
    </div>
  );
}
