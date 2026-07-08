import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
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
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo || '/');
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
          <img src="/logo2.svg" alt="PrizeFlow" style={{ width: 100, height: 100, objectFit: 'contain' }} />
        </div>

        <h1 className="auth-title" style={{ textAlign: 'center' }}>Welcome back</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>Sign in to operate your campaigns</p>

        {error && <div className="error-banner" style={{ textAlign: 'left' }}>{error}</div>}

        <div className="field" style={{ textAlign: 'left' }}>
          <label>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="operator@yourvenue.com" required autoFocus />
        </div>
        <div className="field" style={{ textAlign: 'left' }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ fontSize: 13, color: '#64748B', marginTop: 16 }}>
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}