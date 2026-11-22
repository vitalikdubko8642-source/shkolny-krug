ALTER TABLE demo_attachments ADD COLUMN conversation_id TEXT REFERENCES demo_dm_conversations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS demo_attachments_conversation ON demo_attachments(conversation_id);
