// GET  /api/teams            — public: every team (frontend already hides
//                               pending/rejected ones from the general
//                               public in dataLoader.js's visibleTeams())
// POST /api/teams             — public: team registration. Deliberately not
//                               under /private — a brand-new team doesn't
//                               have an Access-provisioned account yet.
import * as db from '../../server-lib/d1.js';
import { json, route } from '../../server-lib/respond.js';

export const onRequestGet = route(async ({ env }) => json(await db.listTeams(env)));

export const onRequestPost = route(async ({ env, request }) => {
  const body = await request.json();
  return json(await db.registerTeam(env, body), { status: 201 });
});
