# docs/status_summary_latest.md（開發現況總結：時間線＋驗收點）

> 用途：一眼掌握「現在穩了什麼 / 剩下什麼」，並留下可複製的驗收清單。

---

## TL;DR（2026-02-09 更新）

### ✅ 已完成（本機 & Vercel 都驗證過）
- ✅ 分支：`feature/urgent-medium-long`
- ✅ `npm run build`：成功（TypeScript 0 error）
- ✅ Vercel build / runtime 連續阻塞已排除
  - build（TS）：`pg` 型別宣告缺失 → 補 `@types/pg`
  - runtime（Vercel Functions）：`Error: Cannot find module 'pg'` → 把 `pg` 放到 **dependencies**（不是 devDependencies）
- ✅ `src/oshihapi/modeGuide/recommendMode.ts`：`boolean | undefined` 型別問題已修
- ✅ `/api/telemetry/health`：
  - 本機：可回 `{"ok":true}`
  - Vercel：可回 `{"ok":true}`（不再 500）
- ✅ Result 頁：「匿名データ送信」在 Vercel 成功寫入 Neon
- ✅ Windows Git 雜訊收斂：
  - 新增 `.gitattributes`（統一 LF 規則）
  - 更新 `.gitignore`：忽略 `*.lnk`
  - 本 repo 設定：`git config core.autocrlf false`（只影響此 repo）

### ✅ Parity Gate（Production == Local）摘要（本次補充）
- `post_merge_routine.ps1` 現在維持作為 merge 後唯一入口，預設執行 build 與 Vercel parity gate。
- parity gate 會先驗證本機 commit 與 upstream 一致，再輪詢 `https://<prod-host>/api/version` 比對 `commitSha`。
- 本次修正衝突標記誤判：`Assert-NoConflictMarkers` 改為只檢查**行首** `<<<<<<< / ======= / >>>>>>>`，避免腳本內說明文字被當成衝突。
- 影響：在無衝突 repo 上，PowerShell 5.1 執行 `./post_merge_routine.ps1` 不會因誤判中止；若檔案真的含行首衝突標記仍會正確中止。

### 🟡 仍需做/確認（建議下一步）
- [ ] 合併到 `main` → 拿到固定 Production URL（給朋友測更方便）
- [ ] Telemetry 事件結構／匿名化規則：補齊 docs（價格 bucket、商品名 hash/不送）
- [ ] Neon 查詢清單（SQL）：快速看「回饋分佈／模式分佈／判定分佈」
- [ ] 朋友測試腳本（日文）+ 回收回饋表單（Google Form 也行）
- [ ] ゲーム課金（中立）v1: 種別追加 + Short/Medium + 情報チェック（検索）

---

## 這次對話的復盤（為什麼卡、怎麼解）

### 1) Vercel build 失敗：`pg` typings
**症狀**：Vercel build logs 顯示 TypeScript 無法找到 `pg` 的宣告檔（例如 `app/api/telemetry/health/route.ts` 內有 `import ... from "pg";`）。

**處理**：
- 新增 `@types/pg` 到 devDependencies
- commit + push

✅ 驗收：Vercel build 不再卡在 TS。

---

### 2) Vercel runtime 500：`Cannot find module 'pg'`
**症狀**：Vercel Logs 出現：
- `GET /api/telemetry/health 500` / `POST /api/telemetry 500`
- message：`Error: Cannot find module 'pg'`

**原因**：
- `@types/pg` 只解決「編譯期」
- 但 Vercel Function runtime 需要真的有 `pg` 套件

**處理**：
- `npm i pg`（確保在 dependencies）
- commit + push → 觸發 redeploy

✅ 驗收：
- `/api/telemetry/health` 不再 500
- Result 頁「送信する」成功，Neon 有新增 row

---

### 3) push 被拒（non-fast-forward）→ stash + rebase
**症狀**：`git push` 被拒，提示遠端分支更新、你本機落後。

✅ 最穩流程（Windows）：
1) `git stash push -u ...`（包含 untracked）
2) `git pull --rebase origin feature/urgent-medium-long`
3) `git stash pop`

**踩坑**：stash pop 產生衝突後，不能 commit；且衝突標記（`<<<<<<<`）會讓 build 直接炸。

---

### 4) stash pop 衝突標記導致 build 爆
**症狀**：`src/oshihapi/telemetryClient.ts` 出現 `<<<<<<< Updated upstream` 等衝突標記，Turbopack 解析失敗。

✅ 最短救援：
- `git reset --hard HEAD`
- `git clean -fd`

（如果那包 stash 本來就不要了，這是最快。）

---

### 5) TypeScript 嚴格型別錯：`boolean | undefined`
**症狀**：`src/oshihapi/modeGuide/recommendMode.ts` 內 `pushIf(isInStore, ...)`，但 `isInStore` 是 `boolean | undefined`。

**處理**：讓 helper 接受可選 boolean。

✅ 驗收：`npm run build` 全綠。

---

### 6) LF/CRLF warning 與 `.gitattributes`
**症狀**：`LF will be replaced by CRLF` 反覆出現（尤其 stash 時）。

**處理**：
- 新增 `.gitattributes` + `.gitignore`（忽略 `*.lnk`）並 commit
- 本 repo 設 `core.autocrlf=false`（只影響此 repo）

✅ 小提醒：`.gitattributes` 沒被 git 追蹤（untracked）時，不會生效。

---

### 7) PowerShell 對 `stash@{0}` 的坑
**症狀**：`git stash drop stash@{0}` 報 `unknown switch`。

**處理**：PowerShell 需要引號：
- `git stash drop 'stash@{0}'`

---

## 固定驗收清單（每次改完都跑）

### A) 本機（必跑）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run build
npm run dev -- --webpack
```

### B) 功能（手動 1 分鐘）
- [ ] Home → Flow → Result 能跑完
- [ ] History 看得到剛剛那筆（刷新後仍存在）
- [ ] `/api/telemetry/health` 回 `{"ok":true}`（本機/Vercel 都要）
- [ ] Result 頁：點「送信する」→ toast 顯示成功

### C) Vercel（發佈驗收）
- [ ] 最新 commit 對應 Deployment ✅ Ready
- [ ] 用手機開啟 Preview/Production URL 跑完一次 Flow
- [ ] Vercel Logs：`/api/telemetry` 不再 500

---

## 安全提醒（P0）
- 如果你曾在聊天/截圖中貼出資料庫連線字串或密碼：**立刻在 Neon 旋轉密碼 / 換新 role**，並同步更新 Vercel env。

---

## 下一步建議（最短路徑）
- P0：把 feature 合併到 `main`，讓 Production URL 固定（更好分享）
- P1：補「Neon SQL 查詢清單」與「事件 schema」到 docs
- P2：加一個 Result 頁的「JSON 匯出」按鈕（給你做 ML / debug）
