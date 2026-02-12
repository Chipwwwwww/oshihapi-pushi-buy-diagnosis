# PMR safety checklist (Windows / PS5.1)

> 目的：任何「自動化腳本/復盤交付」都不能把 PMR 搞爆。

## 1) Parser safety（必做）
- ✅ 必須能 parse：
  - `[ScriptBlock]::Create((Get-Content -Raw .\post_merge_routine.ps1)) | Out-Null`
- ❌ 禁止：
  - 字串內 `"$var:"`（會觸發 drive 解析）
  - param/變數命名：`args`、`Host`
  - PS7-only 語法（例如 `? :` ternary）

## 2) Determinism（必做）
- kill ports：3000/3001/3002
- 清 `.next`（建議也清 `.turbo`、`node_modules\.cache`）
- `npm ci` → `npm run build`（build-first）
- dev 必須 ready 才算成功（否則 fail + bundle）

## 3) Diagnosability（必做）
- 任何失敗都要：
  1) 明確標示 stage/label
  2) log：`ops/pmr_log_*.txt`
  3) bundle：`ops/pmr_debug_bundle_*.zip`
  4) 自動複製「PMR AUTO SUMMARY」到剪貼簿（方便 Ctrl+V 回報）

## 4) Version parity（可選，但要可診斷）
- parity gate 必須在 build ✅ 後
- branch != prod branch 時，target=preview
- 缺 host/route → 顯示 skipped 原因（不可爆）
