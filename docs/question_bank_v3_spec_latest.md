# QuestionBank v3 / Branching Spec (Latest)

## 0) 目標（推し活ユーザーの思考モデル）
推し活の意思決定は「論理」だけではなく、以下の揺れが強い：
- **後悔の非対称**：買わない後悔（機会損失）と、買った後の罪悪感/置き場/金欠
- **供給・期限・現場**：締切/在庫/再販の不確実性が意思決定を押す
- **相場と納得**：定価/中古相場/プレ値で「納得できる上限」が重要
- **推しへの支援**：支援目的（応援）と自己満足（所有）を分けて考えたい
- **衝動と情緒**：疲労/睡眠不足/テンションで判断が荒れる
- **収納が現場**：物理グッズは置き場所が最終ボトルネック

このため v3 は：
- 「FlowMode（深さ）」＝質問数/所要時間
- 「StyleMode（ver0/1/2）」＝同じロジックでも **世界観の文案** を変えてSNS共有を促進
- 「ItemType」＝チケット/ガチャ/予約/フィギュア/デジタル等の追加質問を切り替える

---

## 1) 分岐の全体像（Hard vs Soft）
### Hard branches（ロジック・意味が変わる）
- FlowMode: quick / standard / deep（既存の急いで/じっくり/AI相談）
- ItemType: goods / gacha / ticket / figure / digital / preorder
- Verdict: BUY / WAIT / SKIP
- WaitType: cooldown_24h / wait_market / wait_restock / wait_prepare
- ReasonTags: budget / urgency / market / space / impulse / duplicate / use / regret / risk
- NextActions: buy_now / set_price_cap / market_check / cooldown_24h / declutter_first / check_inventory / set_spending_cap / rerun_later

### Soft branches（表現だけ変える＝StyleMode ver0/1/2）
- ver0 standard：中立/工具感（絵文字なし）
- ver1 kawaii：かわいく背中を押す（emoji<=2, kaomoji<=1）
- ver2 oshi：推し活語（安全版・過激/黒話/攻撃性なし、emoji<=1）

**Invariant（最重要）**  
StyleMode は「問題文/選択肢/説明/貼紙/共有文」だけ変える。  
Verdict/WaitType/ReasonTags/NextActions の“意味”は絶対に変えない。

---

## 2) QuestionBank v3（構成）
### Core（全ItemType共通 / Deepほど多く出す）
A. Context（入口）
- q_item_type
- q_urgency_deadline
- q_budget_impact
- q_payment_timing

B. Core Decision（推し活の核）
- q_market_price
- q_regret_if_skip
- q_regret_if_buy
- q_use_frequency
- q_space_storage
- q_duplicate_inventory
- q_alt_satisfaction
- q_impulse_state
- q_support_goal

C. Risk/Reality（落とし穴）
- q_authenticity_risk（偽物/公式）
- q_return_policy（返品/返金）
- q_future_conflicts（来月の固定イベント/遠征と衝突）
- q_storage_cost（収納コスト＝片付け時間/家族目線）

### Addons（ItemType別）
- ticket:
  - q_ticket_total_cost
  - q_ticket_schedule_burden
  - q_ticket_purpose_clarity（誰のため/何を得たい）
- gacha:
  - q_gacha_stop_line
  - q_gacha_duplicate_tolerance
  - q_gacha_trade_options
- preorder:
  - q_preorder_cancel
  - q_preorder_release_window
  - q_preorder_budget_future
- figure:
  - q_shipping_risk
  - q_figure_display_plan
- digital:
  - q_digital_expiry
  - q_digital_replay_value
  - q_digital_ownership

---

## 3) FlowModeごとの出題ルール（見える化）
- quick（急いで）：Context 2 + Core 3（最大5問）
- standard（じっくり）：Context 4 + Core 8（最大12問）
- deep（AI相談）：Context + Core + Risk/Reality + Addons（最大20〜26問）

---

## 4) v3 実装指針（安全に）
- まず **UIに質問を出し切る**（StyleModeで文案が変わる＝ユーザーが「機能が見える」）
- evaluate() は v3 の回答が無い場合でも壊れない（undefined許容）
- 旧runIdの表示は互換維持（missing answers は無視）

---

## 5) 受け入れ基準
- `npm run build` ✅ が唯一裁判
- StyleModeを切り替えても verdict/reasons/actions の“意味”は変わらない
- HOMEでStyleModeを選べて、flow/resultまで反映される（localStorage永続）
