# Question Bank / Branch Architecture (Latest)

対象：日本の若年〜社会人オタク（推し活・グッズ/ガチャ/チケット/フィギュア/予約/デジタル）  
ゴール：**衝動買いの後悔を減らしつつ、応援/楽しさを最大化**（短時間で決める）

---

## 1) Hard Branch（ロジック）と Soft Branch（文案）を分離する
- **Hard（固定）**：QuestionId / option.value / reasonTags / nextActions / 判定語義
- **Soft（可変）**：StyleMode による title/help/label/説明文/共有文/ステッカー

---

## 2) 入力の分岐（Entry）
### ItemType
- goods / gacha / ticket / figure / digital / preorder

### Goal（目的）
- support（応援/支援） / memory（記念） / utility（実用） / trade（相場/転売目的は“安全に”扱う）

### FlowMode（診断深度）
- quick（急いで：30秒）
- standard（じっくり：60〜120秒）
- consult（AI相談：長診断）

> FlowMode は「質問数」。StyleMode は「口調」。混ぜない。

---

## 3) ReasonTags（固定語義）
- budget：予算負荷
- urgency：締切/在庫
- market：相場/価格の熱
- space：収納/置き場所
- impulse：衝動/コンディション
- duplicate：ダブり/既所有
- use：使用/活躍頻度
- regret：後悔（買わない/買う）
- risk：配送/偽物/キャンセル不可等

---

## 4) Core 質問（全 ItemType 共通）
MVP では **この Core を必ず持つ**。FlowMode で出す数を変える。

### Core-12（推奨）
1. q_urgency_deadline（urgency）
2. q_budget_impact（budget）
3. q_market_price（market）
4. q_regret_if_skip（regret）
5. q_regret_if_buy（regret/risk）
6. q_use_frequency（use）
7. q_space_storage（space）
8. q_duplicate_inventory（duplicate）
9. q_alt_satisfaction（use/regret）
10. q_impulse_state（impulse）
11. q_payment_timing（budget）
12. q_support_goal（regret/use）

---

## 5) Addons（ItemType ごと）
### ticket
- q_ticket_total_cost（budget）
- q_ticket_time_off（risk/budget）
- q_ticket_purpose_clarity（regret）

### gacha
- q_gacha_stop_line（budget/impulse）
- q_gacha_duplicate_tolerance（duplicate）
- q_gacha_trade_route（duplicate/market）

### figure
- q_figure_size_risk（space/risk）
- q_shipping_risk（risk）
- q_authenticity_risk（risk）

### digital
- q_digital_replay_value（use）
- q_digital_expiry（urgency）

### preorder
- q_preorder_cancel（risk）
- q_preorder_payment_lock（budget/risk）
- q_preorder_delay_risk（risk）

---

## 6) FlowMode の質問セット（見える仕様）
### quick（急いで 30秒）
- urgency_deadline / budget_impact / regret_if_skip / space_storage / impulse_state
- 早停（最大2）
  - budget=bad && urgency=anytime → WAIT/SKIP 寄り（冷却/上限設定）
  - urgency=soon_48h && budget=ok && space=ok && regret_if_skip=high → BUY 寄り

### standard（じっくり 60〜120秒）
- Core-10 or Core-12（MVP は Core-12 推奨）

### consult（AI相談）
- Core-12 + Addons（ItemType）
- 追加：自由記述（任意）→ AI に渡すプロンプト生成（将来機能）

---

## 7) NextActions（固定語義）
- buy_now / set_price_cap / market_check / cooldown_24h / declutter_first
- check_inventory / set_spending_cap / rerun_later

---

## 8) 受け入れ基準（唯一の裁判）
- `npm run build` ✅
- StyleMode を変えても：**判定・理由タグ・アクションの“意味”は変わらない**
- FlowMode は質問数が変わる（=見える）。
