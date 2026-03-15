# status_summary_latest（2026-02-20）

## 現在狀態（要點）
- ✅ 「Mode=体験/深度（時間/出力差）」路線：AI 不再是 mode 名稱，AI 相談作為結果頁末尾可選 CTA
- ✅ Confirm/Settings 分頁導線：/confirm（摘要+調整）→ /confirm/settings（入力）
- ✅ 方案C（compact）採用：目標是 **手機首屏 CTA 可見、盡量不捲動**
- ✅ 導線優先度：Primary = 「入力を追加して精度を上げる（任意）」、Secondary = 「このまま診断へ（かんたん）」
- ✅ /confirm 區塊優先序：`決め切り度` > `表示スタイル`（影響更大）

## 為什麼這樣安排（產品/商業）
- `種別(itemKind)` 會改變後續題目，是「品質/信任」關鍵分岐 → 需要被看見與被引導。
- 把 “最影響結果的選項” 放前面，降低「被算計/被羞辱」的推し活情緒風險（更中立可信）。

## 下一個 deterministic gate（你現在要做的）
1) ✅ `./post_merge_routine.ps1`
2) ✅ （build OK 後）`./ops/verify_pr39_80plus_parity.ps1`
3) ✅ iPhone 實機：/confirm、/confirm/settings 的 CTA 是否首屏可見、是否容易理解

## 風險清單
- compact 過頭導致可讀性下降 → 以「CTA 可見、種別可見」為底線，不追求 0 scroll 到犧牲理解。
- sticky footer 可能遮住內容 → 需要 safe-area/padding-bottom 保護。


## 本次 P1（diagnostics/verification）完成項
- ✅ 新增 run-level trace：runContext / shownQuestionIds / skippedQuestionIds / branchHits / branchMisses / resultInputsSummary。
- ✅ 新增 deterministic matrix：30 scenarios（3 modes × 6 itemKinds + goodsClass 展開 + edge checks）。
- ✅ 新增 edge assertions：refresh restore、back-then-change-answer、style switch invariant。
- ✅ 新增可重現報告：`docs/diagnostics/diagnosis_validation_report_latest.json`。
- ℹ️ trace 顯示採 dev-only（`NODE_ENV!==production` 且 result query `debug=1`）。

## 已知剩餘缺口（本次報告方式）
- itemKind 專屬路徑缺口會由 `qa:diagnostics` 的 `uniquePathGaps` 明確列出並 fail；不做靜默通過。

## 本次 P2（scoring calibration / explainability）完成項
- ✅ 新增 HOLD 子類型（`info_missing` / `budget_pain` / `impulse_cooldown` / `condition_not_ready` / `risk_uncertain`），維持 top-level 決策契約不變。
- ✅ 重新整理分數因子桶（desire/urgency/budget/readiness/uncertainty/impulse/itemKind risk），並把 itemKind-specific 風險納入可追蹤計算。
- ✅ 結果頁新增「為何不是 BUY / 為何不是 SKIP / 阻塞因子 / 推薦理由」解釋層，提升可解釋性。
- ✅ telemetry payload（opt-in）新增非敏感 calibration metadata（subtype/confidence bucket/dominant buckets/unknownCount）。
- ✅ diagnostics 新增分離案例檢查（BUY/HOLD/SKIP、used/blind_draw/game_billing 差異、styleMode 邏輯不變、confidence 0..100 邊界）。

## P2 殘留校準缺口（已記錄）
- ⚠️ 30-case baseline matrix 的 default answer 分布仍偏向 HOLD（屬於題庫預設回答保守性），後續可在 P3 透過題庫擴充與 scenario 錨點再校準。
