# 推し活トーン（日本向け）コピー差し替えパック

このパックは「モード選びガイド」の文言を、より日本の推し活文脈に寄せたバージョンです。  
※ロジック（recommendMode）はそのままでも使えます。UI側で import を差し替えるだけでOK。

---

## 1) 追加されるファイル

- `src/oshihapi/modeGuide/modeCopy_ja_oshikatsu.ts`  
  モードカード（短/中/長）の見出し・サブ・一言

- `src/oshihapi/modeGuide/situationChips_ja_oshikatsu.ts`  
  「状況から選ぶ」チップ（ちょいラフ）

- `src/oshihapi/modeGuide/scenarios_ja_oshikatsu.ts`  
  「例から選ぶ」シナリオカード（推し活口吻）

---

## 2) 使い方（UI側で import 差し替え）

### Home（app/page.tsx）での差し替え例

```ts
// before
import { SITUATION_CHIPS_JA } from "@/src/oshihapi/modeGuide/situationChips_ja";
import { SCENARIO_CARDS_JA } from "@/src/oshihapi/modeGuide/scenarios_ja";

// after（推し活トーン）
import { SITUATION_CHIPS_JA_OSHIKATSU } from "@/src/oshihapi/modeGuide/situationChips_ja_oshikatsu";
import { SCENARIO_CARDS_JA_OSHIKATSU } from "@/src/oshihapi/modeGuide/scenarios_ja_oshikatsu";
```

モードカード文言も切り替えるなら：

```ts
import { MODE_COPY_JA_OSHIKATSU, MODE_CONFLICT_TIP_JA_OSHIKATSU } from "@/src/oshihapi/modeGuide/modeCopy_ja_oshikatsu";
```

---

## 3) トーンルール（忘れがちなのでメモ）

- 否定しない（「焦ってる」＝自然）
- 線引きに落とす（上限 / 条件 / 24h保留）
- 「未来の自分」視点を使う
- “正しい”ではなく“安全運転”の比喩で

