# status summary (latest)

## 這次你達成的狀態（已驗證）
- ✅ Local：已成功切回指定版本（commit `f5db190`），並且 `npm run build` ✅
- ✅ Vercel：已用 **Promote to Production** 把 production 指到同一個 deployment（回到你要的舊版）(參考：Vercel docs「Promoting a Deployment」 https://vercel.com/docs/deployments/promoting-a-deployment)
- ✅ PMR：已修到「可跑、可診斷、失敗自動複製剪貼簿摘要」的版本（PS 5.1 兼容）

## 本次根因（精準版）
1) `post_merge_routine.ps1` 曾經被 patch 壞 / ParserError → 導致 merge 後流程無法 deterministic
2) 因為 dev 可能仍佔用 port 3000，你看到的 local 畫面不一定是你以為的 commit
3) Vercel 其實已經有你要的 deployment；你要的是「讓 production domains 指向它」，不是改 git

## 新 SOP（以後照抄就不會再踩）
- Local：只要出現「local 不是最新版」→ 先跑 `.\post_merge_routine.ps1`（它會 kill ports + 清 .next + build）
- Vercel：要把 production 指到某個 commit → 先找那個 deployment → Promote to Production（回滾也用 promote）(參考：Vercel docs「Promoting a Deployment」 https://vercel.com/docs/deployments/promoting-a-deployment)
- 支援資訊：PMR 失敗時直接 Ctrl+V（PMR AUTO SUMMARY）

## 下一步（把流程更自動化）
- （可選）之後要把 promote 也一鍵化：引入 Vercel CLI 的 `vercel promote` 做成 ops 腳本（需要你登入/連結專案）(參考：Vercel CLI docs「vercel promote」 https://vercel.com/docs/cli/promote)
