// session.js — cookie-based sessions backed by D1. A session token is a
// random, high-entropy string; only its SHA-256 hash is ever stored, so a
// leaked database dump doesn't hand out working session tokens (the same
// reasoning as password hashing, though a fast hash is fine here — the
// token itself is already unguessable, unlike a human-chosen password).

const COOKIE_NAME = 'bk_session';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export async function createSession(env, userId) {
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
  const tokenHash = await sha256Hex(raw);
  const expiresAt = new Date(Date.now() + THIRTY_DAYS * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(tokenHash, userId, expiresAt).run();
  return raw;
}

export async function getSessionUser(env, request) {
  const raw = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME];
  if (!raw) return null;
  const tokenHash = await sha256Hex(raw);
  const row = await env.DB.prepare(
    `SELECT u.id, u.role, u.name, u.email, u.team_id AS teamId, u.player_id AS playerId, u.org_id AS orgId
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires_at > datetime('now')`,
  ).bind(tokenHash).first();
  return row ?? null;
}

export async function destroySession(env, request) {
  const raw = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME];
  if (!raw) return;
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256Hex(raw)).run();
}

// Secure is only set over HTTPS, because `wrangler pages dev` serves plain
// HTTP locally and a Secure cookie set there would be silently dropped by
// the browser, breaking local login entirely.
export function setCookieHeader(request, { token, clear = false } = {}) {
  const isHttps = new URL(request.url).protocol === 'https:';
  const parts = [`${COOKIE_NAME}=${clear ? '' : encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (isHttps) parts.push('Secure');
  parts.push(clear ? 'Max-Age=0' : `Max-Age=${THIRTY_DAYS}`);
  return parts.join('; ');
}
