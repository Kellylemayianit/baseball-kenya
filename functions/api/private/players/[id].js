// DELETE /api/private/players/:id
import * as db from '../../../../server-lib/d1.js';
import { json, route } from '../../../../server-lib/respond.js';

export const onRequestDelete = route(async ({ env, data, params }) => {
  await db.removePlayer(env, params.id, data.user);
  return json({ ok: true });
});
