// POST /api/private/teams/:id { homeField, about } — team-staff self-edit
import * as db from '../../../../server-lib/d1.js';
import { json, route } from '../../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, params, request }) => {
  const patch = await request.json();
  return json(await db.updateTeam(env, params.id, patch, data.user));
});
