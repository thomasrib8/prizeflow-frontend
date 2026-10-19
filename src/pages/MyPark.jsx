import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button, Badge } from '../components/ui';

// "Mon parc": read-only space of a reseller account. Wheels it holds, clients placed under it, history, and the request button.
// Only SPARK attributes a wheel: here the reseller can only ASK. Nothing of another reseller and no participant data ever reaches this page.
const STATUS_TONE = { event: 'green', rented: 'blue', available: 'neutral', maintenance: 'orange' };
const eur = (c) => (c === null || c === undefined ? '—' : (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' }));
const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString([], { dateStyle: 'medium' }) : '—');
const TABS = ['wheels', 'clients', 'history', 'requests'];
const lbl = { fontSize: 12, color: '#64748B' };

function RequestForm({ park, clients, initialWheel, onClose, onSent }) {
  const { t } = useTranslation('admin');
  const [f, setF] = useState({ wheelId: initialWheel || '', clientId: '', wantedOn: '', note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const r = await api.createResellerRequest({ wheelId: f.wheelId || undefined, clientId: f.clientId || undefined, wantedOn: f.wantedOn || undefined, note: f.note || undefined }); onSent(r.requests); onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="modal-overlay" style={{ zIndex: 330 }}>
      <form className="modal-card" style={{ '--modal-w': '460px' }} onSubmit={send}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>{t('myPark.requestTitle')}</h3>
        <p style={{ ...lbl, margin: '0 0 12px', lineHeight: 1.6 }}>{t('myPark.requestHelp')}</p>
        {error && <div className="error-banner">{error}</div>}
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={lbl}>{t('myPark.wheel')}<select value={f.wheelId} onChange={(e) => setF({ ...f, wheelId: e.target.value })} style={{ display: 'block', width: '100%' }}>
            <option value="">—</option>{park.wheels.map((w) => <option key={w.wheelId} value={w.wheelId}>{w.serial}{w.status === 'available' ? '' : ` · ${t(`myPark.status.${w.status}`)}`}</option>)}</select></label>
          <label style={lbl}>{t('myPark.client')}<select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} style={{ display: 'block', width: '100%' }}>
            <option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label style={lbl}>{t('myPark.wantedOn')}<input type="date" value={f.wantedOn} onChange={(e) => setF({ ...f, wantedOn: e.target.value })} style={{ display: 'block' }} /></label>
          <label style={lbl}>{t('myPark.note')}<textarea rows={3} maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} style={{ display: 'block', width: '100%' }} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose}>{t('profit.close')}</Button>
          <Button type="submit" disabled={busy}>{t('myPark.send')}</Button>
        </div>
      </form>
    </div>
  );
}

export default function MyPark() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('wheels');
  const [park, setPark] = useState(null);
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null | { wheel }
  const load = useCallback(() => {
    api.getResellerPark().then((p) => { setPark(p); setRequests(p.requests || []); }).catch((e) => setError(e.message));
    api.getResellerClients().then(setClients).catch(() => {});
    api.getResellerHistory().then(setHistory).catch(() => {});
  }, []);
  useEffect(() => { load(); const h = setInterval(load, 30000); return () => clearInterval(h); }, [load]); // follows what SPARK attributes

  if (error) return <div className="error-banner">{error}</div>;
  if (!park) return <p className="page-subtitle">{t('common.loading')}</p>;
  const s = park.stats;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('myPark.title')}</h1><p className="page-subtitle">{t('myPark.subtitle')}</p></div>
        <Button onClick={() => setForm({ wheel: '' })}>{t('myPark.requestBtn')}</Button>
      </div>
      <div className="grid-stats">
        <div className="stat"><div className="stat-label">{t('myPark.statHeld')}</div><div className="stat-value">{s.held}</div></div>
        <div className="stat"><div className="stat-label">{t('myPark.statRented')}</div><div className="stat-value">{s.rented}</div></div>
        <div className="stat"><div className="stat-label">{t('myPark.statAvailable')}</div><div className="stat-value">{s.available}</div></div>
        <div className="stat"><div className="stat-label">{t('myPark.statClients')}</div><div className="stat-value">{s.clients}</div></div>
      </div>
      {park.contract && <p style={{ ...lbl, margin: '10px 0 0' }}>{t('myPark.contract', { rent: eur(park.contract.rentPerWheelCents), activation: eur(park.contract.activationCents) })}{s.monthlyRentCents !== null ? ` · ${t('myPark.monthlyTotal')} ${eur(s.monthlyRentCents)}` : ''}</p>}
      <div className="tabs" style={{ marginTop: 12 }}>{TABS.map((x) => <button key={x} className={`tab${tab === x ? ' active' : ''}`} onClick={() => setTab(x)}>{t(`myPark.tabs.${x}`)}{x === 'requests' && requests.some((r) => r.status === 'pending') ? ` (${requests.filter((r) => r.status === 'pending').length})` : ''}</button>)}</div>

      {tab === 'wheels' && (
        <Card className="mt-card">
          {park.wheels.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('myPark.noWheels')}</p> : (
            <table className="data-table">
              <thead><tr><th>{t('myPark.wheel')}</th><th>{t('myPark.statusCol')}</th><th>{t('myPark.client')}</th><th>{t('myPark.event')}</th><th>{t('myPark.since')}</th><th></th></tr></thead>
              <tbody>{park.wheels.map((w) => (
                <tr key={w.wheelId}>
                  <td style={{ fontWeight: 600 }}>{w.serial}<div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>{t('myPark.heldSince')} {fmt(w.heldSince)}</div></td>
                  <td><Badge tone={STATUS_TONE[w.status]}>{t(`myPark.status.${w.status}`)}</Badge></td>
                  <td>{w.client ? (w.client.name || t('myPark.sparkClient')) : '—'}</td>
                  <td>{w.event ? `${w.event.name}${w.event.city ? ` · ${w.event.city}` : ''}` : '—'}</td>
                  <td>{w.since ? `${fmt(w.since)}${w.expectedReturn ? ` → ${fmt(w.expectedReturn)}` : ''}` : '—'}</td>
                  <td>{w.requestPending ? <Badge tone="orange">{t('myPark.requested')}</Badge> : <Button size="sm" variant="secondary" onClick={() => setForm({ wheel: w.wheelId })}>{t('myPark.requestShort')}</Button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}
      {tab === 'clients' && (
        <Card className="mt-card">
          {clients.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('myPark.noClients')}</p> : (
            <table className="data-table">
              <thead><tr><th>{t('myPark.client')}</th><th>{t('myPark.currentWheel')}</th><th>{t('myPark.event')}</th><th>{t('myPark.rentals')}</th><th>{t('myPark.lastRental')}</th></tr></thead>
              <tbody>{clients.map((c) => <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.name}</td><td>{c.currentWheel || '—'}</td><td>{c.event ? `${c.event.name}${c.event.city ? ` · ${c.event.city}` : ''}` : '—'}</td><td>{c.rentals}</td><td>{fmt(c.lastRentalOn)}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      )}
      {tab === 'history' && (
        <Card className="mt-card">
          {history.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('myPark.noHistory')}</p> : (
            <table className="data-table">
              <thead><tr><th>{t('myPark.wheel')}</th><th>{t('myPark.client')}</th><th>{t('myPark.period')}</th><th>{t('myPark.days')}</th><th>{t('myPark.events')}</th></tr></thead>
              <tbody>{history.map((h, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{h.wheel}</td><td>{h.client || t('myPark.sparkClient')}</td><td>{fmt(h.from)} → {h.to ? fmt(h.to) : t('myPark.ongoing')}</td><td>{h.days}</td><td>{h.events.join(', ') || '—'}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      )}
      {tab === 'requests' && (
        <Card className="mt-card">
          {requests.length === 0 ? <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('myPark.noRequests')}</p> : requests.map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
              <Badge tone={r.status === 'pending' ? 'orange' : r.status === 'done' ? 'green' : 'neutral'}>{t(`myPark.reqStatus.${r.status}`)}</Badge>
              <span>{[r.wheel, r.client, r.wantedOn && fmt(r.wantedOn)].filter(Boolean).join(' · ') || '—'}</span>{r.note && <span style={{ color: '#64748B' }}>{r.note}</span>}<span style={{ flex: 1 }} />
              {r.status === 'pending' && <Button size="sm" variant="ghost" onClick={async () => { try { const x = await api.cancelResellerRequest(r.id); setRequests(x.requests); load(); } catch (e) { setError(e.message); } }}>{t('myPark.cancel')}</Button>}
            </div>
          ))}
        </Card>
      )}
      {form && <RequestForm park={park} clients={clients} initialWheel={form.wheel} onClose={() => setForm(null)} onSent={(r) => { setRequests(r); setTab('requests'); load(); }} />}
    </div>
  );
}
