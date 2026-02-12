# 🧭 oshihapi ops (Windows / PowerShell 5.1)

## 0) 絶対ルール
- 合格標準は `npm run build` ✅（dev だけ動いても不可）
- merge 後は原則これだけ：`.\post_merge_routine.ps1`
- Vercel / Codex / Local を一致させるには **remote push が必須**
  - Codex は GitHub remote の commit しか読めない
  - Vercel も remote をビルドする（prod/preview branch は設定次第）

## 1) Mode 用語（混乱しやすい）
- FlowMode（診断深度）: 急いで/じっくり/AI相談 → 質問数/時間
- StyleMode（文案世界観）: standard/kawaii/oshi → 表現だけ変える（ロジック不変）

## 2) merge 後の最短 SOP
1) `git status --porcelain` が空（dirty はまず解消）
2) `git push`（ahead があるなら必須。Vercel/Codex が最新を見れる状態にする）
3) `.\post_merge_routine.ps1`
   - build ✅ が唯一裁判
   - parity skipped の場合：host / branch / push / Vercel の deploy 状況を確認

## 3) “local が Vercel 最新じゃない”原因トップ3
- push していない（local HEAD だけ進んでいる）
- prod domain を見ているが、作業 branch は preview 扱い（Vercel の prod branch 設定）
- parity 用 host/branch 設定が未投入（ops/vercel_*.txt）

## 4) Next の workspace root 警告（よくある）
USERPROFILE 直下に `package-lock.json` があると Next がルート推定を誤る場合あり。
- もし存在するなら移動/削除推奨：`$env:USERPROFILE\package-lock.json`
