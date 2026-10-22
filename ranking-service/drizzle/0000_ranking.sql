CREATE TABLE runs (
  id TEXT PRIMARY KEY NOT NULL,
  seed INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX runs_created ON runs(created_at);
--> statement-breakpoint
CREATE INDEX runs_ip ON runs(ip_hash, created_at);
--> statement-breakpoint
CREATE TABLE scores (
  player_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY(player_id, difficulty)
);
--> statement-breakpoint
CREATE INDEX scores_ranking ON scores(difficulty, score DESC, achieved_at ASC);
