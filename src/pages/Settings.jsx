import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, updateStoredUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  function load() {
    api.getAccountSettings()
      .then((res) => { setGoogleReviewUrl(res.googleReviewUrl); setSavedUrl(res.googleReviewUrl); })
      .catch((e) => setError(e.message));
    api.listCampaigns()
      .then(setCampaigns)
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

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

  async function handleSaveName(e) {
    e.preventDefault();
    setNameSaving(true);
    setNameMsg('');
    try {
      const { user: updated } = await api.updateProfile({ name });
      updateStoredUser({ name: updated.name });
      setNameMsg('Saved');
      setTimeout(() => setNameMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setNameSaving(false);
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile and the Google review gate for guest spins</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Card title="Your profile" className="mt-card">
        <form onSubmit={handleSaveName} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <Button type="submit" disabled={nameSaving || name === (user?.name || '')} style={{ marginTop: 20 }}>
            {nameSaving ? 'Saving…' : 'Save'}
          </Button>
          {nameMsg && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600, marginTop: 20 }}>{nameMsg}</span>}
        </form>

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

      <Card title="Google review link" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 10px', lineHeight: 1.6 }}>
          Guests are sent to this link when a campaign requires a review before spinning. Paste the link to
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

      <Card title="Require a Google review before spinning" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
          Per campaign — when enabled, guests must open the review link and stay away long enough before their
          spin unlocks. This isn't a verified check (Google doesn't expose that), just a friction gate.
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
                  Require review
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
    </div>
  );
}
