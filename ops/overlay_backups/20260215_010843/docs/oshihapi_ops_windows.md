# 🧭 oshihapi ops（Windows / PowerShell 5.1）

## Repo root（所有操作從這裡開始）
`C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

---

## 唯一合格標準
- ✅ `npm run build`
- merge 後驗收：✅ `.\post_merge_routine.ps1`（PMR）

---

## 這次轉折點：PR77 基線 → 整合 PR39–PR80+ → 可證明 parity
### 我們建立的「可證明」驗收證據
1) `npm run build ✅`
2) PROD `/api/version` 回傳 `commitSha` 必須 == `git rev-parse HEAD`
3) PROD `/api/telemetry/health` 必須 `{ok:true}` 且 db ok

---

## PS5.1 必踩坑（硬規格）
- ❌ 不可用 PS7 ternary `? :`
- ✅ if/else 才能 PS5.1 穩定跑
- 路徑含 `[runId]` 這類 `[]`：PowerShell 會當 wildcard  
  ✅ 用 `-LiteralPath`（例如：`Test-Path -LiteralPath "app/result/[runId]/page.tsx"`）
- `Invoke-WebRequest` 一律加 `-UseBasicParsing`（避免互動式安全提示卡住）

---

## Vercel 衛生（避免部署看錯專案）
- 同 repo 原則只保留 1 個 Vercel project（除非刻意 staging）
- 需要觸發部署：優先用空 commit（不改程式碼但能讓 Vercel 重跑）

---

## 快速驗收腳本（可重用）
- `.\ops\verify_pr39_80plus_parity.ps1`
  - 檢查 must-have paths
  - 查 PROD `/api/version` 是否對齊 HEAD
  - 查 PROD `/api/telemetry/health` 是否 ok
