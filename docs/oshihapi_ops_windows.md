# 🧭 oshihapi ops（Windows / PowerShell 5.1）

## Repo root（所有操作從這裡開始）
`C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

---

## 唯一合格標準（不可妥協）
- ✅ `npm run build`
- ✅ merge 後驗收：`./post_merge_routine.ps1`（PMR）

> 原則：先 Local（build ✅ / start OK）→ 再追 Vercel=Local=Codex parity。

---

## 本次新增：Confirm/Settings（手機「盡量不捲動」）的驗收要點（2026-02-20）
### 背景（為什麼要做）
- `種別(itemKind)` 會改變後續題目，是高影響分岐 → 必須被看見、被引導。
- 第二頁（/confirm）與第三頁（/confirm/settings）要接近第一頁體驗：**CTA 在首屏可見、使用者不必找按鈕。**

### 快速檢查清單（iPhone Safari / DevTools mobile）
- /confirm：
  - ✅ Primary CTA = `入力を追加して精度を上げる（任意）`
  - ✅ Secondary CTA = `このまま診断へ（かんたん）`
  - ✅ `決め切り度` 在 `表示スタイル` 上方（優先級更高）
  - ✅ CTA（sticky）在首屏可見（不被遮住、safe-area OK）
- /confirm/settings：
  - ✅ `種別` 在表單中可見且優先（至少首屏看到）
  - ✅ CTA（sticky）在首屏可見

---

## 我們建立的「可證明」驗收證據（Evidence-based gates）
1) `npm run build ✅`
2) PROD `/api/version` 的 `commitSha` **必須等於** `git rev-parse HEAD`
3) PROD `/api/telemetry/health` **必須 ok**（`{"ok":true,"db":"ok"}`）
4) must-have paths（用 `-LiteralPath`）存在
5) PS 5.1 腳本不得卡住（IWR 一律 `-UseBasicParsing`）

---

## PS 5.1 必踩坑（硬規格，所有腳本都必須遵守）
- ❌ **禁止** PS7-only ternary `? :`
  PS5.1 的 `?` 是 `Where-Object` alias，會造成 parser/binding 問題。
- ✅ 用 `if/else` 寫法。
- 路徑包含中括號 `[]`（例如 Next route：`app/result/[runId]/...`）
  PowerShell 會把 `[]` 當 wildcard：
  ✅ `Test-Path -LiteralPath "app/result/[runId]/page.tsx"`
- `Invoke-WebRequest` 一律帶 `-UseBasicParsing`（避免互動式安全提示卡住）。

---

## Vercel 衛生（避免「看錯專案」的災難）
- 同一個 repo 原則只保留 1 個 Vercel Project（除非刻意 staging）。
- 需要重跑 production：
  - 優先空 commit 觸發部署（不改程式碼，能保證 deployment 跟 commit 有事件）
  - 或 Deploy Hook（PS5.1 IWR `-UseBasicParsing`）

---

## merge 後標準流程（你只要照做，不要腦補）
1) `git status -sb`
2) `./post_merge_routine.ps1`
3) （可選）本機 production-smoke：
   - `npm run start -- -p 3000`
   - `Invoke-WebRequest http://localhost:3000/api/version -UseBasicParsing`
   - `Invoke-WebRequest http://localhost:3000/api/telemetry/health -UseBasicParsing`
4) parity（build OK 後才做）：
   - `./ops/verify_pr39_80plus_parity.ps1`（會比對 prod commitSha）

---

## Debug bundle（出事時最省事的回報）
最小回報（省事且 deterministic）：
1) `ops/pmr_debug_bundle_*.zip`
2) `ops/pmr_log_*.txt`（最新）
3) `git status -sb`
4) `git log -n 10 --oneline --decorate`（必要時）
