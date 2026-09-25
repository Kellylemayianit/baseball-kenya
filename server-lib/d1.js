import { hashPassword } from './password.js';

// d1.js — every query the API makes. Same function names, same inputs, same
// validation and same permission checks as the old in-memory src/services/api.js
// had, and the same return shapes the frontend already expects — this file
// is that file's real-database replacement, not a new design.
//
// A note on `actor`: every mutating function here takes an actor resolved
// from the signed-in session (see server-lib/session.js), never from
// anything the client sent in the request body. That's the one structural
// change from the demo: permission can no longer be spoofed by editing a
// JS object in the browser console.

export const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UT'];
export const INNINGS = 7;

class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const refuse = (message, status) => { throw new ApiError(message, status); };

const isSuper = (actor) => actor?.role === 'super';
const isFederation = (actor) => actor?.role === 'federation';
const isTeamStaff = (actor) => actor?.role === 'coach' || actor?.role === 'team';
const managesTeam = (actor, teamId) => isSuper(actor) || (isTeamStaff(actor) && actor.teamId === teamId);
const moderatesOrg = (actor, orgId) => isSuper(actor) || (isFederation(actor) && actor.orgId === orgId);

const clean = (text, max) => String(text ?? '').trim().slice(0, max);
const wholeNumber = (value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 99;
const newId = (prefix) => `${prefix}${crypto.randomUUID().slice(0, 8)}`;

const j = (value) => JSON.stringify(value);
const parseJ = (value) => (value == null ? null : JSON.parse(value));

/* ---------- Row shaping: D1 gives snake_case-ish flat rows; the frontend
   expects the nested camelCase shapes api.js always returned. ------------ */
function shapeTeam(row) {
  return {
    id: row.id, orgId: row.org_id, name: row.name, short: row.short, county: row.county,
    region: row.region, homeField: row.home_field, founded: row.founded, type: row.type,
    color: row.color, status: row.status, about: row.about,
    managerName: row.manager_name, contact: row.contact_email,
    leagueIds: row.league_ids ? row.league_ids.split(',') : [],
  };
}
function shapeLeague(row) {
  return { id: row.id, orgId: row.org_id, name: row.name, kind: row.kind, season: row.season, blurb: row.blurb, teamIds: row.team_ids ? row.team_ids.split(',') : [] };
}
function shapeMatch(row) {
  return {
    id: row.id, leagueId: row.league_id, awayId: row.away_id, homeId: row.home_id,
    date: row.date, venue: row.venue, status: row.status,
    innings: row.innings_away ? { away: parseJ(row.innings_away), home: parseJ(row.innings_home) } : null,
    hits: row.hits_away == null ? null : { away: row.hits_away, home: row.hits_home },
    errors: row.errors_away == null ? null : { away: row.errors_away, home: row.errors_home },
    recap: row.recap, submittedBy: row.submitted_by, verifiedBy: row.verified_by, adminNote: row.admin_note,
  };
}
function shapePlayer(row) {
  return { id: row.id, teamId: row.team_id, name: row.name, jersey: row.jersey, position: row.position, bio: row.bio };
}

/* ---------- Reads --------------------------------------------------------- */
export async function listOrganizations(env) {
  const { results } = await env.DB.prepare(
    `SELECT o.*, GROUP_CONCAT(l.id) AS league_ids FROM organizations o
     LEFT JOIN leagues l ON l.org_id = o.id GROUP BY o.id`,
  ).all();
  return results.map((r) => ({ id: r.id, name: r.name, kind: r.kind, leagueIds: r.league_ids ? r.league_ids.split(',') : [] }));
}

export async function listLeagues(env) {
  const { results } = await env.DB.prepare(
    `SELECT l.*, GROUP_CONCAT(tl.team_id) AS team_ids FROM leagues l
     LEFT JOIN team_leagues tl ON tl.league_id = l.id GROUP BY l.id`,
  ).all();
  return results.map(shapeLeague);
}

export async function listTeams(env) {
  const { results } = await env.DB.prepare(
    `SELECT t.*, GROUP_CONCAT(tl.league_id) AS league_ids FROM teams t
     LEFT JOIN team_leagues tl ON tl.team_id = t.id GROUP BY t.id`,
  ).all();
  return results.map(shapeTeam);
}

export async function listMatches(env) {
  const { results } = await env.DB.prepare('SELECT * FROM matches').all();
  return results.map(shapeMatch);
}

export async function listNews(env) {
  const { results } = await env.DB.prepare('SELECT * FROM news ORDER BY date DESC').all();
  return results;
}

export async function listPlayers(env, teamId) {
  const stmt = teamId
    ? env.DB.prepare('SELECT * FROM players WHERE team_id = ?1').bind(teamId)
    : env.DB.prepare('SELECT * FROM players');
  const { results } = await stmt.all();
  return results.map(shapePlayer);
}

export async function getPlayer(env, playerId) {
  const row = await env.DB.prepare('SELECT * FROM players WHERE id = ?1').bind(playerId).first();
  return row ? shapePlayer(row) : null;
}

export async function listFollowedTeamIds(env, actor) {
  if (!actor) return [];
  const { results } = await env.DB.prepare('SELECT team_id FROM follows WHERE user_id = ?1').bind(actor.id).all();
  return results.map((r) => r.team_id);
}

/* ---------- Follows --------------------------------------------------------- */
export async function toggleFollow(env, teamId, actor) {
  if (!actor) refuse('Sign in to follow a team.', 401);
  const team = await env.DB.prepare('SELECT id FROM teams WHERE id = ?1').bind(teamId).first();
  if (!team) refuse('That team no longer exists.', 404);
  const existing = await env.DB.prepare('SELECT 1 FROM follows WHERE user_id = ?1 AND team_id = ?2').bind(actor.id, teamId).first();
  if (existing) {
    await env.DB.prepare('DELETE FROM follows WHERE user_id = ?1 AND team_id = ?2').bind(actor.id, teamId).run();
    return { following: false };
  }
  await env.DB.prepare('INSERT INTO follows (user_id, team_id) VALUES (?1, ?2)').bind(actor.id, teamId).run();
  return { following: true };
}

/* ---------- Teams ------------------------------------------------------------ */
export async function registerTeam(env, { name, orgId, county, homeField, managerName, contact }) {
  const team = {
    name: clean(name, 60), county: clean(county, 40), homeField: clean(homeField, 80),
    managerName: clean(managerName, 60), contact: clean(contact, 80),
  };
  if (!team.name || !team.county || !team.homeField || !team.managerName || !team.contact) {
    refuse('Fill in every field so the federation can review your team.');
  }
  if (!/^\S+@\S+\.\S+$/.test(team.contact)) refuse('Enter an email address the federation can reply to.');

  const dupe = await env.DB.prepare('SELECT 1 FROM teams WHERE lower(name) = lower(?1)').bind(team.name).first();
  if (dupe) refuse('A team with that name already exists.');

  const org = (await env.DB.prepare('SELECT id FROM organizations WHERE id = ?1').bind(orgId).first())
    ?? (await env.DB.prepare('SELECT id FROM organizations LIMIT 1').first());
  if (!org) refuse('No organisation is set up to receive registrations yet.', 500);

  const id = newId('t');
  const short = team.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'NEW';
  await env.DB.prepare(
    `INSERT INTO teams (id, org_id, name, short, county, region, home_field, founded, type, color, status, about, manager_name, contact_email)
     VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?7, 'Community club', '#374151', 'pending', '', ?8, ?9)`,
  ).bind(id, org.id, team.name, short, team.county, team.homeField, new Date().getFullYear(), team.managerName, team.contact).run();

  const row = await env.DB.prepare('SELECT * FROM teams WHERE id = ?1').bind(id).first();
  return shapeTeam({ ...row, league_ids: '' });
}

export async function setTeamStatus(env, teamId, status, actor) {
  const team = await env.DB.prepare('SELECT * FROM teams WHERE id = ?1').bind(teamId).first();
  if (!team) refuse('That team no longer exists.', 404);
  if (!moderatesOrg(actor, team.org_id)) refuse('Only that organisation’s federation admin can do that.', 403);
  if (!['approved', 'rejected'].includes(status)) refuse('Unknown status.');

  await env.DB.prepare('UPDATE teams SET status = ?1 WHERE id = ?2').bind(status, teamId).run();

  if (status === 'approved') {
    const already = await env.DB.prepare('SELECT 1 FROM team_leagues WHERE team_id = ?1').bind(teamId).first();
    if (!already) {
      const league = await env.DB.prepare('SELECT id FROM leagues WHERE org_id = ?1 LIMIT 1').bind(team.org_id).first();
      if (league) await env.DB.prepare('INSERT INTO team_leagues (team_id, league_id) VALUES (?1, ?2)').bind(teamId, league.id).run();
    }
  }
  return { id: teamId, status };
}

export async function updateTeam(env, teamId, patch, actor) {
  if (!managesTeam(actor, teamId)) refuse('You can only change your own team.', 403);
  const homeField = clean(patch.homeField, 80);
  if (!homeField) refuse('Add the name of your home field.');
  const about = clean(patch.about, 400);
  await env.DB.prepare('UPDATE teams SET home_field = ?1, about = ?2 WHERE id = ?3').bind(homeField, about, teamId).run();
  return { id: teamId, homeField, about };
}

/* ---------- Players ------------------------------------------------------------ */
export async function addPlayer(env, teamId, { name, jersey, position }, actor) {
  if (!managesTeam(actor, teamId)) refuse('You can only change your own team.', 403);
  const player = { name: clean(name, 60), jersey: Number(jersey), position };
  if (!player.name) refuse('Enter the player’s name.');
  if (!wholeNumber(jersey)) refuse('Jersey numbers run from 0 to 99.');
  if (!POSITIONS.includes(player.position)) refuse('Pick a position from the list.');

  const dupe = await env.DB.prepare('SELECT 1 FROM players WHERE team_id = ?1 AND jersey = ?2').bind(teamId, player.jersey).first();
  if (dupe) refuse(`Jersey ${player.jersey} is already taken on this team.`);

  const id = newId('p');
  await env.DB.prepare('INSERT INTO players (id, team_id, name, jersey, position, bio) VALUES (?1, ?2, ?3, ?4, ?5, \'\')')
    .bind(id, teamId, player.name, player.jersey, player.position).run();
  return { id, teamId, bio: '', ...player };
}

export async function removePlayer(env, playerId, actor) {
  const player = await env.DB.prepare('SELECT * FROM players WHERE id = ?1').bind(playerId).first();
  if (!player) refuse('That player is already gone.', 404);
  if (!managesTeam(actor, player.team_id)) refuse('You can only change your own team.', 403);
  await env.DB.prepare('DELETE FROM players WHERE id = ?1').bind(playerId).run();
}

export async function updatePlayerBio(env, playerId, bio, actor) {
  const player = await env.DB.prepare('SELECT * FROM players WHERE id = ?1').bind(playerId).first();
  if (!player) refuse('That player no longer exists.', 404);
  const allowed = isSuper(actor) || actor?.playerId === playerId || managesTeam(actor, player.team_id);
  if (!allowed) refuse('You can only edit your own player profile.', 403);
  const value = clean(bio, 300);
  await env.DB.prepare('UPDATE players SET bio = ?1 WHERE id = ?2').bind(value, playerId).run();
  return { id: playerId, bio: value };
}

/* ---------- Matches -------------------------------------------------------------- */
export async function createFixture(env, { leagueId, awayId, homeId, date, venue }, actor) {
  const league = await env.DB.prepare('SELECT * FROM leagues WHERE id = ?1').bind(leagueId).first();
  if (!league) refuse('Pick a league or tournament.');
  if (!moderatesOrg(actor, league.org_id)) refuse('Only that organisation’s federation admin can do that.', 403);
  if (!awayId || !homeId) refuse('Pick both teams.');
  if (awayId === homeId) refuse('A team cannot play itself.');

  const inLeague = await env.DB.prepare('SELECT team_id FROM team_leagues WHERE league_id = ?1 AND team_id IN (?2, ?3)').bind(leagueId, awayId, homeId).all();
  if (inLeague.results.length !== 2) refuse('Both teams must belong to this league.');
  if (!date || Number.isNaN(new Date(date).getTime())) refuse('Pick a date and start time.');

  const home = await env.DB.prepare('SELECT home_field FROM teams WHERE id = ?1').bind(homeId).first();
  const id = newId('m');
  await env.DB.prepare(
    `INSERT INTO matches (id, league_id, away_id, home_id, date, venue, status, recap, admin_note)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'scheduled', '', '')`,
  ).bind(id, leagueId, awayId, homeId, date, clean(venue, 80) || home.home_field).run();

  const row = await env.DB.prepare('SELECT * FROM matches WHERE id = ?1').bind(id).first();
  return shapeMatch(row);
}

export async function submitMatchResult(env, matchId, { innings, hits, errors, recap }, actor) {
  const match = await env.DB.prepare('SELECT * FROM matches WHERE id = ?1').bind(matchId).first();
  if (!match) refuse('That game no longer exists.', 404);
  const league = await env.DB.prepare('SELECT org_id FROM leagues WHERE id = ?1').bind(match.league_id).first();
  const allowed = isSuper(actor) || moderatesOrg(actor, league?.org_id) || managesTeam(actor, match.home_id) || managesTeam(actor, match.away_id);
  if (!allowed) refuse('Only the two teams or the federation can enter a result.', 403);
  if (match.status !== 'scheduled') refuse('This game already has a result.');

  const inningsOk = ['away', 'home'].every((side) => Array.isArray(innings?.[side]) && innings[side].length === INNINGS && innings[side].every(wholeNumber));
  if (!inningsOk) refuse(`Enter runs for all ${INNINGS} innings, using whole numbers from 0 to 99.`);
  const countsOk = ['away', 'home'].every((side) => wholeNumber(hits?.[side]) && wholeNumber(errors?.[side]));
  if (!countsOk) refuse('Hits and errors must be whole numbers from 0 to 99.');

  const auto = isSuper(actor) || moderatesOrg(actor, league?.org_id);
  const status = auto ? 'final' : 'pending';
  await env.DB.prepare(
    `UPDATE matches SET innings_away=?1, innings_home=?2, hits_away=?3, hits_home=?4, errors_away=?5, errors_home=?6,
     recap=?7, submitted_by=?8, admin_note='', status=?9, verified_by=?10 WHERE id=?11`,
  ).bind(
    j(innings.away.map(Number)), j(innings.home.map(Number)), Number(hits.away), Number(hits.home),
    Number(errors.away), Number(errors.home), clean(recap, 600), actor.id, status, auto ? actor.id : null, matchId,
  ).run();

  return { id: matchId, status };
}

export async function verifyMatch(env, matchId, actor) {
  const match = await env.DB.prepare('SELECT * FROM matches WHERE id = ?1').bind(matchId).first();
  if (!match) refuse('That result is no longer waiting for review.', 404);
  const league = await env.DB.prepare('SELECT org_id FROM leagues WHERE id = ?1').bind(match.league_id).first();
  if (!moderatesOrg(actor, league?.org_id)) refuse('Only that organisation’s federation admin can do that.', 403);
  if (match.status !== 'pending') refuse('That result is no longer waiting for review.');
  await env.DB.prepare("UPDATE matches SET status='final', verified_by=?1 WHERE id=?2").bind(actor.id, matchId).run();
  return { id: matchId, status: 'final' };
}

export async function sendBackMatch(env, matchId, note, actor) {
  const match = await env.DB.prepare('SELECT * FROM matches WHERE id = ?1').bind(matchId).first();
  if (!match) refuse('That result is no longer waiting for review.', 404);
  const league = await env.DB.prepare('SELECT org_id FROM leagues WHERE id = ?1').bind(match.league_id).first();
  if (!moderatesOrg(actor, league?.org_id)) refuse('Only that organisation’s federation admin can do that.', 403);
  if (match.status !== 'pending') refuse('That result is no longer waiting for review.');
  await env.DB.prepare(
    `UPDATE matches SET status='scheduled', innings_away=NULL, innings_home=NULL, hits_away=NULL, hits_home=NULL,
     errors_away=NULL, errors_home=NULL, recap='', submitted_by=NULL, admin_note=?1 WHERE id=?2`,
  ).bind(clean(note, 200) || 'Sent back for correction.', matchId).run();
  return { id: matchId, status: 'scheduled' };
}

export { ApiError };

/* ---------- Account provisioning --------------------------------------------
   Nobody gets a role by signing up for themselves — POST /api/auth/signup
   only ever creates a 'fan'. Every other role is created here, by someone
   who already has the right to grant it:
     - 'federation' accounts: only the platform admin (super) can create
       one, and must assign it an orgId.
     - 'player' / 'coach' / 'team' accounts: the platform admin, that
       team's federation admin, or that team's existing staff can create
       one, always scoped to a specific team.
     - 'super' is never created through this endpoint at all — the one
       platform-admin account is seeded directly via a migration, on
       purpose, so it can never be granted through the API even by another
       super account. */
export async function createUserAccount(env, { email, password, name, role, teamId, playerId, orgId }, actor) {
  const cleanEmail = clean(email, 120).toLowerCase();
  const cleanName = clean(name, 60);
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) refuse('Enter a valid email address.');
  if (!password || String(password).length < 8) refuse('Password must be at least 8 characters.');
  if (!cleanName) refuse('Enter a name.');
  if (!['player', 'coach', 'team', 'federation'].includes(role)) refuse('Pick a valid role.');

  let scope = { teamId: null, playerId: null, orgId: null };

  if (role === 'federation') {
    if (!isSuper(actor)) refuse('Only the site admin can create federation accounts.', 403);
    const org = await env.DB.prepare('SELECT id FROM organizations WHERE id = ?1').bind(orgId).first();
    if (!org) refuse('Pick an organisation.');
    scope.orgId = org.id;
  } else {
    const team = await env.DB.prepare('SELECT id, org_id FROM teams WHERE id = ?1').bind(teamId).first();
    if (!team) refuse('Pick a team.');
    const allowed = isSuper(actor) || moderatesOrg(actor, team.org_id) || managesTeam(actor, team.id);
    if (!allowed) refuse('You can only add people to your own team.', 403);
    scope.teamId = team.id;
    if (role === 'player') {
      if (!playerId) refuse('Pick a player from the roster.');
      const player = await env.DB.prepare('SELECT id FROM players WHERE id = ?1 AND team_id = ?2').bind(playerId, team.id).first();
      if (!player) refuse('That player is not on this team.');
      scope.playerId = player.id;
    }
  }

  const dupe = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?1').bind(cleanEmail).first();
  if (dupe) refuse('An account with that email already exists.');

  const id = newId('u');
  const passwordHash = await hashPassword(String(password));
  await env.DB.prepare(
    'INSERT INTO users (id, role, name, email, password_hash, team_id, player_id, org_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)',
  ).bind(id, role, cleanName, cleanEmail, passwordHash, scope.teamId, scope.playerId, scope.orgId).run();

  return { id, role, name: cleanName, email: cleanEmail, ...scope };
}
