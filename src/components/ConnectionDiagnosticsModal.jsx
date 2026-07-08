import { useEffect, useState } from 'react';
import { api } from '../api/client';
import WheelDiagnosticsRows, { Row, since } from './WheelDiagnosticsRows';

const POLL_MS = 5000;

function latencyTone(ms) {
  if (ms === null || ms === undefined) return 'gray';
  if (ms < 150) return 'green';
  if (ms < 400) return 'orange';
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
          {agentConnected && diagnostics?.agent?.connectedSince
            ? `Connecté depuis ${since(diagnostics.agent.connectedSince)}`
            : 'Non connecté'}
          {diagnostics?.agent?.disconnectHistory?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#94A3B8' }}>
              Dernières coupures : {diagnostics.agent.disconnectHistory.slice(0, 3).map((d) => new Date(d.disconnectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })).join(' · ')}
            </div>
          )}
        </Row>

        <WheelDiagnosticsRows diagnostics={diagnostics} />

        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, marginBottom: 0 }}>
          Se rafraîchit automatiquement toutes les 5 secondes.
        </p>
      </div>
    </div>
  );
}
