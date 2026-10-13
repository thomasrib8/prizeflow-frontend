// A WebSocket look-alike for tutorial mode: the wheel is "connected" and sits still. Same surface as the real one
// (onopen / onmessage / onclose / readyState / send / close) so useWheelSocket needs no change.
export function createDemoSocket() {
  const ws = {
    readyState: 0, onopen: null, onmessage: null, onclose: null, onerror: null,
    send(data) { try { const m = JSON.parse(data); if (m.type === 'ping') emit({ type: 'pong', ts: m.ts }); } catch { /* ignore */ } },
    close() { ws.readyState = 3; if (ws.onclose) ws.onclose({}); },
  };
  function emit(msg) { if (ws.onmessage) ws.onmessage({ data: JSON.stringify(msg) }); }
  setTimeout(() => {
    ws.readyState = 1;
    if (ws.onopen) ws.onopen({});
    emit({ type: 'agent_connection', payload: { connected: true } });
    emit({ type: 'wheel_status', payload: { status: 'Free', currentPos: 3.2, targetIndex: 0 } });
  }, 60);
  return ws;
}
