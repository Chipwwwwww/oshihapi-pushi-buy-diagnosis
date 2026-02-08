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

## 送信フロー確認
1. 結果ページで「匿名データ送信に協力する」をONにする。
2. 必要に応じて「価格を送らない」「商品名を送らない」を切り替える（デフォルトは送らない）。
3. 「送信する」ボタンを押したときだけ `source = 'run_export'` の行が追加される。
4. L1フィードバックのクリックだけでは送信されない（localStorageのrun記録のみ更新）。
