// dataLoader.js — turns raw service data into the view models pages need.
// Standings are always derived from verified results, never stored.

import * as api from './api.js';
import { getUser } from '../utilities/auth.js';
import { byId, sum } from '../utilities/helpers.js';

const isApproved = (team) => team.status === 'approved';

async function loadBase() {
  const [organizations, leagues, teams, matches, news, followed] = await Promise.all([
    api.listOrganizations(), api.listLeagues(), api.listTeams(), api.listMatches(), api.listNews(),
    api.listFollowedTeamIds(getUser()),
  ]);
  const user = getUser();
  return {
    user, organizations, leagues, teams, matches, news, followed,
    ref: { teams: byId(teams), leagues: byId(leagues), matches: byId(matches), orgs: byId(organizations) },
  };
}

/* ---------- Standings ----------------------------------------------------- */
// Only 'final' matches count. A pending result never moves the table.
export function computeStandings(league, teams, matches) {
  const rows = new Map();
  for (const team of teams.filter(isApproved)) {
    if (league.teamIds.includes(team.id)) {
      rows.set(team.id, { teamId: team.id, p: 0, w: 0, l: 0, t: 0, rs: 0, ra: 0, results: [] });
    }
  }

  const finals = matches
    .filter((m) => m.leagueId === league.id && m.status === 'final' && m.innings)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const m of finals) {
    const away = sum(m.innings.away);
    const home = sum(m.innings.home);
    const apply = (row, scored, allowed) => {
      if (!row) return;
      row.p += 1;
      row.rs += scored;
      row.ra += allowed;
      const result = scored > allowed ? 'W' : scored < allowed ? 'L' : 'T';
      row[result.toLowerCase()] += 1;
      row.results.push(result);
    };
    apply(rows.get(m.awayId), away, home);
    apply(rows.get(m.homeId), home, away);
  }

  const list = [...rows.values()].map((row) => ({
    ...row,
    rd: row.rs - row.ra,
    pct: row.p ? (row.w + row.t / 2) / row.p : 0,
    form: row.results.slice(-5),
  }));

  const name = (id) => teams.find((t) => t.id === id)?.name ?? '';
  list.sort((a, b) => b.pct - a.pct || b.rd - a.rd || b.rs - a.rs || name(a.teamId).localeCompare(name(b.teamId)));

  const leader = list[0];
  return list.map((row, i) => ({
    ...row,
    rank: i + 1,
    gb: leader ? ((leader.w - leader.l) - (row.w - row.l)) / 2 : 0,
  }));
}

const byDateAsc = (a, b) => a.date.localeCompare(b.date);
const byDateDesc = (a, b) => b.date.localeCompare(a.date);

/* ---------- Home ---------------------------------------------------------- */
export async function loadHome() {
  const base = await loadBase();
  const finals = base.matches.filter((m) => m.status === 'final').sort(byDateDesc);
  const upcoming = base.matches.filter((m) => m.status === 'scheduled').sort(byDateAsc).slice(0, 3);
  const league = base.leagues[0];
  const standings = league ? computeStandings(league, base.teams, base.matches) : [];
  const featuredTeams = standings.slice(0, 4).map((row) => ({
    team: base.ref.teams[row.teamId], row,
  }));
  return {
    ...base,
    league, standings,
    featured: finals[0] ?? null,
    latest: finals.slice(1, 4),
    upcoming,
    featuredTeams,
    leagueMap: base.ref.leagues,
  };
}

/* ---------- Teams --------------------------------------------------------- */
function visibleTeams(base) {
  const { user, teams } = base;
  return teams.filter((t) => isApproved(t) || user?.role === 'super' ||
    (user?.role === 'federation' && user.orgId === t.orgId) || user?.teamId === t.id);
}

function primaryRecord(team, base) {
  const league = base.ref.leagues[team.leagueIds[0]];
  if (!league) return { league: null, row: null };
  const rows = computeStandings(league, base.teams, base.matches);
  return { league, row: rows.find((r) => r.teamId === team.id) ?? null };
}

export async function loadTeams() {
  const base = await loadBase();
  const teams = visibleTeams(base).map((team) => {
    const { league, row } = primaryRecord(team, base);
    return { ...team, league, row, followed: base.followed.includes(team.id) };
  });
  teams.sort((a, b) => (a.row?.rank ?? 99) - (b.row?.rank ?? 99) || a.name.localeCompare(b.name));
  return {
    ...base,
    teams,
    counties: [...new Set(teams.map((t) => t.county))].sort(),
  };
}

export async function loadTeamDetail(teamId) {
  const base = await loadBase();
  const team = visibleTeams(base).find((t) => t.id === teamId);
  if (!team) return null;
  const roster = (await api.listPlayers(teamId)).sort((a, b) => a.jersey - b.jersey);
  const teamMatches = base.matches.filter((m) => m.homeId === teamId || m.awayId === teamId);
  const tables = team.leagueIds.map((leagueId) => {
    const league = base.ref.leagues[leagueId];
    const rows = computeStandings(league, base.teams, base.matches);
    return { league, row: rows.find((r) => r.teamId === teamId) ?? null, size: rows.length };
  });
  return {
    ...base,
    team: { ...team, followed: base.followed.includes(teamId) },
    roster, tables,
    upcoming: teamMatches.filter((m) => m.status === 'scheduled').sort(byDateAsc),
    results: teamMatches.filter((m) => m.status !== 'scheduled').sort(byDateDesc),
  };
}

/* ---------- Matches ------------------------------------------------------- */
export async function loadMatches(leagueId) {
  const base = await loadBase();
  const league = base.ref.leagues[leagueId] ?? base.leagues[0];
  const inLeague = base.matches.filter((m) => m.leagueId === league.id);
  return {
    ...base,
    league,
    fixtures: inLeague.filter((m) => m.status === 'scheduled').sort(byDateAsc),
    results: inLeague.filter((m) => m.status !== 'scheduled').sort(byDateDesc),
    standings: computeStandings(league, base.teams, base.matches),
  };
}

/* ---------- Dashboard -------------------------------------------------------
   Every stakeholder gets its own view model, but they all share the same
   base data so a role change never means a different data source. */
export async function loadDashboard(user) {
  const base = await loadBase();

  if (user.role === 'super' || user.role === 'federation') {
    const orgs = user.role === 'super' ? base.organizations : base.organizations.filter((o) => o.id === user.orgId);
    const orgIds = new Set(orgs.map((o) => o.id));
    const inScope = (leagueId) => orgIds.has(base.ref.leagues[leagueId]?.orgId);
    return {
      ...base,
      orgs,
      pendingTeams: base.teams.filter((t) => t.status === 'pending' && orgIds.has(t.orgId)),
      pendingResults: base.matches.filter((m) => m.status === 'pending' && inScope(m.leagueId)).sort(byDateAsc),
      scheduled: base.matches.filter((m) => m.status === 'scheduled' && inScope(m.leagueId)).sort(byDateAsc),
      approvedTeams: base.teams.filter((t) => isApproved(t) && orgIds.has(t.orgId)).length,
      verifiedGames: base.matches.filter((m) => m.status === 'final' && inScope(m.leagueId)).length,
    };
  }

  if (user.role === 'fan') {
    const teams = base.teams.filter((t) => base.followed.includes(t.id)).map((team) => {
      const { league, row } = primaryRecord(team, base);
      return { ...team, league, row, followed: true };
    });
    const teamIds = new Set(teams.map((t) => t.id));
    const upcoming = base.matches
      .filter((m) => m.status === 'scheduled' && (teamIds.has(m.homeId) || teamIds.has(m.awayId)))
      .sort(byDateAsc);
    return { ...base, teams, upcoming };
  }

  if (user.role === 'player') {
    const team = base.ref.teams[user.teamId];
    const player = await api.getPlayer(user.playerId);
    const { league, row } = primaryRecord(team, base);
    const mine = base.matches.filter((m) => m.homeId === team.id || m.awayId === team.id).sort(byDateAsc);
    return { ...base, team, player, league, row, mine };
  }

  // coach / team staff
  const team = base.ref.teams[user.teamId];
  const { league, row } = primaryRecord(team, base);
  const size = league ? computeStandings(league, base.teams, base.matches).length : 0;
  const roster = (await api.listPlayers(team.id)).sort((a, b) => a.jersey - b.jersey);
  const mine = base.matches
    .filter((m) => m.homeId === team.id || m.awayId === team.id)
    .sort(byDateAsc);
  return { ...base, team, league, row, size, roster, mine };
}
