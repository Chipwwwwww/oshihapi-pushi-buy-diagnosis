
## P4 追加驗收（草稿持久化 / 重新播放）
- 進 /flow 時需確認：有相容草稿可「續跑」，不相容草稿會顯示失效原因並重新開始。
- 結果頁與歷史頁的「再診斷」必須建立新 draftId，不可覆寫既有 completed run。
- QA 固定執行：`npm run qa:diagnostics`（含 refresh/back/persistence 檢查）+ `npm run build`。
## P3 追加驗收（題庫分岐 + 首頁漏斗）
除了既有 build/PMR 外，PR 驗收請固定加跑：
1) `npm run gen:question-bank`
2) `npm run qa:diagnostics`
3) `npm run build`

### P3 重點人工確認
- 首頁流程順序是否為：Step1 itemKind（goods-like 可選 goodsClass）→ Step2 mode。
- optional meta（itemName/price/deadline）未填時仍可直接進 flow。
- recommendation 文案是否解釋「為何推薦」。
- `まとめ買い（β）` 是否為降權/檢證中標示（非主流程 CTA）。

### 未來分岐覆蓋回歸
- 每次調整 question bank 後都要跑 `npm run gen:question-bank` 並提交 docs/question_bank_branch_table_latest.*。
- `qa:diagnostics` 若報 itemKind 或 goodsClass unique path 缺口，視為 fail 不可合併。

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

---

## Deterministic 診斷驗證（P1 gate）
- 執行：`npm run qa:diagnostics`
- 輸出報告：`docs/diagnostics/diagnosis_validation_report_latest.json`
- 這個 gate 會驗證：
  - mode（short/medium/long）× itemKind（goods/blind_draw/used/preorder/ticket/game_billing）
  - goods/used × all goodsClass
  - styleMode 不改變邏輯路徑
  - refresh restore（mode/itemKind/styleMode/answers/index）
  - back 後改答案是否重算分岐與清理 downstream answers
- 判定規則：
  - report 產出 + script exit code 0 = pass
  - 若 itemKind 缺少專屬路徑，會在 report 的 `uniquePathGaps` 顯示並讓 script fail
