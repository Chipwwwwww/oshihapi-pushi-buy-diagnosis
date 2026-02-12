# 🧭 oshihapi ops (Windows / PowerShell)

## 0) 絶対ルール
- 合格標準は **`npm run build` ✅**（dev が動いても不可）
- merge 後は原則これだけ：`.\post_merge_routine.ps1`
- **Local / Vercel / Codex を一致**させるには **remote push が必須**
  - Codex は GitHub remote の commit しか読めない
  - Vercel も remote をビルドする（prod/preview branch は設定次第）

## 1) Mode 用語（ここが混乱ポイント）
- FlowMode（診断深さ）: 急いで/じっくり/AI相談 → 質問数/時間
- StyleMode（文案世界観）: standard/kawaii/oshi → 文案/表現だけ変える（value/ロジックは固定）

## 2) merge 後の最短 SOP（照抄でOK）
1) `git status --porcelain` が空（dirty はまず解消）
2) `git push`（ahead があるなら必須。Vercel/Codex が最新を見れる状態にする）
3) `.\post_merge_routine.ps1`
   - build ✅ が唯一裁判

## 3) “local が Vercel 最新じゃない”時の原因トップ3
- push していない（local HEAD だけ進んでいる）
- prod domain を見ているが、作業 branch は preview 扱い（Vercel の prod branch 設定）
- ops の host/branch が未設定（parity が skip になる）

## 4) Next 警告（workspace root / lockfile）
USERPROFILE 直下に `package-lock.json` があると Next がルート推定を誤る場合あり。

- 対処（安全に退避）：
  - `$env:USERPROFILE\package-lock.json` を `*.bak_yyyyMMdd_HHmmss` にリネーム

## 5) “TypeScript: Invalid character / ':' expected” の典型原因
- TS ファイルに **先頭の余計な `\`** が混入している
- TS ファイルに **`#region`/`#endregion`**（PowerShell の指示）を貼ってしまっている
  - TS 側では `//` コメントにする

再発防止：
- 日本語を含む TS/MD を PowerShell で生成する場合は
  - `WriteAllText(UTF8Encoding(false))` を使い、文字化け/先頭ゴミを避ける
