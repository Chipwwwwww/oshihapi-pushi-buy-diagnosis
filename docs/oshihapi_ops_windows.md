# 🧭 oshihapi ops（Windows / PowerShell 5.1）

## Repo root（所有操作從這裡開始）
`C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

---

## 唯一合格標準（不可妥協）
- ✅ `npm run build`
- ✅ merge 後驗收：`./post_merge_routine.ps1`（PMR）

> 原則：先 Local（build ✅ / start OK）→ 再追 Vercel=Local=Codex parity。

---

## 本次轉折點（PR77 基線 → 整合 PR39–PR80+ → 可證明 parity）

### 我們建立的「可證明」驗收證據（Evidence-based gates）
1) `npm run build ✅`
2) PROD `/api/version` 的 `commitSha` **必須等於** `git rev-parse HEAD`
3) PROD `/api/telemetry/health` **必須 ok**（`{"ok":true,"db":"ok"}`）
4) must-have paths（用 `-LiteralPath`）存在
5) PS 5.1 腳本不得卡住（IWR 一律 `-UseBasicParsing`）

### 為什麼這是轉折點
- 從「靠直覺/看 merge 訊息」→ 轉為「用證據驗收」
- 從「環境/分支/部署混亂」→ 轉為「可重播（reset → replay → verify）可回滾」

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

## 快速驗收（可重用）
- `./ops/verify_pr39_80plus_parity.ps1`
  - must-have paths（LiteralPath）
  - PROD `/api/version` commitSha 對齊 HEAD
  - PROD `/api/telemetry/health` ok
