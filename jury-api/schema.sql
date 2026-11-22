PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS demo_rooms (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS demo_members (
  token_hash TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES demo_rooms(id) ON DELETE CASCADE,
  nick TEXT NOT NULL COLLATE NOCASE,
  UNIQUE(room_id, nick)
);
CREATE TABLE IF NOT EXISTS demo_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES demo_rooms(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_messages_room_id ON demo_messages(room_id, id);
CREATE TABLE IF NOT EXISTS demo_meetings (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES demo_rooms(id) ON DELETE CASCADE,
  owner_token_hash TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  place TEXT NOT NULL,
  note TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_meetings_room_id ON demo_meetings(room_id);
CREATE TABLE IF NOT EXISTS demo_meeting_attendees (
  meeting_id TEXT NOT NULL REFERENCES demo_meetings(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  PRIMARY KEY(meeting_id, token_hash)
);
