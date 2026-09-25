// password.js — password hashing with the Web Crypto API only (PBKDF2 +
// SHA-256), so nothing outside the Workers runtime's built-ins is needed.
// bcrypt/argon2 aren't available as native bindings on Workers; PBKDF2 via
// SubtleCrypto is the standard practical choice there.
//
// Stored format: "pbkdf2$<iterations>$<salt base64>$<hash base64>" — the
// iteration count travels with the hash so it can be raised later without
// invalidating passwords hashed under the old count.

const ITERATIONS = 100_000;

function toBase64(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
function fromBase64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveBits(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored ?? '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const actual = await deriveBits(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

// A syntactically valid but unusable hash, run through the same PBKDF2 work
// as a real check when no matching user exists — so a login attempt against
// an unknown email takes the same time as one against a known email, and a
// timing measurement can't be used to enumerate which emails have accounts.
export const DUMMY_HASH = `pbkdf2$${ITERATIONS}$${toBase64(new Uint8Array(16))}$${toBase64(new Uint8Array(32))}`;
