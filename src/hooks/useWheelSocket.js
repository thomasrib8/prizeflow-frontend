import { useEffect, useRef, useState, useCallback } from 'react';
import { connectWs } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useWheelSocket() {
  const { user } = useAuth();
  const [wheelStatus, setWheelStatus] = useState(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    let reconnectTimer = null;

    function connect() {
      if (cancelled) return;
      const ws = connectWs();
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'wheel_status') setWheelStatus(msg.payload);
          if (msg.type === 'agent_connection') setAgentConnected(msg.payload.connected);
        } catch (e) {
          // ignore malformed frame
        }
      };
      ws.onclose = () => {
        if (!cancelled) reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [user]);

  return { wheelStatus, agentConnected };
}
