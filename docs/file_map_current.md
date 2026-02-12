# file map (latest)

## 0) You always run
- post_merge_routine.ps1  （merge 後唯一必跑的一鍵驗收腳本）

## 1) Ops / diagnostics
- ops/pmr_bak/                       （PMR 自動/手動備份）
- ops/pmr_log_*.txt                  （PMR log）
- ops/pmr_dev_stdout_*.txt           （dev stdout）
- ops/pmr_dev_stderr_*.txt           （dev stderr）
- ops/pmr_debug_bundle_*.zip         （debug bundle：發生事故時貼這個）
- ops/vercel_prod_branch.txt         （prod branch 名稱）
- ops/vercel_prod_host.txt           （prod domain）
- ops/vercel_preview_host.txt        （preview domain）

## 2) Docs / Specs（SOP & 交付）
- docs/retro_report_latest.txt
- docs/status_summary_latest.md
- docs/oshihapi_ops_windows.md
- docs/file_map_current.md
- docs/pmr_safety_checklist.md

## 3) Codex prompts
- docs/codex_prompt_pmr_hardening_clipboard_readygate_20260213.txt
- docs/codex_prompt_fix_style_copy_dictionary_build_20260213.txt
- docs/codex_prompt_mode_system_v2_20260213.txt

## 4) AI instruction (source of truth)
- gpt_prompt_next_chat_latest.txt
