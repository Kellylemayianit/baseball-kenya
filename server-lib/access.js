// access.js — verifies a Cloudflare Access identity and resolves it to a
// platform user. This is the whole of "auth": there is no password, no
// session token this code issues itself. Access authenticates the person
// at Cloudflare's edge (Google/GitHub/email OTP, whatever your Zero Trust
// team is configured with); this file only checks that the JWT Access
// attached to the request is genuine, then looks up which platform role
// that email has in D1.
//
// How the request gets here: an Access Application (set up once, in the
// dashboard — see /docs/backend-notes.md) protects the /api/private/*
// path. A browser without a valid Access session is redirected by
// Cloudflare's edge to your team's login page *before* this Worker code
// ever runs; a request that does reach this file already carries a valid,
// Cloudflare-issued JWT in the Cf-Access-Jwt-Assertion header.

import { createRemoteJWKSet, jwtVerify } from 'jose';

let jwks = null; // cached across requests on this isolate; see getJwks()

function getJwks(env) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));
  }
  return jwks;
}

// Verifies the Cf-Access-Jwt-Assertion header and returns the Access
// identity ({ email, sub, ... }), or null if the header is missing or the
// token doesn't check out. This does NOT look at any users table — it only
// proves who Cloudflare says the person is.
//
// audience defaults to env.ACCESS_AUD (the general, public-facing Access
// Application protecting /api/private/*). The hidden owner entry point at
// /owner/login passes env.ACCESS_OWNER_AUD instead, because it's a
// separate Access Application with its own, far stricter policy — see
// docs/deploy.md, "Two Access Applications, not one".
export async function verifyAccessRequest(request, env, audience = env.ACCESS_AUD) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;

  // Local development escape hatch: wrangler can't emulate a real Access
  // login, so `wrangler pages dev` sets ENVIRONMENT=development in
  // wrangler.toml and this lets you fake an identity with a header
  // instead. This branch is unreachable in production because Access
  // itself strips any Cf-Access-Jwt-Assertion header a client tries to
  // forge and replaces it with its own signed one — but ENVIRONMENT is
  // only ever "development" in your local wrangler.toml, never deployed.
  if (env.ENVIRONMENT === 'development' && token === 'dev') {
    const devEmail = request.headers.get('X-Dev-User-Email');
    return devEmail ? { email: devEmail, sub: `dev:${devEmail}` } : null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(env), {
      issuer: env.ACCESS_TEAM_DOMAIN,
      audience,
    });
    if (!payload.email) return null;
    return { email: String(payload.email).toLowerCase(), sub: payload.sub };
  } catch {
    // Expired, wrong audience, bad signature, clock skew beyond tolerance —
    // any of these mean "treat this request as unauthenticated", not a 500.
    return null;
  }
}

// Looks the verified email up in the users table to get their platform
// role and scope (teamId / playerId / orgId). Returns null if Access
// authenticated them but nobody has provisioned an account for that email
// yet — see the "Provisioning people" section in /docs/backend-notes.md.
export async function resolveUser(env, identity) {
  if (!identity) return null;
  const row = await env.DB
    .prepare('SELECT id, role, name, email, team_id AS teamId, player_id AS playerId, org_id AS orgId FROM users WHERE email = ?1')
    .bind(identity.email)
    .first();
  return row ?? null;
}
