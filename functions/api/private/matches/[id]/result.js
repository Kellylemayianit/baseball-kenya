// POST /api/private/matches/:id/result { innings, hits, errors, recap }
import * as db from '../../../../../server-lib/d1.js';
import { json, route } from '../../../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, params, request }) => {
  const body = await request.json();
  return json(await db.submitMatchResult(env, params.id, body, data.user));
});
