// functions/owner/login.js — GET /owner/login
//
// The hidden entry point for the site owner only. Nothing in the app's UI
// links here — no button, no nav item, nothing in the JS bundle points at
// this path. It works purely because you know the URL.
//
// The real protection isn't the URL being obscure, though: this path is
// meant to sit behind its own, SEPARATE Cloudflare Access Application —
// one whose policy allows only your specific email, nobody else's, not
// even "anyone with a valid email" like the general sign-in does. See
// docs/deploy.md, "Two Access Applications, not one", for the exact
// dashboard steps. Even someone who finds this URL gets Access's own
// refusal page, never this code.
//
// Once that Access Application has authenticated you, this just checks
// your D1 role really is 'super' (defence in depth — Access proves who
// you are, this still checks what you're allowed to do) and drops you
// into the normal dashboard, which already renders the platform-admin
// view for a 'super' user. There's no separate "owner UI" to maintain —
// this route's only job is the handshake.
import { verifyAccessRequest, resolveUser } from '../../server-lib/access.js';
import { json } from '../../server-lib/respond.js';

export const onRequestGet = async ({ request, env }) => {
  const identity = await verifyAccessRequest(request, env, env.ACCESS_OWNER_AUD);
  if (!identity) {
    return json({ error: 'Not authorized.' }, { status: 403 });
  }
  const user = await resolveUser(env, identity);
  if (!user || user.role !== 'super') {
    return json({ error: `${identity.email} is not set up as a site admin.` }, { status: 403 });
  }
  return Response.redirect(new URL('/#/dashboard', request.url), 303);
};
