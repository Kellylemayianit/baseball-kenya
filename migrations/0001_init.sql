-- 0001_init.sql — applied with: npm run db:migrate:local / db:migrate:remote

-- schema.sql — the D1 schema api.js is designed to map onto.
-- Every id in the demo data (o1, l1, t1, m1, t1-p1...) is a TEXT primary key
-- on purpose, so the same ids work unchanged once they come from D1 instead
-- of mockData.js. This file is not run automatically; it is the target
-- for the migration that replaces src/services/api.js's in-memory `db`
-- with `env.DB.prepare(...)` calls once the Worker exists.

PRAGMA foreign_keys = ON;

CREATE TABLE organizations (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  kind  TEXT NOT NULL
);

CREATE TABLE leagues (
  id      TEXT PRIMARY KEY,
  org_id  TEXT NOT NULL REFERENCES organizations(id),
  name    TEXT NOT NULL,
  kind    TEXT NOT NULL,      -- 'League' | 'Tournament'
  season  TEXT NOT NULL,
  blurb   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE teams (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organizations(id),
  name          TEXT NOT NULL UNIQUE,
  short         TEXT NOT NULL,
  county        TEXT NOT NULL,
  region        TEXT NOT NULL,
  home_field    TEXT NOT NULL,
  founded       INTEGER NOT NULL,
  type          TEXT NOT NULL,
  color         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  about         TEXT NOT NULL DEFAULT '',
  manager_name  TEXT,
  contact_email TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A team can play in more than one league or tournament.
CREATE TABLE team_leagues (
  team_id   TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, league_id)
);

CREATE TABLE players (
  id       TEXT PRIMARY KEY,
  team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  jersey   INTEGER NOT NULL,
  position TEXT NOT NULL,
  bio      TEXT NOT NULL DEFAULT '',
  UNIQUE (team_id, jersey)
);

CREATE TABLE matches (
  id           TEXT PRIMARY KEY,
  league_id    TEXT NOT NULL REFERENCES leagues(id),
  away_id      TEXT NOT NULL REFERENCES teams(id),
  home_id      TEXT NOT NULL REFERENCES teams(id),
  date         TEXT NOT NULL,   -- ISO 8601, stored with the +03:00 offset
  venue        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'scheduled',  -- 'scheduled' | 'pending' | 'final'
  innings_away TEXT,            -- JSON array of 7 ints, e.g. "[0,1,0,0,0,2,0]"
  innings_home TEXT,
  hits_away    INTEGER,
  hits_home    INTEGER,
  errors_away  INTEGER,
  errors_home  INTEGER,
  recap        TEXT NOT NULL DEFAULT '',
  submitted_by TEXT,            -- users.id
  verified_by  TEXT,            -- users.id
  admin_note   TEXT NOT NULL DEFAULT ''
);

-- Users come from Cloudflare Access (or a chosen auth provider) once that
-- lands; this table just maps a verified identity to a platform role and,
-- for team-scoped or org-scoped roles, the team/org/player they're scoped to.
-- auth.js's DEMO_USERS object becomes rows here.
CREATE TABLE users (
  id         TEXT PRIMARY KEY,   -- from the auth provider (e.g. a Cloudflare Access subject)
  role       TEXT NOT NULL,      -- 'player' | 'coach' | 'team' | 'fan' | 'federation' | 'super'
  name       TEXT NOT NULL,
  email      TEXT,
  team_id    TEXT REFERENCES teams(id),          -- coach, team, player
  player_id  TEXT REFERENCES players(id),         -- player
  org_id     TEXT REFERENCES organizations(id)    -- federation
);

CREATE TABLE follows (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, team_id)
);

CREATE TABLE news (
  id      TEXT PRIMARY KEY,
  tag     TEXT NOT NULL,
  date    TEXT NOT NULL,
  title   TEXT NOT NULL,
  summary TEXT NOT NULL
);

CREATE INDEX idx_matches_league  ON matches(league_id);
CREATE INDEX idx_matches_status  ON matches(status);
CREATE INDEX idx_players_team    ON players(team_id);
CREATE INDEX idx_teams_org       ON teams(org_id);
CREATE INDEX idx_teams_status    ON teams(status);
