-- Optional addresses collected without subscribing to, or queuing, emails.
CREATE TABLE game_contacts (
  pick_id TEXT PRIMARY KEY REFERENCES game_picks(id),
  chapter INTEGER NOT NULL REFERENCES game_rounds(chapter),
  email TEXT NOT NULL,
  locale TEXT NOT NULL,
  created_at TEXT NOT NULL
);
