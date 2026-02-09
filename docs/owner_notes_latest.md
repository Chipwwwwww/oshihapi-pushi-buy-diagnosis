# Owner Notes（自用備忘錄 / 最新）— 2026-02-10

> 這份是給你自己看的：不用給別人看。  
> 你最重要的習慣：**先上 MVP 驗證**，不要被完美設計拖慢。

---

## ✅ 你最近已完成（安心）
- iPhone Light mode OK；Dark mode 的差異根因已定位（iOS + in-app browser）
- 已有 baseline/tag 與最穩 SOP（feature 驗收 → main 合併）
- 你修掉了 CI 的 lint 爆炸點（`scripts.lint` 不再指向不存在的 `/lint`）

---

## 🎯 你現在討論出的「產品方向」（推し活更貼近）
### 方向 1：把「買えた瞬間の快感（脳汁）」變成可被理解的訊號（不羞辱）
- Medium/Long：**買いたい理由（複数選択OK）**（最多 3）
- Short：用 **0–5 的欲しさ軸** 取代複選（不拖慢 30 秒）

你要的效果：
- 能分辨「幸福的購入」vs「短命衝動」
- 系統給出朋友口吻的建議（例：10 分冷卻、相場 5 分、先做置き場所）

### 方向 2：把「置き場所」做成必問（尤其グッズ）
- 置き場所不確定 → 大幅往保留/やめる 推（這個是最實用的剎車）

### 方向 3：冷角/供給多 → 預設導去二手相場（不靠 API、只靠搜尋跳轉）
- メルカリ/駿河屋/まんだらけ/Yahoo!オク 先看 5 分鐘

---

## 🔥 下一步最值得做的 3 件事（按 CP 排序）
1) **PR：複選動機 + Short 欲しさ軸**（新增 multi 題型 renderer）
2) **PR：置き場所必問 + 中古導流 action**（理由/建議模板）
3) Dark mode 視覺系統一套到底（surface/text/input/chips 全一致）

---

## 🧪 每次發版固定驗收（你不要再漏）
- iPhone Safari：Light / Dark
- iPhone Messenger in-app：Dark（文字、卡片、輸入框、chips）
- `npm run lint` / `npm run build`

---

## 🧩 你的下一段「貼給 GPT」開新對話 prompt（直接複製用）
你是我的「產品經理＋技術顧問＋UX 設計師＋日本市場顧問」＋「一人開發者的交付教練」。
專案：Next.js App Router + TypeScript。Windows PowerShell 開發，dev 固定用：
npm run dev -- --webpack
MVP 原則：不登入、不收個資、localStorage；telemetry 必須 opt-in 且預設關閉；商品名/價格屬敏感欄位預設不送。
現況：iPhone Dark mode（尤其 Messenger in-app）是主要風險，方向採 Midnight Glass（暗底 + 半透明 surface + 可讀字色 + 明確選中態）。
下一個 PR 目標：加入「買いたい理由（複数選択OK）」(max 3) 給 Medium/Long，以及 Short 用 0–5 欲しさ軸；新增 multi 題型 renderer；evaluate.ts 要能用 rush/futureUse 等旗標產生理由與行動（10分冷卻/相場5分/先做置き場所）。
請直接輸出：可落地規格、PowerShell 指令、Codex PR prompt（docs/codex_prompt_*.txt），並給驗收清單。不要反問我，合理預設直接往下做。
