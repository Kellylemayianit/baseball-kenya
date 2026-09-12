/**
 * api.js — simulated network layer. Every call returns a Promise and
 * incurs artificial latency, so callers (dataLoader.js) can be written
 * exactly as they would against a real REST backend. Mutates its own
 * in-memory copy of the seed data so create/update/delete persist for
 * the session without touching mockData.js's originals.
 */
import { teams as seedTeams, matches as seedMatches } from "./mockData.js";
import { uid } from "../utilities/helpers.js";

const LATENCY_MS = 260;

// Working copies — deep-cloned so the seed module stays pristine.
let teamsStore = seedTeams.map((t) => ({ ...t, roster: [...t.roster] }));
let matchesStore = seedMatches.map((m) => ({ ...m }));

function delay(value, ms = LATENCY_MS) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), LATENCY_MS));
}

/* ---------------------------- Teams ---------------------------- */

export function fetchTeams() {
  return delay(teamsStore.map((t) => ({ ...t })));
}

export function fetchTeamById(id) {
  const team = teamsStore.find((t) => t.id === id);
  return team ? delay({ ...team }) : fail(`No team found for id "${id}"`);
}

/* ---------------------------- Matches ---------------------------- */

export function fetchMatches() {
  return delay(matchesStore.map((m) => ({ ...m })));
}

export function fetchMatchById(id) {
  const match = matchesStore.find((m) => m.id === id);
  return match ? delay({ ...match }) : fail(`No match found for id "${id}"`);
}

export function createMatch(payload) {
  if (!payload.homeTeamId || !payload.awayTeamId || !payload.date) {
    return fail("Home team, away team and date are required.");
  }
  if (payload.homeTeamId === payload.awayTeamId) {
    return fail("Home and away teams must be different.");
  }
  const record = {
    id: uid("m"),
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    innings: 9,
    ...payload,
  };
  matchesStore = [record, ...matchesStore];
  return delay({ ...record });
}

export function updateMatch(id, patch) {
  const index = matchesStore.findIndex((m) => m.id === id);
  if (index === -1) return fail(`No match found for id "${id}"`);
  matchesStore[index] = { ...matchesStore[index], ...patch };
  return delay({ ...matchesStore[index] });
}

export function deleteMatch(id) {
  const exists = matchesStore.some((m) => m.id === id);
  if (!exists) return fail(`No match found for id "${id}"`);
  matchesStore = matchesStore.filter((m) => m.id !== id);
  return delay({ id });
}
