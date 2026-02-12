# StyleMode / FlowMode Spec (Latest)

## 0) 結論（ここだけ覚えればOK）
- **FlowMode（診断深度）**：急いで / じっくり / AI相談 ＝「問う数・時間」
- **StyleMode（文案世界観）**：standard / kawaii / oshi ＝「同じ判断を、違う口調・文案で見せる」

> あなたが欲しい「開始ページで切り替えて、全ページに効く」は **StyleMode** のこと。

---

## 1) MVP 不変ルール（Invariant）
- StyleMode は **表現のみ** を変える：
  - 質問の見せ方（prompt）
  - 選択肢ラベル（label）
  - 結果の見出し・説明・アドバイス文
  - 共有文テンプレ、ステッカー、微文案
- StyleMode は **ロジックを変えない**：
  - BUY / WAIT / SKIP の意味
  - reasonTags の意味
  - nextActions の意味
  - 早停ルール（あるなら）

---

## 2) “違う風格で質問も違う” を安全に実現する方法
- **QuestionId と option.value は固定（ロジック側）**
- StyleMode ごとに **title/help/label だけ変える**
- 「質問数の違い」は FlowMode でやる（急いで/じっくり/AI相談）。

---

## 3) UI 要件（全部“見える”状態にする）
- HOME：StyleMode toggle（標準 / かわいい / 推し活用語）
- FLOW：各質問の prompt/選択肢 label を StyleMode で切替
- RESULT：見出し/説明/アドバイス/共有文 を StyleMode で切替
- 永続化：localStorage key `oshihapi:style_mode`（全ページ共通）

---

## 4) 口調ルール（安全ガード）
### standard
- 中立・工具感、絵文字/顔文字なし

### kawaii
- かわいい・情緒サポート
- 絵文字 ≤ 2、顔文字 ≤ 1（共有文）
- 攻撃/差別/成人/過激ワード禁止

### oshi（安全版）
- 推し活っぽいが **出圈できる安全語彙**
- 絵文字 ≤ 1、顔文字なし
- 深すぎる黒話・擦れたワード・攻撃語彙は禁止
