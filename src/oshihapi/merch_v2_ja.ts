import type { QuestionSet } from './model';

/**
 * オシハピ｜推し買い診断（merch_v2_ja）
 * - 通常：7問
 * - 急ぎ：urgentCore=true を中心に 4〜6問で完走
 *
 * Note: ここでは「チケット」も itemKind= ticket として同枠で扱う（周辺グッズの一種）。
 */
export const merch_v2_ja: QuestionSet = {
  id: 'merch_v2_ja',
  locale: 'ja',
  category: 'merch',
  version: 2,
  questions: [
    {
      id: 'q_desire',
      type: 'scale',
      title: 'これは「推し度（欲しさ）」どれくらい？',
      description: '0=気になるだけ / 5=本命レベル',
      required: true,
      urgentCore: true,
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 3,
      mapTo: 'desire',
      leftLabel: '気になるだけ',
      rightLabel: '本命',
    },
    {
      id: 'q_budget_pain',
      type: 'single',
      title: 'この出費、あとで痛い？',
      required: true,
      urgentCore: true,
      options: [
        { id: 'ok', label: '全然平気', tags: ['budget_ok'], delta: { affordability: 85, regretRisk: 35 } },
        { id: 'some', label: 'ちょい痛い', tags: ['budget_some'], delta: { affordability: 60, regretRisk: 45 } },
        { id: 'hard', label: '生活に影響する', tags: ['budget_hard'], delta: { affordability: 35, regretRisk: 65 } },
        { id: 'force', label: '無理して払う（危険）', tags: ['budget_force'], delta: { affordability: 15, regretRisk: 80, impulse: 70 } },
      ],
    },
    {
      id: 'q_urgency',
      type: 'single',
      title: '今買わないとどうなる？（急ぎ度）',
      required: true,
      urgentCore: true,
      options: [
        { id: 'not_urgent', label: 'いつでも買えそう', tags: ['urgency_low'], delta: { urgency: 20, rarity: 30, restockChance: 70 } },
        { id: 'low_stock', label: '在庫が減ってる/締切が近い', tags: ['urgency_mid'], delta: { urgency: 55, rarity: 55, restockChance: 45 } },
        { id: 'last', label: 'ほぼラスト/今日が期限', tags: ['urgency_high'], delta: { urgency: 85, rarity: 70, restockChance: 25 } },
        { id: 'unknown', label: 'わからない', tags: ['unknown_urgency'], delta: { urgency: 50 } },
      ],
    },
    {
      id: 'q_rarity_restock',
      type: 'single',
      title: '再販（受注/再入荷）しそう？',
      description: '再販が高いほど「今買う必要」は下がりやすい',
      required: true,
      urgentCore: true,
      options: [
        { id: 'likely', label: 'しそう（高い）', tags: ['restock_high'], delta: { restockChance: 80, rarity: 35 } },
        { id: 'maybe', label: 'たぶん（中）', tags: ['restock_mid'], delta: { restockChance: 55, rarity: 50 } },
        { id: 'unlikely', label: 'しなさそう（低い）', tags: ['restock_low'], delta: { restockChance: 25, rarity: 75 } },
        { id: 'unknown', label: 'わからない', tags: ['unknown_restock'], delta: { restockChance: 50, rarity: 50 } },
      ],
    },
    {
      id: 'q_goal',
      type: 'single',
      title: '今回の目的は？',
      description: '買い方提案（中古/BOX/くじ上限）に影響する',
      required: true,
      urgentCore: false,
      options: [
        { id: 'single', label: '推し（特定の1つ）だけ欲しい', tags: ['goal_single'] },
        { id: 'set', label: 'セットで揃えたい', tags: ['goal_set'] },
        { id: 'fun', label: '引く体験（くじ/ガチャ感）を楽しみたい', tags: ['goal_fun'] },
      ],
    },
    {
      id: 'q_hot_cold',
      type: 'single',
      title: '欲しい枠（推し）は人気枠？（燙角/冷角）',
      required: true,
      urgentCore: false,
      options: [
        { id: 'hot', label: '人気（高騰しがち）', tags: ['hot'] },
        { id: 'normal', label: '普通', tags: ['normal_popularity'] },
        { id: 'cold', label: '冷め（安く買えることが多い）', tags: ['cold'] },
        { id: 'unknown', label: 'わからない', tags: ['unknown_popularity'] },
      ],
    },
    {
      id: 'q_regret_impulse',
      type: 'single',
      title: 'いまの自分、どれに近い？（衝動/後悔リスク）',
      required: true,
      urgentCore: true,
      options: [
        { id: 'calm', label: '冷静（後悔しにくい）', tags: ['state_calm'], delta: { impulse: 25, regretRisk: 35 } },
        { id: 'excited', label: 'テンション高め（勢い）', tags: ['state_excited'], delta: { impulse: 65, regretRisk: 55 } },
        { id: 'tired', label: '疲れてる/メンタル弱り気味', tags: ['state_tired'], delta: { impulse: 70, regretRisk: 70 } },
        { id: 'fomo', label: '焦ってる（今しかない圧）', tags: ['state_fomo'], delta: { impulse: 75, regretRisk: 65, urgency: 70 } },
      ],
    },
  ],
};
