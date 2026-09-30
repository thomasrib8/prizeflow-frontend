import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWheelSocket } from '../hooks/useWheelSocket';
import { useLaunchQueue, toggleValue } from '../hooks/useLaunchQueue';
import { useProspectAddedToast } from '../hooks/useProspectAddedToast';
import { Badge, Button, EmptyState } from '../components/ui';
import ProspectCard from '../components/ProspectCard';
import NewProspectModal from '../components/NewProspectModal';
import FilterGroup from '../components/FilterGroup';

const MANIFEST_HREF = '/pwa-manifest.webmanifest';
const APPLE_ICON_HREF = '/pwa-apple-touch-icon.png';

// Swaps in the PWA-only manifest (start_url/scope both "/pwa") and this
// shortcut's own name/icon while this page is mounted, so "Add to Home
// Screen" here installs "Spark" with its own icon and opens straight back
// into this page — never the main site's icon or name. Android/Chrome reads
// the <link rel="manifest"> above; iOS Safari instead reads
// apple-mobile-web-app-title/apple-touch-icon directly from the page, so
// those are swapped the same way — the app's own icon/title (set once in
// index.html) is restored on unmount rather than left changed.
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

/// A phone-only, single-purpose shell for a sales rep working a booth:
/// capture a lead (typed or scanned from a badge), watch the live queue, and
/// annotate whoever just played — nothing else. Meant to be installed to a
/// home screen from this exact URL (sparkapp360.com/pwa) rather than used in
/// a regular browser tab; see usePwaManifest above for why installing from
/// here scopes the shortcut to just this page. Reuses the same data/actions
/// as the full Launch page (useLaunchQueue) but never the QR code or the
/// on-device kiosk spin button — those stay desktop/tablet-only.
export default function LaunchPWA() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  usePwaManifest();

  const { agentConnected } = useWheelSocket();
  const q = useLaunchQueue();
  const [noteGuest, setNoteGuest] = useState(null);
  const [showNewProspect, setShowNewProspect] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const { message: prospectAdded, notify: notifyProspectAdded } = useProspectAddedToast();
  const [playerFiltersOpen, setPlayerFiltersOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null; // redirecting

  return (
    <div className="pwa-shell">
      <header className="pwa-topbar">
        <div className="pwa-topbar-row">
          <div className="pwa-brand">
            <img src="/pwa-brand-mark.svg" alt="" className="pwa-brand-logo" />
            <span>SPARK</span>
          </div>
          <button type="button" className="pwa-signout" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
        </div>
        <div className="pwa-topbar-row">
          <Badge tone={agentConnected ? 'green' : 'red'}>{agentConnected ? 'Wheel ready' : 'Wheel offline'}</Badge>
          <span className="pwa-campaign-name">
            {q.campaign === undefined ? 'Loading…' : q.campaign === null ? 'No active campaign' : q.campaign.name}
          </span>
        </div>
      </header>

      {q.error && <div className="error-banner" style={{ margin: '0 14px 12px' }}>{q.error}</div>}

      {prospectAdded && (
        <div className="pwa-toast">✓ {prospectAdded}</div>
      )}

      <div className="pwa-actions">
        {q.scanEnabled && q.campaign && (
          <label className="btn btn-secondary pwa-action-btn" style={{ cursor: 'pointer' }}>
            📷 Scan the badge
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) { setScanFile(f); setShowNewProspect(true); }
              }}
            />
          </label>
        )}
        <div className="pwa-action-btn">
          <Button
            variant="secondary"
            disabled={!q.campaign}
            style={{ width: '100%' }}
            onClick={() => { setScanFile(null); setShowNewProspect(true); }}
          >
            + New prospect
          </Button>
        </div>
      </div>

      {q.campaign === null && (
        <div className="pwa-section">
          <EmptyState title="No campaign is currently active" description="Ask an admin to start one from the Campaigns page." />
        </div>
      )}

      {q.campaign && (
        <section className="pwa-section">
          <h2 className="pwa-section-title">Live queue</h2>
          {!q.queue ? (
            <p className="page-subtitle">Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div className="pwa-subhead">Currently playing</div>
                {q.queue.active ? (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#03041A' }}>
                      <button
                        type="button"
                        onClick={() => setNoteGuest({ email: q.queue.active.email, firstName: q.queue.active.firstName, lastName: q.queue.active.lastName })}
                        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 700, color: '#002881', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {q.queue.active.firstName}
                      </button>
                      {' '}— {q.queue.active.launched ? 'spinning…' : 'waiting to spin'}
                    </div>
                    {q.queue.active.retryMessage && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#EF4444' }}>{q.queue.active.retryMessage}</div>
                    )}
                    {q.queue.active.giftName && (
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                        Will win: <strong style={{ color: '#0055F8' }}>{q.queue.active.giftName}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button type="button" className="pwa-queue-btn pwa-queue-btn-skip" disabled={q.queueActionBusy} onClick={q.handleSkipPlayer}>
                        Passer le joueur
                      </button>
                      <button type="button" className="pwa-queue-btn pwa-queue-btn-cancel" disabled={q.queueActionBusy} onClick={q.handleCancelPlayer}>
                        Annuler le joueur
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="page-subtitle" style={{ margin: 0 }}>Nobody right now</p>
                )}
              </div>

              <div>
                <div className="pwa-subhead">Waiting ({q.queue.waiting.length})</div>
                {q.queue.waiting.length === 0 ? (
                  <p className="page-subtitle" style={{ margin: 0 }}>No one in line</p>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#334155' }}>
                    {q.queue.waiting.map((w, i) => <li key={i}>{w.firstName}</li>)}
                  </ol>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {q.campaign && (
        <section className="pwa-section">
          <h2 className="pwa-section-title">Last 20 players</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>Tap a name to add a note, rating or segment.</p>

          {q.recentPlayers && q.recentPlayers.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Search…"
                value={q.playerSearch}
                onChange={(e) => q.setPlayerSearch(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
              />
              <Button variant="secondary" onClick={() => setPlayerFiltersOpen(true)} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                Filters{q.playerActiveFilterCount > 0 ? ` (${q.playerActiveFilterCount})` : ''}
              </Button>
            </div>
          )}

          {!q.recentPlayers && <p className="page-subtitle">Loading…</p>}
          {q.recentPlayers && q.recentPlayers.length === 0 && <p className="page-subtitle">No players yet.</p>}
          {q.recentPlayers && q.recentPlayers.length > 0 && q.filteredRecentPlayers.length === 0 && (
            <p className="page-subtitle">No players match your search or filters.</p>
          )}

          <div className="pwa-player-list">
            {q.filteredRecentPlayers?.map((p) => (
              <button
                key={p.rewardId}
                type="button"
                className="pwa-player-card"
                onClick={() => setNoteGuest({ email: p.email, firstName: p.first_name, lastName: p.last_name })}
              >
                <div className="pwa-player-name">{p.first_name} {p.last_name}</div>
                <div className="pwa-player-meta">
                  {p.gift_name ? (
                    <span className="pwa-player-gift">{p.gift_name}</span>
                  ) : (
                    <span className="pwa-player-nogift">
                      {p.outcome === 'manual' ? 'No gift' : `No gift · ${p.outcome === 'cancelled' ? 'cancelled' : 'skipped'}`}
                    </span>
                  )}
                  {p.segment && <span className="pwa-player-segment">{p.segment}</span>}
                  {p.lead_rating ? <span className="pwa-player-stars">{'★'.repeat(p.lead_rating)}{'☆'.repeat(3 - p.lead_rating)}</span> : null}
                </div>
                {p.note && <div className="pwa-player-note">{p.note}</div>}
              </button>
            ))}
          </div>
        </section>
      )}

      {playerFiltersOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Filters</h3>
              {q.playerActiveFilterCount > 0 && (
                <button
                  onClick={() => { q.setPlayerFilterGifts([]); q.setPlayerFilterSegments([]); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--link)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Clear all</button>
              )}
            </div>
            <FilterGroup title="Gift" options={q.playerGiftOptions} selected={q.playerFilterGifts}
              onToggle={(v) => q.setPlayerFilterGifts(toggleValue(q.playerFilterGifts, v))} />
            <FilterGroup title="Segment" options={q.playerSegmentOptions} selected={q.playerFilterSegments}
              onToggle={(v) => q.setPlayerFilterSegments(toggleValue(q.playerFilterSegments, v))} />
            <Button onClick={() => setPlayerFiltersOpen(false)} style={{ marginTop: 4 }}>Done</Button>
          </div>
        </div>
      )}

      {showNewProspect && q.campaign && (
        <NewProspectModal
          campaign={q.campaign}
          initialFile={scanFile}
          scanEnabled={q.scanEnabled}
          onClose={() => { setShowNewProspect(false); setScanFile(null); }}
          onCreated={notifyProspectAdded}
        />
      )}

      {noteGuest && q.campaign && (
        <ProspectCard
          campaignId={q.campaign.id}
          guest={noteGuest}
          initialMode="edit"
          onClose={() => setNoteGuest(null)}
          onSaved={q.handleNoteSaved}
        />
      )}
    </div>
  );
}
