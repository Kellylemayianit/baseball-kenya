// auth.js — the session, backed by Cloudflare Access. There is no password
// and no login form here: signIn() sends the browser to a path Access
// protects, which is what makes Cloudflare show its own login screen
// (Google, GitHub, one-time email code — whatever your Zero Trust team is
// configured with); signOut() clears the Access session the same way.
// getUser()/can.* are the only things the rest of the app calls, so this
// file is the one seam between "how identity works" and everything else.

export const ROLE_LABELS = {
  player: 'Player', coach: 'Coach', team: 'Team manager',
  fan: 'Fan', federation: 'Federation admin', super: 'Site admin',
};
export const ROLE_ICONS = {
  player: 'user', coach: 'clipboard', team: 'shield',
  fan: 'heart', federation: 'organization', super: 'chart',
};

let user = null;
let pendingMessage = null; // set when Access authenticated someone with no role yet
let resolved = false;      // true once the first /api/private/me check has run
const listeners = new Set();

export const getUser = () => user;
export const isResolved = () => resolved;
export const getPendingMessage = () => pendingMessage;

// Called once on boot (see src/app.js) and again after anything that could
// change who's signed in. Safe to call repeatedly — it never throws.
export async function refreshSession() {
  try {
    const res = await fetch('/api/private/me', { credentials: 'same-origin' });
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      // Access redirected to its own login page: nobody is signed in.
      user = null;
      pendingMessage = null;
    } else {
      const data = await res.json();
      if (res.ok) { user = data; pendingMessage = null; }
      else { user = null; pendingMessage = res.status === 403 ? data.error : null; }
    }
  } catch {
    user = null;
  }
  resolved = true;
  listeners.forEach((fn) => fn(user));
  return user;
}

// Sends the browser to a Cloudflare Access–protected path. Someone without
// a session gets Access's own login screen; the path itself (see
// functions/api/private/login.js) just bounces back into the app once
// Access has authenticated them.
export function signIn() {
  const back = location.hash || '#/dashboard';
  location.href = `/api/private/login?return=${encodeURIComponent(back)}`;
}

// Clears the Access session cookie. /cdn-cgi/access/logout is served by
// Cloudflare at the edge for any zone with an Access application on it —
// no team-domain config needed client-side.
export function signOut() {
  location.href = '/cdn-cgi/access/logout';
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- Permission checks ----------------------------------------------
   Client-side only — these decide what the UI shows. The real check for
   every write happens again in functions/api/**, against the Access
   session, because a browser-side check can always be bypassed. */
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

  isSignedIn: (actor) => Boolean(actor),
};
