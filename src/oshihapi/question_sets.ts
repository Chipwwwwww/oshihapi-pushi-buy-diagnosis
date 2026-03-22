import type { GoodsClass, GoodsSubtype, ItemKind } from "@/src/oshihapi/model";
import { shouldAskStorage as baseShouldAskStorage } from "@/src/oshihapi/storageGate";

export const QUICK_QUESTION_IDS = [
  "q_storage_fit",
  "q_desire",
  "q_budget_pain",
  "q_urgency",
  "q_rarity_restock",
  "q_hot_cold",
  "q_regret_impulse",
  "q_impulse_axis_short",
] as const;

export const CORE_12_QUESTION_IDS = [
  "q_storage_fit",
  "q_storage_space",
  "q_desire",
  "q_goal",
  "q_urgency",
  "q_rarity_restock",
  "q_budget_pain",
  "q_price_feel",
  "q_motives_multi",
  "q_hot_cold",
  "q_regret_impulse",
  "q_impulse_axis_short",
  "q_alternative_plan",
] as const;

export const ADDON_BY_ITEM_KIND: Partial<Record<ItemKind, readonly string[]>> = {
  goods: ["q_addon_goods_event_limit_context", "q_addon_common_info", "q_addon_common_priority", "q_addon_goods_compare", "q_addon_goods_portability"],
  blind_draw: [
    "q_addon_blind_draw_cap",
    "q_addon_blind_draw_exit",
    "q_addon_blind_draw_duplicate_tolerance",
    "q_addon_blind_draw_trade_intent",
    "q_addon_blind_draw_exchange_friction",
    "q_addon_blind_draw_single_fallback",
    "q_addon_blind_draw_stop_budget",
    "q_addon_blind_draw_miss_pain",
  ],
  ticket: ["q_addon_common_info", "q_addon_common_priority", "q_addon_ticket_schedule", "q_addon_ticket_resale_rule", "q_addon_ticket_trip_load", "q_addon_ticket_next_chance"],
  preorder: ["q_addon_common_info", "q_addon_common_priority", "q_addon_preorder_timeline", "q_addon_preorder_decay", "q_addon_preorder_compare_loss"],
  used: [
    "q_addon_common_info",
    "q_addon_common_priority",
    "q_addon_used_condition",
    "q_addon_used_price_gap",
    "q_addon_used_defect_return",
    "q_addon_used_authenticity",
    "q_addon_used_seller_trust",
  ],
};

export function shouldAskStorage(itemKind?: ItemKind, goodsSubtype?: GoodsSubtype): boolean {
  return baseShouldAskStorage(itemKind, goodsSubtype);
}


export const MIXED_MEDIA_RANDOM_GOODS_QUESTION_IDS = [
  "q_addon_blind_draw_cap",
  "q_addon_blind_draw_exit",
  "q_addon_blind_draw_duplicate_tolerance",
  "q_addon_blind_draw_trade_intent",
  "q_addon_blind_draw_exchange_friction",
  "q_addon_blind_draw_single_fallback",
  "q_addon_blind_draw_stop_budget",
  "q_addon_blind_draw_miss_pain",
] as const;

export const MEDIA_P3B_QUESTION_IDS = [
  "q_addon_media_bonus_importance",
  "q_addon_media_multi_store_tolerance",
  "q_addon_media_split_order_burden",
] as const;

export const VOICE_MEDIA_ADDON_QUESTION_IDS = [
  "q_addon_voice_cast_check",
  "q_addon_voice_audio_bonus_value",
  "q_addon_voice_listen_intent",
] as const;

export const MEDIA_P3C_QUESTION_IDS = [
  "q_addon_media_single_vs_set_intent",
  "q_addon_media_completion_satisfaction",
  "q_addon_media_used_market_recovery",
  "q_addon_media_used_market_comfort",
  "q_addon_media_completion_pressure_type",
  "q_addon_media_set_reward_strength",
] as const;

export const MEDIA_CORE_QUESTION_IDS = [
  "q_addon_media_motive",
  "q_addon_media_support_scope",
  "q_addon_media_collection_budget",
  "q_addon_media_edition_intent",
  ...MEDIA_P3C_QUESTION_IDS,
  "q_addon_media_member_version",
  "q_addon_media_playback_space",
  "q_addon_media_limited_pressure",
  ...MEDIA_P3B_QUESTION_IDS,
  "q_addon_media_random_goods_intent",
] as const;

export const ADDON_BY_GOODS_CLASS: Record<GoodsClass, readonly string[]> = {
  small_collection: ["q_addon_goods_collection_goal", "q_addon_goods_trade_intent"],
  paper: ["q_addon_goods_paper_care", "q_addon_goods_paper_view_freq"],
  wearable: ["q_addon_goods_wear_freq", "q_addon_goods_wear_fit", "q_addon_goods_wear_scene"],
  display_large: ["q_addon_goods_display_space_plan", "q_addon_goods_display_move_risk"],
  tech: ["q_addon_goods_tech_compat", "q_addon_goods_tech_after_use"],
  media: [
    "q_addon_media_motive",
    "q_addon_media_support_scope",
    "q_addon_media_collection_budget",
    "q_addon_media_edition_intent",
    ...MEDIA_P3C_QUESTION_IDS,
    "q_addon_media_member_version",
    "q_addon_media_playback_space",
    "q_addon_media_limited_pressure",
    ...MEDIA_P3B_QUESTION_IDS,
    "q_addon_media_random_goods_intent",
  ],
  itabag_badge: ["q_addon_goods_itabag_target", "q_addon_goods_itabag_usage"],
};

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
