ALTER TABLE demo_profiles ADD COLUMN bubble TEXT NOT NULL DEFAULT 'default';
CREATE TABLE IF NOT EXISTS demo_bubble_owned (
  token_hash TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  bubble TEXT NOT NULL,
  purchase_ref TEXT NOT NULL,
  PRIMARY KEY(token_hash, bubble)
);
