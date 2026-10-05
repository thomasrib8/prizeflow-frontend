import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card } from './ui';

// Line icons (24px, 1.8 stroke — same style as the PWA's menu icons) used by
// the compact/mobile variant instead of emoji.
const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, width: 20, height: 20 };
const FacebookIcon = () => <svg {...svgProps}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
const InstagramIcon = () => <svg {...svgProps}><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z" /><path d="M17.5 6.5h.01" /></svg>;
const LinkedinIcon = () => <svg {...svgProps}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>;
const XIcon = () => <svg {...svgProps}><path d="M4 4l16 16M20 4 4 20" /></svg>;

// Brand names — never translated. Keys match GET /account/settings.
const SOCIAL_PLATFORMS = [
  { key: 'facebookUrl', label: 'Facebook', icon: '📘', Svg: FacebookIcon },
  { key: 'instagramUrl', label: 'Instagram', icon: '📷', Svg: InstagramIcon },
  { key: 'linkedinUrl', label: 'LinkedIn', icon: '💼', Svg: LinkedinIcon },
  { key: 'xUrl', label: 'X', icon: '✖️', Svg: XIcon },
];

export const DEFAULT_CAMPAIGN_SETTINGS = {
  googleReviewMode: 'off', // 'off' | 'before' | 'after'
  googleReviewUrl: '', // '' = follow the account's link (Settings)
  socialMediaRequired: false,
  aiAssistantEnabled: false,
};

// Maps a campaigns row (snake_case columns, as returned by the API) to this
// form's value shape — used when editing an existing campaign or duplicating.
export function settingsFromCampaign(c) {
  return {
    googleReviewMode: c.google_review_required ? (c.google_review_position === 'before' ? 'before' : 'after') : 'off',
    googleReviewUrl: c.google_review_url || '',
    socialMediaRequired: !!c.social_media_required,
    aiAssistantEnabled: !!c.ai_assistant_enabled,
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
            {configuredSocials.map((p) => <span key={p.key}><p.Svg />{p.label}</span>)}
          </div>
        )}
        {account && configuredSocials.length > 0 && !compact && (
          <div style={{ fontSize: 13, color: '#64748B' }}>
            {t('campaignSettings.socialLinksUsed')}{' '}
            {configuredSocials.map((p) => `${p.icon} ${p.label}`).join(' · ')}
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
    </>
  );
}
