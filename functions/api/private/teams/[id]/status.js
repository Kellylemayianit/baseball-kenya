// POST /api/private/teams/:id/status { status: "approved" | "rejected" }
import * as db from '../../../../../server-lib/d1.js';
import { json, route } from '../../../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, params, request }) => {
  const { status } = await request.json();
  return json(await db.setTeamStatus(env, params.id, status, data.user));
});
