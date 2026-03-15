
## P4 persistence/replay 主要檔案
- `src/store/diagnosisStore.ts`：DraftRun 模型、草稿存取、相容性驗證、失效紀錄、replay seed 建立。
- `app/flow/FlowClient.tsx`：flow 載入時 restore/invalidate、每步驟持久化、提交後清草稿。
- `app/page.tsx`：首頁增加「下書きを再開 / 新規診断を開始」入口。
- `app/result/[runId]/page.tsx`：結果頁支援「新規重跑」與「帶舊答案 replay」。
- `app/history/page.tsx`：每筆歷史支援 replay（建立新 draft，不修改舊 run）。
## P3 追加（首頁漏斗 + 分岐覆蓋）
- `src/oshihapi/homeFunnel.ts`：首頁 2-step 漏斗輔助規則（goodsClass 適用、模式 tradeoff、任意欄位提示）。
- `app/page.tsx`：首頁 IA 改為「先 itemKind，再 mode」，並明確化 optional meta 說明。
- `src/oshihapi/question_sets.ts`：itemKind addon 映射擴充（used/blind_draw/preorder/ticket 新增專屬題）。
- `src/oshihapi/merch_v2_ja.ts`：新增/強化 itemKind 與 goodsClass 題庫條目。
- `src/oshihapi/flowResolver.ts`：branch hit/miss 增補（kind_* / goods_class_*）。
- `scripts/validate_diagnosis_matrix.ts`：新增 itemKind/goodsClass 專屬題命中與首頁漏斗檢查。

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

## Deterministic QA / Diagnostics（本次新增）
- `src/oshihapi/flowResolver.ts`：集中化 flow 分岐解算 + run-level branch trace（shown/skipped/hits/misses）
- `src/oshihapi/flowState.ts`：back/change-answer 後的 downstream answer 清理
- `scripts/validate_diagnosis_matrix.ts`：可重現 scenario matrix 驗證入口
- `docs/diagnostics/diagnosis_validation_report_latest.json`：最新驗證產物（機器可讀）
