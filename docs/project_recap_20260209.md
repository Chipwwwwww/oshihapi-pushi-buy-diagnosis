# 專案回顧與作業手冊（更新到 2026-02-10）

> 這份文件是給「自己」看的：把「iPhone17 看起來跟 iPhone12 不一樣」一路追到根因，並形成可重複的解法與流程。  
> 另外補上：你新增推し活方向（買えた快感）與你剛修的 lint 事故，讓下次不重踩。

---

## 1) 事件主線：iPhone Dark mode 不一致
### 事件：同一份 code，iPhone17（Messenger）看起來跟 iPhone12/桌機不一樣
- iPhone17 + Messenger in-app + Dark mode：淡字、白卡刺眼、難讀
- iPhone Light mode / 桌機：看起來正常

**關鍵結論：不是手機壞，是「Dark mode 規則不完整」。**
- iOS/in-app browser 更容易觸發 `prefers-color-scheme: dark`
- 背景變暗但卡片/輸入框仍白 → 字色套用 dark 的淡色 → 直接消失

---

## 2) 你做對的事（最值得複製）
### A) 30 秒驗因
1) iPhone 外觀切 Light → 立刻正常
2) 同網址 Safari 開 vs Messenger 開 → in-app 更容易暴露
→ 結論：修 Dark mode 規則（surface + text 一致），不是做「機型適配」。

### B) 最小 patch（不動桌機 UI）
- iOS-only global css：
  - `-webkit-text-size-adjust: 100%`
  - `min-height: 100dvh`
  - `.safe-bottom` safe-area padding
- 視覺系統（推し活向け）：Midnight Glass

---

## 3) 新增：你討論收斂的「推し活更貼近」方向（2026-02-10）
你把「買下來的快感」正式納入決策：這件事很關鍵，會讓產品更像同好。

### A) 設計原則
- 不羞辱、不道德說教：不用「衝動買い」「ダメ」「無駄」
- 但要有剎車：用「冷卻」「先看相場」「先做置き場所」這種實際行動

### B) 題型策略（避免短診斷變慢）
- Short（30 秒）：用 0–5 欲しさ軸（未来寄り ↔ 快感寄り）
- Medium/Long：用「買いたい理由（複数選択OK）」最多 3
  - rush / support / use / fomo / bonus / trend / vague

### C) 引擎規則要點
- rush 強 → 加入 10 分冷卻 action
- rush 且沒有 use（未來用途不明）→ 追加「写真で満足」「小物だけ」提示
- trend/vague → 導去相場 5 分（新品不焦慮，中古可能更香）

---

## 4) 新增：CI lint 事故（2026-02-10）
### 症狀
- `npm run lint` 報：
  - `Invalid project directory provided, no such directory: /.../lint`

### 根因
- `package.json` 的 `scripts.lint` 把 `lint` 當目錄參數傳入（例如 `next lint lint`）
- repo 沒有 `./lint` → CI 直接炸

### 最小修正
- 把 `scripts.lint` 改成 `next lint`
- 立刻本機 `npm run lint` 驗收

### 你之後的預防清單（每個 PR 都跑一次）
- `npm run lint`
- `npm run build`

---

## 5) 你的固定作業流程（以後照做）
1) 在 docs 寫 Codex prompt（小範圍、帶驗收點）
2) Codex 開 PR → merge 到 feature 驗收
3) 手機驗收（iOS Dark + Messenger）
4) OK → merge main
5) 更新 6 份 docs（狀態/回顧/檔案地圖/ops/下一步）

