import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';

// Admin: hand a configured draft campaign to a client account. The campaign leaves the admin account (a trace stays in the "Transférées" filter).
export default function TransferCampaignModal({ campaign, onClose, onDone }) {
  const { t } = useTranslation('admin');
  const [targets, setTargets] = useState(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.listTransferTargets().then(setTargets).catch((e) => setError(e.message)); }, []);
  const needle = q.trim().toLowerCase();
  const list = (targets || []).filter((u) => !needle || `${u.name} ${u.email} ${u.company}`.toLowerCase().includes(needle));
  const chosen = (targets || []).find((u) => u.id === picked);

  async function go() {
    setBusy(true); setError('');
    try { await api.transferCampaign(campaign.id, picked); onDone(chosen); }
    catch (e) { setError(t(`transfer.err.${e.code}`, { defaultValue: e.message })); setBusy(false); }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ '--modal-w': '520px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>{t('transfer.title')}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px' }}>{t('transfer.intro', { name: campaign.name })}</p>
        {error && <div className="error-banner">{error}</div>}
        <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('transfer.search')} aria-label={t('transfer.search')}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit', marginBottom: 10 }} />
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #F1F4FB', borderRadius: 10 }} role="radiogroup" aria-label={t('transfer.title')}>
          {!targets && <p className="page-subtitle" style={{ padding: 12 }}>{t('common.loading')}</p>}
          {targets && list.length === 0 && <p className="page-subtitle" style={{ padding: 12 }}>{t('transfer.none')}</p>}
          {list.map((u) => (
            <button key={u.id} type="button" role="radio" aria-checked={picked === u.id} onClick={() => setPicked(u.id)}
              style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'center', padding: '10px 14px', border: 'none', borderBottom: '1px solid #F1F4FB', background: picked === u.id ? '#EAF1FF' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${picked === u.id ? '#0055F8' : '#BFD4FF'}`, background: picked === u.id ? 'radial-gradient(#0055F8 45%, #fff 50%)' : '#fff', flex: 'none' }} />
              <span style={{ minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 13.5 }}>{u.company || u.name}</b>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.company ? `${u.name} · ` : ''}{u.email}</span>
              </span>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#8A5200', background: '#FFF7E6', border: '1px solid #FCD9A0', borderRadius: 10, padding: '9px 12px', margin: '12px 0', lineHeight: 1.5 }}>{t('transfer.warning')}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="secondary" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
          <Button disabled={busy || !picked} onClick={go}>{busy ? t('transfer.sending') : (chosen ? t('transfer.confirmTo', { to: chosen.company || chosen.name }) : t('transfer.confirm'))}</Button>
        </div>
      </div>
    </div>
  );
}
