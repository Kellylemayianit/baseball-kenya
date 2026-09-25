// POST /api/auth/login { email, password }
import { verifyPassword, DUMMY_HASH } from '../../../server-lib/password.js';
import { createSession, setCookieHeader } from '../../../server-lib/session.js';
import { json, route } from '../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, request }) => {
  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  const row = await env.DB.prepare(
    `SELECT id, role, name, email, password_hash, team_id AS teamId, player_id AS playerId, org_id AS orgId
     FROM users WHERE email = ?1`,
  ).bind(email).first();

  // Always run a PBKDF2 check, even for an email that doesn't exist, so the
  // response time doesn't tell an attacker which emails have accounts.
  const valid = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !valid) return json({ error: 'Incorrect email or password.' }, { status: 401 });

  const token = await createSession(env, row.id);
  const { password_hash, ...user } = row;
  return json(user, { headers: { 'Set-Cookie': setCookieHeader(request, { token }) } });
});
