# status_summary_latest.md (as of 2026-02-13)

## ✅ 目前狀態（最重要）
- `npm run build` ✅（PMR 流程確認可通過）
- `.\post_merge_routine.ps1` ✅
  - Local dev 可起：`✅ Local 起動OK: http://localhost:3000`
  - commit: `8357b091d29653aec380f02533fade0437528621`（來自 PMR 輸出）

## ✅ 本次新增功能：置き場所（放不放得下）gate（physical only）
- 目的：對「實體類（如 goods）」在未確認置き場所時，避免直接推薦 BUY
- 行為：
  - 只對 physical 種別問 `q_storage_fit`
  - ticket/課金等非實體 skip
  - 若 `NONE/UNKNOWN`：BUY → THINK（保留），並降 confidence、附加 reason/action
  - 結果頁顯示「置き場所」一列/ chip
- 表示スタイル：標準 / かわいい / 推し活用語 都有對應文案

## 🟡 parity 現況
- PMR 顯示：`Parity: skipped (target=preview, missing host config)`
- 意味：local 已 OK；parity 不阻斷（符合精神）
- 若要啟用：補 `ops/vercel_preview_host.txt`（及必要設定）

## ⚠️ 本次踩雷 & 已修正
- PowerShell 5.1 內建唯讀變數撞名（大小寫不分）
  - `$pid` → 等同 `$PID`（唯讀）→ KILL_PORTS 會爆
  - `$host` → 等同 `$Host`（唯讀）→ PARITY 會爆
- 已改名避免，PMR 已可完整跑完

## 待辦（最小風險優先序）
1) （可選）把「Reserved var guard」做成 PMR 內建 fail-fast（交給 Codex 最小 diff）
2) （可選）補齊 preview host 設定讓 parity 可跑（不影響 local）
3) 把本次復盤 docs commit/push 到正確 branch（避免 DETACHED 狀態下 commit）
