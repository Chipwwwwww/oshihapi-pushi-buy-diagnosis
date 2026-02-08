# oshihapi 檔案地圖（Current）

> 用途：給自己找檔案、給 AI/Codex 對齊用。  
> Repo（Windows）：`C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

---

## 0) 專案根目錄（建桌面捷徑就建這個）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

### Git/換行規則（新增）
- `.gitattributes`（統一 LF；Windows 建議保留）
- `.gitignore`（已加入 `*.lnk`，避免 Windows 捷徑混進 repo）

---

## 1) Docs（最常打開/貼給 Codex/貼給 AI）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\docs\`
  - `oshihapi_ops_windows.md`（Windows 操作守則）
  - `ai_next_phase_ml_ui.md`（下一階段：ML + UI 的 AI 指令）
  - `status_summary_latest.md`（目前做到哪裡：時間線＋驗收點）
  - `decision_engine_report_ja.md`（引擎/題庫/設計報告：日文）
  - `decision_engine_report_zh_TW.md`（同上：繁中）
  - `開発状況まとめ_latest.md`（開發現況備忘）
  - `発想メモ_latest.md`（Backlog/發想/方向）
  - `codex_prompt_*.txt`（貼給 Codex 開 PR 的任務指令）

✅ 一鍵找 Codex prompt：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
Get-ChildItem -Recurse -Filter "codex_prompt*.txt" | Select-Object FullName
```

---

## 2) UI（Next.js App Router）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\app\`
  - `page.tsx`（Home）
  - `flow\page.tsx`（Flow：問答）
  - `result\[runId]\page.tsx`（Result：結果頁、L1 回饋、送信 UI）
  - `history\page.tsx`（History：本機紀錄）
  - `layout.tsx`（lang/metadata/全域 layout）

### API（Next route handlers）
- `app\api\telemetry\route.ts`（`POST /api/telemetry`）
- `app\api\telemetry\health\route.ts`（`GET /api/telemetry/health`）
  - ※ 這裡會用到 `pg`：
  - build（TypeScript）：需要 `@types/pg`
  - runtime（Vercel Functions）：需要 `pg` 在 dependencies（不是 devDependencies）

---

## 3) 核心引擎/題庫/規則（TS）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\src\oshihapi\`
  - `engine.ts`（evaluate() 決策本體）
  - `engineConfig.ts`（權重/閾值/可調參）
  - `merch_v2_ja.ts`（題庫：urgentCore/standard/longOnly）
  - `reasonRules.ts`（理由/行動/分享文案規則）
  - `runStorage.ts`（localStorage 保存/讀取 runs）
  - `promptBuilder.ts`（長診斷的 AI prompt 組裝）
  - `telemetryClient.ts`（前端送信 payload/build/send）
  - `modeGuide\recommendMode.ts`（自動推薦：短/中/長；曾修正 pushIf 的 optional boolean 型別）
  - `supportData.ts`（搜尋連結等）
  - `model.ts`（型別：DecisionRun/InputMeta 等）

---

## 4) 共用元件（UI 呈現）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\components\`
  - `DecisionScale.tsx`（結果頁刻度尺）

---

## 5) 本機環境設定（非常重要：不要 commit）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\.env.local`
  - 例：`POSTGRES_URL_NON_POOLING=...`（Neon 連線字串）

### Git（本 repo 建議）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git config core.autocrlf false
```

---

## 6) 下載/解壓包（建議固定位置，避免 copy 找不到）
- 下載（zip）：`C:\Users\User\Downloads\`
- 固定解壓根：`C:\Users\User\Downloads\_oshihapi_packs\`

---

## 7) 資料去哪裡看（Telemetry / L1）
- 本機（local）：瀏覽器 localStorage（Runs/History/L1 label 都在這）
- 遠端（Neon）：`telemetry_runs` table（只有 opt-in + 送信 才會有）

Neon 常用查詢（抽 event/runId/l1Label）：
```sql
SELECT
  created_at,
  source,
  data->>'event'   AS event,
  data->>'runId'   AS run_id,
  data->>'l1Label' AS l1_label
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 50;
```

---

## 8) 給 AI/Codex 對齊用（直接複製貼上）
```text
Repo 根目錄（Windows）：
C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\

重要檔案地圖：
1) docs
- docs/oshihapi_ops_windows.md
- docs/ai_next_phase_ml_ui.md
- docs/status_summary_latest.md
- docs/decision_engine_report_ja.md
- docs/decision_engine_report_zh_TW.md
- docs/codex_prompt_*.txt

2) UI（Next App Router）
- app/page.tsx
- app/flow/page.tsx
- app/result/[runId]/page.tsx
- app/history/page.tsx
- app/layout.tsx
- app/api/telemetry/route.ts
- app/api/telemetry/health/route.ts

3) Core
- src/oshihapi/engine.ts
- src/oshihapi/engineConfig.ts
- src/oshihapi/merch_v2_ja.ts
- src/oshihapi/reasonRules.ts
- src/oshihapi/runStorage.ts
- src/oshihapi/promptBuilder.ts
- src/oshihapi/telemetryClient.ts
- src/oshihapi/model.ts
- src/oshihapi/supportData.ts

4) Components
- components/DecisionScale.tsx

環境變數（不要 commit）：
- .env.local（例 POSTGRES_URL_NON_POOLING=Neon 連線字串）

資料查看位置：
- localStorage：所有 runs/history + L1 label（本機）
- Neon：telemetry_runs（opt-in 勾選 + 點「送信する」才會寫入）
```
