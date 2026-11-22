CREATE TABLE IF NOT EXISTS jury_codes (
  code_hash TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES demo_rooms(id) ON DELETE CASCADE,
  nick TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  token_hash TEXT
);
