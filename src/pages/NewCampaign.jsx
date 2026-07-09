import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';
import { useAdmin } from '../hooks/useAdmin';
import { useWheelSocket } from '../hooks/useWheelSocket';
import WheelSVG, { posToAngle } from '../components/WheelSVG';

const EMPTY_SLOTS = Array.from({ length: 12 }, (_, i) => ({ slotIndex: i, giftName: '', stock: 0, redeemMethod: 'qr' }));

export default function NewCampaign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCampaignId = searchParams.get('from');
  const { isAdmin } = useAdmin();
  const [isTest, setIsTest] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slots, setSlots] = useState(EMPTY_SLOTS);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewAngle, setPreviewAngle] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [templateMsg, setTemplateMsg] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const { wheelStatus, agentConnected } = useWheelSocket();

  // Mirror the real physical wheel live whenever it's connected — the on-screen
  // cleat should visibly move together with the real one instead of sitting
  // wherever it was last dragged. Manual dragging (below) is only meant as a
  // fallback for when no wheel is connected, or to nudge it back in sync if the
  // operator ever needs to; "Resync with live wheel" clears the override.
  useEffect(() => {
    if (manualOverride) return;
    if (!agentConnected || !wheelStatus) return;
    setPreviewAngle(posToAngle(wheelStatus.currentPos));
  }, [agentConnected, wheelStatus, manualOverride]);

  function handleManualRotate(angle) {
    setManualOverride(true);
    setPreviewAngle(angle);
  }

  const previewCase = Math.floor((((previewAngle % 360) + 360) % 360) / 30) + 1;
  const totalStock = slots.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);

  // Duplicate an existing campaign's slot/gift config — stock always starts
  // at 0 here, adjustable before creating (per roadmap: never a silent copy).
  useEffect(() => {
    if (!fromCampaignId) return;
    api.getCampaign(fromCampaignId).then((source) => {
      setName(`Copy of ${source.name}`);
      applySlotConfig(source.slots.map((s) => ({ slotIndex: s.slot_index, giftName: s.gift_name })));
    }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCampaignId]);

  useEffect(() => {
    api.listCampaignTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  function applySlotConfig(configSlots) {
    const byIndex = new Map(configSlots.map((s) => [s.slotIndex, s.giftName]));
    setSlots(EMPTY_SLOTS.map((s) => ({ ...s, giftName: byIndex.get(s.slotIndex) || '' })));
  }

  async function handleUseTemplate(e) {
    const id = e.target.value;
    e.target.value = '';
    if (!id) return;
    try {
      const template = await api.getCampaignTemplate(id);
      applySlotConfig(template.slots);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveTemplate() {
    const configured = slots.filter((s) => s.giftName.trim());
    if (configured.length === 0) { setError('Configure at least one gift name before saving a template.'); return; }
    const templateName = window.prompt('Name this template:');
    if (!templateName) return;
    setSavingTemplate(true);
    try {
      await api.saveCampaignTemplate(templateName, configured.map((s) => ({ slotIndex: s.slotIndex, giftName: s.giftName })));
      setTemplates(await api.listCampaignTemplates());
      setTemplateMsg('Template saved');
      setTimeout(() => setTemplateMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingTemplate(false);
    }
  }

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
        slots: active.map(s => ({
          slotIndex: s.slotIndex,
          giftName: s.giftName,
          stock: Number(s.stock),
          redeemMethod: s.redeemMethod === 'code' ? 'code' : 'qr',
        }))
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
          {templates && templates.length > 0 && (
            <div className="field">
              <label>Start from a saved template (optional)</label>
              <select defaultValue="" onChange={handleUseTemplate} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}>
                <option value="">— Select a template —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slotCount} slots)</option>)}
              </select>
            </div>
          )}
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

        <Card title="Wheel orientation helper" className="mt-card">
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
            {agentConnected && !manualOverride
              ? 'Tracking the physical wheel live — the red cleat moves together with the real one.'
              : 'Lost track of which physical case is which? Drag the red cleat below to match what you see on the real wheel.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <WheelSVG positionAngle={previewAngle} size={200} interactive onRotate={handleManualRotate} />
            <div style={{ fontSize: 14, color: '#334155' }}>
              Red cleat is pointing at <strong>Case {previewCase}</strong>
              {agentConnected && manualOverride && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setManualOverride(false)}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#2563EB', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                  >
                    Resync with live wheel
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Products (12 wheel slots)" className="mt-card"
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {templateMsg && <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>{templateMsg}</span>}
              <button type="button" onClick={handleSaveTemplate} disabled={savingTemplate} className="btn btn-ghost btn-sm" style={{ cursor: savingTemplate ? 'not-allowed' : 'pointer' }}>
                {savingTemplate ? 'Saving…' : 'Save as template'}
              </button>
              <span className="badge badge-blue">Total stock: {totalStock}</span>
            </div>
          }>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>
            "Redeem" chooses how the guest confirms their gift: <b>QR</b> links straight to it, <b>Code</b> emails an 8-character code to type in on the Rewards page.
          </p>
          <div className="slots-grid">
            {slots.map((s, i) => {
              const pct = totalStock ? ((Number(s.stock) || 0) / totalStock) * 100 : 0;
              return (
                <div className="slot-row" key={i}>
                  <div className="slot-index">Case {i + 1}</div>
                  <input placeholder="Gift name" value={s.giftName} onChange={e => updateSlot(i, 'giftName', e.target.value)} />
                  <input type="number" min="0" placeholder="Stock" value={s.stock || ''} onChange={e => updateSlot(i, 'stock', e.target.value)} />
                  <select value={s.redeemMethod} title="How the guest confirms their gift" onChange={e => updateSlot(i, 'redeemMethod', e.target.value)}>
                    <option value="qr">QR</option>
                    <option value="code">Code</option>
                  </select>
                  <div className="slot-pct">{pct ? `${pct.toFixed(1)}%` : '—'}</div>
                </div>
              );
            })}
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
