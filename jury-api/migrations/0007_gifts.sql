CREATE TABLE IF NOT EXISTS demo_wallets (
  token_hash TEXT PRIMARY KEY REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 50 CHECK (coins >= 0)
);
CREATE TABLE IF NOT EXISTS demo_gifts (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  recipient TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  gift_type TEXT NOT NULL,
  anonymous INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_gifts_recipient ON demo_gifts(recipient);
