CREATE TABLE IF NOT EXISTS demo_game_rewards (
  token_hash TEXT NOT NULL REFERENCES demo_members(token_hash) ON DELETE CASCADE,
  round_id TEXT NOT NULL,
  day TEXT NOT NULL,
  amount INTEGER NOT NULL,
  credited INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(token_hash, round_id)
);
