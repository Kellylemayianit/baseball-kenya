import * as db from '../../../server-lib/d1.js';
import { json, route } from '../../../server-lib/respond.js';

export const onRequestGet = route(async ({ env, params }) => {
  const player = await db.getPlayer(env, params.id);
  if (!player) return json({ error: 'Player not found.' }, { status: 404 });
  return json(player);
});
