-- Reinício solicitado pelo proprietário em 11/11/2026.
-- O histórico permanece privado em tabelas de arquivo, sem excluir pontuações.
ALTER TABLE scores RENAME TO scores_archive_20261111;
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
CREATE INDEX scores_ranking_v2 ON scores(difficulty, score DESC, achieved_at ASC);
--> statement-breakpoint
-- Partidas iniciadas antes do reinício não podem repovoar o novo ranking.
ALTER TABLE runs RENAME TO runs_archive_20261111;
--> statement-breakpoint
CREATE TABLE runs (
  id TEXT PRIMARY KEY NOT NULL,
  seed INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX runs_created_v2 ON runs(created_at);
--> statement-breakpoint
CREATE INDEX runs_ip_v2 ON runs(ip_hash, created_at);
