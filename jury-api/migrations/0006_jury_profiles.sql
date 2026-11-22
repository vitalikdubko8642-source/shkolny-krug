CREATE TABLE IF NOT EXISTS demo_profiles (
  token_hash TEXT PRIMARY KEY REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  banner TEXT NOT NULL DEFAULT 'gaming',
  avatar TEXT,
  status TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT ''
);
