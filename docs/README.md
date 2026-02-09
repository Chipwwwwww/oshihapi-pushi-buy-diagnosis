# 這包是什麼？
更新：2026-02-10

這是一組「可直接覆蓋 repo」的 docs / 操作手冊，用來避免你再遇到：
- PR merge 後本機/手機看起來又回到舊 UI
- iPhone（尤其 Messenger in-app browser）在 Dark mode 下顯示跟 iPhone12/桌機不同
- Windows / PowerShell 開發流程不穩（.next 快取、分支同步、build 驗收）

內容（六個更新檔 + 1 個給自己看的筆記）：
- docs/status_summary_latest.md：最新狀態（baseline/tag/分支/風險/最近 PR）
- docs/oshihapi_ops_windows.md：Windows/PowerShell 操作 SOP（含 merge 後最穩流程）
- docs/file_map_current.md：檔案地圖（含 AGENTS.md 與 dark-mode/ios patch 位置）
- docs/ai_next_phase_ml_ui.md：下一階段規格（iOS Dark/可讀性/推し活向け UI）
- docs/project_recap_20260209.md：完整復盤（已更新到 2026-02-10）
- README.md：本檔（說明與放置方式）
- docs/owner_notes_latest.md：✅ 給你自己看的「現況 + 下一步」備忘錄

放置方式（建議）：
1) 把 zip 解壓到 repo 根目錄（會覆蓋 README 與 docs/*）
2) commit & push（讓 Codex / 未來的自己都能看到同一份規範）

提示：
- 之後 Codex 如果又問「AGENTS.md not found」，代表你當前分支沒帶到 AGENTS.md（請先 merge 或 cherry-pick）。
