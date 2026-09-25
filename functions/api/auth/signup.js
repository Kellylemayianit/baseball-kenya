// POST /api/auth/signup { email, password, name }
// Public, self-serve — but always creates a 'fan' account. Every other
// role (player, coach, team, federation) is provisioned by someone who
// already has an account, via POST /api/private/users, never by signing
// up directly. That's deliberate: nobody can grant themselves permissions
// just by filling in a form.
import { hashPassword } from '../../../server-lib/password.js';
import { createSession, setCookieHeader } from '../../../server-lib/session.js';
import { json, route } from '../../../server-lib/respond.js';

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const newId = (p) => `${p}${crypto.randomUUID().slice(0, 8)}`;

export const onRequestPost = route(async ({ env, request }) => {
  const body = await request.json();
  const email = clean(body.email, 120).toLowerCase();
  const name = clean(body.name, 60);
  const password = String(body.password ?? '');

  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  if (!name) return json({ error: 'Enter your name.' }, { status: 400 });

  const dupe = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?1').bind(email).first();
  if (dupe) return json({ error: 'An account with that email already exists.' }, { status: 409 });

  const id = newId('u');
  const passwordHash = await hashPassword(password);
  await env.DB.prepare("INSERT INTO users (id, role, name, email, password_hash) VALUES (?1, 'fan', ?2, ?3, ?4)")
    .bind(id, name, email, passwordHash).run();

  const token = await createSession(env, id);
  const user = { id, role: 'fan', name, email, teamId: null, playerId: null, orgId: null };
  return json(user, { status: 201, headers: { 'Set-Cookie': setCookieHeader(request, { token }) } });
});
