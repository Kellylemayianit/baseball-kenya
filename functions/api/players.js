// GET /api/players?team=t1  (team is optional — omit it for the full list)
import * as db from '../../server-lib/d1.js';
import { json, route } from '../../server-lib/respond.js';

export const onRequestGet = route(async ({ env, request }) => {
  const teamId = new URL(request.url).searchParams.get('team');
  return json(await db.listPlayers(env, teamId));
});
