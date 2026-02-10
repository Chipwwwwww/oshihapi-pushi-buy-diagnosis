# UI 回歸修正：手機/桌面可讀性與穩定性規格（MVP）

## 觀察到的症狀
- 深色區塊內的「標籤/字幕」接近背景色，看起來像消失
- Mobile 上字級/間距不一致，卡片佈局怪，閱讀壓力大
- 某些頁面（結果頁）呈現比 Desktop 更糟

## 根因假設（優先檢查）
- globals.css 覆蓋 Tailwind 或撞名（container/card/muted/button/badge）
- 全域 selector 對小字套 opacity 或 muted 色
- chip/tag 沒有 dark-surface 對比方案

## 設計原則（手機優先）
- 文字對比：小字也要讀得清楚（尤其深色面）
- 不用罪惡感語氣、保持「朋友提醒」調性（文案不在本 PR 必修）
- 全域 CSS 只管「基礎」：字體、背景、預設文字色、focus ring；其餘用 `.osh-*` 類別或 Tailwind utility

## 最小可行樣式建議
- `.osh-container`: max-width + padding（mobile 16px, desktop 24px）
- `.osh-card`: 白底、圓角、陰影、border（不依賴 opacity）
- `.osh-muted`: 只做顏色略淡（不低於 0.75 的可視等級）
- `.osh-chip`: 深色底時文字與背景反相（text: rgba(255,255,255,.92), bg: rgba(255,255,255,.12)）

## 驗收清單（回歸測試）
- [ ] iPhone 12（390x844）：首頁/flow/result 無水平捲動
- [ ] Result 頂部：判定文字、信賴度、傾き 可讀
- [ ] 深色區塊：標籤/字幕不消失
- [ ] DecisionScale：三段標籤不擠爆、marker 清楚
- [ ] Desktop：字級/行高正常，卡片間距一致
