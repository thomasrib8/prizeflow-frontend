import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { api } from '../api/client';
import ConnectionDiagnosticsModal from './ConnectionDiagnosticsModal';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconGrid },
  { to: '/campaigns', label: 'Campaigns', icon: IconBox },
  { to: '/launch', label: 'Launch', icon: IconWheel },
  { to: '/history', label: 'History', icon: IconClock },
  { to: '/rewards', label: 'Rewards', icon: IconGift },
];

const ADMIN_NAV_ITEMS = [
  { to: '/users', label: 'Users', icon: IconUsers, badgeKey: 'pendingCount' },
  { to: '/health', label: 'Health', icon: IconHeart },
];

const PENDING_COUNT_POLL_MS = 30000;

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const { agentConnected, connectedSince, latencyMs } = useWheelSocket();
  const [pendingCount, setPendingCount] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase();

  // Close the mobile drawer automatically whenever the route changes, so
  // tapping a nav link doesn't leave the menu open over the new page.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    function poll() {
      api.getUsersPendingCount().then((res) => { if (!cancelled) setPendingCount(res.count); }).catch(() => {});
    }
    poll();
    const id = setInterval(poll, PENDING_COUNT_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAdmin]);

  return (
    <div className="shell">
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen(true)}
        >
          <IconMenu />
        </button>
        <img src="/logo.svg" alt="PrizeFlow" className="mobile-topbar-logo" />
        <span className="mobile-topbar-name">PrizeFlow</span>
      </div>

      <div
        className={`mobile-menu-backdrop${mobileMenuOpen ? ' open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={`sidebar${mobileMenuOpen ? ' open' : ''}`}>
        <div className="brand">
          <img src="/logo.svg" alt="PrizeFlow" className="brand-logo" />
          <div className="brand-text">
            <div className="brand-name">PrizeFlow</div>
            <div className="brand-sub">Reward Distribution</div>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
              {badgeKey === 'pendingCount' && pendingCount > 0 && (
                <span className="nav-badge">{pendingCount}</span>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="nav-separator" />
              <div className="nav-section-title">Admin</div>
              {ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon, badgeKey }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <Icon />
                  <span>{label}</span>
                  {badgeKey === 'pendingCount' && pendingCount > 0 && (
                    <span className="nav-badge">{pendingCount}</span>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`agent-pill ${agentConnected ? 'ok' : 'off'}`}
            onClick={() => setShowDiagnostics(true)}
            style={{ border: 'none', cursor: 'pointer', font: 'inherit' }}
          >
            <span className="dot" />
            {agentConnected ? 'Wheel connected' : 'Wheel offline'}
          </button>
          <div className="user-row">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || user?.email}</div>
              <button className="logout-link" onClick={() => { logout(); navigate('/login'); }}>
                Sign out
              </button>
            </div>
          </div>
          <NavLink to="/settings" className={({ isActive }) => `nav-item settings-footer-link${isActive ? ' active' : ''}`}>
            <IconSettings />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>
      <main className="content">{children}</main>
      {showDiagnostics && (
        <ConnectionDiagnosticsModal
          onClose={() => setShowDiagnostics(false)}
          agentConnected={agentConnected}
          connectedSince={connectedSince}
          latencyMs={latencyMs}
        />
      )}
    </div>
  );
}

function IconMenu() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
}
function IconGrid() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>;
}
function IconBox() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>;
}
function IconWheel() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></svg>;
}
function IconClock() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>;
}
function IconGift() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="8" width="18" height="4" rx="1"/><rect x="4" y="12" width="16" height="9" rx="1"/><path d="M12 8v13"/><path d="M12 8c-1.5-3-3-4-4.5-4A2 2 0 0 0 6 6c0 1.5 2 2 6 2Z"/><path d="M12 8c1.5-3 3-4 4.5-4A2 2 0 0 1 18 6c0 1.5-2 2-6 2Z"/></svg>;
}
function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
function IconUsers() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IconHeart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.8 8.6c0 4.6-8.8 10.4-8.8 10.4S3.2 13.2 3.2 8.6a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z"/></svg>;
}
