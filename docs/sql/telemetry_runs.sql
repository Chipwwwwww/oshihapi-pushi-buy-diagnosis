CREATE TABLE IF NOT EXISTS telemetry_runs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  session_id TEXT,
  source TEXT,
  data JSONB
);

CREATE INDEX IF NOT EXISTS telemetry_runs_created_at_idx
  ON telemetry_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS telemetry_runs_session_id_idx
  ON telemetry_runs (session_id);

CREATE INDEX IF NOT EXISTS telemetry_runs_source_idx
  ON telemetry_runs (source);
