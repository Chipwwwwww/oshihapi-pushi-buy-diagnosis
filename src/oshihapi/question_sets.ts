import type { GoodsSubtype, ItemKind } from "@/src/oshihapi/model";
import { shouldAskStorage as baseShouldAskStorage } from "@/src/oshihapi/storageGate";

export const QUICK_QUESTION_IDS = [
  "q_storage_fit",
  "q_desire",
  "q_budget_pain",
  "q_urgency",
  "q_rarity_restock",
  "q_regret_impulse",
  "q_impulse_axis_short",
] as const;

export const CORE_12_QUESTION_IDS = [
  "q_storage_fit",
  "q_desire",
  "q_budget_pain",
  "q_urgency",
  "q_rarity_restock",
  "q_goal",
  "q_motives_multi",
  "q_hot_cold",
  "q_regret_impulse",
  "q_impulse_axis_short",
  "q_price_feel",
  "q_storage_space",
  "q_alternative_plan",
] as const;

export const ADDON_BY_ITEM_KIND: Partial<Record<ItemKind, readonly string[]>> = {
  goods: ["q_addon_common_info", "q_addon_common_priority", "q_addon_goods_compare", "q_addon_goods_portability"],
  blind_draw: ["q_addon_common_info", "q_addon_common_priority", "q_addon_blind_draw_cap", "q_addon_blind_draw_exit"],
  ticket: ["q_addon_common_info", "q_addon_common_priority", "q_addon_ticket_schedule", "q_addon_ticket_resale_rule"],
  preorder: ["q_addon_common_info", "q_addon_common_priority", "q_addon_preorder_timeline", "q_addon_preorder_restock"],
  used: ["q_addon_common_info", "q_addon_common_priority", "q_addon_used_condition", "q_addon_used_price_gap"],
};

export function shouldAskStorage(itemKind?: ItemKind, goodsSubtype?: GoodsSubtype): boolean {
  return baseShouldAskStorage(itemKind, goodsSubtype);
}

export const GAME_BILLING_SHORT_QUESTION_IDS = [
  "gb_q1_need",
  "gb_q2_type",
  "gb_q3_budget",
  "gb_q4_use",
  "gb_q5_now",
] as const;

export const GAME_BILLING_FULL_BASE_QUESTION_IDS = [
  ...GAME_BILLING_SHORT_QUESTION_IDS,
  "gb_q6_repeat",
  "gb_q7_alt",
  "gb_q8_wait",
  "gb_q9_info",
] as const;

export const GAME_BILLING_Q10_SPLIT_RULE = {
  conditionQuestionId: "gb_q2_type",
  whenOptionId: "gacha",
  thenQuestionId: "gb_q10_pity",
  elseQuestionId: "gb_q10_value",
} as const;

export function resolveGameBillingQ10QuestionId(typeAnswer: unknown): string {
  return typeAnswer === GAME_BILLING_Q10_SPLIT_RULE.whenOptionId
    ? GAME_BILLING_Q10_SPLIT_RULE.thenQuestionId
    : GAME_BILLING_Q10_SPLIT_RULE.elseQuestionId;
}
