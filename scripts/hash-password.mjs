// scripts/hash-password.mjs — generates a password hash in the exact
// format server-lib/password.js verifies, so you can seed your own login
// directly in migrations/0003_seed_users.sql (or anyone else's, with
// `wrangler d1 execute`, without waiting on a signup form).
//
// Usage: node scripts/hash-password.mjs "your real password here"
import { hashPassword } from '../server-lib/password.js';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your password"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Use at least 8 characters — that\'s what the login form itself requires.');
  process.exit(1);
}
console.log(await hashPassword(password));
