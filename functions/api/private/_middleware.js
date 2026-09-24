// _middleware.js — runs before every route under /api/private/*. It's the
// second half of the access check: the Access Application configured in
// the Cloudflare dashboard already stops an unauthenticated browser from
// reaching this far, but this still verifies the JWT properly (rather than
// trusting the header blindly) and resolves it to a platform user, because
// a Worker should never trust a header's presence alone.
import { verifyAccessRequest, resolveUser } from '../../../server-lib/access.js';
import { json } from '../../../server-lib/respond.js';

export async function onRequest(context) {
  const identity = await verifyAccessRequest(context.request, context.env);
  if (!identity) {
    return json({ error: 'Sign in required.' }, { status: 401 });
  }
  const user = await resolveUser(context.env, identity);
  if (!user) {
    return json({
      error: `Signed in as ${identity.email}, but no role is set up for this account yet. Ask the site admin to add you.`,
    }, { status: 403 });
  }
  context.data.user = user;
  return context.next();
}
