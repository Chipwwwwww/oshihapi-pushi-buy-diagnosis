# 診断フロー規格報表（最新） / 意思決定フロー Single Source of Truth

> 範圍：目前分支的既有實作（Next.js App Router + `src/oshihapi/*`）
> 
> 目的：固定「模式 / 題目 / 分支 / 結果判定」規格，供 PM / 工程 / 後續維護直接對照實作。

---

## 0. 摘要（Executive Summary）

- 目前系統有兩種「mode」概念：
  1) **diagnosisMode（流程模式）**：`short | medium | long`，決定進入 `/flow` 或 `/confirm`、題目數量、hold band（判定門檻帶寬）與是否載入 itemKind addon 題組。Code pointer: `app/page.tsx#handleStart`, `src/oshihapi/modeConfig.ts#normalizeMode`, `app/flow/FlowClient.tsx#questions`.
  2) **styleMode / presentationMode（呈現模式）**：`standard | kawaii | oshi`，只改文案語氣與結果呈現，不改計分核心。Code pointer: `src/oshihapi/modes/useStyleMode.ts`, `src/oshihapi/modes/copy_dictionary.ts`, `src/oshihapi/modes/formatResultByMode.ts`.
- 入口路線：`/`（選模式 + 任意 meta）→ `short` 直接 `/flow`；`medium/long` 先 `/confirm`（可調整）再進 `/flow`。Code pointer: `app/page.tsx#handleStart`, `app/confirm/ConfirmClient.tsx`.
- 結果輸出分兩條引擎：
  - **merch flow**：`evaluate()`，以 8 維 score + 權重 + unknown penalty + impulse nudge + hold band 產生 `BUY/THINK/SKIP`。
  - **game_billing flow**：`evaluateGameBillingV1()`，以 buyScore-stopScore 閾值（>=5 BUY, <=-4 SKIP, else THINK）判定。Code pointer: `src/oshihapi/engine.ts#evaluate`, `src/oshihapi/gameBillingNeutralV1.ts#evaluateGameBillingV1`.
- 結果種類固定為三類：`BUY`（買う）、`THINK`（保留）、`SKIP`（やめる）。Code pointer: `src/oshihapi/model.ts#Decision`.
- tie-break / fallback 核心：
  - 閾值中間帶一律 `THINK`（等於門檻才 BUY/SKIP）。
  - 非法 mode / itemKind / deadline / decisiveness 都有 parser fallback。
  - scale 題若未答會以 default/min 自動補值。
  - storage gate 會在特定 itemKind 下對 `BUY` 進行降級（`NONE/UNKNOWN` -> `THINK`）。

---

## 1. 術語表（Glossary）

| 術語 | 定義 | 值域 / 備註 | 程式碼來源 |
|---|---|---|---|
| mode（建議改稱 diagnosisMode） | 診斷流程模式，影響路由、題目集合與判定帶寬 | `short / medium / long` | `src/oshihapi/model.ts#Mode`, `src/oshihapi/modeConfig.ts` |
| styleMode | 呈現語氣模式（presentation-only） | `standard / kawaii / oshi` | `src/oshihapi/modes/useStyleMode.ts` |
| presentationMode / resultMode | 結果頁與歷史頁用的呈現模式（presentation-only） | `standard / kawaii / oshi` | `src/oshihapi/modes/modeState.ts`, `app/history/page.tsx` |
| itemKind | 商品類型，影響題目分支（addon）與 storage gate | `goods / blind_draw / used / preorder / ticket / game_billing` | `src/oshihapi/model.ts`, `app/flow/FlowClient.tsx` |
| useCase | 引擎路徑分類 | `merch` 或 `game_billing` | `app/flow/FlowClient.tsx#useCase` |
| runId | 單次診斷 ID（UUID） | `crypto.randomUUID()` | `app/flow/FlowClient.tsx#handleNext` |
| sessionId | telemetry session ID | localStorage `oshihapi_session_id` | `src/oshihapi/telemetryClient.ts#getOrCreateSessionId` |
| scoring | 分數計算機制 | merch: 8維0~100 + 權重；game billing: buy-stop | `src/oshihapi/engine.ts`, `src/oshihapi/gameBillingNeutralV1.ts` |
| holdBand | merch 判定閾值帶寬 | base=0.2，再乘 decisiveness*mode multiplier | `src/oshihapi/engine.ts#evaluate` |
| unknownPenalty | 未知資訊懲罰 | 每 tag `unknown_*` 扣 6（預設） | `src/oshihapi/engineConfig.ts`, `src/oshihapi/engine.ts` |
| DecisionOutput | 結果物件（decision/confidence/reasons/actions...） | 統一輸出型別 | `src/oshihapi/model.ts#DecisionOutput` |

> 命名澄清：本專案同時存在「流程 mode」與「UI 文案 style mode」。本報表明確區分為 **diagnosisMode**（流程）與 **styleMode/presentationMode**（presentation-only）。

---

## 2. 全站路由地圖（Route Map）

### 2.1 App pages

| Path | 用途 | 觸發條件（如何進入） | 依賴 state/params | 輸出 / 副作用 |
|---|---|---|---|---|
| `/` | 首頁，選 diagnosisMode + 任意 meta | 直接進站 | local state（mode, itemKind, deadline, decisiveness, styleMode from localStorage） | `router.push` 到 `/flow` 或 `/confirm`，透過 query 傳參 |
| `/confirm` | medium/long 的進入前確認 | `/` 選 `mode!=short` | query: `mode/styleMode/decisiveness/...` | 可改 query，進 `/flow` 或 `/confirm/settings` |
| `/confirm/settings` | 可選的進階輸入 | `/confirm` 點「入力を追加...」 | 同上，另含 itemName/price/deadline/itemKind | 改 query 後進 `/flow` |
| `/flow` | 問答流程主頁 | short 從 `/` 直接進；或 confirm 流進入 | query 驅動 mode/itemKind/useCase/styleMode... | 完成後儲存 run（localStorage）並導向 `/result/[runId]` |
| `/result/[runId]` | 顯示判定、行動建議、分享、telemetry | `/flow` 完成後 | URL param: runId；query: styleMode | 讀 runStorage；可更新 feedback/telemetry opt-in；可送 telemetry |
| `/history` | local run 履歷 | 使用者進入 | localStorage runs + memos | 列出近20筆、可點進結果 |

### 2.2 API routes

| Path | 用途 | 觸發條件 | 依賴 params/body | 回應 / 副作用 |
|---|---|---|---|---|
| `/api/telemetry` (POST) | 寫入 telemetry DB | result page opt-in 後送出 | body: `event, sessionId, data`；event 限 `run_export/l1_feedback` | 插入 `telemetry_runs`；錯誤時回 JSON 錯誤碼 |
| `/api/telemetry/health` (GET) | DB 連線健康檢查 | 人工/監控打點 | env DB URL | 永遠回 JSON（多數情況 status 200），`ok: true/false` |
| `/api/version` (GET) | 版本資訊 | 人工/系統讀取 | env sha/ref | 回 commitSha/vercel 資訊 |

---

## 3. 模式總覽（Modes Overview）

### 3.1 diagnosisMode（流程模式）

- 選擇：首頁 state + template/recommendation 影響預設，但最終由使用者選值。`app/page.tsx`
- 儲存/傳遞：query `mode`，且在 `/flow` 會 `normalizeMode`（含 legacy alias `ai/deep... -> long`）。
- 影響範圍：
  - 路由：short 直達 `/flow`；medium/long 經 `/confirm`。
  - 題目集合：
    - short：quick 題組
    - medium：core 12
    - long：core 12 + itemKind addon
    - game_billing：short 5題，非 short 10題（q10 依 type 分歧）
  - 判定門檻：holdBand 乘上 mode multiplier（short 0.85 / medium 1 / long 1.1）。

### 3.2 styleMode / presentationMode（presentation-only）

- 來源順序：searchParams `styleMode`（也接受 `pm`）> localStorage > default `standard`。
- 儲存：`oshihapi:styleMode`；另有結果模式 `oshihapi:presentationMode`（`pmode`）與歷史頁 `oshihapi:mode`（舊鍵）。
- 影響範圍：**僅文案、標籤、貼紙與分享文字模板**，不進入核心判定 score。

### 3.3 decisiveness（決め切り度）

- 值域：`careful | standard | quick`。
- 傳遞：query + localStorage `oshihapi:decisiveness`。
- 影響：holdBand multiplier（careful 1.25 / standard 1 / quick 0.75）；會改判定敏感度。

---

## 4. 診斷流程圖（Flow Graph）

```mermaid
flowchart TD
  A[/首頁 /] --> B{mode?}
  B -->|short| F[/flow]
  B -->|medium/long| C[/confirm]
  C --> D[/confirm/settings (optional)]
  C --> F
  D --> F

  F --> G{itemKind == game_billing?}
  G -->|yes| H[gameBilling questions]
  G -->|no| I[merch questions]

  H --> J[evaluateGameBillingV1]
  I --> K[evaluate + reasonRules + merchMethod]

  J --> L[saveRun(localStorage)]
  K --> L
  L --> M[/result/{runId}]
  M --> N[/api/telemetry POST (opt-in only)]
```

### 4.1 問題集合分岐（/flow 內）

```mermaid
flowchart LR
  A[useCase merch] --> B{mode}
  B -->|short| C[QUICK_QUESTION_IDS]
  B -->|medium| D[CORE_12_QUESTION_IDS]
  B -->|long| E[CORE_12 + ADDON_BY_ITEM_KIND[itemKind]]
  C --> F{q_storage_fit?}
  D --> F
  E --> F
  F -->|shouldAskStorage=false(ticket/game_billing)| G[skip q_storage_fit]
  F -->|else| H[keep q_storage_fit]
```

---

## 5. 問題庫完整清單（Question Catalog）

> 說明：
> - merch 題庫定義在 `src/oshihapi/merch_v2_ja.ts`。
> - game billing 題庫定義在 `src/oshihapi/gameBillingNeutralV1.ts`。
> - 「被誰使用 / 影響」以目前實作為準；僅少數題目具 delta/tags 直接影響核心 score，其他題目目前主要用於問答完整度與輸出脈絡（未直接入分）。

### 5.1 merch 題目

| questionId | 文案（簡） | 型別 | answer資料型別 | 被誰使用 | 影響分支/計分 |
|---|---|---|---|---|---|
| q_storage_fit | 置き場所、決まってる？ | single | string | flow + engine storage gate | 分支：可能把 BUY 降為 THINK，並調整 confidence/reasons/actions |
| q_desire | 推し度 | scale(0-5) | number | engine | `mapTo=desire` |
| q_budget_pain | 出費是否痛 | single | string | engine | tags(`budget_*`) + delta(affordability/regret/impulse) |
| q_urgency | 急ぎ度 | single | string | engine | tags(含 `unknown_urgency`) + delta(urgency/rarity/restock) |
| q_rarity_restock | 再販機率 | single | string | engine | tags(含 `unknown_restock`) + delta(restock/rarity) |
| q_goal | 目的 | single | string | engine | tags(`goal_single/set/fun`) 給 merchMethod |
| q_motives_multi | 買い理由複選 | multi | string[] | engine | `rush/use/trend/vague` 觸發 impulseFlag/futureUse/trendFlag |
| q_hot_cold | 人氣枠 | single | string | engine | tags(`hot/cold/normal/unknown_popularity`) |
| q_regret_impulse | 衝動/後悔狀態 | single | string | engine | delta(impulse/regretRisk/... ) |
| q_impulse_axis_short | 欲しさ軸 | scale | number | engine | 不入 score map；僅用於 `impulseFlag`（>=4） |
| q_price_feel | 價格納得感 | single | string | 目前主要UI | 現行未在 engine 直接讀取 |
| q_storage_space | 保管見通し | single | string | 目前主要UI | 現行未在 engine 直接讀取 |
| q_alternative_plan | 代替案 | single | string | 目前主要UI | 現行未在 engine 直接讀取 |
| q_long_note | AI相談メモ | text | string | 目前流程未納入 score | longOnly（但目前題組選取未含） |
| q_addon_common_info | 資訊是否齊備 | single | string | long + itemKind addon | 現行未直接入分 |
| q_addon_common_priority | 推活優先度 | single | string | long + itemKind addon | 現行未直接入分 |
| q_addon_goods_compare | 同類比較 | single | string | goods addon | 現行未直接入分 |
| q_addon_goods_portability | 使用情境 | single | string | goods addon | 現行未直接入分 |
| q_addon_blind_draw_cap | 抽數上限 | single | string | blind_draw addon | 現行未直接入分 |
| q_addon_blind_draw_exit | 撤退線 | single | string | blind_draw addon | 現行未直接入分 |
| q_addon_ticket_schedule | 行程可行性 | single | string | ticket addon | 現行未直接入分 |
| q_addon_ticket_resale_rule | 規則確認 | single | string | ticket addon | 現行未直接入分 |
| q_addon_preorder_timeline | 等待容忍 | single | string | preorder addon | 現行未直接入分 |
| q_addon_preorder_restock | 再販調查 | single | string | preorder addon | 現行未直接入分 |
| q_addon_used_condition | 中古狀態風險 | single | string | used addon | 現行未直接入分 |
| q_addon_used_price_gap | 新舊價差 | single | string | used addon | 現行未直接入分 |

### 5.2 game billing 題目

| questionId | 文案（簡） | 型別 | answer資料型別 | 被誰使用 | 影響分支/計分 |
|---|---|---|---|---|---|
| gb_q1_need | 目的清晰度 | single | string | evaluateGameBillingV1 | buy/stop 對映加分 |
| gb_q2_type | 課金類型 | single | string | questions selector + evaluator | 分支：q10 用 pity 或 value |
| gb_q3_budget | 預算承受 | single | string | evaluator | buy/stop |
| gb_q4_use | 使用想像 | single | string | evaluator | buy/stop |
| gb_q5_now | 當下狀態 | single | string | evaluator | buy/stop |
| gb_q6_repeat | 過往滿意度 | single | string | evaluator（非short） | buy/stop |
| gb_q7_alt | 其他優先事項 | single | string | evaluator（非short） | buy/stop |
| gb_q8_wait | 24h後是否仍想買 | single | string | evaluator（非short） | buy/stop |
| gb_q9_info | 資訊確認度 | single | string | evaluator（非short） | buy/stop |
| gb_q10_pity | 天井距離（gacha） | single | string | evaluator（type=gacha） | buy/stop |
| gb_q10_value | 性價比（非gacha） | single | string | evaluator（type!=gacha） | buy/stop |

---

## 6. 分支與路線（Branch Matrix）

### 6.1 路由 / 流程分支 Decision Table

| 條件 | 下一步 |
|---|---|
| Home `mode=short` | `/flow?...` |
| Home `mode in {medium,long}` | `/confirm?...` |
| `/confirm` 點「このまま診断へ」 | `/flow` |
| `/confirm` 點「入力を追加...」 | `/confirm/settings` |
| `/flow` 內 `itemKind===game_billing` | useCase=`game_billing`，走 game billing 題組+引擎 |
| 其餘 itemKind | useCase=`merch`，走 merch 題組+引擎 |

### 6.2 題組分支 Decision Table

| 條件 | 題組 |
|---|---|
| useCase=game_billing && mode=short | `[q1..q5]` |
| useCase=game_billing && mode!=short | `[q1..q10]`，q10依 `gb_q2_type` 選 `pity/value` |
| useCase=merch && mode=short | `QUICK_QUESTION_IDS` |
| useCase=merch && mode=medium | `CORE_12_QUESTION_IDS` |
| useCase=merch && mode=long | `CORE_12 + ADDON_BY_ITEM_KIND[itemKind]` |
| itemKind in {ticket, game_billing} | `q_storage_fit` 從題組過濾掉（`shouldAskStorage=false`） |

### 6.3 判定分支 Decision Table（merch）

| 條件 | 行為 |
|---|---|
| scoreSigned >= holdBand | `BUY` |
| scoreSigned <= -holdBand | `SKIP` |
| 其餘 | `THINK` |
| tags 內 `unknown_*` | unknownPenalty 增加，score magnitude 被壓縮 |
| impulseFlag=true 且 score 未遠高於買入帶 | 再做負向 nudge (`-0.08`) |
| shouldAskStorage=true 且 `q_storage_fit in {NONE,UNKNOWN}` | 若原為 BUY -> THINK；confidence -15；附加 storage reason/action |

### 6.4 判定分支 Decision Table（game_billing）

| 條件 | 行為 |
|---|---|
| `score = buyScore-stopScore >= 5` | BUY |
| `score <= -4` | SKIP |
| 其餘 | THINK |

---

## 7. 結果庫完整清單（Result Catalog）

| resultId | 顯示名 | 適用模式 | 產生條件 | 相依 score/flags |
|---|---|---|---|---|
| BUY | 買う | merch + game_billing | merch: `scoreSigned>=holdBand`；game: `score>=5` | 8維權重結果 / buy-stop分差 |
| THINK | 保留 | merch + game_billing | merch: 中間帶；game: `-4 < score < 5` | 中間帶、unknown、impulse、storage downgrade |
| SKIP | やめる | merch + game_billing | merch: `scoreSigned<=-holdBand`；game: `score<=-4` | 8維權重結果 / buy-stop分差 |

附註：
- `presentation.decisionLabel/headline/badge/tags` 是結果呈現層，屬於文案/標籤生成，不改 `decision`。
- `formatResultByMode` 產生社群分享文案貼紙，也不改核心 decision。

---

## 8. 最終判定算法（How Final Result Is Computed）

## 8.1 Merch 引擎（`evaluate`）

### Inputs
- `questionSet.questions`
- `answers`
- `meta`（itemName/price/deadline/itemKind）
- `mode`、`decisiveness`
- `engineConfig`（weights/threshold/unknownPenalty）

### Step A：初始化與前置旗標
1. scoreSummary 8維初始化為 50。
2. 從 `q_motives_multi` 推導：
   - `impulseFlag = motives包含rush || q_impulse_axis_short>=4`
   - `futureUseFlag = motives包含use`
   - `trendOrVagueFlag = motives包含trend/vague`

### Step B：逐題合併分數/標籤
1. scale/number 題：把 value 映射到 0..100，對 `mapTo` 維度做 merge：
   - `mergeScore(base, add)=round((base+add)/2)` 再 clamp 0..100。
2. single 題：命中 option 後
   - tags 推入全域 `tags[]`
   - delta 逐維 merge 到 scoreSummary。
3. multi/text 題：不走 delta merge（但特定題在 Step A 另行取用）。

### Step C：unknown penalty
- `unknownCount = tags.filter(startsWith("unknown_"))`
- `unknownPenalty = unknownCount * unknownPenaltyPerTag`（預設 6）

### Step D：計算 signed score
1. 對每維做 normalize：`norm=(score-50)/50`（-1..+1）
2. 加權和：`scoreSigned = Σ(norm[dim] * weight[dim])`
   - 權重預設：desire +0.35, affordability +0.20, urgency +0.10, rarity +0.10, restockChance -0.08, regretRisk -0.15, impulse -0.10, opportunityCost -0.12
3. unknown 抑制：`scoreSigned *= (1 - min(0.35, unknownPenalty/100))`
4. impulse nudge：若 `impulseFlag=true` 且 `scoreSigned < buyThreshold+0.2`，`scoreSigned -= 0.08`

### Step E：門檻與判定
1. `holdBandBase = max(abs(buy), abs(skip))`（預設 0.2）
2. `holdBand = holdBandBase * decisivenessMultiplier * modeMultiplier`
   - decisiveness: careful 1.25 / standard 1 / quick 0.75
   - mode: short 0.85 / medium 1 / long 1.1
3. 判定：
   - `scoreSigned >= holdBand` => BUY
   - `scoreSigned <= -holdBand` => SKIP
   - else THINK

### Step F：method / reason / action / confidence
1. method：`decideMerchMethod({tags,scores,goal,popularity})` 產生 `USED_SINGLE/BOX/BLIND_DRAW/PASS` + cap/note。
2. reasons/actions：`pickReasons`, `pickActions`，再疊加 impulse/trend 額外條目，最後截斷（reasons<=6, actions<=3）。
3. confidence：`clamp(50,95, round(50 + abs(scoreSigned)*70 - unknownPenalty))`

### Step G：storage gate（後置覆寫）
- 僅 `shouldAskStorage(itemKind)=true` 時檢查 `q_storage_fit`：
  - `NONE/UNKNOWN`：若 decision=BUY，降為 THINK；confidence 減15（下限50）；追加 storage reason/action。
  - `PROBABLE`：追加提醒性 reason/action。

### Tie-break / Fallback（merch）
- tie-break：處於門檻內中間帶一律 THINK。
- fallback：
  - mode/itemKind/deadline/decisiveness 非法值皆 normalize/parser fallback。
  - scale 未答時，先用 defaultValue/min 補值再 evaluate。
  - option id 若找不到，該題跳過（不加分不加tag）。

Code pointers（核心）：
- `src/oshihapi/engine.ts`：`evaluate`, `mergeScore`, `initScores`
- `src/oshihapi/engineConfig.ts`：`engineConfig`, `normalize01ToSigned`, `clamp`
- `src/oshihapi/merchMethod.ts`：`decideMerchMethod`
- `src/oshihapi/reasonRules.ts`：`pickReasons`, `pickActions`
- `src/oshihapi/storageGate.ts`：`shouldAskStorage`

## 8.2 Game Billing 引擎（`evaluateGameBillingV1`）

### Inputs
- `answers`（gb_q1~gb_q10）

### Algorithm
1. 初始化 `buyScore=0`, `stopScore=0`
2. 每題以 `sumMap(answer, map)` 對 buy/stop 各自加分
3. `score = buyScore - stopScore`
4. 判定：
   - `score>=5 => BUY`
   - `score<=-4 => SKIP`
   - else THINK
5. 生成 `reasons`（三句模板）、`nextActions`（依 decision 2 條）、`searchSuggestions`。

### FlowClient 封裝（重要）
- 結果頁使用的輸出是 FlowClient 二次包裝：
  - `confidence` 固定 70
  - `score` 轉成 `clamp(-1,1, raw/12)`
  - `scoreSummary` 固定全50
  - `merchMethod.method = PASS`、`note="ゲーム課金（中立）v1"`

Code pointers：
- `src/oshihapi/gameBillingNeutralV1.ts`: `getGameBillingQuestions`, `evaluateGameBillingV1`
- `app/flow/FlowClient.tsx`: game billing 分支的 output 封裝

---

## 9. 例子（Worked Examples）

> 下列例子以現行程式邏輯逐步推導。

### Example 1：merch / short / 高欲望且可負擔（BUY）

- 前提：`mode=short`, `decisiveness=standard`, `itemKind=goods`
- 答案：
  - q_storage_fit=CONFIRMED
  - q_desire=5
  - q_budget_pain=ok
  - q_urgency=last
  - q_rarity_restock=unlikely
  - q_regret_impulse=calm
  - q_impulse_axis_short=2
- 中間分數（重點維度）：
  - desire 50->75
  - affordability 50->68
  - regretRisk 50->43 再->39
  - urgency 50->68
  - rarity 50->60->68
  - restock 50->38->32
  - impulse 50->38
- unknownPenalty=0，impulseFlag=false
- 加權後 `scoreSigned≈0.405`
- holdBand=`0.2*1*0.85=0.17`
- 判定：`0.405 >= 0.17 => BUY`
- confidence：`round(50+0.405*70)=78`（範圍內）
- storage gate：CONFIRMED，不覆寫

### Example 2：merch / medium / 資訊未知 + 衝動（THINK）

- 前提：`mode=medium`, `decisiveness=standard`, `itemKind=goods`
- 答案（重點）：
  - q_desire=2
  - q_budget_pain=hard
  - q_urgency=unknown
  - q_rarity_restock=unknown
  - q_hot_cold=unknown
  - q_motives_multi=[rush,trend]
  - q_regret_impulse=fomo
  - q_impulse_axis_short=4
  - q_storage_fit=UNKNOWN
- 中間：
  - unknown tags 至少 3 個（urgency/restock/popularity）=> penalty=18
  - impulseFlag=true（rush 或 axis>=4）
  - 原始加權分約 `-0.105`
  - unknown 抑制後約 `-0.086`
  - impulse nudge 後約 `-0.166`
- holdBand=`0.2*1*1=0.2`
- 判定：介於 -0.2~0.2 => THINK
- confidence base <50，但 clamp 到 50；storage UNKNOWN 再扣15 仍受下限約束 => 50
- storage gate：原本非BUY，僅增加提醒 reason/action

### Example 3：game_billing / long / 條件明顯不利（SKIP）

- 前提：`itemKind=game_billing`, `mode=long`
- 答案：
  - gb_q1_need=unclear
  - gb_q2_type=gacha
  - gb_q3_budget=hard
  - gb_q4_use=low
  - gb_q5_now=rush
  - gb_q6_repeat=rare
  - gb_q7_alt=yes
  - gb_q8_wait=drop
  - gb_q9_info=none
  - gb_q10_pity=far
- buyScore 幾乎 0，stopScore=19 => `score=-19`
- 判定：`-19 <= -4 => SKIP`
- FlowClient 包裝：
  - decision=SKIP
  - confidence=70（固定）
  - score=clamp(-1,1,-19/12)=-1

---

## 10. 錯誤處理與邊界（Edge Cases）

| 情境 | 目前行為 | 程式碼位置 |
|---|---|---|
| mode 非法 / legacy 值 | `normalizeMode` 轉 `medium` 或映射到 `long` | `src/oshihapi/modeConfig.ts#normalizeMode` |
| styleMode 非法 | 回退 `standard` | `src/oshihapi/modes/useStyleMode.ts#resolveStyleMode` |
| decisiveness 非法 | 回退 `standard` | `src/oshihapi/decisiveness.ts#parseDecisiveness` |
| deadline/itemKind 非法 | 回退 `unknown` / `goods` | `app/flow/FlowClient.tsx#parseDeadline/#parseItemKind` |
| 必填 scale 未回答 | 以 `defaultValue` 或 `min` 補值 | `app/flow/FlowClient.tsx#normalizedAnswers` |
| 無題可顯示（question not found） | `/flow` 顯示「質問が見つかりませんでした」+ 回首頁按鈕 | `app/flow/FlowClient.tsx` |
| runId 不存在（結果頁） | result page 走無 run 分支（畫面提示） | `app/result/[runId]/page.tsx` |
| telemetry payload 過大 | 413 `bad_request` | `app/api/telemetry/route.ts` |
| telemetry JSON 錯誤/欄位錯 | 400 `bad_request` | `app/api/telemetry/route.ts` |
| telemetry DB env 缺失 | 500 `db_env_missing`（含 missing keys） | `app/api/telemetry/route.ts` |
| telemetry DB insert 失敗 | 500 `db_insert_failed` + redact detail/hint | `app/api/telemetry/route.ts` |
| telemetry health DB異常 | 200 + `{ok:false,error:...}`（避免白屏500） | `app/api/telemetry/health/route.ts` |

---

## 11. 維護規約（Maintenance Contract）

未來若有以下變更，**必須同步更新本報表**：

1. 新增/刪除/改名 mode（diagnosis 或 style）
   - 更新章節：1, 3, 6, 8
2. 新增/刪除題目、調整題組分支（含 addon）
   - 更新章節：4, 5, 6
3. 調整任何 delta / weight / threshold / penalty / tie-break
   - 更新章節：7, 8, 9
4. 調整結果輸出型別或 result route 讀取方式
   - 更新章節：2, 7, 10
5. API 錯誤處理與狀態碼改動
   - 更新章節：2, 10

建議 PR checklist 增加（文件規約，不改 CI）：
- [ ] `docs/decision_flow_report_latest.md` 已同步更新
- [ ] 若改判定規則，`Worked Examples` 已重算並比對

---

## 12. 版本資訊

- Report generated from commit SHA: `289365a4f1e522399505eba936bc0a65aaa28cce`
- Report baseline: 本分支當前實作（非理想規格、非未來設計稿）
- 產物性質：additive 文檔，不改 runtime 行為

