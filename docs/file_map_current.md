# 📌 檔案地圖（file_map_current.md）

> 目標：你要找檔案/改動點，直接照這張走。

---

## Repo 根目錄（最常用）
- `post_merge_routine.ps1`：merge 後唯一 SOP（本機 build/dev/parity gate）
- `SPEC.md`：產品規格/方向（若有）
- `.env.local`：本機環境變數（不要 commit）

---

## ops/（運維＆腳本輸出）
- `ops/pmr_log_*.txt`：PMR 主 log
- `ops/pmr_dev_stdout_*.txt`, `ops/pmr_dev_stderr_*.txt`：dev server 輸出
- `ops/pmr_debug_bundle_*.zip`：失敗時自動產出（可診斷/可復現）
- `ops/vercel_prod_branch.txt`：prod branch 名稱
- `ops/vercel_prod_host.txt`：prod domain
- `ops/vercel_preview_host.txt`：preview domain（parity 需要）

---

## docs/（文件與 Codex 任務）
- `docs/oshihapi_ops_windows.md`：Windows 操作守則（SOP）
- `docs/status_summary_latest.md`：目前狀態總結
- `docs/retro_report_latest.txt`：復盤全文
- `docs/file_map_current.md`：本檔（檔案地圖）
- `docs/pmr_safety_checklist.md`：PMR 安全檢查清單
- `docs/codex_prompt_*.txt`：貼給 Codex 的任務

---

## app/（Next.js App Router 路由）
- `app/page.tsx`：Home（模式/表示スタイル/診斷入口）
- `app/flow/FlowClient.tsx`：Flow 前端邏輯（題目列表、早期插題、種別 filter）
- `app/result/[runId]/page.tsx`：結果頁（顯示「置き場所」等）
- `app/history/page.tsx`：歷史頁（runs list）

---

## src/oshihapi/（決策引擎與題庫）
（以下為本次「置き場所 gate」PR 涉及的主要檔案路徑）
- `src/oshihapi/storageGate.ts`
  - `shouldAskStorage(kindId)`：physical allowlist / skiplist 集中管理
  - `STORAGE_FIT_LABEL`：顯示 label（結果頁 chip）
- `src/oshihapi/merch_v2_ja.ts`
  - 新增 `q_storage_fit` 題目（CONFIRMED/PROBABLE/NONE/UNKNOWN）
- `src/oshihapi/modes/questionCopy.ts`
  - 三種表示スタイル對應的文案（標準/かわいい/推し活用語）
- `src/oshihapi/engine.ts`
  - post-evaluation gate：當 storage NONE/UNKNOWN 時把 BUY 降級到 THINK（最小風險，不改核心 scoring）

