# テレメトリ導入：作業手順（Windows）

## ローカル更新（mainが更新済みの前提）
cd $env:USERPROFILE\dev\oshihapi-pushi-buy-diagnosis
git checkout main
git pull origin main
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run build
npm run dev -- --webpack

## Local setup
1. リポジトリのルートに `.env.local` を作成し、`POSTGRES_URL_NON_POOLING=...` を設定する（`POSTGRES_URL`/`DATABASE_URL` でも可）。
2. `npm run dev -- --webpack` を再起動する（env 追加後は必ず再起動）。
3. `GET /api/telemetry/health` を開いて `{ ok: true, db: "ok" }` を確認する。
4. 結果ページへ行き、L1 を選択 → 「匿名データ送信に協力する」をON → 「送信する」を押す。
5. 下の Neon SQL を実行して telemetry_runs の追加を確認する。

## Neonで確認
SELECT created_at, source, data
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 20;

## 送信フロー確認
1. L1フィードバックを選択すると即座に localStorage の run 記録が更新される。
2. 「匿名データ送信に協力する」をONにしても自動送信されない。
3. 「送信する」ボタンを押したときだけ `source = 'run_export'` の行が追加される。
