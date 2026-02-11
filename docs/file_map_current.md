# 檔案地圖（current）— 2026-02-11

> 目的：找檔案不用靠記憶，照這張走。

## 1) 最常用（你每天會碰到）
- `post_merge_routine.ps1`  
  - merge 後一鍵 SOP（pull/clean/kill ports/npm ci/build/dev + Vercel==Local parity gate）
- `ops/vercel_prod_host.txt`  
  - **Production host**（只寫 host，不要 https://）
- `docs/oshihapi_ops_windows.md`  
  - Windows / PowerShell 操作守則（含 merge 後 SOP、zip 套用方式）
- `docs/status_summary_latest.md`  
  - 最新狀態、已知問題、下一步
- `docs/file_map_current.md`  
  - 本檔案（檔案地圖）

## 2) 版本/一致性（Vercel==Local）
- `app/api/version/route.ts`  
  - 回傳 `{commitSha, vercelEnv, deploymentId}`，供 parity gate 比對
- `ops/vercel_prod_host.sample.txt`  
  - 範例檔（供複製）

## 3) 交付/復盤輸出（你下載覆蓋用）
- `docs/retro_report_latest.txt`  
  - 本次「整串對話」復盤報表（可直接貼給未來的你/AI）
- `gpt_prompt_next_chat_latest.txt`  
  - 下次新對話直接貼的 AI 指令（含「復盤」規範）

## 4) UI / Next.js 主要檔案
- `app/page.tsx`（首頁）
- `app/flow/page.tsx`（問答流程）
- `app/result/[runId]/page.tsx`（結果頁）
- `app/history/page.tsx`（歷史）

## 5) 資料/邏輯
- `src/oshihapi/*`（診斷引擎、runStorage、問題庫等）

