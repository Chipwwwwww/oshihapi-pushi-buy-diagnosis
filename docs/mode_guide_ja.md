# モード選びガイド（短/中/長）: 仕様 & 実装メモ（MVP）

目的：ユーザーが「短/中/長」のどれを選べばいいか迷う時間を減らす。  
UIでは“教育”よりも **状況（場面）** で選べるようにする。

---

## 1) 画面（Home）に追加する3つの入口

### A. 迷ったらおすすめ（自動推薦）
ユーザーが入力した情報（価格・締切・店頭/会場・候補数・遠征費など）からおすすめモードを提示。

- 表示例  
  - `おすすめ：長診断（2分〜）`  
  - 理由チップ（2〜4個）  
  - `信頼度：78%`（ざっくり）

### B. 状況から選ぶ（チップ）
入力がなくても選べる。`SITUATION_CHIPS_JA` を使用。

- `急いでる（締切が近い）`
- `店頭/会場で目の前`
- `高い（1.5万円以上）`
- `候補が多い（3つ以上）`
- `遠征/宿泊がある`
- `いったん冷やしたい`
- `いつでも買えそう`
- `限定で焦ってる（FOMO）`
- `中古/相場を確認したい`

### C. 例から選ぶ（シナリオカード）
ACG/推し活向けの具体例。`SCENARIO_CARDS_JA` を使用。

---

## 2) 推薦ロジック（説明可能なルール）

`recommendMode(input)`（`src/oshihapi/modeGuide/recommendMode.ts`）  
- 緊急度（締切・店頭）
- 影響度（価格・遠征費）
- 複雑度（候補数・チケット要素）
- 情緒リスク（テンション×過去後悔 ※任意）

### 衝突ケース（急ぎ×高額）
- 今は `medium` 推薦（重要ポイントだけ押さえる）
- `followUp` で「保留なら後で長」を出す

---

## 3) 取り込み（Next.js App Router）

### 3.1 app/page.tsx（Home）
- 入力値を集める（価格、締切、店頭、候補数、遠征費など）
- `recommendMode()` を呼ぶ
- `output.mode` をハイライト表示
- チップ/シナリオのタップで `mode` を変更（ユーザー優先）

```ts
import { recommendMode } from "@/src/oshihapi/modeGuide/recommendMode";
import { SITUATION_CHIPS_JA } from "@/src/oshihapi/modeGuide/situationChips_ja";
import { SCENARIO_CARDS_JA } from "@/src/oshihapi/modeGuide/scenarios_ja";

const rec = recommendMode({
  kind,
  priceYen,
  deadlineAt,
  isInStore,
  optionsCount,
  travelCostYen,
});
```

### 3.2 app/flow/page.tsx（Flow）
- `mode=auto` を許可する場合：Homeで決まった `rec.mode` をクエリに入れて開始
- または `mode=short|medium|long` を使う（現行に合わせて）

---

## 4) 調整ポイント（A/B用）
`MODE_GUIDE_CONFIG`（`src/oshihapi/modeGuide/config.ts`）で閾値を調整：

- 高額判定：`highPriceYen`
- 緊急判定：`urgentHours`
- 候補数：`manyOptions`
- 遠征：`travelHighYen`

---

## 5) 文言トーン
- 説教しない
- “正しい/間違い”ではなく “安全運転/仮判定/整理” と表現する
- FOMO時は「焦り」を悪とせず、確認手順に落とす

