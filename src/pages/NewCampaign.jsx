import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';
import { useAdmin } from '../hooks/useAdmin';

export default function NewCampaign() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [isTest, setIsTest] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slots, setSlots] = useState(
    Array.from({ length: 12 }, (_, i) => ({ slotIndex: i, giftName: '', stock: 0 }))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const totalStock = slots.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);

  function updateSlot(i, field, value) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const active = slots.filter(s => s.giftName.trim() && Number(s.stock) > 0);
    if (!name.trim()) return setError('Campaign name is required');
    if (active.length === 0) return setError('Configure at least one gift with stock > 0');
    setSaving(true);
    try {
      const created = await api.createCampaign({
        name, description, isTest,
        slots: active.map(s => ({ slotIndex: s.slotIndex, giftName: s.giftName, stock: Number(s.stock) }))
      });
      navigate(`/campaigns/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">New campaign</h1>
          <p className="page-subtitle">Configure each wheel slot with a gift and its stock</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card title="Campaign details" className="mt-card">
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Summer 2026" required />
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Short note…" />
          </div>
          {isAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
              <input type="checkbox" checked={isTest} onChange={e => setIsTest(e.target.checked)} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>🔧 Test campaign (admin only)</div>
                <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>Full sequence visible · Excluded from global stats · Remove before production.</div>
              </div>
            </label>
          )}
        </Card>

        <Card title="Products (12 wheel slots)" className="mt-card"
          action={<span className="badge badge-blue">Total stock: {totalStock}</span>}>
          <div className="slots-grid">
            {slots.map((s, i) => (
              <div className="slot-row" key={i}>
                <div className="slot-index">Case {i}</div>
                <input placeholder="Gift name" value={s.giftName} onChange={e => updateSlot(i, 'giftName', e.target.value)} />
                <input type="number" min="0" placeholder="Stock" value={s.stock || ''} onChange={e => updateSlot(i, 'stock', e.target.value)} />
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create campaign'}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/campaigns')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}