import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Button } from './ui';
import { IS_BOX_BUILD } from '../utils/boxMode';
import WheelDiagnosticsRows, { Row, since } from './WheelDiagnosticsRows';

const POLL_MS = 5000;

function latencyTone(ms) {
  if (ms === null || ms === undefined) return 'gray';
  if (ms < 150) return 'green';
  if (ms < 400) return 'orange';
  return 'red';
}

export default function ConnectionDiagnosticsModal({ onClose, agentConnected, connectedSince, latencyMs }) {
  const { t } = useTranslation('admin');
  const [diagnostics, setDiagnostics] = useState(null);
  const [box, setBox] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api.spinStatus().then((res) => { if (!cancelled) setDiagnostics(res.diagnostics); }).catch(() => {});
      if (!IS_BOX_BUILD) api.getOfflineStatus().then((st) => { if (!cancelled) setBox(st); }).catch(() => {});
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div
      onClick={onClose}
      className="modal-overlay"
      style={{ zIndex: 300 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-card"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#03041A' }}>{t('connectionDiagnostics.title')}</h3>
        </div>

        <Row tone={connectedSince ? (latencyTone(latencyMs)) : 'red'} title={t('connectionDiagnostics.tabletCloudTitle')}>
          {connectedSince ? t('connectionDiagnostics.connectedForLabel', { duration: since(connectedSince, t) }) : t('connectionDiagnostics.notConnectedLabel')}
          {latencyMs !== null && latencyMs !== undefined && t('connectionDiagnostics.latencySuffix', { ms: latencyMs })}
        </Row>

        <Row tone={agentConnected ? 'green' : 'red'} title={t('connectionDiagnostics.cloudAgentTitle')}>
          {agentConnected && diagnostics?.agent?.connectedSince
            ? t('connectionDiagnostics.connectedForLabel', { duration: since(diagnostics.agent.connectedSince, t) })
            : t('connectionDiagnostics.notConnectedLabel')}
          {diagnostics?.agent?.disconnectHistory?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#94A3B8' }}>
              {t('connectionDiagnostics.lastDisconnectsLabel', { list: diagnostics.agent.disconnectHistory.slice(0, 3).map((d) => new Date(d.disconnectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })).join(' · ') })}
            </div>
          )}
        </Row>

        <WheelDiagnosticsRows diagnostics={diagnostics} />

        {box && box.enabled && (
          <Row
            tone={!box.boxSeen ? 'red' : box.inSync ? 'green' : box.lastPollSecondsAgo > 15 ? 'red' : 'orange'}
            title={t('connectionDiagnostics.offlineBoxTitle')}
          >
            {!box.boxSeen && t('connectionDiagnostics.offlineBoxNotSeen')}
            {box.boxSeen && box.inSync && t('connectionDiagnostics.offlineBoxInSync')}
            {box.boxSeen && !box.inSync && box.lastPollSecondsAgo > 15 && t('connectionDiagnostics.offlineBoxSilent', { seconds: box.lastPollSecondsAgo })}
            {box.boxSeen && !box.inSync && box.lastPollSecondsAgo <= 15 && t('connectionDiagnostics.offlineBoxBehind', { count: box.eventsBehind })}
          </Row>
        )}

        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, marginBottom: 0 }}>
          {t('connectionDiagnostics.autoRefreshNote')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <Button variant="secondary" onClick={onClose} style={{ minWidth: 160, minHeight: 46, justifyContent: 'center', textAlign: 'center' }}>{t('common.close')}</Button>
        </div>
      </div>
    </div>
  );
}
