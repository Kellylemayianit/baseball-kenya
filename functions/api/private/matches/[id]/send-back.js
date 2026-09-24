// POST /api/private/matches/:id/send-back { note }
import * as db from '../../../../../server-lib/d1.js';
import { json, route } from '../../../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, params, request }) => {
  const { note } = await request.json().catch(() => ({}));
  return json(await db.sendBackMatch(env, params.id, note, data.user));
});
