# 📌 file map（current）

## Top
- `post_merge_routine.ps1`：merge 後一鍵驗收（PMR）
- `ops/`：部署/驗收支援檔案、overlay、備份
- `docs/`：專案文件與復盤

## Next.js App Router
- `app/page.tsx`：首頁
- `app/flow/FlowClient.tsx`：Flow 核心
- `app/history/page.tsx`：歷史
- `app/result/[runId]/page.tsx`：結果頁（注意：含 []，PowerShell 檢查要用 -LiteralPath）

## API
- `app/api/version/route.ts`：版本/commitSha（parity 依據）
- `app/api/telemetry/route.ts`：telemetry
- `app/api/telemetry/health/route.ts`：telemetry health（db guard）
