import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { api } from '../api/client';
import { OfflineBoxPill, useOfflineBox } from './OfflineBoxStatus';
import ConnectionDiagnosticsModal from './ConnectionDiagnosticsModal';
import './Layout.css';

// Native-language labels, same as NewCampaign.jsx/EditCampaign.jsx's guest
// LANGUAGE_OPTIONS — a language switcher always shows each option in its
// own language, never translated into whichever one is currently active.
export const ADMIN_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
];

const NAV_ITEMS = [
  { to: '/', tKey: 'dashboard', icon: IconGrid },
  { to: '/campaigns', tKey: 'campaigns', icon: IconBox },
  { to: '/launch', tKey: 'launch', icon: IconWheel },
  { to: '/rewards', tKey: 'redeem', icon: IconGift },
  { to: '/history', tKey: 'crm', icon: IconPeople },
];

const ADMIN_NAV_ITEMS = [
  { to: '/admin-dashboard', tKey: 'adminDashboard', icon: IconGrid },
  { to: '/users', tKey: 'users', icon: IconUsers, badgeKey: 'pendingCount' },
  { to: '/live', tKey: 'live', icon: IconGlobe },
  { to: '/api-usage', tKey: 'apiUsage', icon: IconGauge },
  { to: '/park', tKey: 'park', icon: IconPark },
  { to: '/catalog', tKey: 'catalog', icon: IconPin, badgeKey: 'catalogPending' },
  { to: '/health', tKey: 'health', icon: IconHeart },
  { to: '/magic', tKey: 'magic', icon: IconMagic },
  { to: '/sequence', tKey: 'sequence', icon: IconSequence },
];

const PENDING_COUNT_POLL_MS = 30000;

export default function Layout({ children }) {
  const { user, logout, updateStoredUser } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('admin');
  const { agentConnected, connectedSince, latencyMs } = useWheelSocket();
  const offlineBox = useOfflineBox();
  const [pendingCount, setPendingCount] = useState(0);
  const [catalogPending, setCatalogPending] = useState(0);
  const [isReseller, setIsReseller] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changingLanguage, setChangingLanguage] = useState(false);
  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase();

  // AuthContext's own effect applies the change globally (i18n.changeLanguage)
  // once updateStoredUser lands — this just persists the choice server-side.
  function handleLanguageChange(language) {
    setChangingLanguage(true);
    api.updateAccountSettings({ language })
      .then(() => updateStoredUser({ language }))
      .catch(() => {})
      .finally(() => setChangingLanguage(false));
  }

  // Close the mobile drawer automatically whenever the route changes, so
  // tapping a nav link doesn't leave the menu open over the new page.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => { // the "Mon parc" entry only exists for reseller accounts
    if (isAdmin) return;
    api.getResellerStatus().then((r) => setIsReseller(!!r.reseller)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    function poll() {
      api.getUsersPendingCount().then((res) => { if (!cancelled) setPendingCount(res.count); }).catch(() => {});
      api.getCatalogPending().then((res) => { if (!cancelled) setCatalogPending(res.count); }).catch(() => {});
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
          aria-label={t('nav.openMenuAriaLabel')}
          onClick={() => setMobileMenuOpen(true)}
        >
          <IconMenu />
        </button>
        <img src="/logo-menu.svg" alt="SPARK" className="mobile-topbar-logo" />
        <span className="mobile-topbar-name">SPARK</span>
      </div>

      <div
        className={`mobile-menu-backdrop${mobileMenuOpen ? ' open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={`sidebar${mobileMenuOpen ? ' open' : ''}`}>
        <div className="brand">
          <img src="/logo-menu.svg" alt="SPARK" className="brand-logo" />
          <div className="brand-text">
            <div className="brand-name">SPARK</div>
          </div>
        </div>

        <nav className="nav">
          {(isReseller ? [...NAV_ITEMS, { to: '/my-park', tKey: 'myPark', icon: IconPark }] : NAV_ITEMS).map(({ to, tKey, icon: Icon, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              <span>{t(`nav.${tKey}`)}</span>
              {badgeKey === 'pendingCount' && pendingCount > 0 && (
                <span className="nav-badge">{pendingCount}</span>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="nav-separator" />
              <div className="nav-section-title">{t('nav.adminSectionTitle')}</div>
              {ADMIN_NAV_ITEMS.map(({ to, tKey, icon: Icon, badgeKey }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <Icon />
                  <span>{t(`nav.${tKey}`)}</span>
                  {badgeKey === 'pendingCount' && pendingCount > 0 && (
                    <span className="nav-badge">{pendingCount}</span>
                  )}
                  {badgeKey === 'catalogPending' && catalogPending > 0 && (
                    <span className="nav-badge">{catalogPending}</span>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <OfflineBoxPill status={offlineBox.status} />
          <button
            className={`agent-pill ${agentConnected ? 'ok' : 'off'}`}
            onClick={() => setShowDiagnostics(true)}
            style={{ border: 'none', cursor: 'pointer', font: 'inherit' }}
          >
            <span className="dot" />
            {agentConnected ? t('pwa.wheelReady') : t('pwa.wheelOffline')}
          </button>
          <div className="user-row">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || user?.email}</div>
              <button className="logout-link" onClick={() => { logout(); navigate('/login'); }}>
                {t('pwa.signOut')}
              </button>
            </div>
          </div>
          <select
            className="language-pill"
            value={user?.language || 'en'}
            disabled={changingLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {ADMIN_LANGUAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <NavLink to="/tutorials" className={({ isActive }) => `nav-item settings-footer-link${isActive ? ' active' : ''}`}>
            <IconBook />
            <span>{t('nav.tutorials')}</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item settings-footer-link${isActive ? ' active' : ''}`}>
            <IconSettings />
            <span>{t('nav.settings')}</span>
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

function IconMagic() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 6.2L11 5M12.2 11.8L11 13"/><path d="M3 21l9-9M12.5 8.5l3 3"/></svg>;
}
function IconSequence() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5" cy="6" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M7 7.5l3 3M14 13.5l3 3"/></svg>;
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
function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
      <path d="M8.5 8h7M8.5 11.5h5" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="7" r="2.4" />
      <path d="M8 20v-1.5a4 4 0 0 1 8 0V20" />
      <circle cx="5" cy="9" r="1.8" />
      <path d="M2 19.5v-.75A3 3 0 0 1 6.2 16" />
      <circle cx="19" cy="9" r="1.8" />
      <path d="M22 19.5v-.75A3 3 0 0 0 17.8 16" />
    </svg>
  );
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
function IconPark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/></svg>;
}
function IconGauge() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 18a8 8 0 1116 0"/><path d="M12 18l4-6"/><circle cx="12" cy="18" r="1"/></svg>;
}
function IconGlobe() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>;
}
function IconPin() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-6.2-7-11.2a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="10" r="2.5"/></svg>;
}
function IconHeart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.8 8.6c0 4.6-8.8 10.4-8.8 10.4S3.2 13.2 3.2 8.6a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z"/></svg>;
}
