# PMR 安全檢查清單（pmr_safety_checklist.md）

> 目標：任何人改 PMR 前先照這張做，避免把 merge 後唯一 SOP 弄壞。

## 0) 合格標準
- `npm run build` ✅（唯一合格）
- `.\post_merge_routine.ps1` 能跑完並顯示 `✅ Local 起動OK`

## 1) PowerShell 5.1 相容性
- 禁用 PS7-only 語法（例：ternary `? :`）
- 避免撞到內建唯讀變數（大小寫不分）：
  - ❌ `$pid` / `$PID`
  - ❌ `$host` / `$Host`
  - ❌ `$args` / `$Args`
  - 建議改名：`$owningPid`, `$parityHost`, `$userArgs`
- 任何命令輸出可能為 `$null`：
  - ❌ `(& somecmd).Trim()`
  - ✅ 先判空再 `.Trim()`

## 2) 失敗必須可診斷
- 任一步驟失敗需顯示：
  - stage label
  - exit code / key message
  - 自動產生 `ops/pmr_debug_bundle_*.zip`
- bundle 內至少包含：
  - env_and_git_snapshot.txt
  - post_merge_routine.ps1（當下版本）
  - ops/*.txt（prod/preview host/branch）

## 3) parity gate 規約
- build OK 才跑 parity
- 缺 host / target 不明 → 必須 `skipped (reason...)`，不可炸
- parity 不能阻斷 local（除非明確要求）

## 4) 變更前的自保
- 改 PMR 前先備份：
  - `Copy-Item post_merge_routine.ps1 post_merge_routine.ps1.bak_YYYYMMDD_HHMMSS`
- 改完先做 parse check：
  - `[System.Management.Automation.Language.Parser]::ParseFile(...)`
- 最後跑一次 PMR 驗收
