ALTER TABLE demo_dm_messages ADD COLUMN reply_id INTEGER;
ALTER TABLE demo_dm_messages ADD COLUMN edited INTEGER NOT NULL DEFAULT 0;
ALTER TABLE demo_reports ADD COLUMN conversation_id TEXT REFERENCES demo_dm_conversations(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS demo_dm_reactions (
  message_id INTEGER NOT NULL REFERENCES demo_dm_messages(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  PRIMARY KEY(message_id, token_hash)
);
