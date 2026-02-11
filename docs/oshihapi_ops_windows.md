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


### Vercel parity gate (Production == Local)
合併後只要跑一個命令：
```powershell
.\post_merge_routine.ps1
```

> ⚠️ 一定要加 `.\`（PowerShell 需要 `.\` 才會執行目前資料夾腳本）。

#### Where to copy Production domain host
1. Vercel → Project → **Deployments**。
2. 點最新一筆 **Production (Current)** deployment。
3. 到 **Domains** 區塊，複製穩定 production domain host。
4. 只貼 host（例如 `your-app.vercel.app`），不要包含 `https://` 或 `/path`。

腳本預設會做硬性檢查：
- 本機 `HEAD` 和遠端上游 commit 一致（必要時自動 `git push`，可用 `-SkipPush` 關掉）
- `https://<prod-host>/api/version` 的 `commitSha` 最終追上本機 `HEAD`
- 預設要求 `vercelEnv=production`（若你故意用 preview host，需加 `-AllowPreviewHost`）
- 會輪詢等待（預設 180 秒）Vercel 非同步部署完成

#### 一次性設定（只做一次）
先從 Vercel 取到**真正的 Production 網域**：
- Vercel → Project → Deployments
- 點最新的 **Production (Current)** deployment
- Domains 區塊複製穩定 production domain（例如 `oshihapi-pushi-buy-diagnosis.vercel.app` 或你綁定的正式網域）

設定方式（二選一）：
```powershell
Copy-Item .\ops\vercel_prod_host.sample.txt .\ops\vercel_prod_host.txt
# 然後編輯 ops/vercel_prod_host.txt 第一行，只填 host（不能含 https:// 或 /path）
```
或
```powershell
$env:OSH_VERCEL_PROD_HOST="oshihapi-pushi-buy-diagnosis.vercel.app"   # 目前 session 生效
setx OSH_VERCEL_PROD_HOST "oshihapi-pushi-buy-diagnosis.vercel.app"    # 永久寫入使用者環境變數（新開視窗生效）
```

#### 從 Vercel Deployment Details 複製 Production domain（詳細）
1. 開啟 Vercel 專案後進到 **Deployments**。
2. 點進最新一筆帶 **Production (Current)** 標籤的 deployment。
3. 在 **Domains** 區塊複製穩定正式網域（不要用 preview hash 網域）。
   - ⚠️ preview hash domain（例如 `*-git-*.vercel.app`）會變動，不可當作 parity gate host，否則會常常失敗。
4. 把複製到的 host 寫到 `ops/vercel_prod_host.txt` 第一行（僅 host）。
5. 或改用 `setx OSH_VERCEL_PROD_HOST "<host>"` 設為永久環境變數。


#### 手動驗證 API 版本（一行指令）
```powershell
curl https://<host>/api/version
```

#### 常見錯誤對照
- `Missing Vercel production host`：尚未設定 host，或還是 placeholder。
- `vercelEnv=preview`：你貼到了 preview hash domain，請改成 Production (Current) 的穩定網域。
- `Vercel still not on this commit`：部署尚未完成/失敗，去 Deployments 確認 production deploy 狀態，稍後重跑。
- `Git operation in progress` / `Unmerged files detected`：先 `git status`，解完衝突或中止 merge/rebase/cherry-pick 後再跑。

緊急時可暫時跳過 gate（不建議常態使用）：
```powershell
.\post_merge_routine.ps1 -SkipVercelParity
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
