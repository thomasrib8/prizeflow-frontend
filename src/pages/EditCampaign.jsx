import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';

// Edits an already-launched campaign's gifts in place — name, redeem method,
// and (for 'perso') its delivery/subject/body/auto-distribute. Deliberately
// excludes stock (shown read-only) and never adds/removes cases — only the
// slots already configured at creation can be edited here.
export default function EditCampaign() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getCampaign(id).then((source) => {
      if (source.status === 'archived') {
        setError('Archived campaigns are read-only.');
        setCampaign(source);
        return;
      }
      setCampaign(source);
      setSlots(source.slots.map((s) => ({
        slotIndex: s.slot_index,
        giftName: s.gift_name,
        stockInitial: s.stock_initial,
        stockRemaining: s.stock_remaining,
        redeemMethod: ['code', 'voucher', 'perso'].includes(s.redeem_method) ? s.redeem_method : 'qr',
        persoDelivery: s.perso_delivery || 'qr',
        persoSubject: s.perso_subject || '',
        persoBody: s.perso_body || '',
        persoAutoDistribute: !!s.perso_auto_distribute,
      })));
    }).catch((e) => setError(e.message));
  }, [id]);

  function updateSlot(i, field, value) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    for (const s of slots) {
      if (!s.giftName.trim()) return setError(`Case ${s.slotIndex + 1}: gift name is required`);
      if (s.redeemMethod === 'perso' && (!s.persoSubject.trim() || !s.persoBody.trim())) {
        return setError(`Case ${s.slotIndex + 1}: a Perso gift needs both a subject and a message`);
      }
    }
    setSaving(true);
    try {
      await api.updateCampaignSlots(id, {
        slots: slots.map((s) => ({
          slotIndex: s.slotIndex,
          giftName: s.giftName,
          redeemMethod: s.redeemMethod,
          ...(s.redeemMethod === 'perso'
            ? { persoDelivery: s.persoDelivery, persoSubject: s.persoSubject, persoBody: s.persoBody, persoAutoDistribute: !!s.persoAutoDistribute }
            : {}),
        })),
      });
      navigate(`/campaigns/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!campaign) return <p className="page-subtitle">{error || 'Loading…'}</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit {campaign.name}</h1>
          <p className="page-subtitle">Update gift names, redeem methods, and Perso emails — stock isn't editable here.</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {campaign.status !== 'archived' && (
        <form onSubmit={handleSubmit}>
          <Card title="Gifts" className="mt-card">
            <div className="slots-grid">
              {slots.map((s, i) => (
                <div key={s.slotIndex} style={{ display: 'contents' }}>
                  <div className="slot-row">
                    <div className="slot-index">Case {s.slotIndex + 1}</div>
                    <input placeholder="Gift name" value={s.giftName} onChange={(e) => updateSlot(i, 'giftName', e.target.value)} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {s.stockRemaining} / {s.stockInitial} left
                    </div>
                    <select value={s.redeemMethod} title="How the guest confirms their gift" onChange={(e) => updateSlot(i, 'redeemMethod', e.target.value)}>
                      <option value="qr">QR</option>
                      <option value="code">Code</option>
                      <option value="voucher">Voucher</option>
                      <option value="perso">Perso</option>
                    </select>
                    <div className="slot-pct" />
                  </div>
                  {s.redeemMethod === 'perso' && (
                    <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, margin: '-2px 0 4px' }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <div className="field" style={{ margin: 0, flex: '0 0 180px' }}>
                          <label style={{ fontSize: 11 }}>Delivers</label>
                          <select value={s.persoDelivery} onChange={(e) => updateSlot(i, 'persoDelivery', e.target.value)}>
                            <option value="code">A code</option>
                            <option value="qr">A QR</option>
                            <option value="text">Just text</option>
                          </select>
                        </div>
                        <div className="field" style={{ margin: 0, flex: '1 1 260px' }}>
                          <label style={{ fontSize: 11 }}>Subject</label>
                          <input placeholder="e.g. You won a free coffee!" value={s.persoSubject} onChange={(e) => updateSlot(i, 'persoSubject', e.target.value)} />
                        </div>
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: 11 }}>
                          Message ({'{{firstName}}'} / {'{{giftName}}'}{s.persoDelivery === 'code' ? ' / {{code}}' : ''} available)
                        </label>
                        <textarea rows={2} placeholder="Custom message shown in the email…" value={s.persoBody} onChange={(e) => updateSlot(i, 'persoBody', e.target.value)} style={{ width: '100%', fontFamily: 'inherit' }} />
                        {s.persoDelivery === 'code' && (
                          <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                            The code, QR and redemption instructions are always added automatically below your message — no need to insert {'{{code}}'} yourself unless you also want to mention it in your own sentence.
                          </p>
                        )}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!s.persoAutoDistribute} onChange={(e) => updateSlot(i, 'persoAutoDistribute', e.target.checked)} />
                        <span style={{ fontSize: 12, color: '#334155' }}>
                          Mark this gift as automatically distributed
                          <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>Skips manual confirmation in Rewards — use only when there's nothing to hand over in person.</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/campaigns/${id}`)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
