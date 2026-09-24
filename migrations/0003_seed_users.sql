-- 0003_seed_users.sql — EDIT THE EMAILS BELOW before running this migration.
--
-- Cloudflare Access identifies people by the email they log in with (Google,
-- GitHub, a one-time code — whatever your Access login method is). This
-- table is what turns "someone logged in as person@example.com" into an
-- actual role on the platform. Nobody gets any access here until their
-- email has a row in this table — that's the whole provisioning model.
--
-- This seed gives you ONE super-admin row so you (the site owner) can sign
-- in and add everyone else — coaches, team managers, federation admins,
-- players, fans — from the live site itself (or by writing more INSERT
-- statements here and re-running `wrangler d1 execute`).
--
-- Replace you@example.com with the real email you'll log into Access with.

INSERT INTO users (id, role, name, email, team_id, player_id, org_id)
VALUES ('u-super-1', 'super', 'Site admin', 'you@example.com', NULL, NULL, NULL);

-- Example rows for the other roles (uncomment and edit as you onboard real
-- people — team_id/org_id/player_id must reference rows from 0002_seed.sql
-- or teams/players registered later; delete what you don't need):
--
-- INSERT INTO users (id, role, name, email, team_id, player_id, org_id)
-- VALUES ('u-federation-1', 'federation', 'Federation admin', 'admin@kbsf.example', NULL, NULL, 'o1');
--
-- INSERT INTO users (id, role, name, email, team_id, player_id, org_id)
-- VALUES ('u-coach-1', 'coach', 'Coach Otieno', 'otieno@example.com', 't1', NULL, NULL);
--
-- INSERT INTO users (id, role, name, email, team_id, player_id, org_id)
-- VALUES ('u-fan-1', 'fan', 'Mercy Achieng', 'mercy@example.com', NULL, NULL, NULL);
