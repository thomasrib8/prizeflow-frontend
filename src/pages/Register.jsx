import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FIELDS = [
  { key: 'lastName', label: 'Last name', placeholder: 'Smith' },
  { key: 'firstName', label: 'First name', placeholder: 'John' },
  { key: 'company', label: 'Company', placeholder: 'Belle Vue Hotel' },
  { key: 'industrySector', label: 'Industry sector', placeholder: 'Hospitality' },
  { key: 'address', label: 'Address', placeholder: '12 Main Street, City', fullWidth: true },
  { key: 'email', label: 'Email', placeholder: 'contact@yourcompany.com', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: '06 12 34 56 78', type: 'tel' },
  { key: 'password', label: 'Password', placeholder: 'At least 8 characters', type: 'password', fullWidth: true },
];

export default function Register() {
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
      setError(`Please fill in: ${missing.map((f) => f.label).join(', ')}.`);
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
          <h1 className="auth-title">Request sent</h1>
          <p className="auth-subtitle">
            Your account has been created and is awaiting approval by an administrator. You'll be able to sign in
            once it's approved.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
            Back to sign in
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

        <h1 className="auth-title" style={{ textAlign: 'center' }}>Create an account</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>An administrator will need to approve it before you can sign in</p>

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
          {loading ? 'Creating…' : 'Create account'}
        </button>

        <Link to="/login" className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
          Sign in
        </Link>
      </form>
    </div>
  );
}
