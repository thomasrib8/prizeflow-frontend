// Registry of tutorials. Each file exports { id, icon, device, admin, start, steps[{run}], texts{fr,en,...} }.
// A language without its own text falls back to French (the reference language of the tutorials).
import lifecycle from './pause-end';

export const TUTORIALS = [lifecycle];

export const getTutorial = (id) => TUTORIALS.find((t) => t.id === id) || null;

export function tutorialText(tuto, lang) {
  return tuto.texts[lang] || tuto.texts.fr;
}
