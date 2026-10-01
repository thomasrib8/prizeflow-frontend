import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export default function ResetPassword() {
  const { t } = useTranslation('admin');
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError(t('auth.resetPassword.passwordsDontMatchError')); return; }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
          <h1 className="auth-title">{t('settings.information.passwordUpdated')}</h1>
          <p className="auth-subtitle">{t('auth.resetPassword.redirectingDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img src="/logo2.svg" alt="SPARK" style={{ width: 100, height: 100, objectFit: 'contain' }} />
        </div>

        <h1 className="auth-title" style={{ textAlign: 'center' }}>{t('auth.resetPassword.chooseNewPasswordTitle')}</h1>

        {error && <div className="error-banner" style={{ textAlign: 'left' }}>{error}</div>}

        <div className="field" style={{ textAlign: 'left' }}>
          <label>{t('settings.information.newPasswordLabel')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder={t('settings.information.newPasswordPlaceholder')} minLength={8} required autoFocus />
        </div>
        <div className="field" style={{ textAlign: 'left' }}>
          <label>{t('auth.resetPassword.confirmPasswordLabel')}</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')} minLength={8} required />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {loading ? t('common.saving') : t('auth.resetPassword.saveNewPasswordBtn')}
        </button>

        <p style={{ fontSize: 13, color: '#64748B', marginTop: 16 }}>
          <Link to="/login">{t('auth.backToSignIn')}</Link>
        </p>
      </form>
    </div>
  );
}
