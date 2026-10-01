import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';

// The language guests see throughout the play flow — see NewCampaign.jsx's
// LANGUAGE_OPTIONS for why this is separate from the admin panel's language.
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
];

// Edits an already-launched campaign's gifts in place — name, redeem method,
// and (for 'perso') its delivery/subject/body/auto-distribute. Deliberately
// excludes stock (shown read-only) and never adds/removes cases — only the
// slots already configured at creation can be edited here.
export default function EditCampaign() {
  const { t } = useTranslation('admin');
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventName, setEventName] = useState('');
  const [language, setLanguage] = useState('en');
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getCampaign(id).then((source) => {
      setName(source.name || '');
      setDescription(source.description || '');
      setEventName(source.event_name || '');
      setLanguage(source.language || 'en');
      if (source.status === 'archived') {
        setError(t('editCampaign.archivedReadOnlyError'));
        setCampaign(source);
        return;
      }
      setCampaign(source);
      setSlots(source.slots.map((s) => ({
        slotIndex: s.slot_index,
        giftName: s.gift_name,
        stockInitial: s.stock_initial,
        stockRemaining: s.stock_remaining,
        redeemMethod: ['code', 'voucher', 'perso'].includes(s.redeem_method) ? s.redeem_method : 'qr',
        persoDelivery: s.perso_delivery || 'qr',
        persoSubject: s.perso_subject || '',
        persoBody: s.perso_body || '',
        persoAutoDistribute: !!s.perso_auto_distribute,
      })));
    }).catch((e) => setError(e.message));
  }, [id]);

  function updateSlot(i, field, value) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError(t('newCampaign.campaignNameRequiredError'));
    for (const s of slots) {
      if (!s.giftName.trim()) return setError(t('editCampaign.giftNameRequiredError', { n: s.slotIndex + 1 }));
      if (s.redeemMethod === 'perso' && (!s.persoSubject.trim() || !s.persoBody.trim())) {
        return setError(t('newCampaign.persoNeedsSubjectBodyError', { n: s.slotIndex + 1 }));
      }
    }
    setSaving(true);
    try {
      await api.updateCampaignDetails(id, { name, description, eventName, language });
      await api.updateCampaignSlots(id, {
        slots: slots.map((s) => ({
          slotIndex: s.slotIndex,
          giftName: s.giftName,
          redeemMethod: s.redeemMethod,
          ...(s.redeemMethod === 'perso'
            ? { persoDelivery: s.persoDelivery, persoSubject: s.persoSubject, persoBody: s.persoBody, persoAutoDistribute: !!s.persoAutoDistribute }
            : {}),
        })),
      });
      navigate(`/campaigns/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!campaign) return <p className="page-subtitle">{error || t('common.loading')}</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('editCampaign.pageTitle', { name: campaign.name })}</h1>
          <p className="page-subtitle">{t('editCampaign.pageSubtitle')}</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {campaign.status !== 'archived' && (
        <form onSubmit={handleSubmit}>
          <Card title={t('newCampaign.campaignDetailsTitle')} className="mt-card">
            <div className="field">
              <label>{t('newCampaign.nameLabel')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>{t('newCampaign.descriptionLabel')}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="field">
              <label>{t('newCampaign.eventNameLabel')}</label>
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder={t('newCampaign.eventNamePlaceholder')} />
            </div>
            <div className="field">
              <label>{t('newCampaign.guestLanguageLabel')}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}>
                {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                {t('newCampaign.guestLanguageHint')}
              </div>
            </div>
          </Card>

          <Card title={t('editCampaign.giftsTitle')} className="mt-card">
            <div className="slots-grid">
              {slots.map((s, i) => (
                <div key={s.slotIndex} style={{ display: 'contents' }}>
                  <div className="slot-row">
                    <div className="slot-index">{t('dashboard.caseLabel', { n: s.slotIndex + 1 })}</div>
                    <input placeholder={t('editCampaign.giftNamePlaceholder')} value={s.giftName} onChange={(e) => updateSlot(i, 'giftName', e.target.value)} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {t('editCampaign.stockLeftLabel', { remaining: s.stockRemaining, initial: s.stockInitial })}
                    </div>
                    <select value={s.redeemMethod} title={t('editCampaign.redeemMethodTitle')} onChange={(e) => updateSlot(i, 'redeemMethod', e.target.value)}>
                      <option value="qr">QR</option>
                      <option value="code">Code</option>
                      <option value="voucher">Voucher</option>
                      <option value="perso">Perso</option>
                    </select>
                    <div className="slot-pct" />
                  </div>
                  {s.redeemMethod === 'perso' && (
                    <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, margin: '-2px 0 4px' }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <div className="field" style={{ margin: 0, flex: '0 0 180px' }}>
                          <label style={{ fontSize: 11 }}>{t('editCampaign.deliversLabel')}</label>
                          <select value={s.persoDelivery} onChange={(e) => updateSlot(i, 'persoDelivery', e.target.value)}>
                            <option value="code">{t('editCampaign.deliversCode')}</option>
                            <option value="qr">{t('editCampaign.deliversQr')}</option>
                            <option value="text">{t('editCampaign.deliversText')}</option>
                          </select>
                        </div>
                        <div className="field" style={{ margin: 0, flex: '1 1 260px' }}>
                          <label style={{ fontSize: 11 }}>{t('settings.emailTemplates.subjectLabel')}</label>
                          <input placeholder={t('editCampaign.subjectPlaceholder')} value={s.persoSubject} onChange={(e) => updateSlot(i, 'persoSubject', e.target.value)} />
                        </div>
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: 11 }}>
                          {t('editCampaign.messageLabel', { vars: `{{firstName}} / {{giftName}}${s.persoDelivery === 'code' ? ' / {{code}}' : ''}` })}
                        </label>
                        <textarea rows={2} placeholder={t('editCampaign.messagePlaceholder')} value={s.persoBody} onChange={(e) => updateSlot(i, 'persoBody', e.target.value)} style={{ width: '100%', fontFamily: 'inherit' }} />
                        {s.persoDelivery === 'code' && (
                          <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                            {t('editCampaign.codeAutoAddedNote', { code: '{{code}}' })}
                          </p>
                        )}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!s.persoAutoDistribute} onChange={(e) => updateSlot(i, 'persoAutoDistribute', e.target.checked)} />
                        <span style={{ fontSize: 12, color: '#334155' }}>
                          {t('editCampaign.autoDistributeLabel')}
                          <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>{t('editCampaign.autoDistributeDesc')}</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('editCampaignSettings.saveChangesBtn')}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/campaigns/${id}`)}>{t('common.cancel')}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
