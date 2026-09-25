// auth.js — the session, backed by a real email/password login stored in
// D1 (server-lib/password.js, server-lib/session.js). getUser()/can.* are
// the only things the rest of the app calls, so this file is the one seam
// between "how identity works" and everything else.

export const ROLE_LABELS = {
  player: 'Player', coach: 'Coach', team: 'Team manager',
  fan: 'Fan', federation: 'Federation admin', super: 'Site admin',
};
export const ROLE_ICONS = {
  player: 'user', coach: 'clipboard', team: 'shield',
  fan: 'heart', federation: 'organization', super: 'chart',
};

let user = null;
let resolved = false; // true once the first /api/auth/me check has run
const listeners = new Set();

export const getUser = () => user;
export const isResolved = () => resolved;

async function readJsonResponse(res) {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new Error('Something went wrong.');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// Called once on boot (see src/app.js) and again after anything that could
// change who's signed in. Safe to call repeatedly — it never throws.
export async function refreshSession() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    user = res.ok ? await readJsonResponse(res) : null;
  } catch {
    user = null;
  }
  resolved = true;
  listeners.forEach((fn) => fn(user));
  return user;
}

export async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  user = await readJsonResponse(res);
  listeners.forEach((fn) => fn(user));
  return user;
}

export async function signup(email, password, name) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  user = await readJsonResponse(res);
  listeners.forEach((fn) => fn(user));
  return user;
}

export async function signOut() {
  try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch { /* clear local state regardless */ }
  user = null;
  listeners.forEach((fn) => fn(user));
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- Permission checks ----------------------------------------------
   Client-side only — these decide what the UI shows. The real check for
   every write happens again in functions/api/**, against the session
   cookie, because a browser-side check can always be bypassed. */
const isSuper = (actor) => actor?.role === 'super';
const isFederation = (actor) => actor?.role === 'federation';
const isTeamStaff = (actor) => actor?.role === 'coach' || actor?.role === 'team';

export const can = {
  manageTeam: (actor, teamId) => isSuper(actor) || (isTeamStaff(actor) && actor.teamId === teamId),

  enterResult: (actor, match, leagueOrgId) =>
    match.status === 'scheduled' &&
    (isSuper(actor) || (isFederation(actor) && actor.orgId === leagueOrgId) ||
      (isTeamStaff(actor) && [match.homeId, match.awayId].includes(actor.teamId))),

  seePendingScore: (actor, match, leagueOrgId) =>
    isSuper(actor) || (isFederation(actor) && actor.orgId === leagueOrgId) ||
    (isTeamStaff(actor) && [match.homeId, match.awayId].includes(actor.teamId)),

  moderatesOrg: (actor, orgId) => isSuper(actor) || (isFederation(actor) && actor.orgId === orgId),

  editOwnProfile: (actor, playerId) => isSuper(actor) || actor?.playerId === playerId || isTeamStaff(actor),

  canProvision: (actor) => isSuper(actor) || isFederation(actor) || isTeamStaff(actor),

  isSignedIn: (actor) => Boolean(actor),
};
