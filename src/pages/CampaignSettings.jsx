import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from '../components/ui';
import CampaignSettingsForm, { DEFAULT_CAMPAIGN_SETTINGS, settingsFromCampaign } from '../components/CampaignSettingsForm';

// Post-creation editing of New campaign's "Settings" step: Google review
// invite (and its link for this campaign), social media invite, AI assistant.
// Editable on a running campaign too — guests pick the change up on their
// next page load. (Segmentation / forms live on EditCampaignSettings.jsx,
// gifts on EditCampaign.jsx.)
export default function CampaignSettings() {
  const { t } = useTranslation('admin');
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_CAMPAIGN_SETTINGS);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    api.getCampaign(id).then((c) => {
      setCampaign(c);
      setSettings(settingsFromCampaign(c));
    }).catch((e) => setError(e.message));
  }, [id]);

  async function handleSave() {
    if (settings.googleReviewMode !== 'off' && !settings.googleReviewUrl.trim()) {
      setError(t('campaignSettings.googleReviewLinkRequiredError'));
      return;
    }
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      await api.updateCampaignSettings(id, { ...settings, googleReviewUrl: settings.googleReviewUrl.trim() });
      setSavedMsg(t('common.saved'));
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!campaign) return <p className="page-subtitle">{error || t('common.loading')}</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('campaignSettings.editPageTitle', { name: campaign.name })}</h1>
          <p className="page-subtitle">{t('campaignSettings.editPageSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {savedMsg && <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>{savedMsg}</span>}
          <Button disabled={saving} onClick={handleSave}>{saving ? t('common.saving') : t('editCampaignSettings.saveChangesBtn')}</Button>
          <Button variant="secondary" onClick={() => navigate(`/campaigns/${id}`)}>{t('editCampaignSettings.backBtn')}</Button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <CampaignSettingsForm value={settings} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} />

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Button disabled={saving} onClick={handleSave}>{saving ? t('common.saving') : t('editCampaignSettings.saveChangesBtn')}</Button>
        <Button variant="secondary" onClick={() => navigate(`/campaigns/${id}`)}>{t('editCampaignSettings.backBtn')}</Button>
      </div>
    </div>
  );
}
