/**
 * auth.js — mock session layer for the demo dashboard. No real
 * credentials are checked; this exists purely to demonstrate a
 * route-guard pattern in a zero-framework router.
 */

const SESSION_KEY = "bk_demo_session";
let listeners = [];

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
  listeners.forEach((fn) => fn(session));
}

export function isAuthenticated() {
  return Boolean(readSession());
}

export function getCurrentUser() {
  const session = readSession();
  return session ? session.user : null;
}

/** Mock sign-in: any non-empty name/role is accepted. */
export function login({ name = "League Admin", role = "Match Official" } = {}) {
  writeSession({ user: { name, role }, since: Date.now() });
  return getCurrentUser();
}

export function logout() {
  writeSession(null);
}

export function onAuthChange(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

/**
 * Route guard: returns true if navigation should proceed, or redirects
 * to a login prompt (handled by the caller) and returns false.
 */
export function requireAuth() {
  return isAuthenticated();
}
