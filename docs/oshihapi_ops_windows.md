# 🧭 oshihapi 操作守則（Windows / PowerShell 5.1）

> 核心精神：**merge 後只跑 `.\post_merge_routine.ps1`**，合格標準只有 **`npm run build` ✅**。  
> 任何失敗必須 **可診斷 / 可復現 / 可回滾**（靠 PMR 自動產出的 log + debug bundle）。

---

## 0) Repo Root（永遠從這裡開始）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
```

---

## 1) Merge 後唯一 SOP（最高優先）
```powershell
.\post_merge_routine.ps1
```

你應該看到（例）：
- `▶ npm ci`
- `▶ npm run build`
- `▶ Start dev: http://localhost:3000`
- `✅ Local 起動OK: http://localhost:3000 (commit <sha>)`

---

## 2) PMR 常見錯誤與診斷方式
### 2.1 看 stage
PMR 失敗時會印：
- `stage: <STAGE_NAME>`
- `log: ops\pmr_log_YYYYMMDD_HHMMSS.txt`
- `bundle: ops\pmr_debug_bundle_YYYYMMDD_HHMMSS.zip`

### 2.2 Debug bundle 內容用途
`ops\pmr_debug_bundle_*.zip` 用來「可復現」：
- env & git snapshot
- 當下版本 `post_merge_routine.ps1`
- 相關 ops 設定檔（prod/preview host/branch 等）

---

## 3) 本次踩雷（已處理）：PS5.1 內建唯讀變數撞名
PowerShell **大小寫不分**，因此：
- `$pid` 等同 `$PID`（唯讀）→ 一賦值就爆
- `$host` 等同 `$Host`（唯讀）→ 一賦值就爆

✅ 已用最小修補避免（將自訂變數改名）  
**未來規約：腳本/工具一律避免使用 `$pid/$host` 當自訂變數。**

---

## 4) 分支 / DETACHED HEAD 的 deterministic 作法
你可能會遇到：
- `git symbolic-ref --short HEAD` 空值（DETACHED）

建議 SOP：
```powershell
git branch --contains HEAD
# 選你要的那個，例如 feature/urgent-medium-long
git switch feature/urgent-medium-long
```

⚠️ 原則：**不要在 DETACHED 狀態 commit/push**（避免把歷史弄亂）。

---

## 5) Vercel parity gate（可選、不可阻斷 local）
- parity 只在 build OK 後執行
- 如果缺 host 設定，必須清楚顯示 `skipped (reason...)`，而不是炸掉

設定檔位置：
- `ops\vercel_prod_branch.txt`
- `ops\vercel_prod_host.txt`
- `ops\vercel_preview_host.txt`

---

## 6) 給 Codex 的任務檔（都放 docs/）
```powershell
Get-ChildItem -Recurse -Filter "codex_prompt*.txt" | Select-Object FullName
```

---

## 7) 快速自救（只做你要我做的）
- 你說「給我shell」→ 我給你一段可直接跑的 PowerShell（包含 cd / 備份 / 覆蓋 / 驗收）
- 你說「給codex」→ 我給你最小 diff 的 Codex PR prompt（build ✅ 為唯一合格）

