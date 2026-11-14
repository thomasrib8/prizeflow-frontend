// Screen readers need a text field and its label to be linked. The forms of the app are written as <div class="field"><label>…</label><input/></div>,
// which looks right but leaves the input without a name for assistive technology. This links every such pair once, as the forms appear
// (no change to what is drawn): the label gets `for`, the control gets an id when it has none. Groups of several controls (radios, checkboxes)
// are left alone, they name themselves.
let counter = 0;
function link(root) {
  root.querySelectorAll('.field').forEach((field) => {
    const label = field.querySelector(':scope > label');
    if (!label || label.htmlFor || label.querySelector('input,select,textarea')) return;
    const controls = field.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea');
    if (controls.length !== 1) return;
    const control = controls[0];
    if (!control.id) control.id = `fld-${++counter}`;
    label.htmlFor = control.id;
  });
}

// Fields that only carry a placeholder (search boxes, "Gift name"…) or a first "All…" option get that text as their accessible name.
function nameBare(root) {
  root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), select, textarea').forEach((el) => {
    if ((el.labels && el.labels.length) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) return;
    if (el.tagName === 'SELECT') {
      const first = el.options && el.options[0];
      if (first && first.value === '' && first.text.trim()) el.setAttribute('aria-label', first.text.trim());
    } else if (el.placeholder && el.placeholder.trim()) el.setAttribute('aria-label', el.placeholder.trim());
  });
}

export function startAutoLabel() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  let queued = false;
  const run = () => { queued = false; try { link(document); nameBare(document); } catch (e) { /* never break the page for this */ } };
  const schedule = () => { if (!queued) { queued = true; setTimeout(run, 60); } }; // a timer, not requestAnimationFrame: it also runs in a background tab
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
}
