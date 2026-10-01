import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export default function ForgotPassword() {
  const { t } = useTranslation('admin');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📩</div>
          <h1 className="auth-title">{t('auth.forgotPassword.checkEmailTitle')}</h1>
          <p className="auth-subtitle">{t('auth.forgotPassword.checkEmailDesc')}</p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
            {t('auth.backToSignIn')}
          </Link>
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

        <h1 className="auth-title" style={{ textAlign: 'center' }}>{t('auth.forgotPassword.title')}</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>{t('auth.forgotPassword.subtitle')}</p>

        {error && <div className="error-banner" style={{ textAlign: 'left' }}>{error}</div>}

        <div className="field" style={{ textAlign: 'left' }}>
          <label>{t('auth.emailLabel')}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')} required autoFocus />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {loading ? t('auth.forgotPassword.sendingBtn') : t('auth.forgotPassword.sendResetLinkBtn')}
        </button>

        <p style={{ fontSize: 13, color: '#64748B', marginTop: 16 }}>
          <Link to="/login">{t('auth.backToSignIn')}</Link>
        </p>
      </form>
    </div>
  );
}
