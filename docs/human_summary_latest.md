# human_summary_latest.md（人話版）

## 今天做了什麼（結果）
1) 把「置き場所（放不放得下）」加入診斷流程（只對實體種別生效）
2) 三種表示スタイル（標準/かわいい/推し活用語）都能顯示對應文案
3) merge 後 PMR 兩次爆炸（PS5.1 撞 `$PID/$Host`）→ 已用最小改名修好
4) `.\post_merge_routine.ps1` 現在能完整跑完（build ✅、dev ready ✅）
5) parity 目前 skipped（缺 preview host），但不影響 local（符合精神）

## 你現在最該做的 3 件事（依重要度）
1) ✅ 任何 merge 後，只跑 `.\post_merge_routine.ps1`
2) （可選）補 ops/vercel_preview_host.txt 讓 parity 可以真的對齊 preview
3) （可選）讓 Codex 做一個「reserved var guard」PR，避免 PMR 再被 `$pid/$host` 搞爆

## 如果又爆了怎麼辦（超短）
- 先看 `stage:`，再看 `ops/pmr_log_*.txt`
- 有 debug bundle 就貼路徑 `ops/pmr_debug_bundle_*.zip`
