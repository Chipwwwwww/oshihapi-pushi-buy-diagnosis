# Full Branch Architecture (Latest) — 推し活向け（題庫「完全版」設計）

目的：推し活ユーザーの思考（情緒↔現実）を“分岐”として整理し、**見せる文案は style で変える**が、**判定ロジック（hard）は不変**にする。

---

## 0) ユーザー像（日本の推し活・SNS共有前提）
- 行動トリガー：供給（限定/受注/抽選）・現場（ライブ/イベント）・相場（中古/高騰）・情緒（尊さ/後悔）
- コスト感覚：**「総額」**（本体＋送料＋手数料＋遠征＋休み＋体力）で痛い目を見やすい
- リスク嫌悪：在庫/再販・配送破損・偽物・キャンセル不可・支払い時期
- 満足の型：
  - 支援（推しに金を落とす）
  - 記念（思い出化・誕生日/周年）
  - 実用（使う/着る/飾る）
  - 交換/回収（ガチャ・被り・譲渡）
- SNS共有：結果が「短くて可愛い/刺さる」ほど拡散する（スクショ・コピペ）

---

## 1) 分岐の全体像（Hard × Soft）
### Hard（不変・判定に影響する可能性がある概念）
- ItemType（goods/gacha/ticket/figure/digital/preorder）
- Acquisition（現場/通販/受注/抽選/中古）※将来拡張
- TimeLimit（締切/再販可能性）
- TotalCost（総額）
- BudgetImpact（生活侵食）
- Storage（置き場）
- Duplicate（所持/被り）
- Market（相場・高騰）
- Risk（偽物/破損/キャンセル不可/支払い）
- Emotion（衝動/疲れ/ストレス）
- Regret（見送る後悔 vs 買う後悔）
- Use（使う/飾る頻度）
- Alternatives（代替満足）

### Soft（styleで変える）
- 質問文言、選択肢の言い方、選択後の一言、結果の説明/背中押し、SNS用文面

---

## 2) 題庫の層（Diagnosis Mode 別）
### Fast（30秒）
- Core を最小セット（5〜7問）で結論 → 結果ページで補助質問（任意）を促す

### Standard（60秒〜2分）
- Core10＋タイプ別Addon（3〜6問）

### Deep（AIに相談/長診断）
- Core10＋Addon＋「反省/納得」用の深掘り（結果の“説明満足度”を上げる）
- 重要：Deepの追加質問は **MVPでは判定を変えない**（run にメモ保存 → 結果説明をリッチ化）

---

## 3) Question Modules（完全版モジュール）
### Core（全ItemType共通・完全版）
1) chance_now（今取れる？）
2) urgency_deadline（締切/今しかない？）
3) budget_impact（生活侵食）
4) total_cost（総額見積もり）
5) market_heat（相場/高騰）
6) price_cap（上限決められる？）
7) regret_if_skip（見送る後悔）
8) regret_if_buy（買う後悔）
9) use_frequency（使う/飾る頻度）
10) space_storage（置き場）
11) duplicate_check（所持/被り）
12) alt_satisfaction（代替満足）
13) impulse_state（衝動/疲れ）
14) upcoming_supply（今月/近々の供給）
15) authenticity_risk（偽物/信用）
16) shipping_risk（破損/配送）
17) cancel_policy（キャンセル）
18) payment_timing（支払い時期）
19) memory_value（記念性：誕生日/周年/初現場）
20) oshi_priority（推し順位/熱量）

### Addon by ItemType
- goods：bundle_trap / size_weight / shipping_fee / wearability / usage_scene
- gacha：spending_cap / pity_system / duplicate_tolerance / trade_option / stop_rule
- ticket：travel_total / schedule_conflict / stamina_load / seat_value / purpose_clarity
- figure：size_scale / display_plan / dust_maintenance / boredom_risk / long_storage
- digital：time_limit / rewatch_value / drm_risk / language_support / bundle_value
- preorder：delay_risk / cancel_policy / payment_timing / after_release_drop / stock_after

---

## 4) Result（完全版の説明満足度を上げる）
結果は verdict（BUY/WAIT/SKIP）だけでなく：
- WHY（reasonTags を人間語へ）
- NEXT（nextActions を具体化）
- STYLE（ver0/ver1/ver2 で口調/表現を変える）
- Deepメモ（長診断の回答を“納得材料”として引用）

---

## 5) MVPの実装方針（最小リスク）
- まず：style切替を Home/Flow/Result まで繋ぐ
- 追加質問は **最初は説明満足度用途**（判定は不変）
- 後で：評価ロジックへ段階的に取り込む（R1/R2）

