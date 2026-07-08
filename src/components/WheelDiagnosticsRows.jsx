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

function wifiTone(pct) {
  if (pct === null || pct === undefined) return 'gray';
  if (pct >= 60) return 'green';
  if (pct >= 30) return 'orange';
  return 'red';
}

/// The wheel-side telemetry rows that are always purely derived from a
/// polled diagnostics snapshot (Agent↔Wheel local, Wifi signal) plus the
/// wheel identity block — shared between the operator-facing
/// ConnectionDiagnosticsModal (which renders its own Tablette↔Cloud and
/// Cloud↔Agent rows on top, since those mix in a live useWheelSocket push)
/// and the admin's read-only UserDetail fiche (which only ever has a polled
/// snapshot of the same shared wheel, via GET /users/:id/overview).
export default function WheelDiagnosticsRows({ diagnostics }) {
  const wheelLocal = diagnostics?.wheelLocal;
  const wifi = diagnostics?.wifiSignal;
  const identity = diagnostics?.wheelIdentity;

  return (
    <>
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

      {identity && (identity.modelNumber || identity.serialNumber || identity.securityKey) && (
        <div style={{ padding: '12px 0', borderTop: '1px solid #F1F5F9', marginTop: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Identité de la roue</div>
          <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.8 }}>
            {identity.modelNumber && <div>Model Number : <strong style={{ color: '#0F172A' }}>{identity.modelNumber}</strong></div>}
            {identity.serialNumber && <div>Serial Number : <strong style={{ color: '#0F172A' }}>{identity.serialNumber}</strong></div>}
            {identity.securityKey && <div>Security Key : <strong style={{ color: '#0F172A' }}>{identity.securityKey}</strong></div>}
          </div>
        </div>
      )}
    </>
  );
}

export { Row, Dot, since, wifiTone };
