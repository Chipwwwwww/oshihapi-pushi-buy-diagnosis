# 人話版摘要（給自己看）

## 這次你做對的事
- 用 stash + backup branch 先保全，避免「修到一半想回去卻回不去」
- 把 local 明確切回 `f5db190`，並用 build ✅ 證明 app 沒壞
- 最後用 Vercel 的 Promote to Production 把 prod 直接指到那個 deployment（最少風險）

## 真正的問題不是 Next.js
- 是「PMR 不 deterministic」+「port 3000 可能還在跑舊 dev」+「PS ParserError 讓清理流程根本沒跑完」

## 以後最省事的流程
- 只要 local 看起來怪：跑 PMR → 失敗 Ctrl+V 貼摘要
- 只要 Vercel 要回到某版：找到 deployment → Promote to Production
- 不要用 force push 回退 git（除非你真的要改 branch 歷史）

## 下一步（自動化升級）
- 把 vercel promote（CLI）做成 `ops/vercel_promote_prod.ps1`（需要你登入/連結專案）
