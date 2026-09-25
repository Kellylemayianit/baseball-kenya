// GET /api/auth/me — who (if anyone) the session cookie belongs to.
import { getSessionUser } from '../../../server-lib/session.js';
import { json, route } from '../../../server-lib/respond.js';

export const onRequestGet = route(async ({ env, request }) => {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: 'Not signed in.' }, { status: 401 });
  return json(user);
});
