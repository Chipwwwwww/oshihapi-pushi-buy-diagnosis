# 🧭 oshihapi 操作守則（Windows / PowerShell）— 2026-02-11

> 目標：你只要在 repo root 跑一條命令，就能把 **Local** 拉到最新、乾淨重建、並確認 **Vercel Production == Local**。

---

## 0) 你永遠只在這裡操作（Repo Root）
`C:\\Users\\User\\dev\\oshihapi-pushi-buy-diagnosis\\`

---

## 1) merge 後唯一 SOP（最重要）
### ✅ 你要做的只有：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
.\post_merge_routine.ps1
```

這個腳本會做：
- git fetch/pull（可用 `-SkipPull` 跳過）
- **fail-fast：偵測 conflict markers（<<<<<<< 等）**
- **Vercel parity gate：等待直到 Vercel Production commit == Local HEAD**
- 刪 `.next`、殺 3000/3001/3002、`npm ci`、`npm run build`
- `npm run dev -- --webpack -p 3000`

---

## 2) 只要做一次：設定 Production Domain（給 parity gate 用）
> parity gate 需要知道「Production host」。這個 host 只要設定一次即可。

### 2.1 在 Vercel UI 找到 Production host
1. Vercel → 進你的 project（oshihapi-pushi-buy-diagnosis）
2. `Deployments` → 找有 **Environment = Production** 且有 **Current** 的那一筆
3. 點進去 `Deployment Details`
4. 在 `Domains` 區塊複製其中一個 Production domain（通常是 `...vercel.app`）
   - 你只要 host：**不要** `https://`、**不要** `/`

### 2.2 寫入到 repo（推薦）
```powershell
"oshihapi-pushi-buy-diagnosis.vercel.app" | Set-Content -Encoding UTF8 .\ops\vercel_prod_host.txt
```

### 2.3 或用環境變數（二選一）
```powershell
setx OSH_VERCEL_PROD_HOST "oshihapi-pushi-buy-diagnosis.vercel.app"
# ✅ 重要：setx 後要「重開 PowerShell」才會生效
```

---

## 3) parity gate 常見錯誤與判斷
### A) `404 Not Found` on `/api/version`
- 原因：專案沒有 `app/api/version/route.ts`（或沒被部署到 Production）
- 解法：補上 route.ts、push，等 Vercel Production redeploy 後再跑腳本

### B) `VERCEL MISMATCH`
- 原因：Vercel Production 還沒部署到你 local 的 commit（剛 merge 常見）
- 腳本會自動 retry 等待；若最後仍不一致：
  - 確認你填的 host 是 **Production domain**（不是 Preview）
  - 確認 Vercel 的 `Production / Current` 指向的 commit

### C) `Conflict markers detected`
- 原因：repo 裡還有 `<<<<<<<` 等沒解掉
- 解法：先修掉衝突，再跑 `.\post_merge_routine.ps1`

---

## 4) zip 覆蓋套用（你最常踩的坑）
### 問題：你照範例打 `C:\path\to\xxx.zip` 會找不到
✅ 正確做法：自動找 Downloads 最新的一包
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis

$zip = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "oshihapi_docs_update_*.zip" |
  Sort-Object LastWriteTime -Desc |
  Select-Object -First 1

if (-not $zip) { throw "Cannot find oshihapi_docs_update_*.zip in Downloads" }

Expand-Archive -Path $zip.FullName -DestinationPath . -Force
```

---

## 5) 你最常用的檔案位置（速查）
- `post_merge_routine.ps1`（merge 後 SOP）
- `ops/vercel_prod_host.txt`（Production host）
- `app/api/version/route.ts`（Vercel==Local 的依據）
- `docs/status_summary_latest.md`（最新狀態）
- `docs/file_map_current.md`（檔案地圖）
- `docs/retro_report_latest.txt`（最新復盤報表）
- `gpt_prompt_next_chat_latest.txt`（下次新對話指令）
