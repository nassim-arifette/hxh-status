CREATE TABLE game_emails (
  pick_id TEXT PRIMARY KEY REFERENCES game_picks(id),
  chapter INTEGER NOT NULL REFERENCES game_rounds(chapter),
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  locale TEXT NOT NULL,
  confirm_hash TEXT UNIQUE NOT NULL,
  recovery_hash TEXT UNIQUE NOT NULL,
  unsubscribe_hash TEXT UNIQUE NOT NULL,
  confirm_expires TEXT NOT NULL,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  result_queued_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(chapter,email_hash)
);
CREATE INDEX game_emails_unsettled ON game_emails(chapter,pick_id)
  WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL AND result_queued_at IS NULL;
CREATE TABLE game_mail_jobs (
  id TEXT PRIMARY KEY,
  pick_id TEXT NOT NULL REFERENCES game_emails(pick_id),
  kind TEXT NOT NULL CHECK(kind IN ('confirmation','results')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  lease_until TEXT,
  first_attempt_at TEXT,
  sent_at TEXT,
  provider_id TEXT,
  UNIQUE(pick_id,kind)
);
CREATE INDEX game_mail_pending ON game_mail_jobs(status,available_at);
CREATE TABLE game_mail_budget(day TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0);
-- Contains previews only when explicitly running on localhost. No real sends.
CREATE TABLE game_mail_preview(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
