import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { t } = useTranslation('admin');
  const FIELDS = [
    { key: 'lastName', label: t('settings.information.fieldLastName'), placeholder: t('auth.register.lastNamePlaceholder') },
    { key: 'firstName', label: t('settings.information.fieldFirstName'), placeholder: t('auth.register.firstNamePlaceholder') },
    { key: 'company', label: t('settings.information.fieldCompany'), placeholder: t('auth.register.companyPlaceholder') },
    { key: 'industrySector', label: t('settings.information.fieldIndustrySector'), placeholder: t('auth.register.industryPlaceholder') },
    { key: 'address', label: t('settings.information.fieldAddress'), placeholder: t('auth.register.addressPlaceholder'), fullWidth: true },
    { key: 'email', label: t('auth.register.fieldEmail'), placeholder: t('auth.register.emailPlaceholder'), type: 'email' },
    { key: 'phone', label: t('settings.information.fieldPhone'), placeholder: t('auth.register.phonePlaceholder'), type: 'tel' },
    { key: 'password', label: t('auth.register.fieldPassword'), placeholder: t('settings.information.newPasswordPlaceholder'), type: 'password', fullWidth: true },
  ];
  const { register } = useAuth();
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const missing = FIELDS.filter((f) => !String(values[f.key] || '').trim());
    if (missing.length) {
      setError(t('auth.register.pleaseFillInError', { fields: missing.map((f) => f.label).join(', ') }));
      return;
    }
    setLoading(true);
    try {
      await register(values);
      setDone(true);
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
          <h1 className="auth-title">{t('auth.register.requestSentTitle')}</h1>
          <p className="auth-subtitle">
            {t('auth.register.requestSentDesc')}
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
            {t('auth.backToSignIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <form className="auth-card auth-card-wide" onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img src="/logo2.svg" alt="SPARK" style={{ width: 100, height: 100, objectFit: 'contain' }} />
        </div>

        <h1 className="auth-title" style={{ textAlign: 'center' }}>{t('auth.register.createAccountTitle')}</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>{t('auth.register.createAccountSubtitle')}</p>

        {error && <div className="error-banner" style={{ textAlign: 'left' }}>{error}</div>}

        <div className="register-grid">
          {FIELDS.map((f, i) => (
            <div className={`field${f.fullWidth ? ' field-full' : ''}`} style={{ textAlign: 'left' }} key={f.key}>
              <label>{f.label}</label>
              <input
                type={f.type || 'text'}
                value={values[f.key] || ''}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                minLength={f.key === 'password' ? 8 : undefined}
                required
                autoFocus={i === 0}
              />
            </div>
          ))}
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
          {loading ? t('auth.register.creatingBtn') : t('auth.register.createAccountBtn')}
        </button>

        <Link to="/login" className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
          {t('auth.login.signInBtn')}
        </Link>
      </form>
    </div>
  );
}
