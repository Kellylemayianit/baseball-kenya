// POST /api/private/players/:id/bio { bio }
import * as db from '../../../../../server-lib/d1.js';
import { json, route } from '../../../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, params, request }) => {
  const { bio } = await request.json();
  return json(await db.updatePlayerBio(env, params.id, bio, data.user));
});
