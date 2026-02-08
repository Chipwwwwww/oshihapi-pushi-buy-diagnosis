-- テーブル一覧
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
ORDER BY table_name;

-- 最新10件（送信が動き始めたら）
SELECT id, created_at, session_id, source, data
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 10;

-- source別の件数
SELECT source, count(*) AS n
FROM telemetry_runs
GROUP BY source
ORDER BY n DESC;

-- L1フィードバックだけ見たい（data->>'event' を想定）
SELECT
  created_at,
  session_id,
  data->>'runId' AS run_id,
  data->>'label' AS label
FROM telemetry_runs
WHERE data->>'event' = 'l1_feedback'
ORDER BY created_at DESC
LIMIT 50;
