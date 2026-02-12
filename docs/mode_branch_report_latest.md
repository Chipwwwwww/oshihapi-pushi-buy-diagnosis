# Mode / Branch Report (Latest)

このファイルは **Codex への単一仕様**：Hard（ロジック）と Soft（文案）を分離して混乱を防ぐ。

## Invariant（絶対に変えてはいけない）
- StyleMode は **表現だけ** を変える（質問文/選択肢ラベル/説明/共有文/ステッカー）
- StyleMode は **ロジックを変えない**
  - BUY/WAIT/SKIP の意味
  - reasonTags / nextActions の語義
  - 題庫ルーティング（FlowMode や ItemType による出題）は Hard 側（別物）

## 用語
- FlowMode：急いで/じっくり/AI相談（質問数・所要時間）
- StyleMode：standard/kawaii/oshi（文案世界観 ver0/1/2）

## Branch Architecture（最上位）
1) Entry：ItemType / Goal / FlowMode / StyleMode
2) Question routing：FlowMode セット + ItemType Addons
3) Evaluate：reasonTags を集約して Verdict + NextActions を決定
4) Present：StyleMode で copy/sticker/shareText を生成（ロジック不変）

## Question Bank（最新版）
詳細は `docs/question_bank_spec_latest.md` を参照。
