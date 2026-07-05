// Shared wheel SVG component
// positionAngle: angle in degrees (0 = top, clockwise) for the red cleat
// highlightSection: 0-11 to highlight a section (for result display)
const FULL_ROT = 400;

export function posToAngle(currentPos) {
  return ((currentPos % FULL_ROT) / FULL_ROT) * 360;
}

export default function WheelSVG({ positionAngle = 0, size = 220, highlightSection = null }) {
  const cx = 160, cy = 160, r = 130;
  const sections = 12;
  const sectionAngle = 360 / sections;

  const labels = Array.from({ length: sections }, (_, i) => {
    const a = ((i + 0.5) * sectionAngle - 90) * (Math.PI / 180);
    const lr = r * 0.68;
    return { x: cx + lr * Math.cos(a), y: cy + lr * Math.sin(a), num: i + 1, idx: i };
  });

  const dots = Array.from({ length: sections }, (_, i) => {
    const a = (i * sectionAngle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  // Gold cleat: fixed at top (between 12 and 1)
  const goldRad = -90 * (Math.PI / 180);
  const goldOuter = { x: cx + (r + 18) * Math.cos(goldRad), y: cy + (r + 18) * Math.sin(goldRad) };
  const goldInner = { x: cx + (r - 8) * Math.cos(goldRad), y: cy + (r - 8) * Math.sin(goldRad) };
  const goldBall = { x: cx + (r + 7) * Math.cos(goldRad), y: cy + (r + 7) * Math.sin(goldRad) };

  // Red cleat: moves with positionAngle
  const redRad = (positionAngle - 90) * (Math.PI / 180);
  const redOuter = { x: cx + (r + 18) * Math.cos(redRad), y: cy + (r + 18) * Math.sin(redRad) };
  const redInner = { x: cx + r * Math.cos(redRad), y: cy + r * Math.sin(redRad) };

  return (
    <svg viewBox="0 0 320 320" style={{ width: size, height: size }}>
      {/* Sections */}
      {Array.from({ length: sections }, (_, i) => {
        const startA = (i * sectionAngle - 90) * (Math.PI / 180);
        const endA = ((i + 1) * sectionAngle - 90) * (Math.PI / 180);
        const x1 = cx + r * Math.cos(startA), y1 = cy + r * Math.sin(startA);
        const x2 = cx + r * Math.cos(endA), y2 = cy + r * Math.sin(endA);
        const isHighlighted = highlightSection === i;
        return (
          <path key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
            fill={isHighlighted ? '#EFF6FF' : 'white'}
            stroke="#111" strokeWidth="1.5"
          />
        );
      })}

      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth="2" />

      {/* Labels */}
      {labels.map(l => (
        <text key={l.idx} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central"
          fontSize="18" fontWeight="900" fontFamily="Arial Black, sans-serif"
          fill={highlightSection === l.idx ? '#2563EB' : '#111'}
          transform={`rotate(${(l.idx + 0.5) * sectionAngle}, ${l.x}, ${l.y})`}>
          {l.num}
        </text>
      ))}

      {/* Dots on rim */}
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="5" fill="#111" />)}

      {/* Center */}
      <circle cx={cx} cy={cy} r="5" fill="#111" />

      {/* Gold cleat (fixed) */}
      <line x1={goldOuter.x} y1={goldOuter.y} x2={goldInner.x} y2={goldInner.y}
        stroke="#5C2D0A" strokeWidth="4" strokeLinecap="round" />
      <circle cx={goldBall.x} cy={goldBall.y} r="6" fill="#C9A84C" />

      {/* Red cleat (live) */}
      <line x1={redOuter.x} y1={redOuter.y} x2={redInner.x} y2={redInner.y}
        stroke="#8B0000" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
