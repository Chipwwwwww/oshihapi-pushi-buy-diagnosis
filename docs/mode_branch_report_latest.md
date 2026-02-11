# Mode / Branch Spec (Latest)

本檔是「給 Codex 的單一規格來源」：定義所有分支（硬邏輯）與 Mode（軟呈現）如何分離。
**最重要不變規則（Invariant）**：
- Mode（ver0/ver1/ver2）只改「表達層」：貼紙/一言、語氣、emoji/顏文字、shareText 模板、UI 微文案。
- Mode 絕對不能改：題庫路由、判定 BUY/WAIT/SKIP、waitType、reasonTags 的語義、nextActions 的選擇邏輯。

---

## 名詞共識（避免混淆）
- **Mode（模式）**：你口中的 ver0/ver1/ver2
  - ver0 = standard（標準/中立）
  - ver1 = kawaii（かわいいmode）
  - ver2 = oshi（推し活用語mode・安全版）
- **Release（版本迭代）**：R0/R1/R2（開發階段）— 以後不要用 ver1/ver2 表示版本迭代，避免與 Mode 混用。

---

## 硬分支字典（Hard Branches：三個 Mode 共用）
### A) Entry（入口）
- ItemType: goods / gacha / ticket / figure / digital / preorder
- Urgency: high / mid / low
- PriceKnown: known / unknown
- Goal: support / memory / utility / trade

### B) Question Routing（題庫路由）
- Core10：通用核心 10 題（必問）
  1) 入手機會 2) 預算衝擊 3) 相場/價格熱度 4) 不買後悔
  5) 買了後悔 6) 使用/飾る頻度 7) 收納/空間
  8) 重複/所持確認 9) 替代滿足 10) 衝動/狀態
- TypeAddons（依 ItemType 加題，後續 Release 才擴充）
  - gacha: cap/撤退線、被り耐性、交換手段
  - ticket: 遠征總費、體力/請假負荷、目的清晰度
  - figure: 運送風險、飽き耐性、收納確定度
  - digital: 期限、重播價值、保存性
  - preorder: 付款時點、取消可否
- EarlyStop（早停規則，封口：最多 2 條）
  1) budget_bad && urgency_low -> WAIT/SKIP 短路
  2) urgency_high && budget_ok && space_ok && regret_high -> BUY 快速確認

### C) Decision（判定）
- Verdict: BUY / WAIT / SKIP
- WaitType（僅 WAIT）: cooldown_24h / wait_market / wait_restock / wait_prepare
- Confidence: high / mid / low（僅呈現用，不影響判定）
- ReasonTags（固定字典）:
  budget / urgency / market / space / impulse / duplicate / use / regret / risk

### D) NextActions（下一步行動：每次最多 2 個）
- buy_now
- set_price_cap
- market_check
- cooldown_24h
- declutter_first
- check_inventory
- set_spending_cap
- rerun_later

### E) Output Artifacts（輸出種類）
- Text: x_280（X 280 字） / dm_short（群聊短版）
- Card: square_1to1 / story_9to16（後續 Release 再做也可）

---

## 軟分支（Soft Branches：Mode 專用）
### Mode ver0 = standard（標準）
- 目標：中立可靠、工具感
- 限制：不使用 emoji/顏文字；貼紙為資訊型（相場注意/24h待ち/予算設計…）

### Mode ver1 = kawaii（かわいいmode）
- 目標：更想截圖分享、情緒支持
- 限制：emoji ≤ 2、顏文字 ≤ 1、避免攻擊/成人/歧視字串
- 貼紙偏鼓勵：いける！✨ / 今日は寝よっ… / ダブり回避！等

### Mode ver2 = oshi（推し活用語mode・安全版）
- 目標：圈內共鳴但可出圈（安全）
- 限制：emoji ≤ 1、不用顏文字、避免過深黑話與任何擦邊/攻擊性詞
- 貼紙偏推し活語：供給ありがとう案件 / 待てるオタク、強い / 収納が現場 等

---

## ScenarioKey（貼紙選擇鍵）
貼紙選擇不看 UI，不看亂數；只看：
- verdict
- waitType（WAIT 時最優先）
- primaryTag（從 reasonTags 依優先序挑 1 個）

ScenarioKey 建議集合（已在 mode_dictionary.ts 定義）：
- BUY: buy_default / buy_urgency / buy_regret
- WAIT: wait_cooldown_24h / wait_market / wait_restock / wait_prepare_(space|duplicate|budget)
- SKIP: skip_budget / skip_risk
- generic（保底）

---

## 驗收（唯一裁判）
- 必須：npm run build ✅
- Mode 切換後：
  - Verdict / Reasons / Actions 不變
  - 只允許貼紙與語氣變
