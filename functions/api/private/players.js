// POST /api/private/players { teamId, name, jersey, position }
import * as db from '../../../server-lib/d1.js';
import { json, route } from '../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, request }) => {
  const { teamId, ...player } = await request.json();
  return json(await db.addPlayer(env, teamId, player, data.user), { status: 201 });
});
