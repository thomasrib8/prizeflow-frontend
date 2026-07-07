import { useEffect, useRef, useState } from 'react';
import { connectWs } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PING_INTERVAL_MS = 5000;

export function useWheelSocket() {
  const { user } = useAuth();
  const [wheelStatus, setWheelStatus] = useState(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const [connectedSince, setConnectedSince] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    let reconnectTimer = null;
    let pingTimer = null;

    function connect() {
      if (cancelled) return;
      const ws = connectWs();
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectedSince(new Date().toISOString());
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'wheel_status') setWheelStatus(msg.payload);
          if (msg.type === 'agent_connection') setAgentConnected(msg.payload.connected);
          if (msg.type === 'pong') setLatencyMs(Date.now() - msg.ts);
        } catch (e) {
          // ignore malformed frame
        }
      };
      ws.onclose = () => {
        clearInterval(pingTimer);
        setConnectedSince(null);
        setLatencyMs(null);
        if (!cancelled) reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      clearInterval(pingTimer);
      wsRef.current?.close();
    };
  }, [user]);

  return { wheelStatus, agentConnected, connectedSince, latencyMs };
}
