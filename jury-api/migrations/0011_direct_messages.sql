CREATE TABLE IF NOT EXISTS demo_dm_settings (
  token_hash TEXT PRIMARY KEY REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  allowed TEXT NOT NULL DEFAULT 'all',
  approval INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS demo_dm_conversations (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES demo_rooms(id) ON DELETE CASCADE,
  first_token TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  second_token TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  initiator TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(room_id, first_token, second_token)
);
CREATE TABLE IF NOT EXISTS demo_dm_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES demo_dm_conversations(id) ON DELETE CASCADE,
  author TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_dm_messages_conversation ON demo_dm_messages(conversation_id, id);
CREATE TABLE IF NOT EXISTS demo_dm_blocks (
  owner TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  blocked TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  PRIMARY KEY(owner, blocked)
);
