/**
 * dataLoader.js — thin caching layer in front of services/api.js.
 * Pages and components should import from here (never from api.js
 * directly) so caching, invalidation and derived lookups live in one
 * place.
 */
import * as api from "./api.js";

const cache = {
  teams: null, // Promise<Team[]> | null
  matches: null, // Promise<Match[]> | null
};

export function getTeams({ fresh = false } = {}) {
  if (fresh || !cache.teams) cache.teams = api.fetchTeams();
  return cache.teams;
}

export async function getTeamById(id) {
  const teams = await getTeams();
  const found = teams.find((t) => t.id === id);
  if (found) return found;
  return api.fetchTeamById(id);
}

export function getMatches({ fresh = false } = {}) {
  if (fresh || !cache.matches) cache.matches = api.fetchMatches();
  return cache.matches;
}

export async function getMatchById(id) {
  const matches = await getMatches();
  const found = matches.find((m) => m.id === id);
  if (found) return found;
  return api.fetchMatchById(id);
}

/** Matches involving a given team, most recent first. */
export async function getMatchesForTeam(teamId) {
  const matches = await getMatches();
  return matches
    .filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getUpcomingMatches(limit = 4) {
  const matches = await getMatches();
  return matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, limit);
}

export async function getLiveOrRecentMatches(limit = 6) {
  const matches = await getMatches();
  return matches
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

/** Standings derived from each team's recorded win/loss totals. */
export async function getStandings() {
  const teams = await getTeams();
  return teams
    .map((t) => ({
      ...t,
      games: t.wins + t.losses,
      pct: t.wins + t.losses ? t.wins / (t.wins + t.losses) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);
}

/** Create a match and invalidate the matches cache so views refresh. */
export async function createMatch(payload) {
  const created = await api.createMatch(payload);
  cache.matches = null;
  return created;
}

export async function updateMatch(id, patch) {
  const updated = await api.updateMatch(id, patch);
  cache.matches = null;
  return updated;
}

export async function deleteMatch(id) {
  const result = await api.deleteMatch(id);
  cache.matches = null;
  return result;
}

export function invalidateAll() {
  cache.teams = null;
  cache.matches = null;
}
