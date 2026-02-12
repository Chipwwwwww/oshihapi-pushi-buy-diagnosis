# Mode / Branch Spec (Latest)

本檔是「給 Codex 的單一規格來源」：定義所有分支（硬邏輯）與 Presentation Style（軟呈現）如何分離。

**最重要不變規則（Invariant）**
- Presentation Style（ver0/ver1/ver2）只改「表達層」：問題/選項文案、貼紙/一言、語氣、emoji/顏文字、shareText 模板、UI 微文案、結果解釋/建議文案。
- Presentation Style 絕對不能改：題庫路由、判定 BUY/WAIT/SKIP、waitType、reasonTags 的語義、nextActions 的選擇邏輯（= decision engine 硬邏輯）。

---

## 名詞共識（避免混淆）
- **Diagnosis Mode（診断モード）**：開始頁的「急いで決める / じっくり / AIに相談」＝流程長度與深度（硬邏輯）。
- **Presentation Style（表現スタイル）**：你口中的 ver0/ver1/ver2 ＝文案風格（軟呈現）。
  - ver0 = standard（標準/中立）
  - ver1 = kawaii（かわいい）
  - ver2 = oshi（推し活用語・安全版）

---

## Hard Branches（硬邏輯分支：三個 Style 共用）
### A) Entry（入口）
- ItemType: goods / gacha / ticket / figure / digital / preorder
- Urgency: high / mid / low
- PriceKnown: known / unknown
- Goal: support / memory / utility / trade

### B) Decision（判定）
- Verdict: BUY / WAIT / SKIP
- WaitType（僅 WAIT）: cooldown_24h / wait_market / wait_restock / wait_prepare
- ReasonTags（固定字典）:
  budget / urgency / market / space / impulse / duplicate / use / regret / risk
- NextActions（每次最多 2 個）:
  buy_now / set_price_cap / market_check / cooldown_24h / declutter_first / check_inventory / set_spending_cap / rerun_later

---

## Soft Branches（Style 專用：文案）
### ver0 = standard
- 中立可靠、工具感。emoji/顏文字なし。

### ver1 = kawaii
- スクショ共有したくなる、情緒サポート。絵文字控えめ、優しい。

### ver2 = oshi（安全版）
- 圈內共鳴＋出圈安全。過深黑話/擦邊/攻擊性は避ける。

---

## UI 必須（你要的）
- **開始頁（app/page.tsx）就能切換 Presentation Style**
- Flow：問題/選項文案依 style 變
- Result：結果解釋/建議/貼紙/分享文案依 style 變
- Invariant：切換 style 前後 verdict/reasonTags/actions（硬邏輯）不可改。

---

## 驗收（唯一裁判）
- npm run build ✅
- Manual：同一個 runId 切 style，verdict/reasonTags/actions 不變，只是文案不同。
