import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';
import SegmentationBuilder from '../components/SegmentationBuilder';
import CampaignFieldsBuilder from '../components/CampaignFieldsBuilder';
import { SALES_FIELD_TYPES, GUEST_FIELD_TYPES } from '../components/fieldTypes';

// Post-creation editing of everything from the "New campaign" wizard's
// steps 2 & 3 (gifts themselves are edited separately, see EditCampaign.jsx)
// — segmentation categories, the sales rep's "Autres informations" fields,
// and the guest-facing form's custom fields. Editable at any time, including
// on an already-active campaign: every value saved against these is a
// name/label snapshot (see db/index.js), so changes here never rewrite or
// orphan anything already recorded.
export default function EditCampaignSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [segmentCategories, setSegmentCategories] = useState([]);
  const [salesFields, setSalesFields] = useState([]);
  const [guestFields, setGuestFields] = useState([]);

  useEffect(() => {
    api.getCampaign(id).then((c) => {
      setCampaign(c);
      setSegmentCategories((c.segmentCategories || []).map((cat) => ({ name: cat.name, options: cat.options.map((o) => o.label) })));
      setSalesFields((c.fields || []).filter((f) => f.scope === 'sales').map((f) => ({ label: f.label, fieldType: f.fieldType, options: f.options, required: f.required })));
      setGuestFields((c.fields || []).filter((f) => f.scope === 'guest').map((f) => ({ label: f.label, fieldType: f.fieldType, options: f.options, required: f.required })));
    }).catch((e) => setError(e.message));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSavedMsg('');
    const cleanCategories = segmentCategories.filter((c) => c.name.trim() && (c.options || []).length);
    const cleanFields = [
      ...salesFields.filter((f) => f.label.trim()).map((f) => ({ ...f, scope: 'sales' })),
      ...guestFields.filter((f) => f.label.trim()).map((f) => ({ ...f, scope: 'guest' })),
    ];
    try {
      await api.updateCampaignSegmentCategories(id, cleanCategories);
      await api.updateCampaignFields(id, cleanFields);
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!campaign) return <p className="page-subtitle">{error || 'Loading…'}</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Segmentation & forms — {campaign.name}</h1>
          <p className="page-subtitle">Customer segmentation, sales fields, and the guest-facing form's custom fields.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {savedMsg && <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>{savedMsg}</span>}
          <Button disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save changes'}</Button>
          <Button variant="secondary" onClick={() => navigate(`/campaigns/${id}`)}>Back</Button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <Card title="Segmentation client" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
          Define as many categories as you need, each with its own set of options. Existing notes keep whatever
          category/option names they were tagged with even after a rename here.
        </p>
        <SegmentationBuilder categories={segmentCategories} onChange={setSegmentCategories} />
      </Card>

      <Card title="Autres informations" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
          Extra fields your sales team can fill in on a guest's form (Launch page / CRM tab) — never required.
        </p>
        <CampaignFieldsBuilder fields={salesFields} onChange={setSalesFields} fieldTypes={SALES_FIELD_TYPES} />
      </Card>

      <Card title="Formulaire prospect" className="mt-card">
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
          What the guest fills in before spinning, beyond the always-required first name / last name / email.
        </p>
        <CampaignFieldsBuilder fields={guestFields} onChange={setGuestFields} fieldTypes={GUEST_FIELD_TYPES} showRequired />
      </Card>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Button disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save changes'}</Button>
        <Button variant="secondary" onClick={() => navigate(`/campaigns/${id}`)}>Back</Button>
      </div>
    </div>
  );
}
