// POST /api/auth/logout
import { destroySession, setCookieHeader } from '../../../server-lib/session.js';
import { json, route } from '../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, request }) => {
  await destroySession(env, request);
  return json({ ok: true }, { headers: { 'Set-Cookie': setCookieHeader(request, { clear: true }) } });
});
