// POST /api/private/users — create a login for someone (coach, team
// manager, player, or federation admin). See createUserAccount in
// server-lib/d1.js for exactly who is allowed to create which role.
import * as db from '../../../server-lib/d1.js';
import { json, route } from '../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, request }) => {
  const body = await request.json();
  return json(await db.createUserAccount(env, body, data.user), { status: 201 });
});
