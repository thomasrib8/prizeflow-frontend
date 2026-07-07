import { useState } from 'react';
import { api } from '../api/client';
import { Button } from './ui';
import './ResultOverlay.css';

export default function ResultOverlay({ result, onClose }) {
  const [stage, setStage] = useState(result.demo ? 'result-demo' : 'result'); // result | form | sent
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rewardId, setRewardId] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.consent) {
      setError('Consent is required to send the reward.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.submitReward(result.distributionId, form);
      setRewardId(res.rewardId);
      setStage('sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay">
      {stage === 'result-demo' && (
        <div className="overlay-content">
          <div className="result-emoji">🎡</div>
          <div className="result-title">Demo spin</div>
          <div className="result-gift">Case {result.slotIndex + 1}</div>
          <p className="result-note">No stock was used, no client recorded.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      )}

      {stage === 'result' && (
        <div className="overlay-content">
          <div className="result-emoji">🎉</div>
          <div className="result-title">CONGRATULATIONS</div>
          <div className="result-gift">{result.giftName}</div>
          {result.roomNumber && <div className="result-room">Room {result.roomNumber}</div>}
          <Button onClick={() => setStage('form')} style={{ marginTop: 28 }}>
            Continue
          </Button>
        </div>
      )}

      {stage === 'form' && (
        <div className="overlay-content overlay-form">
          <h2 className="form-title">Guest details</h2>
          <p className="form-sub">
            {result.giftName} · Room {result.roomNumber}
          </p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label>First name</label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Last name</label>
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <label className="consent-row">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              />
              <span>I agree to receive my reward by email and consent to the processing of my personal data.</span>
            </label>

            <Button type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {submitting ? 'Sending…' : 'SEND REWARD'}
            </Button>
          </form>
        </div>
      )}

      {stage === 'sent' && (
        <div className="overlay-content">
          <div className="result-emoji">✅</div>
          <div className="result-title">Reward sent</div>
          <div className="result-gift">{rewardId}</div>
          <p className="result-note">An email with the reward QR code reference has been sent to the guest.</p>
          <Button onClick={onClose} style={{ marginTop: 24 }}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
