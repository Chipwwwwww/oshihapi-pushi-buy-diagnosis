# 🧭 oshihapi 操作守則（Windows / PowerShell 版）v3（覆蓋用）

> 你可以把本檔整段原封不動貼到 `docs/oshihapi_ops_windows.md` 覆蓋原本。

## 0) 只建一個捷徑就夠（必做）
✅ Repo 根目錄（所有 dev / git / localhost 都從這裡開始）  
`C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

> 建議：桌面捷徑指到 repo 根目錄（見第 12 節）

---

## 1) 檔案地圖（找檔案就照這張）

### A) 規格/文件（最常看）
- `./SPEC.md`
- `./docs/`
  - `decision_engine_report_ja.md`
  - `decision_engine_report_zh_TW.md`
  - `開発状況まとめ_latest.md`
  - `発想メモ_latest.md`
  - `result_ui_update_notes.txt`
  - `codex_prompt_*.txt`（貼給 Codex 的任務都在這）
  - `ai_product_brief_ja_mvp.md`（給 AI 的大框架指令）
  - `ai_next_phase_ml_ui.md`（下一階段給 AI 的指令）

✅ 全 repo 找 Codex prompt：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
Get-ChildItem -Recurse -Filter "codex_prompt*.txt" | Select-Object FullName
```

### B) UI（Next.js App Router）
- `./app/page.tsx`（Home）
- `./app/flow/page.tsx`（Flow）
- `./app/result/[runId]/page.tsx`（Result）
- `./app/history/page.tsx`（History）
- `./app/layout.tsx`

### C) 引擎/題庫/規則（核心）
- `./src/oshihapi/engine.ts`
- `./src/oshihapi/engineConfig.ts`
- `./src/oshihapi/merch_v2_ja.ts`
- `./src/oshihapi/reasonRules.ts`
- `./src/oshihapi/runStorage.ts`
- `./src/oshihapi/promptBuilder.ts`（長診斷 prompt）
- `./src/oshihapi/modeGuide/*`
- `./src/oshihapi/telemetryClient.ts`（匿名送信 client）

### D) 共用元件
- `./components/DecisionScale.tsx`

---

## 2) repo 內搜尋（rg 不一定有，用這兩套）
### A) 有 ripgrep（rg）就用 rg（快）
```powershell
rg "匿名データ" -n
rg "送信する" -n
rg "l1Label" -n
rg "/api/telemetry" -n
```

### B) 沒 rg 就用 Select-String（PowerShell 內建）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
Get-ChildItem -Recurse -File | Select-String -Pattern "匿名データ" -List
```

---

## 3) zip 包下載/解壓（永遠用同一個目的地）
✅ 固定解壓根目錄：  
`C:\Users\User\Downloads\_oshihapi_packs\`

```powershell
$zipName = "some_pack.zip"  # ← 改這個
$zip  = Join-Path $env:USERPROFILE "Downloads\$zipName"
$dest = Join-Path $env:USERPROFILE "Downloads\_oshihapi_packs\$($zipName -replace '\.zip$','')"

Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Expand-Archive -Path $zip -DestinationPath $dest -Force

dir $dest
dir (Join-Path $dest "docs") -Recurse -ErrorAction SilentlyContinue
dir (Join-Path $dest "src") -Recurse -ErrorAction SilentlyContinue
dir (Join-Path $dest "components") -Recurse -ErrorAction SilentlyContinue
```

---

## 4) 手動導入 zip 內容到 repo（推薦 PowerShell 版）
✅ 標準 Copy 模板（docs/src/components 覆蓋貼進 repo）

```powershell
$repo = "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis"
$pack = Join-Path $env:USERPROFILE "Downloads\_oshihapi_packs\some_pack"  # ← 改 pack 資料夾名

Copy-Item -Recurse -Force (Join-Path $pack "docs\*") (Join-Path $repo "docs") -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force (Join-Path $pack "src\*")  (Join-Path $repo "src")  -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force (Join-Path $pack "components\*") (Join-Path $repo "components") -ErrorAction SilentlyContinue

cd $repo
git status
```

---

## 5) 每天開工固定流程（照做就不亂）
### A) 同步最新（先確認分支）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git fetch origin
git branch --show-current
git log -1 --oneline
```

### B) 目前實務規則（固定）
- 看最新 UI/flow/result：✅ `feature/urgent-medium-long`
- 對外穩定/Production：✅ `main`（但要先把 feature merge 回 main）

切到 feature 並更新：
```powershell
git checkout feature/urgent-medium-long
git pull
```

### C) 跑本機（Windows 固定 webpack）
```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run dev -- --webpack
```

打開：  
- http://localhost:3000

---

## 6) 用 Codex 時：分支要選哪個？
✅ 原則：你希望 PR 最後合到哪，就選哪個 base branch

- 繼續在最新流程上迭代：✅ Codex base 選 `feature/urgent-medium-long`
- 直接更新 Production（main）：✅ Codex base 選 `main`
- 不要選 `codex/*` 當 base（那是工作分支）

---

## 7) PR merge 完後：本機要下什麼（固定版）
### PR merge 到 feature
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git checkout feature/urgent-medium-long
git pull
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run dev -- --webpack
```

### PR merge 到 main
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git checkout main
git pull
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run dev -- --webpack
```


### Vercel parity gate（Production == Local == origin/main）
合併後只要跑一個命令：
```powershell
./post_merge_routine.ps1
```

> ⚠️ PowerShell 通常也可用 `.\post_merge_routine.ps1`，但文件統一示範 `./post_merge_routine.ps1`。

> ℹ️ 新版 conflict scan 只掃 `app/`、`src/`、`components/`、`ops/` 與 `post_merge_routine.ps1`，且用行首錨定 `^<<<<<<<` / `^=======$` / `^>>>>>>>`，不掃 `docs/` 可避免誤判。

> ℹ️ Vercel parity 可用 `-VercelParityMode warn`（不阻塞、僅警告）或 `-VercelParityMode enforce`（嚴格失敗即中止）。

#### 一次性設定（只做一次）
1. Vercel Project → **Settings** → **Git**，確認 **Production Branch** 就是你平常 merge 的分支（通常是 `main`）。
2. 設定 Production domain host（只放 host，不含 `https://`、不含 `/path`）：

```powershell
setx OSH_VERCEL_PROD_HOST "oshihapi-pushi-buy-diagnosis.vercel.app"
```
或：
```powershell
Copy-Item .\ops\vercel_prod_host.sample.txt .\ops\vercel_prod_host.txt
# 編輯 ops/vercel_prod_host.txt 第一行，只填 host
```

#### 腳本做了什麼（重點）
- `git fetch --all --prune`
- 工作樹必須乾淨（dirty 直接 fail-fast）
- 檢查本機與 `origin/main`（或 upstream）是否一致
  - 若本機 ahead，且目前在 `main`、無 dirty、無 divergence，預設自動 push（可加 `-SkipPush` 關閉）
- `npm ci` → `npm run build`（build 是硬性 gate）
- 輪詢 `https://<prod-host>/api/version`（最多等待 `-VercelMaxWaitSec`，預設 180 秒）
  - `404` 代表 Production 還沒更新到包含 `/api/version` 的 commit（或 Production Branch 設錯）
  - `200` 會比對 `commitSha` 是否等於本機 `HEAD`
- 印出：LOCAL SHA / ORIGIN SHA / VERCEL commitSha / VERCEL env
- 寫入：`ops/parity_snapshot_latest.json`

#### `/api/version` 回傳 404 代表什麼？
這不是本機腳本 bug。通常表示：Production 尚未提供包含 `/api/version` 的 commit、Production Branch 設錯，或 deployment 失敗 / 被 rate limit。
- 先確認 Vercel **Production Branch** 設定正確
- 查看 Vercel Deployments 的最新 **Production** deployment 狀態
- 若遇到 rate limit（例如 `api-deployments-free-per-day`），需等待 / 升級 / 降低部署頻率

快速檢查（PowerShell）：
```powershell
$prod=(Get-Content .\ops\vercel_prod_host.txt|Select-Object -First 1).Trim(); irm "https://$prod/api/version?t=$([int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" -TimeoutSec 10
```

#### Troubleshooting（常見錯誤）
- `Working tree is not clean`：先 `git status --short`，commit/stash 後重跑。
- `local diverged from origin/main`：先解 divergence（通常 `git pull --rebase` + 解衝突）再重跑。
- `Production domain is not serving the commit that contains app/api/version/route.ts`：
  - 檢查 Vercel Production Branch 是否等於 merge 目標分支
  - 或手動 promote 最新 deployment 到 Production
- `Vercel commit mismatch` timeout：通常是 Production deploy 還在跑或 deploy 失敗，去 Vercel Deployments 看狀態。

#### 緊急暫時跳過 parity gate（不建議常態）
```powershell
./post_merge_routine.ps1 -SkipVercelParity
```

⚠️ 重要：feature 併完後，最後一定要 merge 回 main（你自己的規則）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git checkout main
git pull
git merge feature/urgent-medium-long
git push
```

---

## 7.5) Git 救援手順（non-fast-forward / stash / rebase / 衝突標記）【新增】

### A) `git push` 被拒（non-fast-forward）
**症狀**：`rejected (non-fast-forward)`，遠端分支比本機新。

✅ 最穩流程（含 untracked files）：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git stash push -u -m "wip before rebase"
git fetch origin
git pull --rebase origin feature/urgent-medium-long
git stash pop
```

### B) ⚠️ PowerShell 的 `stash@{0}` 要加引號
不然會出現 `error: unknown switch`。
```powershell
git stash list
git stash drop 'stash@{0}'
```

### C) ⚠️ 看到 `No local changes to save` 時，不要立刻 `git stash pop`
`stash pop` 會套用「既有的 stash@{0}」（可能是舊的那包），很容易把衝突又帶回來。

### D) stash pop 後出現衝突標記導致 build 爆（`<<<<<<< Updated upstream`）
**症狀**：`npm run build` 報 Turbopack 解析失敗，並指向某個檔案含 `<<<<<<<`。

✅ 最短救援（回到乾淨 HEAD + 清掉 untracked）：
```powershell
git reset --hard HEAD
git clean -fd
npm run build
```

> 如果你確定那包 stash 不要了：先救乾淨，再用 `git stash drop 'stash@{0}'` 刪掉，避免下次手滑。

---

---

## 8) Telemetry / Neon 檢查（最短路徑）
### A) 前端：Result 頁送信流程（正確設計）
- 必須是：✅ opt-in（預設不勾）＋ ✅ 點「送信する」才送  
- 價格/商品名敏感欄位：必須正向 opt-in 且預設不勾

### B) 本機確認 API 有沒有被打到（看 dev server 視窗）
- `POST /api/telemetry 200` ✅
- `POST /api/telemetry 500` ❌ → 看回傳 JSON / toast 訊息

### C) 不要用 irm 看 500（常常只顯示例外）
改用瀏覽器或 curl.exe

瀏覽器直接開：  
- http://localhost:3000/api/telemetry/health

或用：
```powershell
curl.exe -i http://localhost:3000/api/telemetry/health
```

---

## 9) LF/CRLF（行末）雜訊處理（Windows 必看）【新增】

### 目標
- Git 不再一直提示 `LF will be replaced by CRLF`
- 團隊/CI/Vercel 以同一種行末（建議 LF）為準

### A) repo 內統一規則（已導入）
- `.gitattributes`：指定 `*.ts/*.tsx/*.md/...` 使用 LF
- `.gitignore`：忽略 `*.lnk`（Windows 捷徑不要進 repo）

### B) 重要：`.gitattributes` 要先被追蹤才會生效
如果 `.gitattributes` 還是 untracked，規則不會套用。

✅ 推薦順序（首次導入時）：
```powershell
git add .gitattributes .gitignore
git commit -m "chore: add gitattributes and ignore windows shortcuts"
git add --renormalize .
git status
```

### C) 建議：本 repo 把 autocrlf 關掉（只影響此 repo）
你可以保持全域 Git 設定不動，單獨針對這個 repo 設：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git config core.autocrlf false
```

---

---

## 10) Neon SQL（常用查詢清單）【新增】

> 目的：不用猜「有沒有寫入」，直接以 DB 為準。

### A) 最新 20 筆（原始 payload）
```sql
SELECT id, created_at, session_id, source, data
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 20;
```

### B) 最近 50 筆摘要（抽 event/runId/l1Label）
```sql
SELECT
  created_at,
  source,
  data->>'event' AS event,
  data->>'runId' AS run_id,
  data->>'l1Label' AS l1_label
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 50;
```

### C) L1 分佈（未填顯示 (none)）
```sql
SELECT
  COALESCE(data->>'l1Label', '(none)') AS l1_label,
  COUNT(*) AS cnt
FROM telemetry_runs
GROUP BY 1
ORDER BY cnt DESC;
```

### D) 若有獨立事件 `source='l1_feedback'`
```sql
SELECT COUNT(*) AS cnt
FROM telemetry_runs
WHERE source = 'l1_feedback';
```

---

## 11) ESLint / lint 現況
你目前看到錯誤：  
- ESLint v9 找不到 `eslint.config.(js|mjs|cjs)` → 代表 repo 缺少 flat config 檔或 lint script 不對

✅ MVP 不一定要先擋住，但建議下一步修成「能跑 lint 不爆」

快速確認：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
dir eslint.config.*
type package.json
```

---

## 11.5) If Vercel checks stay pending
### Steps
a) Open the Vercel check details (to confirm it is truly pending)  
b) Run locally:
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
npm ci
npm run build
```
c) Retrigger with an empty commit:
```powershell
git commit --allow-empty -m "chore: retrigger ci"
git push
```
d) Use GitHub Actions CI (lint + build) as the merge criteria while Vercel is pending

---

## 11.6) Vercel checks stuck (Waiting for status...)
### Steps
a) First, run local checks to confirm the code is OK:
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
npm ci
npm run build
```
b) Re-trigger checks via an empty commit:
```powershell
git commit --allow-empty -m "chore: retrigger ci"
git push
```
c) If branch protection requires Vercel checks, adjust required checks to prefer GitHub Actions CI (if permitted)

---

## 12) 手機 / 給朋友測（最短路徑）
- 給朋友：用 Vercel Preview 或 Production URL（不要用 localhost）
- 朋友測最新：丟 feature 的 Preview URL
- 朋友測穩定：Production URL（main）

---

## 13) 一鍵打開常用位置
```powershell
ii "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis"
ii "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\docs"
notepad "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\SPEC.md"
```

---

## 14) 一次建立桌面捷徑（repo / docs / GitHub）— 跑一次就好
```powershell
$repo = "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis"
$docs = Join-Path $repo "docs"
$desktop = [Environment]::GetFolderPath("Desktop")
$wsh = New-Object -ComObject WScript.Shell

# Repo shortcut
$sc1 = $wsh.CreateShortcut((Join-Path $desktop "oshihapi-repo.lnk"))
$sc1.TargetPath = $repo
$sc1.WorkingDirectory = $repo
$sc1.Save()

# Docs shortcut
$sc2 = $wsh.CreateShortcut((Join-Path $desktop "oshihapi-docs.lnk"))
$sc2.TargetPath = $docs
$sc2.WorkingDirectory = $docs
$sc2.Save()

# GitHub URL shortcut
$urlFile = Join-Path $desktop "oshihapi-github.url"
@"
[InternetShortcut]
URL=https://github.com/Chipwwwwww/oshihapi-pushi-buy-diagnosis
"@ | Set-Content -Encoding ASCII $urlFile

"Done. Shortcuts created on Desktop."
```

---

## 15) ✅ 60 秒速查（最常用的 6 行）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git checkout feature/urgent-medium-long
git pull
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run dev -- --webpack
```

---

## 16) Vercel だけ `送信失敗 /api/telemetry 500` になる時（pg / env / integration）【2026-02-09 追加】

### 症状A：Vercel Logs に `Error: Cannot find module 'pg'`
- **原因**：`pg` が `devDependencies` にしかなく、Vercel Functions（node runtime）に入らない
- **対処**：`pg` を **dependencies** に入れる

```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
npm i pg
npm i -D @types/pg

git add package.json package-lock.json
git commit -m "fix: add pg to dependencies for Vercel runtime"
git push origin feature/urgent-medium-long
```

### 症状B：`/api/telemetry/health` が HTTP 500（ブラウザで 500 ページ）
- **見方**：Vercel → Project → **Logs** → Route で `/api/telemetry/health` を選んで、Error を見る
- **よくある原因**：
  1) DB 接続 ENV が入っていない（`POSTGRES_URL_NON_POOLING` or `POSTGRES_URL` or `DATABASE_URL`）
  2) Neon 側の接続先 / パスワードを変えたのに、Vercel の ENV が古い

### 症状C：Vercel の Environment Variables に「Edit」がない
- Neon/Vercel の **連携（Storage integration）** で作られた ENV は「管理対象」になり、値を直接編集できないことがある
- 対処の方針（どれか1つ）
  - ① 連携の **Manage Connection** 側から更新
  - ② 一度連携を外して、ENV を手動で追加し直す
  - ③ 別 Key 名で（例：`POSTGRES_URL_NON_POOLING`）を手動で追加して、アプリ側はその Key を優先する

### まずの検証（最短）
1) ブラウザで `https://<your-vercel>/api/telemetry/health`
- `{"ok":true}` → API/DB は生きてる
- `{"ok":false,"error":"db_env_missing"...}` → ENV が不足
- 500 page → Vercel logs で stacktrace（`pg` 不在が多い）

2) 送信ボタン押下→Vercel logs で `/api/telemetry` の status を見る

---

## 17) セキュリティ（重要）
- DB 接続文字列（ユーザー名/パスワード）は **チャットやスクショに出した時点で漏洩扱い**
- Neon 側でパスワードをローテートし、Vercel/ローカル `.env.local` を更新してください
