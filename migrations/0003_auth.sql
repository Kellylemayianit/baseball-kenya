-- 0003_auth.sql — the tables email/password authentication needs.
-- Applied with the same commands as every other migration here:
-- npm run db:migrate:local / npm run db:migrate:remote.

ALTER TABLE users ADD COLUMN password_hash TEXT;

-- One row per active login. token_hash is a SHA-256 of the random session
-- token in the browser's cookie — the raw token itself is never stored, so
-- a leaked database dump doesn't hand out working sessions.
CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);

CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_expiry  ON sessions(expires_at);
