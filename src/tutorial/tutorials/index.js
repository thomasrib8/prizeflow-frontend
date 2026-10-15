// Registry of tutorials. Each file exports { id, icon, device, admin, start, steps[{run}], texts{fr,en,...} }.
// A language without its own text falls back to French (the reference language of the tutorials).
import create from './campaign-create';
import launch from './launch';
import guestFlow from './guest-flow';
import wheelStatus from './wheel-status';
import rewards from './rewards';
import crm from './crm';
import prospectNote from './prospect-note';
import enrichment from './enrichment';
import settings from './settings';
import dashboard from './dashboard';
import pwaInstall from './pwa-install';
import pwaApp from './pwa-app';
import offlineSetup from './offline-setup';
import offlineOutage from './offline-outage';
import lifecycle from './pause-end';
import park from './park';
import setupWizard from './setup-wizard';

// Order in the list = order here; the groups give the page its sections.
export const TUTORIAL_GROUPS = [
  { id: 'start', items: [dashboard, create, lifecycle] },
  { id: 'event', items: [launch, guestFlow, rewards, wheelStatus] },
  { id: 'contacts', items: [crm, prospectNote, enrichment] },
  { id: 'field', items: [pwaInstall, pwaApp, offlineSetup, offlineOutage] },
  { id: 'account', items: [settings] },
  { id: 'admin', items: [park, setupWizard] },
];
export const TUTORIALS = TUTORIAL_GROUPS.flatMap((g) => g.items);

export const getTutorial = (id) => TUTORIALS.find((t) => t.id === id) || null;

export function tutorialText(tuto, lang) {
  return tuto.texts[lang] || tuto.texts.fr;
}
