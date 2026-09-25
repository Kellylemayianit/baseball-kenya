-- 0004_seed_users.sql — EDIT the email AND password_hash below before
-- running this migration.
--
-- This is the only account that exists until you create more (see
-- POST /api/private/users, or `wrangler d1 execute` directly). It's the
-- site admin — deliberately never something anyone can sign up for
-- themselves, and deliberately not hinted at anywhere in the public UI.
--
-- 1. Pick a real password (not the placeholder below) and generate its hash:
--      node scripts/hash-password.mjs "the password you're choosing"
-- 2. Paste that output in place of the placeholder hash below, and your
--    real email in place of you@example.com.
-- 3. Run this migration (npm run db:migrate:remote). You log in at the
--    site's normal /#/dashboard login form with this email and password —
--    there is no separate admin page or special link. Nothing in the UI
--    ever shows that a "site admin" role exists; this account is just an
--    ordinary-looking login nobody but you has the credentials for.

INSERT INTO users (id, role, name, email, password_hash, team_id, player_id, org_id)
VALUES (
  'u-super-1', 'super', 'Site admin', 'kellylemayian6@gmail.com',
  'pbkdf2$100000$iILPAL/5rmCtgeoQaCfaRw==$GdBlroTX/81ESNle/BduuYyn9y/zRe0snefPJMGBmHM=',
  NULL, NULL, NULL
);

-- From here on, create everyone else's accounts once you're signed in as
-- the site admin, via POST /api/private/users (the dashboard's Accounts
-- panel calls this for you) rather than by hand-editing more SQL — that
-- way team-scoped and org-scoped accounts get validated the same way a
-- real request would be.
