# オシハピ｜推し買い診断　発想メモ（最新版 / 自分用）

更新日: 2026-02-08（JST）

---

## 1) 体験を伸ばす最短手
- 結果ページを「一瞬で分かる」ようにする
  - DecisionScale（やめる｜保留｜買う＋矢印）
  - 今すぐやる（行動）を 2〜3個に絞ってボタン化
  - shareText をワンタップでコピー＋トースト

---

## 2) 急・中・長（診断モード）の統合
- 短（30秒）：urgentCore のみ
- 中（60秒〜2分）：urgentCore + standard
- 長（AI）：+ longOnly（自由入力）→ AI prompt を生成してコピー

※MVP では外部APIなし。ユーザーが ChatGPT 等に貼るだけ。

---

## 3) ML（係数最適化）に必要なデータ
- L1：買った/保留/買わなかった/まだ（1タップ）
- 行動ログ：time/changes/backtracks/click
- L2/L3（任意）：後悔/満足/金銭痛 0〜5（次回起動で軽く）

---

## 4) Backlog（優先）
P0:
- DecisionScale を結果ページへ統合
- 結果ページをカード構成に整理（理由/行動/共有）
- L1 フィードバック保存（localStorage）

P1:
- “AIに相談する（長診断）” の導線と promptBuilder
- config_version / A/B の土台

P2:
- チケット版（遠征 t を含む）
