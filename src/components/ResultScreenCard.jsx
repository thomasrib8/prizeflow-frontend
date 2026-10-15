import { useTranslation } from 'react-i18next';
import { Card } from './ui';
import { RESULT_EMOJIS, resultCopy } from '../utils/resultScreen';

export const DEFAULT_RESULT_SCREEN = {
  title: '', message: '', emoji: 'party', showGift: false,
  button: { enabled: false, label: '', url: '' },
};

// campaigns.result_screen_json (string or null) -> form value
export function resultScreenFromCampaign(c) {
  let raw = c && c.result_screen_json;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { raw = null; } }
  return { ...DEFAULT_RESULT_SCREEN, ...(raw || {}), button: { ...DEFAULT_RESULT_SCREEN.button, ...((raw && raw.button) || {}) } };
}

const hint = { fontSize: 12, color: '#94A3B8', marginTop: 4, lineHeight: 1.5 };

// Mini phone showing the guest's final screen exactly as the real one builds it.
function Preview({ value, guestT, giftName }) {
  const copy = resultCopy(value, { firstName: 'Marie', giftName, t: guestT });
  const btn = value.button && value.button.enabled && value.button.label ? value.button : null; // shown as soon as it has a label, even before the link is typed
  return (
    <div style={{ width: 230, minHeight: 360, borderRadius: 26, border: '6px solid #0B1437', background: 'linear-gradient(160deg, #0055F8 0%, #266FF9 100%)', color: 'white', textAlign: 'center', padding: '34px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxSizing: 'border-box', margin: '0 auto' }}>
      <div style={{ fontSize: 40, minHeight: 46 }}>{copy.emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#90DCFE', letterSpacing: '0.12em', textTransform: 'uppercase', overflowWrap: 'anywhere' }}>{copy.title}</div>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{copy.message}</div>
      {copy.gift && <div style={{ fontSize: 20, fontWeight: 900, color: '#90DCFE', overflowWrap: 'anywhere' }}>{copy.gift}</div>}
      {btn && <div style={{ marginTop: 6, background: 'white', color: '#002881', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, maxWidth: '100%', overflowWrap: 'anywhere' }}>{btn.label}</div>}
    </div>
  );
}

export default function ResultScreenCard({ value, onChange, language = 'fr', compact = false }) {
  const { t, i18n } = useTranslation('admin');
  const guestT = i18n.getFixedT(language, 'translation');
  const rs = value || DEFAULT_RESULT_SCREEN;
  const set = (patch) => onChange({ ...rs, ...patch });
  const setBtn = (patch) => onChange({ ...rs, button: { ...rs.button, ...patch } });
  const emojiLabels = { party: '🎉', gift: '🎁', heart: '❤️', none: t('campaignSettings.resultScreen.emojiNone') };

  return (
    <Card title={t('campaignSettings.resultScreen.title')} className="mt-card">
      {!compact && <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>{t('campaignSettings.resultScreen.desc')}</p>}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div className="field">
            <label>{t('campaignSettings.resultScreen.titleLabel')}</label>
            <input type="text" maxLength={80} value={rs.title} placeholder={guestT('result.thankYouWithName', { name: '{firstName}' })} onChange={(e) => set({ title: e.target.value })} />
            <div style={hint}>{t('campaignSettings.resultScreen.titleHint')}</div>
          </div>
          <div className="field">
            <label>{t('campaignSettings.resultScreen.messageLabel')}</label>
            <textarea rows={3} maxLength={240} value={rs.message} placeholder={guestT('result.emailNotice')} onChange={(e) => set({ message: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <div style={hint}>{t('campaignSettings.resultScreen.customNoTranslate')}</div>
          </div>
          <div className="field">
            <label>{t('campaignSettings.resultScreen.emojiLabel')}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.keys(RESULT_EMOJIS).map((k) => (
                <button key={k} type="button" onClick={() => set({ emoji: k })} aria-pressed={rs.emoji === k}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${rs.emoji === k ? '#002881' : '#E2E8F0'}`, background: rs.emoji === k ? '#EEF3FF' : 'white', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {emojiLabels[k]}
                </button>
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', margin: '6px 0 4px' }}>
            <input type="checkbox" checked={!!rs.showGift} onChange={(e) => set({ showGift: e.target.checked })} style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{t('campaignSettings.resultScreen.showGift')}</span>
          </label>
          <div style={{ ...hint, marginBottom: 12 }}>{t('campaignSettings.resultScreen.showGiftHint')}</div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', margin: '6px 0 8px' }}>
            <input type="checkbox" checked={!!rs.button.enabled} onChange={(e) => setBtn({ enabled: e.target.checked })} style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{t('campaignSettings.resultScreen.buttonToggle')}</span>
          </label>
          {rs.button.enabled && (
            <>
              <div className="field">
                <label>{t('campaignSettings.resultScreen.buttonLabel')}</label>
                <input type="text" maxLength={40} value={rs.button.label} placeholder={t('campaignSettings.resultScreen.buttonLabelPh')} onChange={(e) => setBtn({ label: e.target.value })} />
              </div>
              <div className="field">
                <label>{t('campaignSettings.resultScreen.buttonUrl')}</label>
                <input type="url" value={rs.button.url} placeholder="https://" onChange={(e) => setBtn({ url: e.target.value })} />
                <div style={hint}>{t('campaignSettings.resultScreen.buttonHint')}</div>
              </div>
            </>
          )}
        </div>
        {!compact && (
          <div style={{ flex: '0 0 auto', margin: '0 auto' }}>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>{t('campaignSettings.resultScreen.preview')}</div>
            <Preview value={rs} guestT={guestT} giftName={t('campaignSettings.resultScreen.sampleGift')} />
          </div>
        )}
      </div>
    </Card>
  );
}
