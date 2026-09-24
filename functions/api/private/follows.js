// GET  /api/private/follows        — the signed-in user's followed team ids
// POST /api/private/follows { teamId } — toggle following that team
import * as db from '../../../server-lib/d1.js';
import { json, route } from '../../../server-lib/respond.js';

export const onRequestGet = route(async ({ env, data }) => json(await db.listFollowedTeamIds(env, data.user)));

export const onRequestPost = route(async ({ env, data, request }) => {
  const { teamId } = await request.json();
  return json(await db.toggleFollow(env, teamId, data.user));
});
