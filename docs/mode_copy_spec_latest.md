# StyleMode / FlowMode Spec (Latest)

## 0) 結論（避免再混淆）
- **FlowMode**（急いで/じっくり/AI相談）＝「問幾題、花多久」
- **StyleMode**（ver0/1/2 = standard/kawaii/oshi）＝「同一題、同一答案，但文案世界觀不同」

> 你要的「從開始頁面就能切風格」= **StyleMode 必須在首頁提供切換，並且在 flow/result 全站生效**。

---

## 1) MVP 不變規則（Invariant）
- StyleMode 只能改「表達層」：問題文案/選項文案/說明文案/貼紙/emoji/分享模板/微文案
- StyleMode **不能改**：判定 BUY/WAIT/SKIP 的語義、reasonTags 的語義、nextActions 的語義
- 題庫擴充可以做，但要：
  - A) 先做到「既有題目三套文案」讓功能可見
  - B) 再逐步擴充題目 + 讓 evaluate() 納入（可控、可回滾、build-first）

---

## 2) 題庫結構（建議）
- QuestionId 為硬 key（邏輯用）
- CopyKey 為文案 key（呈現用）
- 每題選項 value 固定（邏輯用），label 依 StyleMode 變（呈現用）

---

## 3) 文案風格規範
### standard（ver0）
- 中立、工具感，不用 emoji/顏文字

### kawaii（ver1）
- 可愛、情緒支持
- emoji ≤ 2、顏文字 ≤ 1
- 禁止：攻擊/歧視/成人/過激字串

### oshi（ver2）
- 推し活共鳴但可出圈（安全）
- emoji ≤ 1、不用顏文字
- 禁止：過深黑話、擦邊、攻擊性詞

---

## 4) UI 需求（你說的「所有功能都要讓我看到」）
- **首頁**：新增 StyleMode toggle（標準/かわいい/推し活用語）
- **flow 問題頁**：每題 prompt/選項 label 依 StyleMode 切換
- **結果頁**：結果解釋/建議/分享文案 依 StyleMode 切換
- localStorage key：
  - FlowMode：現有（保持）
  - StyleMode：新 key `oshihapi:style_mode`（全站共用）

