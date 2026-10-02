// The session token lives in memory (source of truth for this tab) and is
// mirrored to localStorage so a reload or a second tab can pick it up.
//
// Why not just read localStorage on every request: localStorage is shared by
// every tab/window of the browser, so a stale tab — or a write that silently
// fails — could hand a request an old, expired token right after a fresh
// login (server logs showed exactly that: login issues token B, ~200 ms later
// a request arrives carrying a 3-day-old token A, and the user is kicked out).
// With the memory copy, a freshly issued token can't be displaced by an older
// one written (or left) in storage by another tab.
const TOKEN_KEY = 'prizeflow_token';
const USER_KEY = 'prizeflow_user';

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage full/blocked — memory copy still works for this tab */ }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// Issued-at (seconds) read from the token's payload without verifying it —
// only used to tell which of two tokens is newer, never to trust one.
function tokenIat(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).iat || 0;
  } catch {
    return 0;
  }
}

let memoryToken = safeGet(TOKEN_KEY);

export function getToken() {
  return memoryToken;
}

export function setToken(token) {
  memoryToken = token || null;
  if (token) safeSet(TOKEN_KEY, token);
  else safeRemove(TOKEN_KEY);
}

// Used when this tab's own token was rejected by the server: clears it, but
// only from storage if storage still holds that same token — another tab may
// have stored a newer one in the meantime, which must be left alone.
export function dropToken(failedToken) {
  if (memoryToken === failedToken) memoryToken = null;
  if (safeGet(TOKEN_KEY) === failedToken) {
    safeRemove(TOKEN_KEY);
    safeRemove(USER_KEY);
  }
}

export function readStoredUser() {
  const raw = safeGet(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function writeStoredUser(user) {
  if (user) safeSet(USER_KEY, JSON.stringify(user));
  else safeRemove(USER_KEY);
}

// Other tabs changing the token in storage: adopt a NEWER token (another tab
// logged in or refreshed), never an older one, and if storage got wiped or
// downgraded while this tab still holds a newer session, put ours back.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== TOKEN_KEY) return;
    const incoming = e.newValue;
    if (incoming && tokenIat(incoming) >= tokenIat(memoryToken)) {
      memoryToken = incoming;
    } else if (memoryToken) {
      safeSet(TOKEN_KEY, memoryToken);
    }
  });
}
