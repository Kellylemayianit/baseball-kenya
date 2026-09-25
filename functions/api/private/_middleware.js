// _middleware.js — runs before every route under /api/private/*. Every
// user created (whether by public signup or by an admin via
// POST /api/private/users) already has a role at creation time, so there's
// no separate "authenticated but not provisioned" state to handle here
// the way there was under Access — a valid session always resolves to a
// user with a role.
import { getSessionUser } from '../../../server-lib/session.js';
import { json } from '../../../server-lib/respond.js';

export async function onRequest(context) {
  const user = await getSessionUser(context.env, context.request);
  if (!user) return json({ error: 'Sign in required.' }, { status: 401 });
  context.data.user = user;
  return context.next();
}
