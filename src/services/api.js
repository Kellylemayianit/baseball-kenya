// api.js — thin fetch client for the real Cloudflare Pages Functions API in
// /functions. Every function here has the exact name and parameter order
// the old in-memory demo version had, so nothing in dataLoader.js or any
// page/component needed to change — only this file did. Permission checks
// now live purely on the server (functions/api/**), which is why the
// trailing `actor` parameter some of these still accept is ignored: the
// server derives who's calling from the Cloudflare Access session cookie,
// never from anything the client claims.

const BASE = '/api';

async function call(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // A /private/* call from a signed-out browser gets redirected by
    // Cloudflare Access to its login page (HTML, not JSON) rather than a
    // clean 401 — this is what that looks like from fetch's side.
    throw new Error('Sign in required.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UT'];
export const INNINGS = 7;

/* ---------- Reads --------------------------------------------------------- */
export const listOrganizations = () => call('/organizations');
export const listLeagues = () => call('/leagues');
export const listTeams = () => call('/teams');
export const listMatches = () => call('/matches');
export const listNews = () => call('/news');
export const listPlayers = (teamId) => call(`/players${teamId ? `?team=${encodeURIComponent(teamId)}` : ''}`);
export const getPlayer = (playerId) => call(`/players/${encodeURIComponent(playerId)}`);

export async function listFollowedTeamIds(actor) {
  if (!actor) return [];
  try { return await call('/private/follows'); } catch { return []; }
}

/* ---------- Follows --------------------------------------------------------- */
export const toggleFollow = (teamId, _actor) => call('/private/follows', { method: 'POST', body: { teamId } });

/* ---------- Teams ------------------------------------------------------------ */
export const registerTeam = (input) => call('/teams', { method: 'POST', body: input });
export const setTeamStatus = (teamId, status, _actor) => call(`/private/teams/${teamId}/status`, { method: 'POST', body: { status } });
export const updateTeam = (teamId, patch, _actor) => call(`/private/teams/${teamId}`, { method: 'POST', body: patch });

/* ---------- Players ------------------------------------------------------------ */
export const addPlayer = (teamId, player, _actor) => call('/private/players', { method: 'POST', body: { teamId, ...player } });
export const removePlayer = (playerId, _actor) => call(`/private/players/${playerId}`, { method: 'DELETE' });
export const updatePlayerBio = (playerId, bio, _actor) => call(`/private/players/${playerId}/bio`, { method: 'POST', body: { bio } });

/* ---------- Matches -------------------------------------------------------------- */
export const createFixture = (input, _actor) => call('/private/matches', { method: 'POST', body: input });
export const submitMatchResult = (matchId, input, _actor) => call(`/private/matches/${matchId}/result`, { method: 'POST', body: input });
export const verifyMatch = (matchId, _actor) => call(`/private/matches/${matchId}/verify`, { method: 'POST' });
export const sendBackMatch = (matchId, note, _actor) => call(`/private/matches/${matchId}/send-back`, { method: 'POST', body: { note } });

/* ---------- Account provisioning -------------------------------------------------- */
export const createUserAccount = (input) => call('/private/users', { method: 'POST', body: input });
