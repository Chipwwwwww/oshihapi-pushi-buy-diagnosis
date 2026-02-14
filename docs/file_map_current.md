# 📌 file map（current）

## Top
- `post_merge_routine.ps1`：merge 後一鍵驗收（PMR）
- `ops/`：部署/驗收支援檔案、overlay、備份
- `docs/`：規格/復盤/操作文件
- `gpt_prompt_next_chat_latest.txt`：下一次新對話的 AI 指令（source of truth）

## Next.js App Router（核心 UI）
- `app/page.tsx`：首頁
- `app/flow/FlowClient.tsx`：Flow 核心
- `app/history/page.tsx`：歷史頁
- `app/result/[runId]/page.tsx`：結果頁（注意：含 `[]`，PowerShell 檢查要用 `-LiteralPath`）

## API（Parity 依據）
- `app/api/version/route.ts`：版本/commitSha（parity gate）
- `app/api/telemetry/route.ts`：telemetry
- `app/api/telemetry/health/route.ts`：telemetry health（DB guard）

## 復盤與報告
- `docs/restore_main_pr39_to_80plus_report.md`：PR39–PR80+ restore 報告（已在 repo）
- `docs/retro_report_latest.txt`：最新復盤（人話版）
- `docs/status_summary_latest.md`：最新狀態摘要（驗收證據）
