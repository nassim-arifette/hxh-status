CREATE TABLE game_rounds (
  chapter INTEGER PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','closed','settled')),
  opened_at TEXT NOT NULL,
  closes_at TEXT,
  announced_date TEXT,
  actual_date TEXT,
  max_date TEXT NOT NULL
);
CREATE TABLE game_players (
  id TEXT PRIMARY KEY,
  recovery_hash TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE game_sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES game_players(id) ON DELETE CASCADE
);
CREATE TABLE game_picks (
  id TEXT PRIMARY KEY,
  chapter INTEGER NOT NULL REFERENCES game_rounds(chapter),
  player_id TEXT NOT NULL REFERENCES game_players(id),
  predicted_date TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(chapter, player_id)
);
CREATE TABLE game_days (
  chapter INTEGER NOT NULL REFERENCES game_rounds(chapter),
  predicted_date TEXT NOT NULL,
  votes INTEGER NOT NULL,
  PRIMARY KEY(chapter, predicted_date)
);
CREATE TRIGGER game_count_pick AFTER INSERT ON game_picks BEGIN
  INSERT INTO game_days(chapter, predicted_date, votes) VALUES(NEW.chapter, NEW.predicted_date, 1)
  ON CONFLICT(chapter, predicted_date) DO UPDATE SET votes = votes + 1;
END;
CREATE TRIGGER game_lock_pick BEFORE UPDATE ON game_picks BEGIN
  SELECT RAISE(ABORT, 'picks_are_final');
END;
CREATE TABLE game_groups (
  id TEXT PRIMARY KEY,
  chapter INTEGER NOT NULL REFERENCES game_rounds(chapter),
  owner_id TEXT NOT NULL REFERENCES game_players(id),
  created_at TEXT NOT NULL,
  UNIQUE(chapter, owner_id)
);
CREATE TABLE game_members (
  group_id TEXT NOT NULL REFERENCES game_groups(id),
  player_id TEXT NOT NULL REFERENCES game_players(id),
  PRIMARY KEY(group_id, player_id)
);
CREATE INDEX game_members_player ON game_members(player_id);
-- The first round is deliberately explicit. Further rounds are opened by an
-- operator only while the target chapter has no official release date.
INSERT INTO game_rounds(chapter, opened_at, max_date)
VALUES(421, strftime('%Y-%m-%dT%H:%M:%fZ','now'), '2031-09-12');
