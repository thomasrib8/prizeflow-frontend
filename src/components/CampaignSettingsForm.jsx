import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card } from './ui';
import CreditsBar from './linkedin/CreditsBar';
import LinkedInIcon from './linkedin/LinkedInIcon';
import { FacebookIcon, InstagramIcon, LinkedinIcon, XIcon } from './SocialIcons';

// Brand names — never translated. Keys match GET /account/settings.
const SOCIAL_PLATFORMS = [
  { key: 'facebookUrl', label: 'Facebook', Svg: FacebookIcon },
  { key: 'instagramUrl', label: 'Instagram', Svg: InstagramIcon },
  { key: 'linkedinUrl', label: 'LinkedIn', Svg: LinkedinIcon },
  { key: 'xUrl', label: 'X', Svg: XIcon },
];

export const DEFAULT_CAMPAIGN_SETTINGS = {
  googleReviewMode: 'off', // 'off' | 'before' | 'after'
  googleReviewUrl: '', // '' = follow the account's link (Settings)
  socialMediaRequired: false,
  aiAssistantEnabled: false,
  linkedinSearchEnabled: false,
};

// Maps a campaigns row (snake_case columns, as returned by the API) to this
// form's value shape — used when editing an existing campaign or duplicating.
export function settingsFromCampaign(c) {
  return {
    googleReviewMode: c.google_review_required ? (c.google_review_position === 'before' ? 'before' : 'after') : 'off',
    googleReviewUrl: c.google_review_url || '',
    socialMediaRequired: !!c.social_media_required,
    aiAssistantEnabled: !!c.ai_assistant_enabled,
    linkedinSearchEnabled: !!c.linkedin_search_enabled,
  };
}

const selectStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'white' };
const hintStyle = { fontSize: 12, color: '#94A3B8', marginTop: 4, lineHeight: 1.5 };
const warnStyle = { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, fontSize: 13, color: '#92400E', lineHeight: 1.5 };

// The campaign "Settings" cards: Google review invite (with an optional
// link just for this campaign), social media invite (links come from the
// app's Settings — not editable here) and the AI assistant. Shared by New
// campaign's last step and the campaign's "Edit settings" page.
//
// `value` is controlled by the parent; `onChange(patch)` receives only the
// changed fields so the parent can merge them into its own state.
// `compact` is the mobile (PWA) presentation: same fields and behaviour, but
// without the explanatory paragraphs and with line icons instead of emoji.
export default function CampaignSettingsForm({ value, onChange, compact = false }) {
  const { t } = useTranslation('admin');
  const [account, setAccount] = useState(null);
  const [aiConfigured, setAiConfigured] = useState(null);
  const prefilledRef = useRef(false);

  useEffect(() => {
    api.getAccountSettings().then(setAccount).catch(() => setAccount({}));
    api.getAiAssistantStatus().then((res) => setAiConfigured(res.configured)).catch(() => setAiConfigured(false));
  }, []);

  // The app's own link is the starting point: pre-fill it once it's known
  // (only if this campaign doesn't already carry its own), so changing it
  // here is a deliberate override for this campaign alone.
  useEffect(() => {
    if (!account || prefilledRef.current) return;
    prefilledRef.current = true;
    if (!value.googleReviewUrl && account.googleReviewUrl) onChange({ googleReviewUrl: account.googleReviewUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const accountUrl = account?.googleReviewUrl || '';
  const reviewOn = value.googleReviewMode !== 'off';
  const url = value.googleReviewUrl.trim();
  const configuredSocials = SOCIAL_PLATFORMS.filter((p) => account?.[p.key]);

  return (
    <>
      <Card title={t('campaignSettings.googleReviewTitle')} className="mt-card">
        {!compact && (
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>
            {t('campaignSettings.googleReviewDesc')}
          </p>
        )}
        <div className="field">
          {!compact && <label>{t('campaignSettings.googleReviewModeLabel')}</label>}
          <select
            aria-label={t('campaignSettings.googleReviewModeLabel')}
            value={value.googleReviewMode}
            onChange={(e) => onChange({ googleReviewMode: e.target.value })}
            style={selectStyle}
          >
            <option value="off">{t('settings.googleReview.reviewOptionOff')}</option>
            <option value="before">{t('settings.googleReview.beforeGameLabel')}</option>
            <option value="after">{t('settings.googleReview.afterGameLabel')}</option>
          </select>
          {reviewOn && !compact && (
            <div style={hintStyle}>
              {value.googleReviewMode === 'before' ? t('settings.googleReview.beforeGameDesc') : t('settings.googleReview.afterGameDesc')}
            </div>
          )}
        </div>

        {reviewOn && (
          <div className="field">
            <label>{t('campaignSettings.linkLabel')}</label>
            <input
              type="url"
              placeholder="https://g.page/r/.../review"
              value={value.googleReviewUrl}
              onChange={(e) => onChange({ googleReviewUrl: e.target.value })}
            />
            {accountUrl && url !== accountUrl && (
              <button
                type="button"
                onClick={() => onChange({ googleReviewUrl: accountUrl })}
                style={{ display: 'block', textAlign: 'left', background: 'none', border: 'none', padding: 0, marginTop: 6, color: '#002881', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
              >
                {t('campaignSettings.useDefaultLinkBtn')}
              </button>
            )}
            {(!compact || !accountUrl) && (
              <div style={hintStyle}>{accountUrl ? t('campaignSettings.linkDefaultHint') : t('campaignSettings.linkMissingHint')}</div>
            )}
          </div>
        )}

        {reviewOn && !compact && (
          <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
            {t('settings.googleReview.neverConditionNote')}
          </p>
        )}
      </Card>

      <Card title={t('campaignSettings.socialTitle')} className="mt-card">
        {!compact && (
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>
            {t('campaignSettings.socialDesc')}
          </p>
        )}
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={value.socialMediaRequired}
            onChange={(e) => onChange({ socialMediaRequired: e.target.checked })}
            style={{ width: 18, height: 18, flexShrink: 0 }}
          />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t('campaignSettings.socialToggleLabel')}</span>
        </label>
        {account && configuredSocials.length > 0 && compact && (
          <div className="pw-social-chips">
            {configuredSocials.map((p) => <span key={p.key}><p.Svg size={20} />{p.label}</span>)}
          </div>
        )}
        {account && configuredSocials.length > 0 && !compact && (
          <div style={{ fontSize: 13, color: '#64748B' }}>
            {t('campaignSettings.socialLinksUsed')}{' '}
            {configuredSocials.map((p, i) => <span key={p.key}>{i > 0 ? ' · ' : ''}<p.Svg size={15} /> {p.label}</span>)}
          </div>
        )}
        {account && configuredSocials.length === 0 && (
          <div style={warnStyle}>{t('campaignSettings.socialNoLinksWarning')}</div>
        )}
        <div style={{ marginTop: 10 }}>
          <Link to="/settings" style={{ fontSize: 12, color: '#002881' }}>{t('campaignSettings.manageInSettingsLink')}</Link>
        </div>
      </Card>

      <Card title={t('campaignSettings.aiTitle')} className="mt-card">
        {!compact && (
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>
            {t('campaignSettings.aiDesc')}
          </p>
        )}
        {aiConfigured === false && (
          <div style={{ ...warnStyle, marginBottom: 14 }}>{t('settings.aiAssistant.notConfiguredWarning')}</div>
        )}
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value.aiAssistantEnabled}
            onChange={(e) => onChange({ aiAssistantEnabled: e.target.checked })}
            style={{ width: 18, height: 18, flexShrink: 0 }}
          />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t('campaignSettings.aiToggleLabel')}</span>
        </label>
      </Card>

      {/* LinkedIn profile search: only offered when an SPARK admin has allowed it for this account */}
      {account?.linkedinSearch?.enabled && (
        <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><LinkedInIcon style={{ width: 18, height: 18 }} />{t('linkedin.cardTitle')}</span>} className="mt-card">
          {!compact && (
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>{t('linkedin.cardDesc')}</p>
          )}
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!value.linkedinSearchEnabled}
              onChange={(e) => onChange({ linkedinSearchEnabled: e.target.checked })}
              style={{ width: 18, height: 18, flexShrink: 0 }}
            />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{t('linkedin.cardToggle')}</span>
          </label>
          {value.linkedinSearchEnabled && (
            <div style={{ marginTop: 16 }}>
              <CreditsBar
                credits={account.linkedinSearch}
                label={t('linkedin.creditsOf', { remaining: account.linkedinSearch.remaining.toLocaleString(), total: account.linkedinSearch.total.toLocaleString() })}
              />
              <p style={{ ...hintStyle, marginTop: 10 }}>{account.linkedinSearch.remaining <= 0 ? t('linkedin.cardExhausted') : t('linkedin.cardNote')}</p>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
