// Line icons (24px grid, 1.8 stroke — the same style as the app's menu icons) instead of emoji, which render
// differently on every device. Used for the social networks and the camera ("scan a badge").
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const wrap = (children) => ({ size = 18, style }) => <svg {...base} width={size} height={size} style={{ flexShrink: 0, verticalAlign: '-0.2em', ...style }}>{children}</svg>;

export const FacebookIcon = wrap(<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />);
export const InstagramIcon = wrap(<><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z" /><path d="M17.5 6.5h.01" /></>);
export const LinkedinIcon = wrap(<><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>);
export const XIcon = wrap(<path d="M4 4l16 16M20 4 4 20" />);
export const CameraIcon = wrap(<><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></>);

// by the key each screen already uses for a network (facebook / facebookUrl …)
export function SocialGlyph({ name, size }) {
  const k = String(name || '').replace(/Url$/, '').toLowerCase();
  const Icon = { facebook: FacebookIcon, instagram: InstagramIcon, linkedin: LinkedinIcon, x: XIcon }[k];
  return Icon ? <Icon size={size} /> : null;
}
