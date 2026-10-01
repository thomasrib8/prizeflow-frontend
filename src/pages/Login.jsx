import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

// returnTo comes straight from the URL, so it's attacker-controllable —
// resolve it against our own origin and refuse anything that doesn't land
// back on it (an absolute external URL, or a protocol-relative "//evil.com"
// smuggled in). Never navigate anywhere the resolved origin doesn't match.
function safeReturnTo(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export default function Login() {
  const { t } = useTranslation('admin');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Lets a reward link (e.g. /redeem/:code, reached by scanning a QR
      // while logged out) send the operator back to the same page instead
      // of always dropping them on the dashboard.
      navigate(safeReturnTo(searchParams.get('returnTo')) || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit} style={{ textAlign: 'center' }}>

        {/* Logo centered, larger */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img src="/logo2.svg" alt="SPARK" style={{ width: 100, height: 100, objectFit: 'contain' }} />
        </div>

        <h1 className="auth-title" style={{ textAlign: 'center' }}>{t('auth.login.welcomeBackTitle')}</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>{t('auth.login.signInSubtitle')}</p>

        {error && <div className="error-banner" style={{ textAlign: 'left' }}>{error}</div>}

        <div className="field" style={{ textAlign: 'left' }}>
          <label>{t('auth.emailLabel')}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')} required autoFocus />
        </div>
        <div className="field" style={{ textAlign: 'left' }}>
          <label>{t('auth.login.passwordLabel')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {loading ? t('auth.login.signingInBtn') : t('auth.login.signInBtn')}
        </button>

        <p style={{ fontSize: 13, color: '#64748B', marginTop: 16 }}>
          <Link to="/forgot-password">{t('auth.login.forgotPasswordLink')}</Link>
        </p>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
          {t('auth.login.noAccountYetText')} <Link to="/register">{t('auth.login.createOneLink')}</Link>
        </p>
      </form>
    </div>
  );
}