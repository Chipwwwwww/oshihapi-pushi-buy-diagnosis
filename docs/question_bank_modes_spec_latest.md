# Question Bank + Mode Copy Spec (Latest)

目的：
- 「Flow（質問の本体/分岐/判定ロジック）」と「Mode（文言/雰囲気）」を完全分離する。
- ver0/ver1/ver2 = 表示と文言だけが変わる（質問ID/選択肢ID/判定ロジック/タグ/アクションは不変）。

---

## 分岐軸（Hard vs Soft）

### Hard（ロジック軸：判定に影響）
1) FlowDepth（既存）：quick / standard / deep
2) ItemType：goods / gacha / ticket / figure / digital / preorder
3) Inputs：予算/締切/価格/在庫など（既存の入力）

### Soft（Mode軸：表示のみ）
- ver0 = standard（標準・中立）
- ver1 = kawaii（かわいい）
- ver2 = oshi（推し活用語・安全版）

Modeで変えてOK：
- 質問文・選択肢文・補足文（＝UIコピー）
- 結果の一言/ステッカー
- 結果説明/提案の言い回し（ただし “何を提案するか” は不変）
- シェア文テンプレ

Modeで変えちゃダメ：
- 質問ID / 選択肢ID
- ルーティング（どの質問が出るか）
- BUY/WAIT/SKIP 判定
- waitType / reasonTags / nextActions の意味と選択条件

---

## 質問バンク（R0: まず全部定義、FlowDepthで出題数を制御）

### Core（全ItemType共通：12）
Q01 core_budget_impact
Q02 core_deadline_urgency
Q03 core_market_price_check
Q04 core_regret_if_skip
Q05 core_regret_if_buy
Q06 core_use_frequency
Q07 core_space_storage
Q08 core_duplicate_inventory
Q09 core_substitute_satisfaction
Q10 core_impulse_state
Q11 core_opportunity_cost
Q12 core_exit_plan_resell

### Addons（ItemType別：各4＝合計20追加）
gacha:
- G01 gacha_ceiling_cap
- G02 gacha_target_clarity
- G03 gacha_duplicate_tolerance
- G04 gacha_trade_exit

ticket:
- T01 ticket_total_cost
- T02 ticket_schedule_health
- T03 ticket_experience_value
- T04 ticket_alternative_options

figure:
- F01 figure_shipping_risk
- F02 figure_display_plan
- F03 figure_boredom_risk
- F04 figure_maintenance

digital:
- D01 digital_expiration
- D02 digital_replay_value
- D03 digital_ownership_saving
- D04 digital_bundle_discount

preorder:
- P01 preorder_payment_timing
- P02 preorder_cancel_policy
- P03 preorder_bonus_exclusive
- P04 preorder_wait_tolerance

---

## FlowDepthごとの出題セット（例：実装は「質問ID配列」だけ変える）

quick（6問）:
- core_budget_impact / core_deadline_urgency / core_regret_if_skip
- core_regret_if_buy / core_space_storage / core_impulse_state

standard（12問）:
- Core 12 全部

deep（最大24問）:
- Core 12 + ItemType Addons 4 + “状況に応じて” 追加（最大24に収める）

---

## 結果（表示だけ差し替える）

- verdict: BUY / WAIT / SKIP
- waitType（WAITのみ）: cooldown_24h / wait_market / wait_restock / wait_prepare
- reasonTags: budget / urgency / market / space / impulse / duplicate / use / regret / risk
- nextActions（最大2）: buy_now / set_price_cap / market_check / cooldown_24h / declutter_first / check_inventory / set_spending_cap / rerun_later

Modeは「これらをどう言い換えるか」だけ担当。

---

## 安全ガードレール（特にver2 oshi）
- 強い攻撃性/差別/過激/性的ワードは使わない
- “内輪すぎる黒話” は避け、出圈しても意味が伝わる推し活語に寄せる
