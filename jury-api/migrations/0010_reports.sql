CREATE TABLE IF NOT EXISTS demo_reports (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES demo_rooms(id) ON DELETE CASCADE,
  message_id INTEGER NOT NULL,
  reporter TEXT NOT NULL,
  author TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS demo_reports_status ON demo_reports(status, created_at);
