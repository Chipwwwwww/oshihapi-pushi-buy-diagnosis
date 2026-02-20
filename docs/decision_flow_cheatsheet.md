# Decision Flow Cheatsheet（速查）

| 模式 | 入口路由 | 主要分支變數 | 結果種類 | 判定關鍵 |
|---|---|---|---|---|
| short（diagnosisMode） | `/ -> /flow` | `itemKind`, `useCase` | BUY / THINK / SKIP | merch: holdBand 較窄（0.85倍），快速出判定 |
| medium（diagnosisMode） | `/ -> /confirm -> /flow` | `itemKind`, `decisiveness`, `styleMode` | BUY / THINK / SKIP | merch: core12 題，holdBand 基準（1.0倍） |
| long（diagnosisMode） | `/ -> /confirm -> /flow` | `itemKind`（決定 addon 題組） | BUY / THINK / SKIP | merch: core12+addon，holdBand 較寬（1.1倍） |
| game_billing（useCase） | `itemKind=game_billing` 後進 `/flow` | `mode`（5題/10題）, `gb_q2_type`（q10分支） | BUY / THINK / SKIP | `score=buy-stop`；`>=5 BUY`, `<=-4 SKIP` |
| styleMode=standard/kawaii/oshi | query `styleMode` 或 localStorage | 僅呈現層 | 不改結果種類 | presentation-only，不進入核心 score |

## 一眼判斷規則

- merch 引擎：
  - 8 維分數（0~100）-> normalize -> 加權和 `scoreSigned`
  - `unknown_*` tags 會壓縮分數幅度
  - 衝動旗標（rush 或 axis>=4）會額外負向 nudge
  - 最終用 `holdBand` 判定 BUY/THINK/SKIP
  - storage gate（非 ticket/game_billing）可把 BUY 降為 THINK
- game billing 引擎：
  - buyScore-stopScore 的簡單分差規則
  - FlowClient 會包裝成統一 DecisionOutput（confidence固定70）

