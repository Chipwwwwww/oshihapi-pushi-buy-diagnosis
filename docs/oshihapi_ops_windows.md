# 🧭 oshihapi ops (Windows / PowerShell 5.1)

> 目標：我只做「同步/驗收/merge/部署」，其他都用一鍵腳本 + 可診斷輸出完成。

## 0) 絕對規則（永遠優先）
- 合格標準永遠是：`npm run build` ✅（dev 能跑不算）
- merge 後固定只跑：`.\post_merge_routine.ps1`
- 期待 Vercel / Codex = 最新：一定先 `git push`
- 發生事故：先保全（stash + backup branch）→ 再處理

---

## 1) 最短日常 SOP（照抄）
1. `cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis`
2. `git fetch --all --prune`
3. `git status -sb`（確認分支 & 是否乾淨）
4. `git push`（只要你期待 Vercel/Codex 跟上）
5. `.\post_merge_routine.ps1`
   - 看到 `✅ Local 起動OK` 才算完成

---

## 2) 本次事故的核心坑（以後一律按這裡做）
### A) Local 不是最新版（或你看到舊版畫面）
幾乎都是其中一個：
- port 3000 已經有舊的 dev 在跑（你以為你啟的是新版本）
- 你 checkout 的 commit/branch 不是你以為的
- 你 build 沒清乾淨（.next 殘留）但 dev 還在拿舊的 cache
- 你在 DETACHED HEAD 或 dirty tree，導致你「修了但沒落在正確分支」

✅ 對策（最小動作）：
- 先跑 `.\post_merge_routine.ps1`（它會 kill 3000/3001/3002 + 清 .next + npm ci + build）
- 失敗時：直接 Ctrl+V 貼上「PMR AUTO SUMMARY」（腳本會自動複製剪貼簿）

### B) PowerShell ParserError（最致命）
常見原因：
- 在字串中用 `$var:`（例如 `"... $path: ..."`）→ PS 會把 `:` 當成 drive 語法，直接 ParserError
- 用了保留變數名/混淆名：例如 param 用 `args`、變數用 `$Host`
- 混進不可見字元 / here-string 拼接錯誤

✅ 對策：
- 任何脚本都要先做 parser check：`[ScriptBlock]::Create((Get-Content -Raw .\post_merge_routine.ps1))`
- 字串插值一律用 `-f` 格式（避免 `$var:`）

---

## 3) Vercel 回到指定舊版（最少風險的做法）
你這次要的其實不是「改 git」，而是「讓 production 網域指到某個已存在的 deployment」。

✅ 建議做法：在 Vercel UI 對該 deployment 做 **Promote to Production**。
- 只是在 Vercel 把 production domains 指到那個 deployment
- 不會改 GitHub 的 branch history（你不用 force push）
- 回滾也同樣快（再 promote 另一個 deployment 即可）

（參考：Vercel docs「Promoting a Deployment」 https://vercel.com/docs/deployments/promoting-a-deployment ）  
（也可用 CLI：`vercel promote <deployment-url>`，參考： https://vercel.com/docs/cli/promote ）  

---

## 4) 支援資訊一鍵複製（Ctrl+V 貼回來）
- PMR 失敗時會自動把摘要放進剪貼簿（PMR AUTO SUMMARY）
- 你只要 Ctrl+V 貼給我即可，不用找 log、也不用手動開檔

---

## 5) 常用指令（備忘）
- dev 指令固定：`npm run dev -- --webpack -p 3000`
- kill 3000/3001/3002（手動）：  
  `foreach ($p in 3000,3001,3002) { Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }`
