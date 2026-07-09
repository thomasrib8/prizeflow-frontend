import { useRef } from 'react';

// Shared wheel SVG component
// positionAngle: angle in degrees (0 = top, clockwise) for the red cleat
// highlightSection: 0-11 to highlight a section (for result display)
// interactive + onRotate(angle): lets the user drag the red cleat by hand
// (mouse or touch) — used in campaign config so an operator confused about
// physical orientation can spin the on-screen wheel to match the real one.
//
// Formula derived from original index.html line 227:
//   transform: rotate(360/12 * pos + "deg")
// where pos = currentPos (encoder value in sections, not degrees).
// 360/12 = 30 degrees per section unit.
const FULL_ROT = 12; // encoder units per full revolution

export function posToAngle(currentPos) {
  // Same formula as original app (360/12 * pos), with a half-section (15°)
  // correction in the other direction: standing exactly on the physical peg
  // between two cases was rendering the red cleat a half-section off from
  // the boundary — the encoder's real reading at that peg is offset by half
  // a unit (the opposite way) from what the raw formula assumes.
  const sectionAngle = 360 / FULL_ROT;
  const raw = currentPos * sectionAngle + sectionAngle / 2;
  return ((raw % 360) + 360) % 360;
}

export default function WheelSVG({ positionAngle = 0, size = 220, highlightSection = null, interactive = false, onRotate, onSectionClick }) {
  const svgRef = useRef(null);
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

  function angleFromPointer(clientX, clientY) {
    const rect = svgRef.current.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    return ((deg % 360) + 360) % 360;
  }

  function handlePointerDown(e) {
    if (!interactive) return;
    e.preventDefault();
    const move = (ev) => {
      const point = ev.touches ? ev.touches[0] : ev;
      onRotate?.(angleFromPointer(point.clientX, point.clientY));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    move(e);
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 320 320"
      style={{ width: size, height: size, cursor: interactive ? 'grab' : undefined, touchAction: interactive ? 'none' : undefined }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
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
            onClick={onSectionClick ? () => onSectionClick(i) : undefined}
            style={{ cursor: onSectionClick ? 'pointer' : undefined }}
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