# Question Bank Branching Table

## A. Branching Matrix

### Merch
#### mode=short
- itemKind=goods: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_regret_impulse -> q_impulse_axis_short
- itemKind=blind_draw: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_regret_impulse -> q_impulse_axis_short
- itemKind=ticket: q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_regret_impulse -> q_impulse_axis_short
- itemKind=preorder: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_regret_impulse -> q_impulse_axis_short
- itemKind=used: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_regret_impulse -> q_impulse_axis_short

#### mode=medium
- itemKind=goods: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan
- itemKind=blind_draw: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan
- itemKind=ticket: q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan
- itemKind=preorder: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan
- itemKind=used: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan

#### mode=long
- itemKind=goods: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan -> q_addon_common_info -> q_addon_common_priority -> q_addon_goods_compare -> q_addon_goods_portability
- itemKind=blind_draw: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan -> q_addon_common_info -> q_addon_common_priority -> q_addon_blind_draw_cap -> q_addon_blind_draw_exit
- itemKind=ticket: q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan -> q_addon_common_info -> q_addon_common_priority -> q_addon_ticket_schedule -> q_addon_ticket_resale_rule
- itemKind=preorder: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan -> q_addon_common_info -> q_addon_common_priority -> q_addon_preorder_timeline -> q_addon_preorder_restock
- itemKind=used: q_storage_fit -> q_desire -> q_budget_pain -> q_urgency -> q_rarity_restock -> q_goal -> q_motives_multi -> q_hot_cold -> q_regret_impulse -> q_impulse_axis_short -> q_price_feel -> q_storage_space -> q_alternative_plan -> q_addon_common_info -> q_addon_common_priority -> q_addon_used_condition -> q_addon_used_price_gap

### Game Billing
- mode=short: gb_q1_need -> gb_q2_type -> gb_q3_budget -> gb_q4_use -> gb_q5_now
- mode=medium: gb_q1_need -> gb_q2_type -> gb_q3_budget -> gb_q4_use -> gb_q5_now -> gb_q6_repeat -> gb_q7_alt -> gb_q8_wait -> gb_q9_info -> gb_q10_value
- mode=long: gb_q1_need -> gb_q2_type -> gb_q3_budget -> gb_q4_use -> gb_q5_now -> gb_q6_repeat -> gb_q7_alt -> gb_q8_wait -> gb_q9_info -> gb_q10_value
- dynamic branch: q10 = gb_q10_pity if gb_q2_type == gacha, else gb_q10_value

## B. Question Catalog Detail

### gb_q1_need
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 今回の課金、目的ははっきりしてる？
- text_kawaii: 今回の課金目的、はっきりしてる？
- text_oshi: 今回の課金目的、明確？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| clear | はっきりしている | はっきりしている | はっきりしている | true |  |  |
| some | なんとなくある | なんとなくある | なんとなくある | true |  |  |
| unclear | まだぼんやり | まだぼんやり | まだぼんやり | true |  |  |

</details>

### gb_q10_pity
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 天井（交換）までの距離は？
- text_kawaii: 天井までの距離は？
- text_oshi: 天井距離はどの位置？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| far | 遠い/不明 | 遠い/不明 | 遠い/不明 | true |  |  |
| mid | 中間くらい | 中間くらい | 中間くらい | true |  |  |
| near | 近い | 近い | 近い | true |  |  |

</details>

### gb_q10_value
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 内容と価格のバランスはどう感じる？
- text_kawaii: 内容の納得感は？
- text_oshi: 施策内容の納得感は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| good | 納得感がある | 納得感がある | 納得感がある | true |  |  |
| low | やや低い | やや低い | やや低い | true |  |  |
| normal | 普通 | 普通 | 普通 | true |  |  |

</details>

### gb_q2_type
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 課金タイプはどれ？
- text_kawaii: どのタイプに課金する？
- text_oshi: どの施策を回す？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| gacha | ガチャ | ガチャ | ガチャ案件 | false |  |  |
| other | その他 | その他 | その他 | true |  |  |
| pack | お得パック | お得パック | パック案件 | false |  |  |
| pass | 月パス/継続系 | 月パス系 | 月パス系 | false |  |  |
| skin | スキン/見た目 | スキン | スキン系 | false |  |  |

</details>

### gb_q3_budget
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: この金額、今月の範囲で無理なく払える？
- text_kawaii: お財布への負担はどう？
- text_oshi: 資金圧はどの程度？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| easy | 無理なく払える | らくらく払える | 余裕あり | false |  |  |
| hard | ちょっと重い | ちょっと重い | 圧が高い | false |  |  |
| ok | 調整すれば払える | 調整すればOK | 調整で対応 | false |  |  |

</details>

### gb_q4_use
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 買ったあと、使うイメージはある？
- text_kawaii: 使う見込みはどれくらい？
- text_oshi: 活用見込みはある？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| high | かなりある | かなりある | かなりある | true |  |  |
| low | あまりない | あまりない | あまりない | true |  |  |
| some | 少しある | 少しある | 少しある | true |  |  |

</details>

### gb_q5_now
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 今の気分はどれに近い？
- text_kawaii: いまのテンションは？
- text_oshi: いまの熱量は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| calm | 落ち着いている | 落ち着いてる | 平常 | false |  |  |
| rush | 急いで決めたい | 今すぐ決めたい | 即断モード | false |  |  |
| up | 少し高まっている | ちょい上がり | 高まり中 | false |  |  |

</details>

### gb_q6_repeat
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 似た課金をして、満足したことが多い？
- text_kawaii: 過去の課金、満足できた？
- text_oshi: 過去課金の満足度は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| half | 半々 | 半々 | 半々 | true |  |  |
| often | 満足したことが多い | 満足したことが多い | 満足したことが多い | true |  |  |
| rare | 満足しないことも多い | 満足しないことも多い | 満足しないことも多い | true |  |  |

</details>

### gb_q7_alt
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 同じ予算で他に優先したいものはある？
- text_kawaii: 他の手段はある？
- text_oshi: 代替手段はある？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| none | 特にない | 特にない | 特にない | true |  |  |
| some | 少しある | 少しある | 少しある | true |  |  |
| yes | ある | ある | ある | true |  |  |

</details>

### gb_q8_wait
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 24時間待っても気持ちは変わらなさそう？
- text_kawaii: 少し待つと気持ち変わりそう？
- text_oshi: 待機すると温度は変わる？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| drop | 下がりそう | 下がりそう | 下がりそう | true |  |  |
| maybe | 少し変わるかも | 少し変わるかも | 少し変わるかも | true |  |  |
| same | 変わらなさそう | 変わらなさそう | 変わらなさそう | true |  |  |

</details>

### gb_q9_info
- useCase: game_billing
- type: single
- scoring relevance: contributes_to_buy_stop_mapping
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 必要な情報（確率/内容/期限）は確認できた？
- text_kawaii: 必要な情報、確認できた？
- text_oshi: 必要情報の確認状況は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| done | 確認できた | 確認できた | 確認できた | true |  |  |
| none | まだ | まだ | まだ | true |  |  |
| part | 一部だけ | 一部だけ | 一部だけ | true |  |  |

</details>

### q_addon_blind_draw_cap
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: くじ・ブラインドの回数上限は決めた？
- text_kawaii: 回す回数の上限きめた？
- text_oshi: 回数上限（天井管理）は決めた？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| fixed | 決めた | 決めた | 決めた | true |  |  |
| none | まだ決めていない | まだ決めていない | まだ決めていない | true |  |  |
| rough | だいたい決めた | だいたい決めた | だいたい決めた | true |  |  |

</details>

### q_addon_blind_draw_exit
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 撤退ライン（やめどき）はある？
- text_kawaii: やめどきライン、ある？
- text_oshi: 撤退ラインは設定済み？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| clear | 明確にある | 明確にある | 明確にある | true |  |  |
| none | 特にない | 特にない | 特にない | true |  |  |
| some | なんとなくある | なんとなくある | なんとなくある | true |  |  |

</details>

### q_addon_common_info
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 必要情報は揃っている？
- text_kawaii: 必要な情報、そろってる？
- text_oshi: 判断材料は十分に揃ってる？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| enough | 十分そろっている | 十分そろっている | 十分そろっている | true |  |  |
| lack | 不足が多い | 不足が多い | 不足が多い | true |  |  |
| partial | 一部足りない | 一部足りない | 一部足りない | true |  |  |

</details>

### q_addon_common_priority
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 今月の推し活の中で優先度は？
- text_kawaii: 今月の優先度は高い？
- text_oshi: 今月案件の中で優先度は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| high | 高い | 高い | 高い | true |  |  |
| low | 低め | 低め | 低め | true |  |  |
| mid | 中くらい | 中くらい | 中くらい | true |  |  |

</details>

### q_addon_goods_compare
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 同系統アイテムとの比較はできた？
- text_kawaii: 似てるグッズと比べられた？
- text_oshi: 類似案件との比較は済んだ？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| done | 比較済み | 比較済み | 比較済み | true |  |  |
| none | まだ比較していない | まだ比較していない | まだ比較していない | true |  |  |
| partial | 一部だけ比較した | 一部だけ比較した | 一部だけ比較した | true |  |  |

</details>

### q_addon_goods_portability
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 持ち歩き・使いどころの想定は？
- text_kawaii: 使う場面、イメージできる？
- text_oshi: 運用シーンを想定できてる？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| often | よく使う想定 | よく使う想定 | よく使う想定 | true |  |  |
| rare | ほぼ観賞用 | ほぼ観賞用 | ほぼ観賞用 | true |  |  |
| sometimes | 時々使う想定 | 時々使う想定 | 時々使う想定 | true |  |  |

</details>

### q_addon_preorder_restock
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 受注再開・再販の可能性を確認した？
- text_kawaii: 再販の可能性しらべた？
- text_oshi: 再販導線の確認状況は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| checked | 確認した | 確認した | 確認した | true |  |  |
| heard | 噂レベルで知っている | 噂レベルで知っている | 噂レベルで知っている | true |  |  |
| unknown | わからない | わからない | わからない | true |  |  |

</details>

### q_addon_preorder_timeline
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 発売・到着タイミングを許容できる？
- text_kawaii: 到着まで待てそう？
- text_oshi: 到着待機を許容できる？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| hard | 待つのが厳しい | 待つのが厳しい | 待つのが厳しい | true |  |  |
| maybe | 状況次第 | 状況次第 | 状況次第 | true |  |  |
| ok | 待てる | 待てる | 待てる | true |  |  |

</details>

### q_addon_ticket_resale_rule
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: キャンセル・譲渡ルールを確認した？
- text_kawaii: キャンセル・譲渡ルール見た？
- text_oshi: キャンセル・譲渡規約は確認済み？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| checked | 確認済み | 確認済み | 確認済み | true |  |  |
| not_yet | 未確認 | 未確認 | 未確認 | true |  |  |
| partly | 一部だけ確認 | 一部だけ確認 | 一部だけ確認 | true |  |  |

</details>

### q_addon_ticket_schedule
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 日程・移動・体調まで見通せている？
- text_kawaii: 日程や移動、だいじょうぶ？
- text_oshi: 日程・移動の実行性は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| ready | 問題なし | 問題なし | 問題なし | true |  |  |
| risk | 不確定が多い | 不確定が多い | 不確定が多い | true |  |  |
| some_risk | 少し不安あり | 少し不安あり | 少し不安あり | true |  |  |

</details>

### q_addon_used_condition
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 中古の状態リスクを許容できる？
- text_kawaii: 中古の状態、受け入れられる？
- text_oshi: 中古状態リスクは許容範囲？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| careful | 条件次第 | 条件次第 | 条件次第 | true |  |  |
| hard | 不安が大きい | 不安が大きい | 不安が大きい | true |  |  |
| ok | 許容できる | 許容できる | 許容できる | true |  |  |

</details>

### q_addon_used_price_gap
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 新品との差額は納得できる？
- text_kawaii: 新品との差額、納得できる？
- text_oshi: 新品差額の妥当性は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| small | 差額が小さい | 差額が小さい | 差額が小さい | true |  |  |
| unknown | 比較できていない | 比較できていない | 比較できていない | true |  |  |
| worth | 納得できる | 納得できる | 納得できる | true |  |  |

</details>

### q_alternative_plan
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 見送る場合の代替案はある？
- text_kawaii: 見送るなら別プランある？
- text_oshi: 見送り時の代替案は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| clear | ある（他の満たし方がある） | あるよ | 明確にある | false |  |  |
| maybe | たぶんある | たぶんある | 候補あり | false |  |  |
| none | 特にない | ないかも | 特にない | false |  |  |

</details>

### q_budget_pain
- useCase: merch
- type: single
- scoring relevance: delta
- mapTo: 
- tags: budget_force, budget_hard, budget_ok, budget_some
- unknown tags hints: 
- text_standard: この出費、あとで痛い？
- text_kawaii: このお買い物、あとでしんどくならない？
- text_oshi: この出費、オタ活資金にダメージある？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| force | 無理して払う（危険） | ムリして払うかも | 無理課金コース | false | budget_force | affordability:15;impulse:70;regretRisk:80 |
| hard | 生活に影響する | 生活にひびきそう | 今月しんどい | false | budget_hard | affordability:35;regretRisk:65 |
| ok | 全然平気 | ぜんぜん平気 | ノーダメ | false | budget_ok | affordability:85;regretRisk:35 |
| some | ちょい痛い | ちょっとだけ痛い | ちょいダメージ | false | budget_some | affordability:60;regretRisk:45 |

</details>

### q_desire
- useCase: merch
- type: scale
- scoring relevance: mapTo
- mapTo: desire
- tags: 
- unknown tags hints: 
- text_standard: これは「推し度（欲しさ）」どれくらい？
- text_kawaii: これ、どれくらいトキメク？
- text_oshi: この案件、推し熱どのくらい？
- sameAsStandard: false
- scaleLabels: left=気になるだけ, right=本命
<details>
<summary>Options</summary>

(none)

</details>

### q_goal
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: goal_fun, goal_set, goal_single
- unknown tags hints: 
- text_standard: 今回の目的は？
- text_kawaii: 今回いちばん叶えたいことは？
- text_oshi: 今回の回収目的は？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| fun | 引く体験（くじ/ガチャ感）を楽しみたい | 引く体験も楽しみたい | 体験重視 | false | goal_fun |  |
| set | セットで揃えたい | セットでそろえたい | セット回収 | false | goal_set |  |
| single | 推し（特定の1つ）だけ欲しい | 推し1点狙い | 単推し回収 | false | goal_single |  |

</details>

### q_hot_cold
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: cold, hot, normal_popularity, unknown_popularity
- unknown tags hints: unknown_popularity
- text_standard: 欲しい枠（推し）は人気枠？（高レート/低レート）
- text_kawaii: 推し枠って人気どのくらい？
- text_oshi: 推し枠レート、どの温度感？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| cold | 落ち着いてる（低レートになりやすい） | 落ち着いてる（低レートになりやすい） | 落ち着いてる（低レートになりやすい） | true | cold |  |
| hot | 人気（高騰/プレ値になりやすい） | 人気（高騰/プレ値になりやすい） | 人気（高騰/プレ値になりやすい） | true | hot |  |
| normal | 普通 | 普通 | 普通 | true | normal_popularity |  |
| unknown | わからない | わからない | わからない | true | unknown_popularity |  |

</details>

### q_impulse_axis_short
- useCase: merch
- type: scale
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 今の欲しさ、どっち寄り？
- text_kawaii: 今の欲しさ、どっちより？
- text_oshi: いまの推し熱、どっち寄り？
- sameAsStandard: false
- scaleLabels: left=未来（飾る/使う）寄り, right=買う瞬間の快感寄り
<details>
<summary>Options</summary>

(none)

</details>

### q_long_note
- useCase: merch
- type: text
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: AIに相談したいポイントを一言で書いてください
- text_kawaii: AIに相談したいことをメモしよう
- text_oshi: AI相談用メモを残す
- sameAsStandard: false
<details>
<summary>Options</summary>

(none)

</details>

### q_motives_multi
- useCase: merch
- type: multi
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 今「買いたい理由」ってどれ？（複数選択OK）
- text_kawaii: 買いたい気持ち、どれに近い？
- text_oshi: 回収動機、どれが強い？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| bonus | 特典が本体（特典目的） | 特典が本体（特典目的） | 特典が本体（特典目的） | true |  |  |
| fomo | 限定・締切が怖い（取り逃し不安） | 限定・締切が怖い（取り逃し不安） | 限定・締切が怖い（取り逃し不安） | true |  |  |
| rush | 買えた瞬間の高揚感がほしい（脳汁） | 買えた瞬間の高揚感がほしい（脳汁） | 買えた瞬間の高揚感がほしい（脳汁） | true |  |  |
| support | 推しを応援したい（気持ち） | 推しを応援したい（気持ち） | 推しを応援したい（気持ち） | true |  |  |
| trend | みんな買ってる／流行ってる（雰囲気） | みんな買ってる／流行ってる（雰囲気） | みんな買ってる／流行ってる（雰囲気） | true |  |  |
| use | 飾りたい／使いたい（未来がある） | 飾りたい／使いたい（未来がある） | 飾りたい／使いたい（未来がある） | true |  |  |
| vague | なんとなく（説明できない） | なんとなく（説明できない） | なんとなく（説明できない） | true |  |  |

</details>

### q_price_feel
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 価格の納得感は？
- text_kawaii: お値段の納得感はどう？
- text_oshi: 価格感、相場的にどう？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| good | 納得できる | いい感じ | 納得 | false |  |  |
| high | 高めに感じる | ちょっと高め | やや高 | false |  |  |
| normal | 普通 | ふつう | 標準 | false |  |  |
| unknown | まだ比較できていない | まだ比べてない | 未比較 | false |  |  |

</details>

### q_rarity_restock
- useCase: merch
- type: single
- scoring relevance: delta
- mapTo: 
- tags: restock_high, restock_low, restock_mid, unknown_restock
- unknown tags hints: unknown_restock
- text_standard: 再販（受注/再入荷）しそう？
- text_kawaii: また会えそう？
- text_oshi: 再販導線、ありそう？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| likely | しそう（高い） | しそう（高い） | しそう（高い） | true | restock_high | rarity:35;restockChance:80 |
| maybe | たぶん（中） | たぶん（中） | たぶん（中） | true | restock_mid | rarity:50;restockChance:55 |
| unknown | わからない | わからない | わからない | true | unknown_restock | rarity:50;restockChance:50 |
| unlikely | しなさそう（低い） | しなさそう（低い） | しなさそう（低い） | true | restock_low | rarity:75;restockChance:25 |

</details>

### q_regret_impulse
- useCase: merch
- type: single
- scoring relevance: delta
- mapTo: 
- tags: state_calm, state_excited, state_fomo, state_tired
- unknown tags hints: 
- text_standard: いまの自分、どれに近い？（衝動/後悔リスク）
- text_kawaii: いまの気分、どれが近い？
- text_oshi: 現在のメンタル状態、どれに近い？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| calm | 冷静（後悔しにくい） | 冷静（後悔しにくい） | 冷静（後悔しにくい） | true | state_calm | impulse:25;regretRisk:35 |
| excited | テンション高め（勢い） | テンション高め（勢い） | テンション高め（勢い） | true | state_excited | impulse:65;regretRisk:55 |
| fomo | 焦ってる（今しかない圧） | 焦ってる（今しかない圧） | 焦ってる（今しかない圧） | true | state_fomo | impulse:75;regretRisk:65;urgency:70 |
| tired | 疲れてる/メンタル弱り気味 | 疲れてる/メンタル弱り気味 | 疲れてる/メンタル弱り気味 | true | state_tired | impulse:70;regretRisk:70 |

</details>

### q_storage_fit
- useCase: merch
- type: single
- scoring relevance: storage_gate
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 置き場所、決まってる？
- text_kawaii: おうちに置くとこ、ある？
- text_oshi: 置き場ある？（棚/ケース確保済み？）
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| CONFIRMED | ある（もう決まってる） | あるよ！（もう決めた） | 確保済み（勝ち） | false |  |  |
| NONE | 今はない | いまはない… | 今はムリ（圧迫） | false |  |  |
| PROBABLE | たぶんある（片付ければ） | たぶんある…！（片付ければ） | 片付ければいける | false |  |  |
| UNKNOWN | わからない（先に確認する） | わかんない（先に見てくる） | 未確認（先に確認） | false |  |  |

</details>

### q_storage_space
- useCase: merch
- type: single
- scoring relevance: none
- mapTo: 
- tags: 
- unknown tags hints: 
- text_standard: 置き場所・保管の見通しは？
- text_kawaii: 置き場所だいじょうぶ？
- text_oshi: 保管キャパは確保できる？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| adjust | 少し工夫が必要 | 少し工夫する | 調整が必要 | false |  |  |
| enough | 問題ない | 問題ない | 問題なし | false |  |  |
| tight | かなり厳しい | かなりきびしい | 厳しい | false |  |  |

</details>

### q_urgency
- useCase: merch
- type: single
- scoring relevance: delta
- mapTo: 
- tags: unknown_urgency, urgency_high, urgency_low, urgency_mid
- unknown tags hints: unknown_urgency
- text_standard: 今買わないとどうなる？（急ぎ度）
- text_kawaii: 今買わないとどうなるかな？
- text_oshi: 今回収しないと取り逃しそう？
- sameAsStandard: false
<details>
<summary>Options</summary>

| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta |
|---|---|---|---|---|---|---|
| last | ほぼラスト/今日が期限 | ほぼラスト/今日まで | 実質ラストチャンス | false | urgency_high | rarity:70;restockChance:25;urgency:85 |
| low_stock | 在庫が減ってる/締切が近い | 在庫へってる/締切近い | 残数少なめ/締切近い | false | urgency_mid | rarity:55;restockChance:45;urgency:55 |
| not_urgent | いつでも買えそう | あとでも買えそう | まだ追える | false | urgency_low | rarity:30;restockChance:70;urgency:20 |
| unknown | わからない | まだわからない | 情報不足 | false | unknown_urgency | urgency:50 |

</details>

