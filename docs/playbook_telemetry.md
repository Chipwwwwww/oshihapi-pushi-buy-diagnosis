# テレメトリ導入：作業手順（Windows）

## ローカル更新（mainが更新済みの前提）
cd $env:USERPROFILE\dev\oshihapi-pushi-buy-diagnosis
git checkout main
git pull origin main
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run build
npm run dev -- --webpack

## Neonで確認
SELECT id, created_at, session_id, source, data
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 10;
