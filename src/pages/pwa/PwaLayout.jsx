import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useWheelSocket } from '../../hooks/useWheelSocket';
import { useLaunchQueue } from '../../hooks/useLaunchQueue';
import { useProspectAddedToast } from '../../hooks/useProspectAddedToast';
import ProspectCard from '../../components/ProspectCard';
import NewProspectModal from '../../components/NewProspectModal';
import ConnectionDiagnosticsModal from '../../components/ConnectionDiagnosticsModal';
import { IconAnalytics, IconHome, IconPlus, IconProspects, IconScan, IconSettings, IconUser } from '../../components/pwa/PwaIcons';
import { PwaContext } from './PwaContext';
import { IS_BOX_BUILD } from '../../utils/boxMode';
import { api } from '../../api/client';
import './pwa.css';

const MANIFEST_HREF = '/pwa-manifest.webmanifest';
const APPLE_ICON_HREF = '/pwa-apple-touch-icon.png';

// Swaps in the PWA-only manifest and this shortcut's own name/icon while the
// PWA is mounted, so "Add to Home Screen" here installs "Spark" with its own
// icon and opens straight back into /pwa/home — never the main site's icon or
// name. Android/Chrome reads the <link rel="manifest">; iOS Safari instead
// reads apple-mobile-web-app-title/apple-touch-icon from the page, so those
// are swapped the same way and restored on unmount.
function usePwaManifest() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = MANIFEST_HREF;
    document.head.appendChild(link);

    const titleMeta = document.createElement('meta');
    titleMeta.name = 'apple-mobile-web-app-title';
    titleMeta.content = 'Spark';
    document.head.appendChild(titleMeta);

    const appleIconLink = document.querySelector('link[rel="apple-touch-icon"]');
    const originalIconHref = appleIconLink?.getAttribute('href');
    if (appleIconLink) appleIconLink.setAttribute('href', APPLE_ICON_HREF);

    return () => {
      link.remove();
      titleMeta.remove();
      if (appleIconLink && originalIconHref) appleIconLink.setAttribute('href', originalIconHref);
    };
  }, []);
}

// iOS home-screen apps measure position:fixed against a viewport that stops
// short of the screen edge when html/body are overflow-x:hidden scroll
// containers (index.css), which left the bottom bar floating above the edge.
// While the PWA is mounted, <html> gets .pw-root (see pwa.css) so those
// containers go away; the desktop app is untouched.
function usePwaRootClass() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('pw-root');
    return () => root.classList.remove('pw-root');
  }, []);
}

/// The mobile PWA shell (/pwa/*): a phone-only companion for a sales rep
/// working a booth. It owns nothing of its own — the data, mutations and
/// popups are the desktop app's (same API, same hooks, same ProspectCard /
/// NewProspectModal); this is only the mobile presentation: header with the
/// active campaign + wheel status, bottom navigation with the central Scan
/// action, and the shared state the four tabs read from.
// Event-box build only: tells the rep whether this box is in charge (internet down: changes are accepted and
// sent later) or merely following the cloud (changes are refused: use the normal app).
function useBoxStatus(refreshKey) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (!IS_BOX_BUILD) return undefined;
    let stop = false;
    const load = () => api.boxStatus().then((s) => { if (!stop) setStatus(s); }).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => { stop = true; clearInterval(t); };
  }, [refreshKey]);
  return status;
}

// Event-box build only. A slim bar that stays at the top while scrolling, so there is never a doubt
// about which version of the app this is: amber = the local copy on the box, not the normal app.
function OfflineBar({ status }) {
  const { t } = useTranslation('admin');
  const inCharge = !status || status.mode === 'primary'; // internet down: the box takes changes
  const pending = status ? status.pendingChanges : 0;
  return (
    <div className="pw-offline-bar" role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3l18 18" /><path d="M9.5 5.4A6 6 0 0 1 18 10a4 4 0 0 1 1.9 7.5" /><path d="M6.3 7.3A6 6 0 0 0 7 19h9.5" />
      </svg>
      <strong>{inCharge ? t('boxApp.barOffline') : t('boxApp.barReadOnly')}</strong>
      {inCharge && status && (
        <span className={`pw-offline-count${pending ? ' has' : ''}`}>
          {pending ? t('boxApp.pending', { count: pending }) : `${t('boxApp.allSent')} ✓`}
        </span>
      )}
    </div>
  );
}

function PwaShell() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  usePwaManifest();
  usePwaRootClass();

  const { agentConnected, connectedSince, latencyMs } = useWheelSocket();
  const q = useLaunchQueue({ watch: true });
  const { message: prospectAdded, notify: notifyProspectAdded } = useProspectAddedToast();
  const [noteGuest, setNoteGuest] = useState(null);
  const [showNewProspect, setShowNewProspect] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  // Bumped whenever a prospect is created or edited, so tabs that list
  // prospects (Prospects, Analytics) refetch.
  const [dataVersion, setDataVersion] = useState(0);
  const fileInputRef = useRef(null);
  const boxStatus = useBoxStatus(dataVersion); // re-read right after a save, so the counter moves at once

  const hasCampaign = !!q.campaign;
  const bump = () => setDataVersion((v) => v + 1);

  function openNewProspect() {
    if (!hasCampaign) return;
    setScanFile(null);
    setShowNewProspect(true);
  }

  // Scan opens the camera straight away (the existing badge-scan flow: photo
  // -> prefilled New prospect form). If badge scanning isn't enabled on this
  // deployment there is nothing to scan with, so it falls back to adding a
  // prospect by hand.
  function startScan() {
    if (!hasCampaign) return;
    if (q.scanEnabled) fileInputRef.current?.click();
    else openNewProspect();
  }

  const ctx = {
    q, hasCampaign, agentConnected, dataVersion,
    openScan: startScan,
    openNewProspect,
    openProspect: (p) => setNoteGuest({ email: p.email, firstName: p.first_name, lastName: p.last_name }),
    showDiagnostics: () => setShowDiagnostics(true),
  };

  const tabs = [
    { to: '/pwa/home', label: t('pwaApp.navHome'), icon: IconHome },
    { to: '/pwa/prospects', label: t('pwaApp.navProspects'), icon: IconProspects },
    { to: '/pwa/analytics', label: t('pwaApp.navAnalytics'), icon: IconAnalytics },
    { to: '/pwa/settings', label: t('pwaApp.navSettings'), icon: IconSettings },
  ];

  return (
    <PwaContext.Provider value={ctx}>
      <div className={`pw-shell${IS_BOX_BUILD ? ' pw-offline' : ''}`}>
        {IS_BOX_BUILD && <OfflineBar status={boxStatus} />}
        <header className="pw-header">
          <div className="pw-header-top">
            <div className="pw-brand">
              <img src="/pwa-brand-mark.svg" alt="" className="pw-brand-logo" />
              <span>SPARK</span>
            </div>
            <button type="button" className="pw-profile" aria-label={t('pwaApp.accountAria')} onClick={() => navigate('/pwa/settings')}>
              <IconUser />
            </button>
          </div>
          <div className="pw-header-sub">
            {q.campaign === undefined
              ? <div className="pw-campaign-skel" />
              : <div className="pw-campaign">{q.campaign === null ? t('pwa.noActiveCampaignLabel') : q.campaign.name}</div>}
            <button type="button" className={`pw-wheel ${agentConnected ? 'on' : 'off'}`} onClick={() => setShowDiagnostics(true)}>
              <i />
              {agentConnected ? t('pwa.wheelReady') : t('pwa.wheelOffline')}
            </button>
          </div>
        </header>

        <main className="pw-sheet">
          {q.error && <div className="error-banner" style={{ marginBottom: 14 }}>{q.error}</div>}
          <Outlet context={ctx} />
        </main>

        {prospectAdded && <div className="pw-toast" role="status">{prospectAdded}</div>}

        <nav className="pw-nav" aria-label="SPARK">
          {tabs.slice(0, 2).map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `pw-nav-item${isActive ? ' active' : ''}`}>
              <tab.icon />
              {tab.label}
            </NavLink>
          ))}
          {/* Online: Scan. On the event box scanning is not possible, so the same spot adds a prospect by hand. */}
          {IS_BOX_BUILD ? (
            <button type="button" className="pw-nav-scan" onClick={openNewProspect} disabled={!hasCampaign} aria-label={t('boxApp.navAdd')}>
              <span className="pw-nav-scan-btn"><IconPlus /></span>
              {t('boxApp.navAdd')}
            </button>
          ) : (
            <button type="button" className="pw-nav-scan" onClick={startScan} disabled={!hasCampaign} aria-label={t('pwaApp.navScan')}>
              <span className="pw-nav-scan-btn"><IconScan /></span>
              {t('pwaApp.navScan')}
            </button>
          )}
          {tabs.slice(2).map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `pw-nav-item${isActive ? ' active' : ''}`}>
              <tab.icon />
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <input
          ref={fileInputRef}
          className="pw-file-input"
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) { setScanFile(f); setShowNewProspect(true); }
          }}
        />

        {showNewProspect && q.campaign && (
          <NewProspectModal
            campaign={q.campaign}
            initialFile={scanFile}
            scanEnabled={q.scanEnabled}
            onClose={() => { setShowNewProspect(false); setScanFile(null); }}
            onCreated={(info) => { notifyProspectAdded(info); q.handleNoteSaved(); bump(); }}
          />
        )}

        {noteGuest && q.campaign && (
          <ProspectCard
            campaignId={q.campaign.id}
            guest={noteGuest}
            initialMode="edit"
            onClose={() => setNoteGuest(null)}
            onSaved={() => { q.handleNoteSaved(); bump(); }}
          />
        )}

        {showDiagnostics && (
          <ConnectionDiagnosticsModal
            onClose={() => setShowDiagnostics(false)}
            agentConnected={agentConnected}
            connectedSince={connectedSince}
            latencyMs={latencyMs}
          />
        )}
      </div>
    </PwaContext.Provider>
  );
}

// Same login rule as every other protected page: signed-out visitors go to
// /login carrying where they were headed, and come back here after signing in.
export default function PwaLayout() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <PwaShell />;
}
