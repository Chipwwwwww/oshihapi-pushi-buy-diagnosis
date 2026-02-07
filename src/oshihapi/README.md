# TS modules usage (copy into your project)

Suggested placement:
- src/engine/*  (engine.ts, engineConfig.ts, reasonRules.ts, merchMethod.ts, supportData.ts)
- src/data/merch_v2_ja.ts
- src/types/model.ts

Minimal usage:
```ts
import { merch_v2_ja } from './merch_v2_ja';
import { evaluate } from './engine';

const output = evaluate({
  questionSet: merch_v2_ja,
  meta: { itemName: 'アクスタ', priceYen: 2800, itemKind: 'goods' },
  answers: {
    q_desire: 5,
    q_budget_pain: 'some',
    q_urgency: 'last',
    q_rarity_restock: 'unknown',
    q_goal: 'single',
    q_hot_cold: 'hot',
    q_regret_impulse: 'fomo',
  }
});
```
