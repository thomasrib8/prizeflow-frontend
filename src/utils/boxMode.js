// The offline event box serves its own build of this app (VITE_API_BASE_URL=same-origin): reps' phones
// open http://sparkoff.box and get the PWA only, signed in with the shared offline access code.
export const IS_BOX_BUILD = import.meta.env.VITE_API_BASE_URL === 'same-origin';
