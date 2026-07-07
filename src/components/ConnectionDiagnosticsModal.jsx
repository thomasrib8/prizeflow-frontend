import { useEffect, useState } from 'react';
import { api } from '../api/client';

const POLL_MS = 5000;

const DOT_COLORS = { green: '#10B981', orange: '#F59E0B', red: '#EF4444', gray: '#94A3B8' };

function Dot({ color }) {
  return <span style={{
    display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
    background: DOT_COLORS[color], flexShrink: 0,
  }} />;
}

function Row({ tone, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ paddingTop: 4 }}><Dot color={tone} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

function since(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

function latencyTone(ms) {
  if (ms === null || ms === undefined) return 'gray';
  if (ms < 150) return 'green';
  if (ms < 400) return 'orange';
  return 'red';
}

function wifiTone(pct) {
  if (pct === null || pct === undefined) return 'gray';
  if (pct >= 60) return 'green';
  if (pct >= 30) return 'orange';
  return 'red';
}

export default function ConnectionDiagnosticsModal({ onClose, agentConnected, connectedSince, latencyMs }) {
  const [diagnostics, setDiagnostics] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api.spinStatus().then((res) => { if (!cancelled) setDiagnostics(res.diagnostics); }).catch(() => {});
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const wheelLocal = diagnostics?.wheelLocal;
  const wifi = diagnostics?.wifiSignal;
  const agent = diagnostics?.agent;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 16, padding: '20px 24px', width: 440, maxWidth: '92vw', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Diagnostic de connexion</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
        </div>

        <Row tone={connectedSince ? (latencyTone(latencyMs)) : 'red'} title="Tablette ↔ Cloud">
          {connectedSince ? `Connectée depuis ${since(connectedSince)}` : 'Non connectée'}
          {latencyMs !== null && latencyMs !== undefined && ` · latence ${latencyMs} ms`}
        </Row>

        <Row tone={agentConnected ? 'green' : 'red'} title="Cloud ↔ Agent (Pi)">
          {agentConnected && agent?.connectedSince
            ? `Connecté depuis ${since(agent.connectedSince)}`
            : 'Non connecté'}
          {agent?.disconnectHistory?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#94A3B8' }}>
              Dernières coupures : {agent.disconnectHistory.slice(0, 3).map((d) => new Date(d.disconnectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })).join(' · ')}
            </div>
          )}
        </Row>

        <Row tone={wheelLocal?.connected === true ? 'green' : wheelLocal?.connected === false ? 'red' : 'gray'} title="Agent ↔ Roue (locale sur le Pi)">
          {wheelLocal?.connected === true && 'Connecté'}
          {wheelLocal?.connected === false && 'Déconnecté'}
          {(wheelLocal?.connected === null || wheelLocal?.connected === undefined) && 'Information pas encore reçue'}
        </Row>

        <Row tone={wifiTone(wifi?.percent)} title="Signal wifi du Pi">
          {wifi?.percent !== null && wifi?.percent !== undefined ? (
            <span>
              {wifi.percent}%
              <span style={{ marginLeft: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} style={{
                    display: 'inline-block', width: 4, height: 6 + i * 4, marginRight: 2,
                    background: wifi.percent >= (i + 1) * 25 ? DOT_COLORS[wifiTone(wifi.percent)] : '#E2E8F0',
                    verticalAlign: 'bottom',
                  }} />
                ))}
              </span>
            </span>
          ) : 'Information pas encore reçue'}
        </Row>

        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, marginBottom: 0 }}>
          Se rafraîchit automatiquement toutes les 5 secondes.
        </p>
      </div>
    </div>
  );
}
