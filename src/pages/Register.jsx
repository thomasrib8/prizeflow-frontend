import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FIELDS = [
  { key: 'lastName', label: 'Nom', placeholder: 'Dupont' },
  { key: 'firstName', label: 'Prénom', placeholder: 'Jean' },
  { key: 'company', label: 'Société', placeholder: 'Hôtel Belle Vue' },
  { key: 'industrySector', label: "Secteur d'activité", placeholder: 'Hôtellerie' },
  { key: 'address', label: 'Adresse', placeholder: '12 rue des Lilas, 75000 Paris' },
  { key: 'email', label: 'Email', placeholder: 'contact@votresociete.com', type: 'email' },
  { key: 'phone', label: 'Téléphone', placeholder: '06 12 34 56 78', type: 'tel' },
  { key: 'password', label: 'Mot de passe', placeholder: '8 caractères minimum', type: 'password' },
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
      setError(`Merci de renseigner : ${missing.map((f) => f.label).join(', ')}.`);
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
          <h1 className="auth-title">Demande envoyée</h1>
          <p className="auth-subtitle">
            Votre compte a été créé et est en attente de validation par un administrateur. Vous pourrez vous
            connecter une fois qu'il sera approuvé.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit} style={{ textAlign: 'center', maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img src="/logo2.svg" alt="PrizeFlow" style={{ width: 100, height: 100, objectFit: 'contain' }} />
        </div>

        <h1 className="auth-title" style={{ textAlign: 'center' }}>Créer un compte</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>Un administrateur devra le valider avant que vous puissiez vous connecter</p>

        {error && <div className="error-banner" style={{ textAlign: 'left' }}>{error}</div>}

        {FIELDS.map((f, i) => (
          <div className="field" style={{ textAlign: 'left' }} key={f.key}>
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

        <button className="btn btn-primary" type="submit" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {loading ? 'Création…' : 'Créer le compte'}
        </button>

        <p style={{ fontSize: 13, color: '#64748B', marginTop: 16 }}>
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
