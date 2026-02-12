# QuestionBank v4 Spec (Latest)

> 目的：推し活（日本のオタク/若年層）向けに「買う/待つ/見送る」を最短で決める。
> かつ、**StyleMode（standard/kawaii/oshi）で“世界観の違い”を体感できる**ようにする。
>
> 原則：ビルド最優先（npm run build ✅）。大きいリファクタはしない。

---

## 0) 用語
- **FlowMode**：診断の深さ（急いで/じっくり/AI相談）＝質問数/時間
- **StyleMode**：文案世界観（standard/kawaii/oshi）＝質問・選択肢・結果文案の“言い方”が変わる
  - MVPでは **ロジックの意味（BUY/WAIT/SKIP, reasonTags, nextActions）を壊さず**、見える差分を最大化する。

---

## 1) ターゲット（前提）
- 日本の推し活ユーザー（学生〜若手社会人が中心）
- 悩み：
  - 予算とFOMOの板挟み
  - 置き場所/被り/後悔（買う後悔・買わない後悔）
  - 相場（定価/中古/再販/値崩れ）
  - チケット遠征の総コストと体力
- 行動：
  - 30秒で決めたい時がある（レジ前/通販〆切）
  - 友達にスクショ共有したい（DM/X）

---

## 2) 分岐（Hard Branch Architecture）
### 2.1 Entry（入力）
- itemType: goods | gacha | ticket | figure | digital | preorder
- priceKnown: known | unknown
- urgency: high | mid | low（〆切/在庫）
- goal: support | memory | utility | trade
- budgetContext: ok | tight | bad（生活費への影響）

### 2.2 QuestionSet（質問セット）
- Core（全タイプ共通）：
  - q_urgency_deadline
  - q_budget_impact
  - q_market_price
  - q_regret_if_skip
  - q_regret_if_buy
  - q_use_frequency
  - q_space_storage
  - q_duplicate_inventory
  - q_alt_satisfaction
  - q_impulse_state
  - q_payment_timing
  - q_support_goal

- Addons（itemTypeで追加）：
  - ticket: q_ticket_total_cost
  - gacha: q_gacha_stop_line
  - preorder: q_preorder_cancel
  - figure/goods/digital: q_shipping_risk（必要に応じて）

### 2.3 EarlyStop（早期確定ルール：最大2つ）
- (A) budget_bad AND urgency_low → SKIP/WAIT（cooldown）
- (B) urgency_high AND budget_ok AND space_ok AND regret_skip_high → BUY

### 2.4 Decision Output（意味は不変）
- verdict: BUY | WAIT | SKIP
- waitType（WAITのみ）: cooldown_24h | wait_market | wait_restock | wait_prepare
- reasonTags: budget | urgency | market | space | impulse | duplicate | use | regret | risk
- nextActions: buy_now | set_price_cap | market_check | cooldown_24h | declutter_first | check_inventory | set_spending_cap | rerun_later

---

## 3) StyleModeで“見える差”を最大化する（Copy Layer）
StyleModeで変えて良い：
- 質問文/補足
- 選択肢ラベル（※ value は固定）
- 結果 headline/explain
- 行動の言い方（ラベル）
- 共有テンプレ（shareText）

StyleModeで変えない（MUST）：
- value / key
- reasonTags/nextActions の意味と選出ロジック
- verdict の意味

---

## 4) 実装方針（最小diff）
1) `src/oshihapi/modes/style_copy_dictionary.ts` を唯一のコピーソースにする
2) HOMEでStyleModeを選び、localStorage `oshihapi:style_mode` に保存
3) FlowでStyleModeに応じた prompt/label を表示（valueは固定）
4) ResultでStyleModeに応じた headline/explain/share を表示（配列は固定）

---

## 5) 受け入れ基準
- `npm run build` ✅
- Home→Flow→Result の3箇所で StyleMode が効く
- StyleMode切替でも verdict/reasons/actions（意味）が変わらない
