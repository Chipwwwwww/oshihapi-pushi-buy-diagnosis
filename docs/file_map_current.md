# file_map_current（粗略地圖，請以 repo 實際內容為準）

> 目的：讓「討論→Codex→驗收」時，大家講同一份路徑與責任範圍。
> 注意：此表是根據近期 PR/對話推定的「高機率存在」路徑；若 repo 已改名/搬移，以實際檔案為準。

---

## App Router（主要 UI/路由）
- `app/page.tsx`：首頁（模式/樣式/模板/輸入入口）
- `app/confirm/page.tsx`：確認/調整（compact；CTA sticky；決め切り度優先）
- `app/confirm/settings/page.tsx`：入力（任意）（種別優先；CTA sticky）
- `app/flow/*`：
  - `app/flow/FlowClient.tsx`：診斷流程 client（讀 query/狀態，導向/正規化）
- `app/result/[runId]/page.tsx`：結果頁（含 AI 相談 CTA / prompt 展開等）

## Domain/Logic（模式、標籤、prompt）
- `src/oshihapi/modeConfig.ts`（或同等）：模式顯示/所要時間/導線配置
- `src/oshihapi/modeConfig/index.ts`：mode labels / 常數（例如 `MODE_LABELS`）
- `src/oshihapi/*`：判定ロジック、prompt 生成（例：buildLongPrompt）

## Components
- `components/AiConsultCta.tsx`：結果頁末尾的「AIに相談」CTA（共通コンポーネント）

## Ops / Scripts
- `post_merge_routine.ps1`：merge 後唯一驗收腳本（PMR）
- `ops/verify_pr39_80plus_parity.ps1`：prod parity gate（commitSha / telemetry / must-have paths）
- `ops/vercel_prod_branch.txt` / `ops/vercel_prod_host.txt` / `ops/vercel_preview_host.txt`：parity 設定
