import type {
  AnswerValue,
  ActionItem,
  Decision,
  DecisionOutput,
  Decisiveness,
  EngineConfig,
  HoldSubtype,
  InputMeta,
  ItemKind,
  MediaEditionPlan,
  MediaEditionPlannerPath,
  Mode,
  RandomGoodsPlan,
  RandomGoodsPlannerPath,
  VenueLimitedGoodsPlan,
  VenueLimitedPlannerPath,
  QuestionSet,
  ReasonItem,
  ScoreDimension,
  UseCase,
} from './model';
import { engineConfig as defaultConfig, normalize01ToSigned, clamp } from './engineConfig';
import { pickReasons, pickActions, buildShareText, getStorageGuidance } from './reasonRules';
import { decideMerchMethod } from './merchMethod';
import { buildPresentation } from './decisionPresentation';
import { computeResultBandTrace } from './bandNarrowing';
import { shouldAskStorage } from './storageGate';
import { resolveScenarioKey } from './scenarioCoverage';
import { resolveCanonicalVerdict, toConfidenceLevel, toVerdictStrength } from './verdictModel';
import { buildUsedExitPlan } from './usedExitPlan';
import { getVoiceMediaSignals } from './voiceMedia';

type EvaluateInput = {
  config?: EngineConfig;
  questionSet: QuestionSet;
  meta: InputMeta;
  answers: Record<string, AnswerValue>;
  mode?: Mode;
  decisiveness?: Decisiveness;
  useCase?: UseCase;
};

type FactorBuckets = {
  desireAttachment: number;
  urgencyOpportunity: number;
  budgetPressure: number;
  readinessLogistics: number;
  uncertaintyUnknowns: number;
  impulseVolatility: number;
  itemKindRisk: number;
};

const decisivenessMultiplierMap: Record<Decisiveness, number> = {
  careful: 1.1,
  standard: 1,
  quick: 0.9,
};

const modeMultiplierMap: Record<Mode, number> = {
  short: 0.95,
  medium: 1,
  long: 1.05,
};

function initScores(): Record<ScoreDimension, number> {
  return {
    desire: 50,
    affordability: 50,
    urgency: 50,
    rarity: 50,
    restockChance: 50,
    regretRisk: 50,
    impulse: 50,
    opportunityCost: 50,
  };
}

function mergeScore(base: number, add?: number): number {
  if (add == null || Number.isNaN(add)) return base;
  return clamp(0, 100, Math.round((base + add) / 2));
}

function applyMotives(scores: Record<ScoreDimension, number>, motives: string[], tags: string[]) {
  const motiveAdjustments: Partial<Record<string, Partial<Record<ScoreDimension, number>>>> = {
    support: { impulse: 35, regretRisk: 45, desire: 70 },
    use: { desire: 70, regretRisk: 40 },
    trend: { restockChance: 35, impulse: 70 },
    vague: { restockChance: 40, impulse: 75, regretRisk: 65 },
    rush: { impulse: 80, regretRisk: 70 },
    fomo: { urgency: 75, impulse: 70, regretRisk: 60 },
    bonus: { urgency: 72, impulse: 68, regretRisk: 64 },
    complete: { desire: 68, impulse: 66, regretRisk: 62, opportunityCost: 64 },
    seiyuu_cast: { desire: 64, impulse: 70, regretRisk: 72 },
  };

  for (const motive of motives) {
    if (motive === 'trend' || motive === 'vague') tags.push('trend_flag');
    if (motive === 'seiyuu_cast') tags.push('actor_fan_primary');
    if (motive === 'bonus') tags.push('bonus_pressure_high');
    if (motive === 'complete') tags.push('collection_pressure');
    const delta = motiveAdjustments[motive];
    if (!delta) continue;
    for (const [dim, value] of Object.entries(delta)) {
      const key = dim as ScoreDimension;
      scores[key] = mergeScore(scores[key], value);
    }
  }
}

function selectWeights(config: EngineConfig, itemKind?: ItemKind) {
  const base = { ...config.decisionWeights };
  if (!itemKind || !config.decisionWeightProfiles?.[itemKind]) return base;
  return { ...base, ...config.decisionWeightProfiles[itemKind] };
}

function stdDev(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getTopFactors(scores: Record<ScoreDimension, number>, kind: 'positive' | 'negative', count = 3): string[] {
  const labels: Record<ScoreDimension, string> = {
    desire: '欲しい気持ち',
    affordability: '予算の余裕',
    urgency: '今必要か',
    rarity: '希少性',
    restockChance: '再販の見込み',
    regretRisk: '後悔リスク',
    impulse: '衝動性',
    opportunityCost: '機会コスト',
  };
  const entries = Object.entries(scores) as [ScoreDimension, number][];
  const sorted = entries
    .map(([dim, score]) => ({ dim, score, signed: normalize01ToSigned(score) }))
    .filter((entry) => (kind === 'positive' ? entry.signed > 0 : entry.signed < 0))
    .sort((a, b) => Math.abs(b.signed) - Math.abs(a.signed))
    .slice(0, count);
  return sorted.map((entry) => `${labels[entry.dim]} (${Math.round(entry.score)})`);
}

function getSingleAnswer(answers: Record<string, AnswerValue>, id: string): string | undefined {
  const value = answers[id];
  return typeof value === 'string' ? value : undefined;
}

function getSingleAnswerFromAliases(answers: Record<string, AnswerValue>, ids: string[]): string | undefined {
  for (const id of ids) {
    const value = getSingleAnswer(answers, id);
    if (value) return value;
  }
  return undefined;
}

function hasCompleteMotive(motives: string[]) {
  return motives.includes('complete');
}

function resolveRandomGoodsTargetStyle(answers: Record<string, AnswerValue>): RandomGoodsPlan['targetStyle'] {
  const goal = getSingleAnswer(answers, 'q_goal');
  if (goal === 'fun') return 'fun_casual';
  if (goal === 'set') return 'full_set';
  if (goal === 'single') return 'one_or_few';

  const exit = getSingleAnswer(answers, 'q_addon_blind_draw_exit');
  if (exit === 'complete') return 'full_set';
  if (exit === 'oshi_only') return 'one_or_few';
  if (exit === 'fun') return 'fun_casual';
  if (exit === 'mixed') return 'mixed';
  return 'unknown';
}

function resolveRandomGoodsDuplicateTolerance(answers: Record<string, AnswerValue>): RandomGoodsPlan['duplicateTolerance'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_duplicate_tolerance');
  if (answer === 'high' || answer === 'medium' || answer === 'low') return answer;
  return 'unknown';
}

function resolveRandomGoodsExchangeWillingness(answers: Record<string, AnswerValue>): RandomGoodsPlan['exchangeWillingness'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_trade_intent');
  if (answer === 'yes') return 'high';
  if (answer === 'maybe') return 'medium';
  if (answer === 'no') return 'low';
  return 'unknown';
}

function resolveRandomGoodsExchangeFriction(answers: Record<string, AnswerValue>): RandomGoodsPlan['exchangeFriction'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_exchange_friction');
  if (answer === 'low' || answer === 'medium' || answer === 'high') return answer;
  return 'unknown';
}

function resolveRandomGoodsSinglesFallback(answers: Record<string, AnswerValue>): RandomGoodsPlan['singlesFallback'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_single_fallback');
  if (answer === 'now') return 'now';
  if (answer === 'after_stop') return 'after_stop';
  if (answer === 'avoid') return 'avoid';
  return 'unknown';
}

function resolveRandomGoodsStopBudget(answers: Record<string, AnswerValue>): RandomGoodsPlan['stopBudget'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_stop_budget');
  if (answer === 'strict' || answer === 'soft' || answer === 'over_limit') return answer;
  return 'unknown';
}

function resolveMediaCharacterVsCast(answers: Record<string, AnswerValue>): MediaEditionPlan['characterVsCast'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_motive');
  if (answer === 'character_ip' || answer === 'balanced' || answer === 'cast_performer') return answer;
  return 'unknown';
}

function resolveMediaOneOshiVsBox(answers: Record<string, AnswerValue>): MediaEditionPlan['oneOshiVsBox'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_support_scope');
  if (answer === 'one_oshi' || answer === 'balanced' || answer === 'box_group') return answer;
  return 'unknown';
}

function resolveMediaCollectionCompleteness(answers: Record<string, AnswerValue>): MediaEditionPlan['collectionCompleteness'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_collection_budget');
  if (answer === 'efficient' || answer === 'balanced' || answer === 'complete') return answer;
  return 'unknown';
}

function resolveMediaEditionAmbition(answers: Record<string, AnswerValue>): MediaEditionPlan['editionAmbition'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_edition_intent');
  if (answer === 'standard_only' || answer === 'limited_preferred' || answer === 'all_editions' || answer === 'one_best_fit') return answer;
  return 'unknown';
}

function resolveMediaSingleVsSetIntent(answers: Record<string, AnswerValue>): MediaEditionPlan['singleVsSetIntent'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_single_vs_set_intent');
  if (answer === 'one_symbolic_item' || answer === 'one_best_fit_version' || answer === 'selective_subset' || answer === 'full_set_bundle') return answer;
  return 'unknown';
}

function resolveMediaCompletionSatisfaction(answers: Record<string, AnswerValue>): MediaEditionPlan['satisfactionWithoutFullCompletion'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_completion_satisfaction');
  if (answer === 'high' || answer === 'medium' || answer === 'low') return answer;
  return 'unknown';
}

function resolveMediaBonusPressure(answers: Record<string, AnswerValue>): MediaEditionPlan['bonusPressure'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_limited_pressure');
  if (answer === 'yes') return 'low';
  if (answer === 'maybe') return 'medium';
  if (answer === 'no') return 'high';
  return 'unknown';
}

function resolveMediaBonusImportance(answers: Record<string, AnswerValue>): MediaEditionPlan['bonusImportance'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_bonus_importance');
  if (answer === 'low' || answer === 'medium' || answer === 'high') return answer;
  return 'unknown';
}

function resolveMediaStoreSplitPreference(answers: Record<string, AnswerValue>): MediaEditionPlan['storeSplitPreference'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_multi_store_tolerance');
  if (answer === 'one_store_ok' || answer === 'compare_then_one' || answer === 'multi_store_considered' || answer === 'all_bonuses_or_bust') return answer;
  return 'unknown';
}

function resolveMediaSplitOrderBurden(answers: Record<string, AnswerValue>): MediaEditionPlan['splitOrderBurden'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_split_order_burden');
  if (answer === 'low' || answer === 'medium' || answer === 'high') return answer;
  return 'unknown';
}

function resolveMediaProductVsBonusMotive(answers: Record<string, AnswerValue>, motives: string[]): MediaEditionPlan['productVsBonusMotive'] {
  const bonusImportance = getSingleAnswer(answers, 'q_addon_media_bonus_importance');
  const bonusPressure = getSingleAnswer(answers, 'q_addon_media_limited_pressure');
  const productMotiveStrong = motives.some((motive) => ['content', 'archive', 'use', 'display'].includes(motive));
  const bonusMotiveStrong = motives.includes('bonus') || bonusImportance === 'high' || bonusPressure === 'no';
  if (bonusMotiveStrong && !productMotiveStrong) return 'bonus_driven';
  if (productMotiveStrong && !bonusMotiveStrong) return 'product_core';
  if (productMotiveStrong || bonusMotiveStrong || bonusImportance === 'medium' || bonusPressure === 'maybe') return 'balanced';
  return 'unknown';
}

function resolveOverpayVsMissPreference(answers: Record<string, AnswerValue>): 'overpay_more' | 'miss_more' | 'balanced' | 'unknown' {
  const answer = getSingleAnswer(answers, 'q_addon_goods_regret_axis');
  if (answer === 'overpay_more' || answer === 'miss_more' || answer === 'balanced') return answer;
  return 'unknown';
}

function resolveMediaRecoveryPreference(answers: Record<string, AnswerValue>): MediaEditionPlan['recoveryPreference'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_used_market_recovery');
  if (answer === 'buy_now_primary' || answer === 'wait_and_patch' || answer === 'reference_only' || answer === 'avoid_used_market') return answer;
  return 'unknown';
}

function resolveMediaUsedMarketComfort(answers: Record<string, AnswerValue>): MediaEditionPlan['usedMarketComfort'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_used_market_comfort');
  if (answer === 'high' || answer === 'medium' || answer === 'low' || answer === 'reference_only') return answer;
  return 'unknown';
}

function resolveMediaCompletionPressureType(answers: Record<string, AnswerValue>): MediaEditionPlan['completionPressureType'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_completion_pressure_type');
  if (answer === 'personal_standard' || answer === 'box_group_desire' || answer === 'bonus_store_pressure' || answer === 'complete_collection_image' || answer === 'mixed') return answer;
  return 'unknown';
}

function resolveMediaSetRewardStrength(answers: Record<string, AnswerValue>): MediaEditionPlan['setRewardStrength'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_set_reward_strength');
  if (answer === 'strong' || answer === 'medium' || answer === 'weak') return answer;
  return 'unknown';
}

function resolveMediaMemberVersionPreference(answers: Record<string, AnswerValue>): MediaEditionPlan['memberVersionPreference'] {
  const answer = getSingleAnswer(answers, 'q_addon_media_member_version');
  if (answer === 'none' || answer === 'specific_version' || answer === 'multiple_versions') return answer;
  return 'unknown';
}

function resolveMediaRandomGoodsAddonIntent(answers: Record<string, AnswerValue>): MediaEditionPlan['randomGoodsAddonIntent'] {
  return getSingleAnswer(answers, 'q_addon_media_random_goods_intent') === 'present' ? 'present' : 'none';
}

function buildMediaEditionPlan(params: {
  meta: InputMeta;
  answers: Record<string, AnswerValue>;
  motives: string[];
  scores: Record<ScoreDimension, number>;
  factorBuckets: FactorBuckets;
}): MediaEditionPlan | undefined {
  if (params.meta.goodsClass !== 'media') return undefined;

  const characterVsCast = resolveMediaCharacterVsCast(params.answers);
  const oneOshiVsBox = resolveMediaOneOshiVsBox(params.answers);
  const singleVsSetIntent = resolveMediaSingleVsSetIntent(params.answers);
  const satisfactionWithoutFullCompletion = resolveMediaCompletionSatisfaction(params.answers);
  const collectionCompleteness = resolveMediaCollectionCompleteness(params.answers);
  const editionAmbition = resolveMediaEditionAmbition(params.answers);
  const bonusPressure = resolveMediaBonusPressure(params.answers);
  const bonusImportance = resolveMediaBonusImportance(params.answers);
  const storeSplitPreference = resolveMediaStoreSplitPreference(params.answers);
  const splitOrderBurden = resolveMediaSplitOrderBurden(params.answers);
  const productVsBonusMotive = resolveMediaProductVsBonusMotive(params.answers, params.motives);
  const overpayVsMissPreference = resolveOverpayVsMissPreference(params.answers);
  const recoveryPreference = resolveMediaRecoveryPreference(params.answers);
  const usedMarketComfort = resolveMediaUsedMarketComfort(params.answers);
  const completionPressureType = resolveMediaCompletionPressureType(params.answers);
  const setRewardStrength = resolveMediaSetRewardStrength(params.answers);
  const memberVersionPreference = resolveMediaMemberVersionPreference(params.answers);
  const randomGoodsAddonIntent = resolveMediaRandomGoodsAddonIntent(params.answers);
  const playbackSpace = getSingleAnswer(params.answers, 'q_addon_media_playback_space');
  const budgetPain = getSingleAnswer(params.answers, 'q_budget_pain');
  const budgetAlignment: MediaEditionPlan['budgetAlignment'] =
    budgetPain === 'force' || budgetPain === 'hard' || params.factorBuckets.budgetPressure >= 68
      ? 'weak'
      : budgetPain === 'some' || params.factorBuckets.budgetPressure >= 56
        ? 'medium'
        : 'strong';

  const completeMotive = collectionCompleteness === 'complete' || params.motives.includes('complete');
  const oneOshiFocused = oneOshiVsBox === 'one_oshi';
  const boxSupportStrong = oneOshiVsBox === 'box_group';
  const fullSetAmbition = editionAmbition === 'all_editions' || memberVersionPreference === 'multiple_versions';
  const castDriven = characterVsCast === 'cast_performer';
  const characterDriven = characterVsCast === 'character_ip';
  const selectiveIntent = singleVsSetIntent === 'selective_subset';
  const singleItemIntent = singleVsSetIntent === 'one_symbolic_item' || singleVsSetIntent === 'one_best_fit_version';
  const canStopSatisfied =
    satisfactionWithoutFullCompletion === 'high' ||
    (satisfactionWithoutFullCompletion === 'medium' && singleVsSetIntent !== 'full_set_bundle');
  const wantsFullSetBundle = singleVsSetIntent === 'full_set_bundle' || fullSetAmbition;
  const usedMarketActionable = usedMarketComfort === 'high' || usedMarketComfort === 'medium';
  const usedMarketReferenceOnly = usedMarketComfort === 'reference_only' || recoveryPreference === 'reference_only';
  const usedMarketAvoided = usedMarketComfort === 'low' || recoveryPreference === 'avoid_used_market';
  const usedMarketCompletionScenarioDetected =
    recoveryPreference === 'wait_and_patch' ||
    recoveryPreference === 'reference_only' ||
    usedMarketComfort === 'high' ||
    usedMarketComfort === 'medium' ||
    usedMarketComfort === 'reference_only';
  const completionImagePressure = completionPressureType === 'complete_collection_image';
  const boxPressure = completionPressureType === 'box_group_desire';
  const bonusPressureType = completionPressureType === 'bonus_store_pressure';
  const personalCompletionStandard = completionPressureType === 'personal_standard';
  const setRewardStrong = setRewardStrength === 'strong';
  const setRewardWeak = setRewardStrength === 'weak';
  const motiveRefinementAxis: MediaEditionPlan['motiveRefinementAxis'] =
    characterDriven && oneOshiFocused
      ? 'character_one_oshi'
      : characterDriven && boxSupportStrong
        ? 'character_box_group'
        : castDriven && oneOshiFocused
          ? 'cast_one_oshi'
          : castDriven && boxSupportStrong
            ? 'cast_box_group'
            : characterVsCast === 'balanced' || oneOshiVsBox === 'balanced'
              ? 'balanced'
              : 'unknown';
  const playbackUnready = playbackSpace === 'not_ready';
  const softFomo = bonusPressure === 'medium' || params.motives.includes('fomo') || params.scores.impulse >= 66;
  const storeBonusScenarioDetected =
    bonusImportance === 'medium' ||
    bonusImportance === 'high' ||
    storeSplitPreference === 'compare_then_one' ||
    storeSplitPreference === 'multi_store_considered' ||
    storeSplitPreference === 'all_bonuses_or_bust' ||
    bonusPressure === 'medium' ||
    bonusPressure === 'high' ||
    params.motives.includes('bonus') ||
    Boolean(params.meta.parsedSearchClues?.bonusClues.length);
  const oneStoreFriendly = storeSplitPreference === 'one_store_ok' || storeSplitPreference === 'compare_then_one';
  const multiStoreIntent = storeSplitPreference === 'multi_store_considered' || storeSplitPreference === 'all_bonuses_or_bust';
  const splitBurdenHigh = splitOrderBurden === 'high' || budgetAlignment === 'weak';
  const splitBurdenLow = splitOrderBurden === 'low' && budgetAlignment !== 'weak';
  const productCore = productVsBonusMotive === 'product_core';
  const bonusDriven = productVsBonusMotive === 'bonus_driven';
  const missSensitive = overpayVsMissPreference === 'miss_more';
  const overpaySensitive = overpayVsMissPreference === 'overpay_more';
  const diffuseUnderlyingMotive =
    productVsBonusMotive !== 'product_core' &&
    !boxSupportStrong &&
    collectionCompleteness !== 'complete' &&
    characterVsCast === 'balanced' &&
    oneOshiVsBox === 'balanced';
  const bonusInflationRisk: MediaEditionPlan['bonusInflationRisk'] =
    bonusDriven && (bonusPressure === 'high' || bonusImportance === 'high')
      ? 'high'
      : storeBonusScenarioDetected && (bonusPressure === 'medium' || bonusImportance === 'medium' || multiStoreIntent)
        ? 'medium'
        : storeBonusScenarioDetected
          ? 'low'
          : 'unknown';

  let chosenPath: MediaEditionPlannerPath = 'buy_one_best_fit_edition';
  let clampReason: string | undefined;
  const reasonFlags: string[] = [];

  if (storeBonusScenarioDetected && bonusDriven && bonusImportance === 'high' && splitBurdenHigh) {
    chosenPath = 'split_orders_are_not_worth_it';
    clampReason = 'split_order_burden_outweighs_bonus_gain';
    reasonFlags.push(clampReason);
  } else if (storeBonusScenarioDetected && bonusDriven && !productCore && bonusPressure === 'high' && budgetAlignment !== 'strong') {
    chosenPath = 'step_back_from_bonus_pressure';
    clampReason = 'bonus_pressure_exceeds_stated_need';
    reasonFlags.push(clampReason);
  } else if (storeBonusScenarioDetected && multiStoreIntent && splitBurdenLow && bonusImportance === 'high' && completeMotive && budgetAlignment === 'strong' && !oneOshiFocused) {
    chosenPath = 'split_orders_are_justified';
    reasonFlags.push('multi_store_chase_alignment_confirmed');
  } else if (storeBonusScenarioDetected && multiStoreIntent && (splitBurdenHigh || overpayVsMissPreference === 'overpay_more')) {
    chosenPath = 'split_orders_are_not_worth_it';
    clampReason = splitBurdenHigh ? 'split_order_burden_outweighs_bonus_gain' : 'overpay_regret_outweighs_bonus_variants';
    reasonFlags.push(clampReason);
  } else if (storeBonusScenarioDetected && productCore && (bonusPressure === 'high' || bonusImportance === 'medium' || bonusImportance === 'high') && oneStoreFriendly) {
    chosenPath = 'buy_product_but_do_not_chase_all_bonuses';
    reasonFlags.push('product_value_outweighs_bonus_completion');
  } else if (storeBonusScenarioDetected && !completionImagePressure && (oneStoreFriendly || bonusImportance === 'medium' || bonusPressure === 'medium')) {
    chosenPath = 'choose_one_best_store';
    reasonFlags.push('one_store_optimization_preferred');
  } else if (completionImagePressure && diffuseUnderlyingMotive && budgetAlignment !== 'strong') {
    chosenPath = 'do_not_force_completion';
    clampReason = 'completion_image_pressure_without_core_motive';
    reasonFlags.push(clampReason);
  } else if (usedMarketCompletionScenarioDetected && recoveryPreference === 'wait_and_patch' && usedMarketActionable && (overpaySensitive || selectiveIntent || singleItemIntent || setRewardWeak || canStopSatisfied)) {
    chosenPath = 'wait_and_patch_holes_later';
    reasonFlags.push('secondary_market_patch_strategy_preferred');
  } else if (usedMarketCompletionScenarioDetected && recoveryPreference === 'wait_and_patch' && (usedMarketActionable || usedMarketReferenceOnly) && (selectiveIntent || singleItemIntent || !wantsFullSetBundle)) {
    chosenPath = 'use_secondary_market_for_missing_items';
    reasonFlags.push(usedMarketReferenceOnly ? 'secondary_market_reference_only_fallback' : 'secondary_market_missing_item_recovery');
  } else if (singleItemIntent && canStopSatisfied && (oneOshiFocused || characterDriven || motiveRefinementAxis === 'character_one_oshi' || motiveRefinementAxis === 'cast_one_oshi')) {
    chosenPath = 'buy_one_only_and_stop';
    reasonFlags.push('single_item_satisfaction_supported');
  } else if ((selectiveIntent || (singleItemIntent && !canStopSatisfied)) && (setRewardWeak || oneOshiFocused || characterDriven || canStopSatisfied)) {
    chosenPath = 'buy_selective_subset';
    reasonFlags.push('selective_subset_beats_full_completion');
  } else if (wantsFullSetBundle && boxSupportStrong && completeMotive && budgetAlignment === 'strong' && setRewardStrong && !completionImagePressure) {
    chosenPath = 'full_set_is_justified';
    reasonFlags.push('full_set_alignment_confirmed');
  } else if (wantsFullSetBundle && (setRewardWeak || diffuseUnderlyingMotive || (!boxSupportStrong && !boxPressure) || budgetAlignment !== 'strong')) {
    chosenPath = 'full_set_is_not_worth_it';
    clampReason =
      budgetAlignment !== 'strong'
        ? 'full_set_burden_outweighs_reward'
        : setRewardWeak
          ? 'full_set_reward_too_weak'
          : 'full_set_motive_not_strong_enough';
    reasonFlags.push(clampReason);
  } else if ((completionImagePressure || (completeMotive && diffuseUnderlyingMotive) || (bonusPressureType && budgetAlignment !== 'strong')) && params.scores.impulse >= 62) {
    chosenPath = 'step_back_from_completion_pressure';
    clampReason = completionImagePressure ? 'completion_pressure_anxiety_dominant' : 'completion_pressure_needs_recheck';
    reasonFlags.push(clampReason);
  } else if (fullSetAmbition && (budgetAlignment === 'weak' || oneOshiFocused || playbackUnready)) {
    chosenPath = bonusPressure === 'high' || completeMotive
      ? 'step_back_from_bonus_or_completion_pressure'
      : 'avoid_full_set_chase';
    clampReason =
      budgetAlignment === 'weak'
        ? 'completion_pressure_budget_misaligned'
        : oneOshiFocused
          ? 'full_set_outpaces_one_oshi_need'
          : 'edition_usage_not_ready';
    reasonFlags.push(clampReason);
  } else if (bonusPressure === 'high' && !fullSetAmbition && budgetAlignment !== 'strong') {
    chosenPath = 'step_back_from_bonus_or_completion_pressure';
    clampReason = 'bonus_pressure_exceeds_stated_need';
    reasonFlags.push('bonus_pressure_exceeds_stated_need');
  } else if (editionAmbition === 'standard_only') {
    chosenPath = 'buy_standard_only';
    reasonFlags.push('standard_only_sufficient');
  } else if (editionAmbition === 'limited_preferred' && budgetAlignment !== 'weak') {
    chosenPath = 'buy_limited_only';
    reasonFlags.push('limited_relevance_supported');
  } else if (fullSetAmbition && boxSupportStrong && completeMotive && budgetAlignment === 'strong') {
    chosenPath = 'full_set_is_justified';
    reasonFlags.push('full_set_alignment_confirmed');
  } else if (fullSetAmbition) {
    chosenPath = 'avoid_full_set_chase';
    clampReason = budgetAlignment === 'medium' ? 'full_set_not_clearly_aligned' : 'full_set_pressure_without_clear_need';
    reasonFlags.push(clampReason);
  } else if (editionAmbition === 'one_best_fit' || oneOshiFocused || softFomo) {
    chosenPath = 'buy_one_best_fit_edition';
    reasonFlags.push('single_best_fit_preferred');
  }

  const optimizingFor =
    chosenPath === 'choose_one_best_store'
      ? 'bonus 圧を認めつつ、1店舗最適化で満足と負担を釣り合わせること'
      : chosenPath === 'buy_product_but_do_not_chase_all_bonuses'
        ? '商品価値は拾いながら、all-bonus chase に広げないこと'
        : chosenPath === 'split_orders_are_not_worth_it'
          ? 'split order の送料・管理負担が bonus 差を上回る時に止めること'
          : chosenPath === 'split_orders_are_justified'
            ? '複数店舗 chase をやるなら motive・予算・負担が揃う時だけにすること'
            : chosenPath === 'step_back_from_bonus_pressure'
              ? 'bonus/FOMO 圧が need を上回る時に一歩引くこと'
              : chosenPath === 'buy_standard_only'
      ? '内容を押さえつつ、限定圧に引っ張られすぎないこと'
      : chosenPath === 'buy_limited_only'
        ? '限定版の relevance は拾いつつ、複数版 chase に広げないこと'
        : chosenPath === 'buy_one_best_fit_edition'
          ? '自分の motive に最も合う 1種だけを選ぶこと'
          : chosenPath === 'buy_one_only_and_stop'
            ? '象徴になる 1点で満足を回収し、そこから増やさないこと'
            : chosenPath === 'buy_selective_subset'
              ? '必要な版・メンバー・絵柄だけに絞って負担を増やしすぎないこと'
          : chosenPath === 'avoid_full_set_chase'
            ? '全版追いの総額と満足差が見合う時だけ広げること'
            : chosenPath === 'full_set_is_not_worth_it'
              ? '全版 reward が弱い時は comp anxiety より選抜回収を優先すること'
            : chosenPath === 'full_set_is_justified'
              ? '箱推し・ completeness・予算が揃う時だけ全版を正当化すること'
              : chosenPath === 'wait_and_patch_holes_later'
                ? '初動で抱え込みすぎず、欠けだけ後から埋めること'
                : chosenPath === 'use_secondary_market_for_missing_items'
                  ? '新品 chase を広げず、欠けた分だけ慎重に二次流通で補うこと'
                  : chosenPath === 'do_not_force_completion'
                    ? '不安を下げるためだけの全回収を避けること'
                    : chosenPath === 'step_back_from_completion_pressure'
                      ? 'completion anxiety が価値判断を押しのけている時に一歩引くこと'
              : 'bonus / completion 圧が need を上回る時に一歩引くこと';

  const reasons: string[] = [];
  const assumptions: string[] = [];

  reasons.push(
    oneOshiFocused
      ? '単推しが強い時は、全版追いより「自分に合う1種」を選ぶ方が満足効率が高い。'
      : boxSupportStrong
        ? '箱・グループ支援が強い場合だけ、複数版の意味が出やすい。'
        : '複数版メディアは motive が曖昧だと買い分けより惰性 chase になりやすい。'
  );
  reasons.push(
    motiveRefinementAxis === 'character_one_oshi'
      ? 'キャラ寄り × 単推し寄りなので、象徴になる1点や最推し版だけで満足を作りやすい。'
      : motiveRefinementAxis === 'character_box_group'
        ? 'キャラ寄りでも箱で揃える意味があるなら、版差や全員分の relevance を個別に見た方がよい。'
        : motiveRefinementAxis === 'cast_one_oshi'
          ? '演者寄り × 単推し寄りでは、出演差・映像特典つきの「最適1種」を選ぶ方が筋が通りやすい。'
          : motiveRefinementAxis === 'cast_box_group'
            ? '演者寄り × 箱寄りなら、全体支援として複数版の意味が出るが、負担との整合は別途必要。'
            : 'キャラ側と演者側の motive が混ざる時は、いちばん刺さる版を1つに絞ると後悔を減らしやすい。'
  );
  if (singleItemIntent) reasons.push('今回の intent 自体が「全部」より1点/1種寄りなので、セット圧をそのまま採用しない方がブレにくい。');
  if (selectiveIntent) reasons.push('選抜回収で満足できるなら、全部そろえるより満足差の大きい部分だけ拾う方が効率がよい。');
  if (satisfactionWithoutFullCompletion === 'low') reasons.push('途中で止まりにくい自覚があるので、最初に full set を正当化できる根拠があるかを厳しめに見ています。');
  if (usedMarketCompletionScenarioDetected) reasons.push('欠けを後から埋める余地があるなら、初動で過剰回収するより穴埋め前提の方が安全なことがある。');
  if (usedMarketReferenceOnly) reasons.push('中古・二次流通は参考相場としては useful だが、価格・状態・真贋の読み切りは前提にしていない。');
  if (usedMarketAvoided) reasons.push('二次流通を避けたいなら、「後から埋めればいい」と軽く言いすぎず、新品側で満足線を先に固める必要がある。');
  if (completionImagePressure) reasons.push('「全部持っている状態」にしたい不安は、実際の版差や使用価値より強く見えてしまうことがある。');
  if (boxPressure) reasons.push('箱・グループで揃える意味が本当にあるかは、セット報酬や版差の実体があるかで見分ける。');
  if (bonusPressureType) reasons.push('completion の圧が店舗 bonus 起点なら、全回収より1店舗最適化や選抜回収の方が崩れにくい。');
  if (setRewardWeak) reasons.push('全版/全員分で得られる reward が弱いなら、総額だけ増えて満足差が小さくなりやすい。');
  if (setRewardStrong) reasons.push('連動特典や収納などセット reward が強い場合だけ、全回収の justification が立ちやすい。');
  if (bonusPressure === 'high') reasons.push('今の迷いは「本編を見たい」より bonus / 限定圧に押されている可能性が高い。');
  if (bonusImportance === 'high') reasons.push('店舗 bonus の重要度が高いほど、商品価値と bonus 価値を分けて考えないと chase が膨らみやすい。');
  if (oneStoreFriendly) reasons.push('1店舗で納得できる余地があるなら、全店 chase より「最も合う1店」を選ぶ方が後悔を減らしやすい。');
  if (multiStoreIntent) reasons.push('複数店舗 chase は motive が強くても、送料・管理・発売日差の負担まで含めて正当化が必要。');
  if (splitBurdenHigh) reasons.push('split order の負担が高い時は、bonus 差より後悔や管理コストが前に出やすい。');
  if (productCore) reasons.push('商品本体への motive が残っているなら、bonus を全部追わなくても満足の芯を確保しやすい。');
  if (bonusDriven) reasons.push('いまの判断は商品本体より店舗 bonus 比較に引っ張られている可能性がある。');
  if (missSensitive && multiStoreIntent) reasons.push('「逃す後悔」が重い場合でも、全部追う前に本当に残したい bonus を絞る方が安定しやすい。');
  if (collectionCompleteness === 'complete') reasons.push('揃えたい気持ちが強いほど、総額と実際の満足差を意識して clamp した方が安全。');
  if (budgetAlignment === 'weak') reasons.push('予算の整合が弱い状態では、全版追いは満足より負担が前に出やすい。');
  if (playbackUnready) reasons.push('再生・保管準備が未整備なら、版数を増やす前に使える1枚/1本へ絞る方が安全。');

  assumptions.push(
    memberVersionPreference === 'specific_version'
      ? 'メンバー/キャラ別は「最推し分だけ relevance が高い」前提で見ています。'
      : memberVersionPreference === 'multiple_versions'
        ? '複数バージョン回収欲は completeness 圧として扱っています。'
        : 'メンバー別差は強い購入根拠としては置いていません。'
  );
  assumptions.push(
    randomGoodsAddonIntent === 'present'
      ? 'ランダム特典/付随グッズは別の stop-line addon として重ねて判断します。'
      : '今回はメディア版違い判断を主軸にしています。'
  );
  assumptions.push(
    storeBonusScenarioDetected
      ? '店舗別 bonus は「全部同価値」とは置かず、1店舗最適化で満足できる余地を先に見ています。'
      : '店舗別 bonus 圧は主軸前提には置いていません。'
  );
  assumptions.push(
    usedMarketCompletionScenarioDetected
      ? usedMarketReferenceOnly
        ? '二次流通は参考・補助導線として扱い、価格・状態・真贋の保証は置いていません。'
        : '二次流通は穴埋めの backup/主導線になり得ますが、価格・状態・在庫は不確実だと置いています。'
      : '今回は新品/公式側の版違い整理を主軸にし、二次流通は前提に置いていません。'
  );

  const bonusPressureChangedRecommendation =
    chosenPath === 'choose_one_best_store' ||
    chosenPath === 'buy_product_but_do_not_chase_all_bonuses' ||
    chosenPath === 'split_orders_are_not_worth_it' ||
    chosenPath === 'split_orders_are_justified' ||
    chosenPath === 'step_back_from_bonus_pressure';
  const splitOrderBurdenChangedRecommendation =
    chosenPath === 'split_orders_are_not_worth_it' ||
    chosenPath === 'split_orders_are_justified' ||
    clampReason === 'split_order_burden_outweighs_bonus_gain';
  const secondaryMarketFallbackChangedRecommendation =
    chosenPath === 'wait_and_patch_holes_later' ||
    chosenPath === 'use_secondary_market_for_missing_items';

  return {
    detected: true,
    scenarioKey: resolveScenarioKey({
      itemKind: params.meta.itemKind,
      goodsClass: params.meta.goodsClass,
      parsedSearchClues: params.meta.parsedSearchClues,
      searchClueRaw: params.meta.searchClueRaw,
      answers: params.answers,
    }),
    characterVsCast,
    oneOshiVsBox,
    singleVsSetIntent,
    satisfactionWithoutFullCompletion,
    collectionCompleteness,
    budgetAlignment,
    editionAmbition,
    bonusPressure,
    bonusImportance,
    storeSplitPreference,
    splitOrderBurden,
    productVsBonusMotive,
    overpayVsMissPreference,
    recoveryPreference,
    usedMarketComfort,
    completionPressureType,
    motiveRefinementAxis,
    setRewardStrength,
    storeBonusScenarioDetected,
    bonusPressureChangedRecommendation,
    splitOrderBurdenChangedRecommendation,
    usedMarketCompletionScenarioDetected,
    secondaryMarketFallbackChangedRecommendation,
    bonusInflationRisk,
    memberVersionPreference,
    randomGoodsAddonIntent,
    chosenPath,
    optimizingFor,
    randomGoodsStopLineAddonInvoked: false,
    clampReason,
    reasonFlags,
    reasons: [...new Set(reasons)].slice(0, 5),
    assumptions: [...new Set(assumptions)].slice(0, 4),
  };
}

function buildRandomGoodsPlan(params: {
  meta: InputMeta;
  answers: Record<string, AnswerValue>;
  motives: string[];
  scores: Record<ScoreDimension, number>;
  factorBuckets: FactorBuckets;
}): RandomGoodsPlan | undefined {
  const mixedMediaAddon = params.meta.goodsClass === 'media' && getSingleAnswer(params.answers, 'q_addon_media_random_goods_intent') === 'present';
  if (params.meta.itemKind !== 'blind_draw' && !mixedMediaAddon) return undefined;

  const targetStyle = resolveRandomGoodsTargetStyle(params.answers);
  const duplicateTolerance = resolveRandomGoodsDuplicateTolerance(params.answers);
  const exchangeWillingness = resolveRandomGoodsExchangeWillingness(params.answers);
  const exchangeFriction = resolveRandomGoodsExchangeFriction(params.answers);
  const singlesFallback = resolveRandomGoodsSinglesFallback(params.answers);
  const stopBudget = resolveRandomGoodsStopBudget(params.answers);
  const missPain = getSingleAnswer(params.answers, 'q_addon_blind_draw_miss_pain');
  const budgetPain = getSingleAnswer(params.answers, 'q_budget_pain');
  const impulseState = getSingleAnswer(params.answers, 'q_regret_impulse');
  const goodsClass = params.meta.goodsClass;
  const usedMarketPreferredClass = goodsClass === 'small_collection' || goodsClass === 'paper' || goodsClass === 'itabag_badge';
  const fullSetAmbition = targetStyle === 'full_set' || hasCompleteMotive(params.motives);
  const funDraw = targetStyle === 'fun_casual' || getSingleAnswer(params.answers, 'q_goal') === 'fun';
  const oneOrFewTarget = targetStyle === 'one_or_few' || getSingleAnswer(params.answers, 'q_goal') === 'single';
  const lowDuplicateTolerance = duplicateTolerance === 'low';
  const highDuplicateTolerance = duplicateTolerance === 'high';
  const exchangeHelpful = exchangeWillingness === 'high' || (exchangeWillingness === 'medium' && exchangeFriction !== 'high');
  const exchangeBlocked = exchangeWillingness === 'low' || exchangeFriction === 'high';
  const singlesReady = singlesFallback === 'now';
  const singlesAvailableAfterStop = singlesFallback === 'after_stop';
  const overBudget = stopBudget === 'over_limit';
  const budgetTight = overBudget || budgetPain === 'hard' || budgetPain === 'force' || params.factorBuckets.budgetPressure >= 68;
  const impulseHigh =
    impulseState === 'excited' ||
    impulseState === 'fomo' ||
    impulseState === 'tired' ||
    params.factorBuckets.impulseVolatility >= 68;
  const poorMarginalProgress =
    (oneOrFewTarget && lowDuplicateTolerance && exchangeBlocked) ||
    (fullSetAmbition && (budgetTight || lowDuplicateTolerance || exchangeBlocked));
  const completionPressureHigh =
    fullSetAmbition ||
    missPain === 'high' ||
    (params.scores.regretRisk >= 72 && params.scores.impulse >= 64);

  let chosenPath: RandomGoodsPlannerPath = 'stop_now';
  let clampReason: string | undefined;
  const reasonFlags: string[] = [];

  if (overBudget) {
    chosenPath = completionPressureHigh ? 'step_back_from_completion_pressure' : 'stop_now';
    clampReason = 'stop_budget_over_limit';
    reasonFlags.push('stop_budget_over_limit');
  } else if (impulseHigh && poorMarginalProgress) {
    chosenPath = completionPressureHigh ? 'step_back_from_completion_pressure' : 'stop_now';
    clampReason = 'impulse_high_low_progress';
    reasonFlags.push('impulse_high_low_progress');
  } else if (fullSetAmbition && (budgetTight || poorMarginalProgress)) {
    chosenPath = singlesReady
      ? 'stop_drawing_buy_singles'
      : usedMarketPreferredClass
        ? 'stop_drawing_check_used_market'
        : 'stop_now';
    clampReason = budgetTight ? 'full_set_budget_unfavorable' : 'full_set_randomness_unfavorable';
    reasonFlags.push(clampReason);
  } else if (oneOrFewTarget && lowDuplicateTolerance && exchangeBlocked) {
    chosenPath = singlesReady ? 'stop_drawing_buy_singles' : 'stop_drawing_check_used_market';
    clampReason = 'single_target_duplicate_risk';
    reasonFlags.push('single_target_duplicate_risk');
  } else if (exchangeHelpful && exchangeFriction !== 'high' && !budgetTight && !overBudget) {
    chosenPath = 'switch_to_exchange_path';
    reasonFlags.push('exchange_path_viable');
  } else if (funDraw && highDuplicateTolerance && !budgetTight && !impulseHigh) {
    chosenPath = 'continue_a_little_more';
    reasonFlags.push('fun_draw_continue_ok');
  } else if ((singlesReady || singlesAvailableAfterStop) && usedMarketPreferredClass) {
    chosenPath = singlesReady ? 'stop_drawing_buy_singles' : 'stop_drawing_check_used_market';
    reasonFlags.push(singlesReady ? 'single_fallback_now' : 'single_fallback_after_stop');
  } else {
    chosenPath = 'stop_now';
    if (exchangeBlocked) reasonFlags.push('exchange_not_viable');
  }

  const stopLineOptimizingFor =
    chosenPath === 'continue_a_little_more'
      ? '楽しさを残しつつ、被りと予算崩れを抑えること'
      : chosenPath === 'switch_to_exchange_path'
        ? '追加で引かずに、交換前提の負担と回収効率を両立すること'
        : chosenPath === 'stop_drawing_buy_singles'
          ? '被りを増やさず、本命回収を単品で確定に寄せること'
          : chosenPath === 'stop_drawing_check_used_market'
            ? '続きの盲抽より中古相場確認へ切り替えて損失を増やさないこと'
            : chosenPath === 'step_back_from_completion_pressure'
              ? 'コンプ圧が楽しさを上回る前にいったん止まること'
              : '被り・衝動・予算超過を増やさずに止まること';

  const reasons: string[] = [];
  const assumptions: string[] = [];

  reasons.push(
    targetStyle === 'full_set'
      ? 'コンプ寄りの回収だと、ランダム継続のコストが急に重くなりやすい。'
      : targetStyle === 'one_or_few'
        ? '本命少数狙いでは、被りが増えるほど盲抽の効率が落ちやすい。'
        : targetStyle === 'fun_casual'
          ? '楽しみ目的なら、撤退線さえ守れば少量継続の納得感を残しやすい。'
          : 'ランダム商品は目的が曖昧なまま続けると撤退線を越えやすい。'
  );
  if (duplicateTolerance === 'low') reasons.push('被り許容が低いので、追加で引くほど後悔リスクが上がりやすい。');
  if (exchangeWillingness === 'high' || exchangeWillingness === 'medium') {
    reasons.push(
      exchangeFriction === 'high'
        ? '交換意欲はあっても、連絡・梱包・待機の負担が高いなら万能ではない。'
        : '交換前提は有効だが、「すぐ成立する」とはみなさず負担込みで見る。'
    );
  }
  if (singlesFallback === 'now' || singlesFallback === 'after_stop') {
    reasons.push('単品/中古に逃げられるなら、盲抽を延ばすより損失を固定しやすい。');
  }
  if (clampReason === 'impulse_high_low_progress') reasons.push('勢いが強い一方で、追加1回の進捗期待が低く、ここで止めた方が後悔しにくい。');
  if (clampReason === 'stop_budget_over_limit') reasons.push('予定ラインを超えた時点で、くじの楽しさより予算崩れが主役になりやすい。');

  assumptions.push(
    exchangeWillingness === 'high' || exchangeWillingness === 'medium'
      ? '交換前提なら、追加購入ではなく「今ある重複で動く」前提にしています。'
      : '交換を前提にしない場合、被りはそのままコストとして扱います。'
  );
  assumptions.push(
    usedMarketPreferredClass
      ? '小物・紙もの・缶バ系は中古単品移行の相性が比較的高い前提です。'
      : '中古単品移行の相性は高めに仮定していません。'
  );

  return {
    detected: true,
    scenarioKey: resolveScenarioKey({
      itemKind: params.meta.itemKind,
      goodsClass: params.meta.goodsClass,
      parsedSearchClues: params.meta.parsedSearchClues,
      searchClueRaw: params.meta.searchClueRaw,
      answers: params.answers,
    }),
    targetStyle,
    duplicateTolerance,
    exchangeWillingness,
    exchangeFriction,
    singlesFallback,
    stopBudget,
    chosenPath,
    stopLineOptimizingFor,
    continuingJustified: chosenPath === 'continue_a_little_more',
    exchangeAssumptionChangedRecommendation: exchangeHelpful && !exchangeBlocked && chosenPath === 'switch_to_exchange_path',
    usedMarketRecommended: chosenPath === 'stop_drawing_check_used_market' || chosenPath === 'stop_drawing_buy_singles',
    clampReason,
    reasonFlags,
    reasons: [...new Set(reasons)].slice(0, 5),
    assumptions: [...new Set(assumptions)].slice(0, 3),
  };
}

function resolveVenueContext(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['venueContext'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_event_limit_context');
  if (answer === 'venue_limited' || answer === 'event_limited' || answer === 'missed_onsite') return answer;
  if (answer === 'none') return 'other';
  return 'unknown';
}

function resolveVenueRecoveryPlausibility(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['recoveryPlausibility'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_post_event_mailorder');
  if (answer === 'likely') return 'high';
  if (answer === 'maybe') return 'medium';
  if (answer === 'unlikely') return 'low';
  return 'unknown';
}

function resolveVenueWaitTolerance(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['waitTolerance'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_wait_tolerance');
  if (answer === 'high' || answer === 'medium' || answer === 'low') return answer;
  return 'unknown';
}

function resolveVenueFirstChanceTolerance(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['firstChanceTolerance'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_first_chance_tolerance');
  if (answer === 'high' || answer === 'medium' || answer === 'low') return answer;
  return 'unknown';
}

function resolveVenueUsedFallback(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['usedFallbackWillingness'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_used_fallback');
  if (answer === 'high' || answer === 'medium' || answer === 'low') return answer;
  return 'unknown';
}

function resolveVenueScarcityPressure(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['scarcityPressure'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_scarcity_pressure');
  if (answer === 'high' || answer === 'medium' || answer === 'low') return answer;
  return 'unknown';
}

function resolveVenuePrimaryMotive(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['primaryMotive'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_venue_motive');
  if (answer === 'collection_completeness' || answer === 'event_memory' || answer === 'practical_collecting' || answer === 'mixed') return answer;
  return 'unknown';
}

function resolveVenueLiveGoodsMotive(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['liveGoodsMotive'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_live_goods_motive');
  if (answer === 'core_attachment' || answer === 'symbolic_value' || answer === 'event_atmosphere' || answer === 'mixed') return answer;
  return 'unknown';
}

function resolveVenueRegretAxis(answers: Record<string, AnswerValue>): VenueLimitedGoodsPlan['regretAxis'] {
  const answer = getSingleAnswer(answers, 'q_addon_goods_regret_axis');
  if (answer === 'overpay_more' || answer === 'miss_more' || answer === 'balanced') return answer;
  return 'unknown';
}

function buildVenueLimitedGoodsPlan(params: {
  meta: InputMeta;
  answers: Record<string, AnswerValue>;
  motives: string[];
  scores: Record<ScoreDimension, number>;
  factorBuckets: FactorBuckets;
}): VenueLimitedGoodsPlan | undefined {
  if (params.meta.itemKind !== 'goods') return undefined;

  const venueContext = resolveVenueContext(params.answers);
  const hasVenueKeyword = [params.meta.parsedSearchClues?.raw, params.meta.parsedSearchClues?.normalized, params.meta.searchClueRaw]
    .filter((value): value is string => Boolean(value))
    .some((value) => ['会場限定', 'イベント限定', '会場先行', '現地限定', '現地販売', '会場物販', '事後通販', '事後受注'].some((keyword) => value.includes(keyword)));

  if (venueContext === 'other' && !hasVenueKeyword) return undefined;

  const recoveryPlausibility = resolveVenueRecoveryPlausibility(params.answers);
  const waitTolerance = resolveVenueWaitTolerance(params.answers);
  const firstChanceTolerance = resolveVenueFirstChanceTolerance(params.answers);
  const usedFallbackWillingness = resolveVenueUsedFallback(params.answers);
  const scarcityPressure = resolveVenueScarcityPressure(params.answers);
  const primaryMotive = resolveVenuePrimaryMotive(params.answers);
  const liveGoodsMotive = resolveVenueLiveGoodsMotive(params.answers);
  const regretAxis = resolveVenueRegretAxis(params.answers);

  const pressureHigh = scarcityPressure === 'high' || params.factorBuckets.impulseVolatility >= 70 || params.motives.includes('fomo');
  const recoveryStrong = recoveryPlausibility === 'high' || (recoveryPlausibility === 'medium' && usedFallbackWillingness !== 'low');
  const canWait = waitTolerance === 'high' || waitTolerance === 'medium';
  const canMissFirstChance = firstChanceTolerance === 'high' || firstChanceTolerance === 'medium';
  const usedFallbackReady = usedFallbackWillingness === 'high' || usedFallbackWillingness === 'medium';
  const overpaySensitive = regretAxis === 'overpay_more';
  const missSensitive = regretAxis === 'miss_more';
  const completionPressureHigh = primaryMotive === 'collection_completeness' || params.motives.includes('complete');
  const memoryDriven = primaryMotive === 'event_memory' || params.motives.includes('memory');
  const coreLiveMotive =
    liveGoodsMotive === 'core_attachment' ||
    liveGoodsMotive === 'symbolic_value' ||
    (liveGoodsMotive === 'mixed' && primaryMotive === 'practical_collecting');
  const atmosphereDriven = liveGoodsMotive === 'event_atmosphere';
  const mixedMediaLiveScenarioDetected = liveGoodsMotive !== 'unknown' || params.motives.includes('seiyuu_cast') || params.motives.includes('memory');
  const trueScarcityLikely =
    (venueContext === 'venue_limited' || venueContext === 'missed_onsite') &&
    recoveryPlausibility === 'low' &&
    !usedFallbackReady;
  const scarcityAssessment: VenueLimitedGoodsPlan['scarcityAssessment'] =
    trueScarcityLikely
      ? 'true_scarcity'
      : recoveryStrong && atmosphereDriven
        ? 'followup_plausible'
        : atmosphereDriven && pressureHigh
          ? 'atmosphere_pressure'
          : mixedMediaLiveScenarioDetected
            ? 'mixed'
            : 'unknown';

  let chosenPath: VenueLimitedPlannerPath = 'wait_for_post_event_mailorder';
  let clampReason: string | undefined;
  const reasonFlags: string[] = [];

  if (mixedMediaLiveScenarioDetected && recoveryStrong && canWait && (atmosphereDriven || overpaySensitive)) {
    chosenPath = 'wait_for_post_event_followup';
    reasonFlags.push('followup_plausible_wait_preferred');
  } else if (mixedMediaLiveScenarioDetected && atmosphereDriven && (pressureHigh || recoveryStrong || overpaySensitive)) {
    chosenPath = 'skip_atmosphere_driven_goods_chase';
    clampReason = recoveryStrong ? 'followup_plausible_atmosphere_driven' : 'atmosphere_pressure_outpaces_evidence';
    reasonFlags.push(clampReason);
  } else if (mixedMediaLiveScenarioDetected && coreLiveMotive && trueScarcityLikely && !overpaySensitive) {
    chosenPath = 'buy_live_goods_now_if_it_matches_core_motive';
    reasonFlags.push('core_live_motive_with_true_scarcity');
  } else if (trueScarcityLikely && waitTolerance === 'low' && firstChanceTolerance === 'low' && (missSensitive || memoryDriven) && !overpaySensitive) {
    chosenPath = 'buy_now_if_it_is_truly_hard_to_recover';
    reasonFlags.push('true_scarcity_recovery_weak');
  } else if (venueContext === 'missed_onsite' && usedFallbackReady) {
    chosenPath = 'fallback_to_used_market_if_missed';
    reasonFlags.push('missed_onsite_used_fallback_ready');
  } else if (recoveryStrong && canWait) {
    chosenPath = 'wait_for_post_event_mailorder';
    reasonFlags.push('recovery_plausible_wait_ok');
  } else if ((canMissFirstChance || overpaySensitive) && usedFallbackReady) {
    chosenPath = venueContext === 'missed_onsite' ? 'fallback_to_used_market_if_missed' : 'skip_onsite_chase_and_check_later';
    reasonFlags.push('used_fallback_safer_than_rush');
  } else if (pressureHigh && (recoveryStrong || overpaySensitive || completionPressureHigh)) {
    chosenPath = 'step_back_from_fomo_pressure';
    clampReason = recoveryStrong ? 'recovery_plausible_not_true_scarcity' : completionPressureHigh ? 'collection_pressure_exceeds_evidence' : 'overpay_regret_dominant';
    reasonFlags.push(clampReason);
  } else if (venueContext === 'missed_onsite') {
    chosenPath = 'skip_onsite_chase_and_check_later';
    reasonFlags.push('missed_onsite_later_check_first');
  } else if (pressureHigh && !trueScarcityLikely) {
    chosenPath = 'step_back_from_fomo_pressure';
    clampReason = 'atmosphere_pressure_outpaces_evidence';
    reasonFlags.push('atmosphere_pressure_outpaces_evidence');
  } else if (trueScarcityLikely) {
    chosenPath = 'buy_now_if_it_is_truly_hard_to_recover';
    reasonFlags.push('true_scarcity_recovery_weak');
  }

  const optimizingFor =
    chosenPath === 'buy_live_goods_now_if_it_matches_core_motive'
      ? 'core motive に合う live goods だけ、回復経路が弱い時に優先すること'
      : chosenPath === 'wait_for_post_event_followup'
        ? 'follow-up plausibility がある時は、その場の勢いより後追い確認を優先すること'
        : chosenPath === 'skip_atmosphere_driven_goods_chase'
          ? 'event の空気だけで膨らむ chase を止め、あとから残る価値に戻すこと'
          : chosenPath === 'buy_now_if_it_is_truly_hard_to_recover'
      ? '回復経路が弱い時だけ急ぐこと'
      : chosenPath === 'wait_for_post_event_mailorder'
        ? '事後通販や後日販売のシグナルを待って高値追いを避けること'
        : chosenPath === 'skip_onsite_chase_and_check_later'
          ? '現地の熱量に押されず、あとで根拠を確認してから動くこと'
          : chosenPath === 'fallback_to_used_market_if_missed'
            ? '取り逃し後も中古回復で panic-buy を避けること'
            : 'FOMO 圧が証拠を上回る時に一歩引くこと';

  const reasons: string[] = [];
  const assumptions: string[] = [];

  if (recoveryStrong) reasons.push('後日通販や後追い回復の見込みがあり、現地の urgency はその分だけ弱まる。');
  if (usedFallbackReady) reasons.push('取り逃しても中古・フリマ fallback を使えるなら、今の panic-buy を減らしやすい。');
  if (overpaySensitive) reasons.push('「逃す後悔」より「高く掴む後悔」が重いので、焦って高値で取りに行かない方が安全。');
  if (completionPressureHigh) reasons.push('揃えたい圧が強い時ほど、限定感を scarcity の証拠と誤認しやすい。');
  if (memoryDriven) reasons.push('思い出価値は大事だが、回復経路が残るなら即断の根拠にはしすぎない。');
  if (coreLiveMotive) reasons.push('live goods が core motive や象徴的な記念に結びつくなら、雰囲気買いより根拠のある確保になりやすい。');
  if (atmosphereDriven) reasons.push('その場の空気が主役だと、イベント後に満足が縮むリスクが上がりやすい。');
  if (trueScarcityLikely) reasons.push('会場限定らしさが強く、回復経路の根拠が弱いので今回は本当の scarcity 寄り。');
  if (clampReason === 'atmosphere_pressure_outpaces_evidence') reasons.push('焦りの強さに対して、回復不能だという証拠はまだ十分ではない。');
  if (clampReason === 'followup_plausible_atmosphere_driven') reasons.push('follow-up の見込みがあるため、今の熱量だけで chase する必要は薄め。');
  if (clampReason === 'recovery_plausible_not_true_scarcity') reasons.push('回復可能性が見えているため、限定感だけで urgent に寄せない。');

  assumptions.push(
    recoveryPlausibility === 'high' || recoveryPlausibility === 'medium'
      ? '事後通販は保証ではなく、待って確認する価値がある可能性として扱います。'
      : '事後通販は強く見込まず、現時点で見えている回復経路を中心に見ます。'
  );
  assumptions.push(
    usedFallbackReady
      ? '中古 fallback は、状態差と送料込み総額を後から確認する前提です。'
      : '中古 fallback を主経路には置かず、別の回復経路を優先します。'
  );
  const atmospherePressureChangedRecommendation =
    chosenPath === 'wait_for_post_event_followup' ||
    chosenPath === 'skip_atmosphere_driven_goods_chase' ||
    chosenPath === 'step_back_from_fomo_pressure';

  return {
    detected: true,
    scenarioKey: resolveScenarioKey({
      itemKind: params.meta.itemKind,
      goodsClass: params.meta.goodsClass,
      parsedSearchClues: params.meta.parsedSearchClues,
      searchClueRaw: params.meta.searchClueRaw,
      answers: params.answers,
    }),
    venueContext,
    recoveryPlausibility,
    waitTolerance,
    firstChanceTolerance,
    usedFallbackWillingness,
    scarcityPressure,
    primaryMotive,
    liveGoodsMotive,
    regretAxis,
    postEventFollowupPlausibility: recoveryPlausibility,
    atmospherePressureChangedRecommendation,
    scarcityAssessment,
    chosenPath,
    optimizingFor,
    recoveryChangedRecommendation: recoveryStrong && chosenPath !== 'buy_now_if_it_is_truly_hard_to_recover',
    usedMarketPartOfSaferPath: chosenPath === 'fallback_to_used_market_if_missed' || chosenPath === 'skip_onsite_chase_and_check_later',
    trueScarcityLikely,
    mixedMediaLiveScenarioDetected,
    clampReason,
    reasonFlags,
    reasons: [...new Set(reasons)].slice(0, 5),
    assumptions: [...new Set(assumptions)].slice(0, 3),
  };
}

function computeItemKindRisk(itemKind: ItemKind, answers: Record<string, AnswerValue>, tags: string[]): number {
  const unknownInfoCount = tags.filter((tag) => tag === 'unknown_info' || tag === 'unknown_compare').length;
  if (itemKind === 'used') {
    let risk = 45;
    const condition = getSingleAnswer(answers, 'q_addon_used_condition');
    const defect = getSingleAnswer(answers, 'q_addon_used_defect_return');
    const auth = getSingleAnswer(answers, 'q_addon_used_authenticity');
    const priceGap = getSingleAnswer(answers, 'q_addon_used_price_gap');
    const sellerTrust = getSingleAnswer(answers, 'q_addon_used_seller_trust');
    if (condition === 'hard') risk += 28;
    if (defect === 'not_ok' || defect === 'unknown') risk += 25;
    if (auth === 'must') risk += 10;
    if (auth === 'unknown') risk += 22;
    if (priceGap === 'small' || priceGap === 'unknown') risk += 12;
    if (sellerTrust === 'low') risk += 22;
    if (sellerTrust === 'medium') risk += 8;
    if (sellerTrust === 'unknown') risk += 14;
    return clamp(0, 100, risk + unknownInfoCount * 5);
  }

  if (itemKind === 'blind_draw') {
    let risk = 42;
    const cap = getSingleAnswer(answers, 'q_addon_blind_draw_cap');
    const exit = getSingleAnswer(answers, 'q_addon_blind_draw_exit');
    const trade = getSingleAnswer(answers, 'q_addon_blind_draw_trade_intent');
    const missPain = getSingleAnswer(answers, 'q_addon_blind_draw_miss_pain');
    if (cap === 'not_good') risk += 24;
    if (exit === 'complete') risk += 16;
    if (trade === 'no') risk += 14;
    if (missPain === 'high') risk += 22;
    if (missPain === 'mid') risk += 10;
    if (cap === 'unknown' || exit === 'unknown' || trade === 'unknown' || missPain === 'unknown') risk += 10;
    return clamp(0, 100, risk + unknownInfoCount * 4);
  }

  if (itemKind === 'preorder') {
    let risk = 40;
    const timeline = getSingleAnswer(answers, 'q_addon_preorder_timeline');
    const decay = getSingleAnswer(answers, 'q_addon_preorder_decay');
    const compareLoss = getSingleAnswer(answers, 'q_addon_preorder_compare_loss');
    if (timeline === 'no' || timeline === 'unknown') risk += 20;
    if (decay === 'drop') risk += 24;
    if (decay === 'uncertain') risk += 10;
    if (compareLoss === 'large') risk += 18;
    if (compareLoss === 'mid') risk += 8;
    return clamp(0, 100, risk + unknownInfoCount * 6);
  }

  if (itemKind === 'ticket') {
    let risk = 38;
    const schedule = getSingleAnswer(answers, 'q_addon_ticket_schedule');
    const resale = getSingleAnswer(answers, 'q_addon_ticket_resale_rule');
    const tripLoad = getSingleAnswer(answers, 'q_addon_ticket_trip_load');
    const nextChance = getSingleAnswer(answers, 'q_addon_ticket_next_chance');
    if (schedule === 'risk') risk += 24;
    if (schedule === 'some_risk') risk += 12;
    if (resale === 'not_yet') risk += 18;
    if (resale === 'partly') risk += 9;
    if (tripLoad === 'heavy') risk += 20;
    if (tripLoad === 'medium') risk += 8;
    if (nextChance === 'unknown') risk += 10;
    return clamp(0, 100, risk + unknownInfoCount * 5);
  }

  if (itemKind === 'game_billing') {
    let risk = 40;
    const type = getSingleAnswer(answers, 'gb_q2_type');
    const wait = getSingleAnswer(answers, 'gb_q8_wait');
    const pity = getSingleAnswer(answers, 'gb_q10_pity');
    const info = getSingleAnswer(answers, 'gb_q9_info');
    if (type === 'gacha') risk += 8;
    if (wait === 'drop') risk += 22;
    if (pity === 'far') risk += 18;
    if (info === 'none') risk += 16;
    return clamp(0, 100, risk + unknownInfoCount * 6);
  }

  return clamp(0, 100, 35 + unknownInfoCount * 4);
}

function computeFactorBuckets(scores: Record<ScoreDimension, number>, unknownCount: number, itemKindRisk: number): FactorBuckets {
  const desireAttachment = clamp(0, 100, Math.round(scores.desire));
  const urgencyOpportunity = clamp(0, 100, Math.round((scores.urgency + scores.rarity + (100 - scores.restockChance)) / 3));
  const budgetPressure = clamp(0, 100, Math.round(((100 - scores.affordability) + scores.opportunityCost) / 2));
  const readinessLogistics = clamp(0, 100, Math.round((scores.opportunityCost * 0.6) + (scores.regretRisk * 0.4)));
  const uncertaintyUnknowns = clamp(0, 100, Math.round((unknownCount * 18) + (scores.regretRisk * 0.35)));
  const impulseVolatility = clamp(0, 100, Math.round((scores.impulse * 0.7) + (scores.regretRisk * 0.3)));
  return {
    desireAttachment,
    urgencyOpportunity,
    budgetPressure,
    readinessLogistics,
    uncertaintyUnknowns,
    impulseVolatility,
    itemKindRisk: clamp(0, 100, itemKindRisk),
  };
}

function determineHoldSubtype(buckets: FactorBuckets, unknownCount: number): { subtype: HoldSubtype; reason: string } {
  if (unknownCount >= 2 || buckets.uncertaintyUnknowns >= 66) {
    return { subtype: 'needs_check', reason: '結論を変えうる確認項目が残っている。' };
  }
  if (
    (buckets.desireAttachment >= 72 || buckets.urgencyOpportunity >= 70) &&
    (buckets.budgetPressure >= 68 || buckets.impulseVolatility >= 68 || buckets.itemKindRisk >= 68)
  ) {
    return { subtype: 'conflicting', reason: '買う理由と止める理由が強く衝突している。' };
  }
  return { subtype: 'timing_wait', reason: 'モノ自体は否定しないが、今動くタイミングが良くない。' };
}

function resolveVoiceDramaBonusMismatch(params: {
  voiceMediaEligible: boolean;
  voiceCdKind?: string;
  voiceBonusValue?: string;
  voiceListenIntent?: string;
  tags: string[];
  factorBuckets: FactorBuckets;
  mediaEditionPlan?: MediaEditionPlan;
}) {
  const {
    voiceMediaEligible,
    voiceCdKind,
    voiceBonusValue,
    voiceListenIntent,
    tags,
    factorBuckets,
    mediaEditionPlan,
  } = params;

  if (!voiceMediaEligible) {
    return { active: false, shouldStop: false };
  }

  const weakListenIntent = voiceListenIntent === 'archive_main' || voiceListenIntent === 'not_sure';
  const storeBonusPressure =
    voiceCdKind === 'store_bonus_audio' ||
    mediaEditionPlan?.bonusImportance === 'high' ||
    mediaEditionPlan?.bonusPressure === 'high' ||
    mediaEditionPlan?.completionPressureType === 'bonus_store_pressure' ||
    tags.includes('bonus_pressure_high') ||
    tags.includes('voice_store_bonus_verification_bias');
  const meaningfulBurden =
    factorBuckets.budgetPressure >= 58 ||
    factorBuckets.readinessLogistics >= 64 ||
    factorBuckets.impulseVolatility >= 68 ||
    mediaEditionPlan?.splitOrderBurden === 'high' ||
    mediaEditionPlan?.budgetAlignment === 'weak';
  const active =
    voiceBonusValue === 'core_audio' &&
    weakListenIntent &&
    storeBonusPressure &&
    meaningfulBurden;

  if (!active) {
    return { active: false, shouldStop: false };
  }

  const shouldStop =
    factorBuckets.budgetPressure >= 68 ||
    factorBuckets.readinessLogistics >= 72 ||
    mediaEditionPlan?.chosenPath === 'step_back_from_bonus_pressure' ||
    mediaEditionPlan?.chosenPath === 'step_back_from_bonus_or_completion_pressure' ||
    mediaEditionPlan?.chosenPath === 'split_orders_are_not_worth_it';

  return { active: true, shouldStop };
}

type TrustGateOutcome = {
  active: boolean;
  scenario: "random_goods" | "media_edition" | "venue_limited";
  criticalUnknownCount: number;
  confidenceCap: number;
  forceHold: boolean;
  reason: string;
  action: string;
  tag: string;
};

function countUnknownValues(values: string[]): number {
  return values.filter((value) => value === 'unknown').length;
}

function resolveTrustGateOutcome(params: {
  randomGoodsPlan?: RandomGoodsPlan;
  mediaEditionPlan?: MediaEditionPlan;
  venueLimitedGoodsPlan?: VenueLimitedGoodsPlan;
}): TrustGateOutcome | undefined {
  const { randomGoodsPlan, mediaEditionPlan, venueLimitedGoodsPlan } = params;

  if (randomGoodsPlan) {
    const criticalUnknownCount = countUnknownValues([
      randomGoodsPlan.targetStyle,
      randomGoodsPlan.duplicateTolerance,
      randomGoodsPlan.exchangeWillingness,
      randomGoodsPlan.exchangeFriction,
      randomGoodsPlan.singlesFallback,
      randomGoodsPlan.stopBudget,
    ]);
    const reliesOnUnknown =
      (randomGoodsPlan.chosenPath === 'switch_to_exchange_path' &&
        (randomGoodsPlan.exchangeWillingness === 'unknown' || randomGoodsPlan.exchangeFriction === 'unknown')) ||
      ((randomGoodsPlan.chosenPath === 'stop_drawing_buy_singles' || randomGoodsPlan.chosenPath === 'stop_drawing_check_used_market') &&
        (randomGoodsPlan.targetStyle === 'unknown' || randomGoodsPlan.singlesFallback === 'unknown')) ||
      (randomGoodsPlan.chosenPath === 'continue_a_little_more' &&
        (randomGoodsPlan.targetStyle === 'unknown' || randomGoodsPlan.stopBudget === 'unknown'));

    if (criticalUnknownCount >= 2 || reliesOnUnknown) {
      return {
        active: true,
        scenario: "random_goods",
        criticalUnknownCount,
        confidenceCap: criticalUnknownCount >= 3 ? 38 : 54,
        forceHold: criticalUnknownCount >= 2,
        reason: 'ブラインド商品の止めどきに必要な前提がまだ足りず、交換・単品回収・撤退ラインを強く言い切れません。',
        action: 'まず「本命の範囲」「被り許容」「交換負担」「止める予算ライン」を埋めてから再判定する。',
        tag: 'trust_gate_random_goods_unknown_heavy',
      };
    }
  }

  if (mediaEditionPlan) {
    const criticalUnknownCount = countUnknownValues([
      mediaEditionPlan.characterVsCast,
      mediaEditionPlan.oneOshiVsBox,
      mediaEditionPlan.singleVsSetIntent,
      mediaEditionPlan.satisfactionWithoutFullCompletion,
      mediaEditionPlan.collectionCompleteness,
      mediaEditionPlan.editionAmbition,
      mediaEditionPlan.recoveryPreference,
      mediaEditionPlan.usedMarketComfort,
      mediaEditionPlan.completionPressureType,
      mediaEditionPlan.setRewardStrength,
      mediaEditionPlan.bonusImportance,
      mediaEditionPlan.storeSplitPreference,
      mediaEditionPlan.splitOrderBurden,
      mediaEditionPlan.memberVersionPreference,
    ]) + (mediaEditionPlan.randomGoodsAddonIntent === 'present' ? 0 : 0);
    const reliesOnUnknown =
      ((mediaEditionPlan.chosenPath === 'buy_one_best_fit_edition' || mediaEditionPlan.chosenPath === 'buy_limited_only' || mediaEditionPlan.chosenPath === 'buy_one_only_and_stop' || mediaEditionPlan.chosenPath === 'buy_selective_subset') &&
        (mediaEditionPlan.editionAmbition === 'unknown' || mediaEditionPlan.characterVsCast === 'unknown')) ||
      ((mediaEditionPlan.chosenPath === 'full_set_is_justified' || mediaEditionPlan.chosenPath === 'full_set_is_not_worth_it') &&
        (mediaEditionPlan.oneOshiVsBox === 'unknown' || mediaEditionPlan.collectionCompleteness === 'unknown' || mediaEditionPlan.editionAmbition === 'unknown' || mediaEditionPlan.setRewardStrength === 'unknown')) ||
      ((mediaEditionPlan.chosenPath === 'wait_and_patch_holes_later' || mediaEditionPlan.chosenPath === 'use_secondary_market_for_missing_items') &&
        (mediaEditionPlan.recoveryPreference === 'unknown' || mediaEditionPlan.usedMarketComfort === 'unknown'));

    if (criticalUnknownCount >= 2 || reliesOnUnknown) {
      return {
        active: true,
        scenario: "media_edition",
        criticalUnknownCount,
        confidenceCap: criticalUnknownCount >= 3 ? 40 : 55,
        forceHold: criticalUnknownCount >= 2,
        reason: '版違いメディアの判断軸がまだ足りず、1種推奨や全版追い可否を強く固定できません。',
        action: 'まず「版違いの意図」「単推しか箱推しか」「予算とコンプ優先度」「キャラ/演者 motive」を埋める。',
        tag: 'trust_gate_media_unknown_heavy',
      };
    }
  }

  if (venueLimitedGoodsPlan) {
    const criticalUnknownCount = countUnknownValues([
      venueLimitedGoodsPlan.venueContext,
      venueLimitedGoodsPlan.recoveryPlausibility,
      venueLimitedGoodsPlan.waitTolerance,
      venueLimitedGoodsPlan.usedFallbackWillingness,
      venueLimitedGoodsPlan.liveGoodsMotive,
      venueLimitedGoodsPlan.regretAxis,
    ]);
    const reliesOnUnknown =
      (venueLimitedGoodsPlan.chosenPath === 'wait_for_post_event_mailorder' && venueLimitedGoodsPlan.recoveryPlausibility === 'unknown') ||
      (venueLimitedGoodsPlan.chosenPath === 'buy_now_if_it_is_truly_hard_to_recover' &&
        (venueLimitedGoodsPlan.recoveryPlausibility === 'unknown' || venueLimitedGoodsPlan.venueContext === 'unknown'));

    if (criticalUnknownCount >= 2 || reliesOnUnknown) {
      return {
        active: true,
        scenario: "venue_limited",
        criticalUnknownCount,
        confidenceCap: criticalUnknownCount >= 3 ? 40 : 55,
        forceHold: criticalUnknownCount >= 2,
        reason: '会場限定かどうか、事後回復の見込み、待てる余地が未確定で、急ぐ/待つを強く言い切れません。',
        action: 'まず「本当に会場限定か」「事後通販の根拠」「待てるか」「中古回復を使うか」を確認する。',
        tag: 'trust_gate_venue_unknown_heavy',
      };
    }
  }

  return undefined;
}

function buildExplanations(params: {
  decision: Decision;
  holdSubtype?: HoldSubtype;
  buckets: FactorBuckets;
  unknownCount: number;
  itemKind: ItemKind;
}): {
  blockingFactors: string[];
  recommendationReasons: string[];
  whyNotBuyYet: string;
  whyNotSkipYet: string;
} {
  const { decision, holdSubtype, buckets, unknownCount, itemKind } = params;
  const blockingFactors: string[] = [];
  if (buckets.budgetPressure >= 65) blockingFactors.push('予算圧が高い');
  if (buckets.uncertaintyUnknowns >= 60 || unknownCount > 0) blockingFactors.push('不明点が残っている');
  if (buckets.impulseVolatility >= 65) blockingFactors.push('勢い要素が強い');
  if (buckets.readinessLogistics >= 65) blockingFactors.push('利用・保管準備が不足');
  if (buckets.itemKindRisk >= 62) blockingFactors.push(`${itemKind}特有のリスクが高い`);

  const recommendationReasons: string[] = [];
  if (decision === 'BUY') {
    recommendationReasons.push('満足寄与（欲しさ・必要性）が阻害要因を上回っている');
    recommendationReasons.push('現時点の不確実性が許容範囲にある');
  } else if (decision === 'SKIP') {
    recommendationReasons.push('負担・不確実性が継続利用価値を上回っている');
    recommendationReasons.push('見送りによる機会損失より保全メリットが大きい');
  } else {
    recommendationReasons.push('賛成要因と反対要因が拮抗している');
    recommendationReasons.push('追加確認1〜2件で結論精度を改善できる');
  }

  const whyNotBuyYet =
    decision === 'BUY'
      ? 'BUY判定に必要な条件を満たしている。'
      : holdSubtype === 'needs_check'
        ? '相場・状態・条件など、1つの重要確認で結論が動く余地があるため。'
        : holdSubtype === 'conflicting'
          ? '買う理由と止める理由が強く衝突し、押し切るには危険なため。'
          : holdSubtype === 'timing_wait'
            ? 'アイテムの良し悪しではなく、今の買い時が不利なため。'
            : 'リスクに対して見返り確信が不足しているため。';

  const whyNotSkipYet =
    decision === 'SKIP'
      ? 'SKIP判定に必要な阻害要因が十分に揃っている。'
      : '満足可能性や機会価値がまだ残っており、即時見送りまでは至らないため。';

  return { blockingFactors: blockingFactors.slice(0, 3), recommendationReasons, whyNotBuyYet, whyNotSkipYet };
}

export function evaluate(input: EvaluateInput): DecisionOutput {
  const config = input.config ?? defaultConfig;
  const scores = initScores();
  const tags: string[] = [];

  const motivesAnswer = input.answers.q_motives_multi;
  const motives = Array.isArray(motivesAnswer)
    ? motivesAnswer.filter((entry): entry is string => typeof entry === 'string')
    : [];

  for (const q of input.questionSet.questions) {
    const ans = input.answers[q.id];
    if (ans == null) continue;

    if (q.type === 'scale' || q.type === 'number') {
      if (Array.isArray(ans)) continue;
      const v = Number(ans);
      if (Number.isFinite(v) && q.mapTo) {
        const pct = clamp(0, 100, Math.round((v / (q.max ?? 5)) * 100));
        scores[q.mapTo] = mergeScore(scores[q.mapTo], pct);
      }
      continue;
    }

    if (q.type === 'single' && q.options) {
      const opt = q.options.find(o => o.id === ans);
      if (!opt) {
        if (q.id === 'q_goal') tags.push('goal_unknown');
        continue;
      }
      if (opt.tags) tags.push(...opt.tags);
      if (opt.delta) {
        for (const [dim, val] of Object.entries(opt.delta)) {
          const d = dim as ScoreDimension;
          scores[d] = mergeScore(scores[d], val as number);
        }
      }
    }
  }

  applyMotives(scores, motives, tags);

  const voiceMediaSignals = getVoiceMediaSignals(input.meta);
  const voiceCdKind = getSingleAnswer(input.answers, 'q_addon_voice_cd_kind');
  const voiceCastCheck = getSingleAnswer(input.answers, 'q_addon_voice_cast_check');
  const voiceBonusValueRaw = getSingleAnswerFromAliases(input.answers, ['q_addon_voice_bonus_is_audio', 'q_addon_voice_audio_bonus_value']);
  const voiceListenIntentRaw = getSingleAnswerFromAliases(input.answers, ['q_addon_voice_listen_timing', 'q_addon_voice_listen_intent']);
  const voiceBonusValue =
    voiceBonusValueRaw === 'core' ? 'core_audio'
      : voiceBonusValueRaw === 'unsure' ? 'not_checked'
      : voiceBonusValueRaw;
  const voiceListenIntent =
    voiceListenIntentRaw === 'collecting_main' ? 'archive_main'
      : voiceListenIntentRaw;

  if (voiceMediaSignals.eligible) {
    tags.push('voice_media_route');
    if (voiceCdKind === 'not_checked') {
      tags.push('unknown_voice_cd_kind_confirmation');
      scores.regretRisk = clamp(0, 100, scores.regretRisk + 8);
      scores.opportunityCost = clamp(0, 100, scores.opportunityCost + 8);
    }
    if (voiceCdKind === 'adjacent_media') {
      tags.push('voice_adjacent_media_pull');
      scores.regretRisk = clamp(0, 100, scores.regretRisk + 6);
      scores.opportunityCost = clamp(0, 100, scores.opportunityCost + 10);
    }
    if (voiceCastCheck === 'important_unconfirmed') {
      tags.push('unknown_voice_cast_confirmation');
      scores.regretRisk = clamp(0, 100, scores.regretRisk + 8);
      scores.opportunityCost = clamp(0, 100, scores.opportunityCost + 6);
    }
    if (voiceBonusValue === 'not_checked') {
      tags.push('unknown_voice_bonus_value');
      if (voiceMediaSignals.hasStoreBonusSignal || voiceMediaSignals.hasFirstComeBonusSignal || voiceMediaSignals.hasEditionSignal) {
        tags.push('unknown_voice_bonus_scope');
      }
      scores.regretRisk = clamp(0, 100, scores.regretRisk + 8);
      scores.opportunityCost = clamp(0, 100, scores.opportunityCost + 8);
    }
    if (voiceListenIntent === 'not_sure') {
      tags.push('unknown_voice_listen_timing');
    }
    if (
      (voiceMediaSignals.hasContentSignal || voiceMediaSignals.hasEditionSignal || voiceMediaSignals.hasStoreBonusSignal) &&
      voiceBonusValue === 'not_checked'
    ) {
      tags.push('unknown_voice_content_scope');
    }
    if (voiceCdKind === 'store_bonus_audio' && (voiceBonusValue === 'not_checked' || voiceBonusValue === 'nice_to_have')) {
      tags.push('voice_store_bonus_verification_bias');
      scores.urgency = clamp(0, 100, scores.urgency + 4);
    }
    if (voiceBonusValue === 'core_audio' && (voiceListenIntent === 'archive_main' || voiceListenIntent === 'not_sure')) {
      tags.push('voice_bonus_use_mismatch', 'bonus_pressure_high');
      scores.impulse = clamp(0, 100, scores.impulse + 8);
      scores.opportunityCost = clamp(0, 100, scores.opportunityCost + 10);
      scores.regretRisk = clamp(0, 100, scores.regretRisk + 8);
    }
    if (voiceListenIntent === 'listen_soon') {
      scores.desire = clamp(0, 100, scores.desire + 4);
    }
  }

  const unknownCount = tags.filter(t => t.startsWith('unknown_')).length;
  const impulseFlag = scores.impulse >= 70;
  const futureUseFlag = motives.includes('support') || motives.includes('use');
  const itemKind = input.meta.itemKind ?? 'goods';

  const weights = selectWeights(config, itemKind);
  let scoreSigned = 0;
  for (const [dim, w] of Object.entries(weights)) {
    const d = dim as ScoreDimension;
    scoreSigned += normalize01ToSigned(scores[d]) * (w as number);
  }

  const itemKindRisk = computeItemKindRisk(itemKind, input.answers, tags);
  const factorBuckets = computeFactorBuckets(scores, unknownCount, itemKindRisk);
  const mediaEditionPlanBase = buildMediaEditionPlan({
    meta: input.meta,
    answers: input.answers,
    motives,
    scores,
    factorBuckets,
  });
  const randomGoodsPlan = buildRandomGoodsPlan({
    meta: input.meta,
    answers: input.answers,
    motives,
    scores,
    factorBuckets,
  });
  const mediaEditionPlan = mediaEditionPlanBase
    ? { ...mediaEditionPlanBase, randomGoodsStopLineAddonInvoked: Boolean(randomGoodsPlan) }
    : undefined;
  const venueLimitedGoodsPlan = buildVenueLimitedGoodsPlan({
    meta: input.meta,
    answers: input.answers,
    motives,
    scores,
    factorBuckets,
  });

  const positivePush =
    factorBuckets.desireAttachment * 0.34 +
    factorBuckets.urgencyOpportunity * 0.22 +
    scores.affordability * 0.16;
  const negativePush =
    factorBuckets.budgetPressure * 0.26 +
    factorBuckets.uncertaintyUnknowns * 0.24 +
    factorBuckets.impulseVolatility * 0.16 +
    factorBuckets.itemKindRisk * 0.20 +
    factorBuckets.readinessLogistics * 0.14;
  const calibratedSigned = clamp(-1, 1, (positivePush - negativePush) / 100);
  scoreSigned = clamp(-1, 1, scoreSigned * 0.35 + calibratedSigned * 0.85);

  const unknownPenalty = unknownCount * config.unknownPenaltyPerTag;
  scoreSigned = scoreSigned * (1 - Math.min(0.45, unknownPenalty / 130));

  if (impulseFlag && scoreSigned < 0.55) {
    let impulseNudge = Math.max(0, ((scores.impulse - 50) / 100) * 0.18);
    if (futureUseFlag) impulseNudge *= 0.6;
    scoreSigned -= impulseNudge;
  }

  const decisiveness = input.decisiveness ?? 'standard';
  const mode = input.mode ?? 'medium';
  const holdBand =
    Math.max(Math.abs(config.thresholds.buy), Math.abs(config.thresholds.skip)) *
    (decisivenessMultiplierMap[decisiveness] ?? 1) *
    (modeMultiplierMap[mode] ?? 1);

  const shortFlowPositiveBuyWindow =
    mode === 'short' &&
    unknownCount <= 1 &&
    factorBuckets.desireAttachment >= 72 &&
    factorBuckets.budgetPressure < 48 &&
    factorBuckets.uncertaintyUnknowns < 42 &&
    factorBuckets.impulseVolatility < 48 &&
    factorBuckets.readinessLogistics < 58 &&
    scoreSigned >= holdBand * 0.8;

  let decision: Decision = 'THINK';
  if (scoreSigned >= holdBand) decision = 'BUY';
  else if (scoreSigned <= -holdBand) decision = 'SKIP';
  else if (shortFlowPositiveBuyWindow) decision = 'BUY';

  if (unknownCount >= 5 && decision === 'BUY') {
    decision = 'THINK';
  }

  const voiceDramaBonusMismatch = resolveVoiceDramaBonusMismatch({
    voiceMediaEligible: voiceMediaSignals.eligible,
    voiceCdKind,
    voiceBonusValue,
    voiceListenIntent,
    tags,
    factorBuckets,
    mediaEditionPlan,
  });

  if (randomGoodsPlan) {
    tags.push(
      `random_goods_path_${randomGoodsPlan.chosenPath}`,
      `random_goods_target_${randomGoodsPlan.targetStyle}`,
      `random_goods_duplicate_${randomGoodsPlan.duplicateTolerance}`,
      `random_goods_exchange_${randomGoodsPlan.exchangeWillingness}`,
      `random_goods_exchange_friction_${randomGoodsPlan.exchangeFriction}`,
      `random_goods_singles_${randomGoodsPlan.singlesFallback}`,
      `random_goods_stop_budget_${randomGoodsPlan.stopBudget}`,
    );
    tags.push(randomGoodsPlan.exchangeAssumptionChangedRecommendation ? 'random_goods_exchange_path_active' : 'random_goods_exchange_path_inactive');
    if (randomGoodsPlan.usedMarketRecommended) tags.push('random_goods_used_market_fallback');
    if (randomGoodsPlan.clampReason) tags.push(`random_goods_clamp_${randomGoodsPlan.clampReason}`);

    if (randomGoodsPlan.chosenPath === 'continue_a_little_more') {
      if (decision === 'SKIP' && factorBuckets.budgetPressure < 72) decision = 'THINK';
    } else if (
      randomGoodsPlan.chosenPath === 'stop_drawing_buy_singles' ||
      randomGoodsPlan.chosenPath === 'stop_drawing_check_used_market' ||
      randomGoodsPlan.chosenPath === 'switch_to_exchange_path'
    ) {
      if (decision === 'BUY') decision = 'THINK';
    } else if (randomGoodsPlan.chosenPath === 'stop_now' || randomGoodsPlan.chosenPath === 'step_back_from_completion_pressure') {
      if (decision === 'BUY') decision = 'THINK';
      if (randomGoodsPlan.clampReason === 'stop_budget_over_limit' || randomGoodsPlan.clampReason === 'impulse_high_low_progress') {
        decision = 'SKIP';
      }
    }
  }

  if (mediaEditionPlan) {
    tags.push(
      `media_edition_path_${mediaEditionPlan.chosenPath}`,
      `media_character_vs_cast_${mediaEditionPlan.characterVsCast}`,
      `media_one_oshi_vs_box_${mediaEditionPlan.oneOshiVsBox}`,
      `media_single_vs_set_intent_${mediaEditionPlan.singleVsSetIntent}`,
      `media_satisfaction_without_full_completion_${mediaEditionPlan.satisfactionWithoutFullCompletion}`,
      `media_collection_completeness_${mediaEditionPlan.collectionCompleteness}`,
      `media_budget_alignment_${mediaEditionPlan.budgetAlignment}`,
      `media_edition_ambition_${mediaEditionPlan.editionAmbition}`,
      `media_bonus_pressure_${mediaEditionPlan.bonusPressure}`,
      `media_bonus_importance_${mediaEditionPlan.bonusImportance}`,
      `media_store_split_${mediaEditionPlan.storeSplitPreference}`,
      `media_split_order_burden_${mediaEditionPlan.splitOrderBurden}`,
      `media_product_vs_bonus_${mediaEditionPlan.productVsBonusMotive}`,
      `media_overpay_vs_miss_${mediaEditionPlan.overpayVsMissPreference}`,
      `media_recovery_preference_${mediaEditionPlan.recoveryPreference}`,
      `media_used_market_comfort_${mediaEditionPlan.usedMarketComfort}`,
      `media_completion_pressure_type_${mediaEditionPlan.completionPressureType}`,
      `media_motive_refinement_axis_${mediaEditionPlan.motiveRefinementAxis}`,
      `media_set_reward_strength_${mediaEditionPlan.setRewardStrength}`,
      `media_bonus_inflation_risk_${mediaEditionPlan.bonusInflationRisk}`,
    );
    if (mediaEditionPlan.memberVersionPreference !== 'unknown') tags.push(`media_member_version_${mediaEditionPlan.memberVersionPreference}`);
    if (mediaEditionPlan.randomGoodsStopLineAddonInvoked) tags.push('media_random_goods_stopline_addon_invoked');
    if (mediaEditionPlan.storeBonusScenarioDetected) tags.push('media_store_bonus_scenario_detected');
    if (mediaEditionPlan.bonusPressureChangedRecommendation) tags.push('media_bonus_pressure_changed_recommendation');
    if (mediaEditionPlan.splitOrderBurdenChangedRecommendation) tags.push('media_split_order_burden_changed_recommendation');
    if (mediaEditionPlan.usedMarketCompletionScenarioDetected) tags.push('media_used_market_completion_detected');
    if (mediaEditionPlan.secondaryMarketFallbackChangedRecommendation) tags.push('media_secondary_market_fallback_changed_recommendation');
    if (mediaEditionPlan.clampReason) tags.push(`media_edition_clamp_${mediaEditionPlan.clampReason}`);

    if (mediaEditionPlan.chosenPath === 'full_set_is_justified') {
      if (decision === 'SKIP' && mediaEditionPlan.budgetAlignment !== 'weak') decision = 'THINK';
    } else if (
      mediaEditionPlan.chosenPath === 'avoid_full_set_chase' ||
      mediaEditionPlan.chosenPath === 'full_set_is_not_worth_it' ||
      mediaEditionPlan.chosenPath === 'do_not_force_completion' ||
      mediaEditionPlan.chosenPath === 'step_back_from_completion_pressure' ||
      mediaEditionPlan.chosenPath === 'step_back_from_bonus_or_completion_pressure'
    ) {
      if (decision === 'BUY') decision = 'THINK';
      if (mediaEditionPlan.budgetAlignment === 'weak' && mediaEditionPlan.chosenPath === 'step_back_from_bonus_or_completion_pressure') {
        decision = 'SKIP';
      }
    } else if (
      mediaEditionPlan.chosenPath === 'wait_and_patch_holes_later' ||
      mediaEditionPlan.chosenPath === 'use_secondary_market_for_missing_items' ||
      mediaEditionPlan.chosenPath === 'buy_selective_subset' ||
      mediaEditionPlan.chosenPath === 'buy_one_only_and_stop'
    ) {
      if (decision === 'BUY') decision = 'THINK';
    } else if (decision === 'BUY' && mediaEditionPlan.budgetAlignment === 'weak') {
      decision = 'THINK';
    }
  }

  if (venueLimitedGoodsPlan) {
    tags.push(
      `venue_limited_path_${venueLimitedGoodsPlan.chosenPath}`,
      `venue_limited_context_${venueLimitedGoodsPlan.venueContext}`,
      `venue_limited_recovery_${venueLimitedGoodsPlan.recoveryPlausibility}`,
      `venue_limited_wait_${venueLimitedGoodsPlan.waitTolerance}`,
      `venue_limited_used_${venueLimitedGoodsPlan.usedFallbackWillingness}`,
      `venue_limited_pressure_${venueLimitedGoodsPlan.scarcityPressure}`,
      `venue_limited_regret_${venueLimitedGoodsPlan.regretAxis}`,
      `venue_limited_motive_${venueLimitedGoodsPlan.primaryMotive}`,
      `venue_limited_live_goods_${venueLimitedGoodsPlan.liveGoodsMotive}`,
      `venue_limited_followup_${venueLimitedGoodsPlan.postEventFollowupPlausibility}`,
      `venue_limited_scarcity_assessment_${venueLimitedGoodsPlan.scarcityAssessment}`,
    );
    if (venueLimitedGoodsPlan.clampReason) tags.push(`venue_limited_clamp_${venueLimitedGoodsPlan.clampReason}`);
    if (venueLimitedGoodsPlan.recoveryChangedRecommendation) tags.push('venue_limited_recovery_changed_recommendation');
    if (venueLimitedGoodsPlan.usedMarketPartOfSaferPath) tags.push('venue_limited_used_market_safer_path');
    if (venueLimitedGoodsPlan.trueScarcityLikely) tags.push('venue_limited_true_scarcity_likely');
    if (venueLimitedGoodsPlan.mixedMediaLiveScenarioDetected) tags.push('venue_limited_mixed_media_live_detected');
    if (venueLimitedGoodsPlan.atmospherePressureChangedRecommendation) tags.push('venue_limited_atmosphere_pressure_changed_recommendation');

    if (
      venueLimitedGoodsPlan.chosenPath === 'buy_now_if_it_is_truly_hard_to_recover' ||
      venueLimitedGoodsPlan.chosenPath === 'buy_live_goods_now_if_it_matches_core_motive'
    ) {
      if (decision === 'SKIP' && factorBuckets.budgetPressure < 72) decision = 'THINK';
    } else {
      if (decision === 'BUY') decision = 'THINK';
      if (
        (venueLimitedGoodsPlan.chosenPath === 'step_back_from_fomo_pressure' || venueLimitedGoodsPlan.chosenPath === 'skip_atmosphere_driven_goods_chase') &&
        venueLimitedGoodsPlan.clampReason === 'atmosphere_pressure_outpaces_evidence'
      ) {
        decision = factorBuckets.budgetPressure >= 68 || scores.impulse >= 72 ? 'SKIP' : 'THINK';
      }
    }
  }

  if (voiceDramaBonusMismatch.active && decision === 'BUY') {
    decision = voiceDramaBonusMismatch.shouldStop ? 'SKIP' : 'THINK';
  }

  const goal =
    tags.includes('goal_set') ? 'set' :
    tags.includes('goal_fun') ? 'fun' :
    tags.includes('goal_unknown') ? 'unknown' : 'single';
  const popularity =
    tags.includes('hot') ? 'hot' :
    tags.includes('cold') ? 'cold' :
    tags.includes('normal_popularity') ? 'normal' : 'unknown';

  const method = decideMerchMethod({ tags, scores, goal, popularity });
  const blindDrawCap = method.method === 'BLIND_DRAW' ? method.cap : undefined;

  let holdSubtype: HoldSubtype | undefined;
  let subtypeReason: string | undefined;
  if (decision === 'THINK') {
    const resolved = determineHoldSubtype(factorBuckets, unknownCount);
    holdSubtype = resolved.subtype;
    subtypeReason = resolved.reason;
    if (voiceDramaBonusMismatch.active && unknownCount < 2) {
      holdSubtype = 'conflicting';
      subtypeReason = '特典の欲しさと実際に聴く価値・負担が衝突している。';
    }
  }

  const initialReasonDecision = decision;
  const initialReasonHoldSubtype = holdSubtype;
  let reasonsBase = pickReasons({ meta: input.meta, tags, scores, decision, blindDrawCap, holdSubtype, factorBuckets });
  let actionsBase = pickActions({ meta: input.meta, tags, scores, decision, blindDrawCap, holdSubtype, factorBuckets });
  const extraReasons: ReasonItem[] = [];
  const extraActions: ActionItem[] = [];

  if (impulseFlag) {
    extraReasons.push({ id: 'impulse_rush', severity: 'info', text: '「買えた快感」が主役の時、満足がすぐ落ち着くこともあるかも。' });
    extraActions.push({ id: 'cooldown_10min', text: '10分だけクールダウン（カート保持）→ その後もう一回だけ判断しよ。' });
  }

  if (voiceMediaSignals.eligible) {
    if (voiceCdKind === 'not_checked') {
      extraReasons.unshift({
        id: 'voice_cd_kind_needs_check',
        severity: 'warn',
        text: '本編ドラマCDなのか、店舗特典ドラマ確認が主なのか未整理で、判断軸そのものがまだ固まっていません。',
      });
      extraActions.unshift({
        id: 'voice_cd_kind_verify',
        text: '商品構成（本編CD / 特典CD / 店舗別差分）を確認してから再診断する',
      });
    } else if (voiceCdKind === 'adjacent_media') {
      extraReasons.unshift({
        id: 'voice_cd_kind_adjacent',
        severity: 'warn',
        text: 'ドラマ要素より別媒体・別仕様への関心が主役なら、この枠で即決すると満足条件がずれやすいです。',
      });
    }
    if (voiceCastCheck === 'important_unconfirmed') {
      extraReasons.unshift({
        id: 'voice_cast_needs_check',
        severity: 'warn',
        text: '出演キャスト確認が購入理由に直結しているため、未確認のままでは結論を固定しない方が安全です。',
      });
      extraActions.unshift({
        id: 'voice_cast_verify',
        text: '出演キャスト・役名表記・参加形式を確認してから再診断する',
      });
    }
    if (
      voiceBonusValue === 'not_checked' &&
      (voiceMediaSignals.hasStoreBonusSignal || voiceMediaSignals.hasFirstComeBonusSignal || voiceMediaSignals.hasEditionSignal)
    ) {
      extraReasons.unshift({
        id: 'voice_bonus_needs_check',
        severity: 'warn',
        text: voiceMediaSignals.hasFirstComeBonusSignal
          ? '先着特典や店舗差が絡むため、「待つ」より先に特典残数・対象店舗・版差の確認が必要です。'
          : '店舗特典や版差の未確認点が残っており、どこで何を買うかで満足度が変わりやすいです。',
      });
      extraActions.unshift({
        id: 'voice_bonus_verify',
        text: '店舗特典の有無・先着条件・通常盤/限定盤の差を先に確認する',
      });
    }
    if (voiceBonusValue === 'core_audio' && (voiceListenIntent === 'archive_main' || voiceListenIntent === 'not_sure')) {
      extraReasons.unshift({
        id: 'voice_listen_mismatch',
        severity: 'warn',
        text: '特典への熱量に対して「実際に聴く」像が弱く、満足より回収圧が先行している可能性があります。',
      });
    } else if (
      voiceCdKind !== 'adjacent_media' &&
      voiceCastCheck === 'important_confirmed' &&
      voiceListenIntent === 'listen_soon' &&
      (voiceBonusValue === 'not_important' || voiceBonusValue === 'nice_to_have')
    ) {
      extraReasons.unshift({
        id: 'voice_route_ready',
        severity: 'info',
        text: 'キャスト確認と聴く予定が揃っているため、ドラマCDとしての満足条件は比較的はっきりしています。',
      });
    }
  }

  if (randomGoodsPlan) {
    const pathText: Record<RandomGoodsPlannerPath, string> = {
      continue_a_little_more: '今回は「少しだけ続ける」は許容範囲。ただし追加分は少量に固定した方が安全。',
      stop_now: 'ここは追加で引くより止まる方が後悔しにくい局面。',
      switch_to_exchange_path: '追加で引くより、いま持っている重複を交換前提で動かす方が合理的。',
      stop_drawing_buy_singles: 'これ以上の盲抽より、必要分を単品で回収する方が損失を抑えやすい。',
      stop_drawing_check_used_market: '追加で引くより、まず中古単品の相場と在庫を見た方が合理的。',
      step_back_from_completion_pressure: 'いまは「揃えたい圧」が楽しさを上回っているので、一度引く手を止めるのが安全。',
    };
    extraReasons.unshift({
      id: `random_goods_${randomGoodsPlan.chosenPath}`,
      severity: randomGoodsPlan.chosenPath === 'continue_a_little_more' ? 'info' : 'strong',
      text: pathText[randomGoodsPlan.chosenPath],
    });

    if (randomGoodsPlan.exchangeAssumptionChangedRecommendation) {
      extraReasons.push({
        id: 'random_goods_exchange_assumption',
        severity: 'info',
        text: 'この結論は「交換を回せる」前提で少し前向きに寄せています。交換負担が重いなら早め停止寄りです。',
      });
    }
    if (randomGoodsPlan.clampReason === 'impulse_high_low_progress') {
      extraReasons.push({
        id: 'random_goods_impulse_clamp',
        severity: 'warn',
        text: '勢いは強いのに進捗期待が低いので、ここで止める方が regret を抑えやすい。',
      });
    }

    const actionText: Record<RandomGoodsPlannerPath, ActionItem> = {
      continue_a_little_more: { id: 'random_goods_continue_soft_cap', text: '追加は少量だけに固定し、その回数を超えたら終了する' },
      stop_now: { id: 'random_goods_stop_now', text: 'ここで打ち止めにして、今日は追加購入しない' },
      switch_to_exchange_path: { id: 'random_goods_exchange_path', text: '追加で引かず、交換前提で整理する（連絡・梱包負担も込みで判断）' },
      stop_drawing_buy_singles: { id: 'random_goods_buy_singles', text: '盲抽は止めて、必要分は単品購入に切り替える' },
      stop_drawing_check_used_market: { id: 'random_goods_check_used_market', text: '盲抽は止めて、まず中古単品の相場と在庫を確認する' },
      step_back_from_completion_pressure: { id: 'random_goods_step_back', text: 'コンプ圧が下がるまで一度離れて、明日また見直す' },
    };
    extraActions.unshift(actionText[randomGoodsPlan.chosenPath]);
  }

  if (mediaEditionPlan) {
    const pathText: Record<MediaEditionPlannerPath, string> = {
      buy_standard_only: '今回は通常版だけで十分。限定圧で版数を増やさなくてよい。',
      buy_limited_only: '限定版に意味はあるが、複数版 chase までは広げない方がよい。',
      buy_one_best_fit_edition: 'いちばん motive に合う 1種だけを選ぶのが合理的。',
      buy_one_only_and_stop: '象徴になる 1点で満足線が作れるなら、そこで止める方が comp 圧に振り回されにくい。',
      buy_selective_subset: '全部ではなく、刺さる版・最推し分・必要な差分だけ拾う方が満足効率がよい。',
      avoid_full_set_chase: '全版追いは今の motive / 予算整合だと広げすぎ。1種に絞る方が安全。',
      full_set_is_not_worth_it: '今の full set は reward より burden が勝ちやすいので、選抜回収へ戻す方が安全。',
      full_set_is_justified: '箱推し・ completeness・予算が揃っているため、今回は全版でも筋が通る。',
      wait_and_patch_holes_later: '初動で抱え込みすぎず、欠けた分だけ後から埋める方が損失を抑えやすい。',
      use_secondary_market_for_missing_items: '新品 chase を広げるより、欠けた分だけ中古・二次流通で補う方が合理的。',
      do_not_force_completion: '今の全回収欲は価値より anxiety を下げるために強まっている可能性がある。',
      step_back_from_completion_pressure: 'いまは comp 圧が実利を押しのけているので、一歩引いてから再評価する方が安全。',
      step_back_from_bonus_or_completion_pressure: '今の迷いは必要性より bonus / completion 圧が前に出ているので、一歩引く方が安全。',
      choose_one_best_store: '全店舗 chase ではなく、いちばん満足に近い 1店舗へ絞るのが合理的。',
      buy_product_but_do_not_chase_all_bonuses: '商品は買ってよいが、店舗 bonus の総取りまでは広げない方が安全。',
      split_orders_are_not_worth_it: '複数店舗 split は bonus 差より送料・管理負担の方が重くなりやすい。',
      split_orders_are_justified: '複数店舗 split は motive・予算・管理負担が揃う今回は正当化できる。',
      step_back_from_bonus_pressure: '今は商品価値より店舗 bonus 比較の圧が前に出ているので、一歩引く方が安全。',
    };
    extraReasons.unshift({
      id: `media_edition_${mediaEditionPlan.chosenPath}`,
      severity: mediaEditionPlan.chosenPath === 'full_set_is_justified' ? 'info' : 'strong',
      text: pathText[mediaEditionPlan.chosenPath],
    });
    if (mediaEditionPlan.clampReason === 'bonus_pressure_exceeds_stated_need') {
      extraReasons.push({
        id: 'media_bonus_pressure_clamp',
        severity: 'warn',
        text: '限定感や bonus の圧はあるが、必要性としては版数を増やす根拠がまだ弱め。',
      });
    }
    const actionText: Record<MediaEditionPlannerPath, ActionItem> = {
      buy_standard_only: { id: 'media_standard_only', text: '通常版だけに固定し、限定版比較は今日は打ち切る' },
      buy_limited_only: { id: 'media_limited_only', text: '限定版を1種だけ確保して、他版の追い買いはしない' },
      buy_one_best_fit_edition: { id: 'media_one_best_fit', text: '収録差・封入差を確認して、自分向けの1種だけ選ぶ' },
      buy_one_only_and_stop: { id: 'media_buy_one_and_stop', text: '象徴になる1点だけ選び、「追加で揃えるか」は今回は保留せず終了する' },
      buy_selective_subset: { id: 'media_selective_subset', text: '最推し分・必要差分・強い版だけ残し、フルセット前提は外す' },
      avoid_full_set_chase: { id: 'media_avoid_full_set', text: '全版前提を外し、最推し・用途・予算に合う版だけ残す' },
      full_set_is_not_worth_it: { id: 'media_full_set_not_worth_it', text: 'フルセット前提を外し、セット reward が強い物だけ残して他は切る' },
      full_set_is_justified: { id: 'media_full_set_justified', text: '全版で行くなら総額上限を先に固定し、理由のある版差だけ確認する' },
      wait_and_patch_holes_later: { id: 'media_wait_patch_holes', text: '今は全部抱えず、欠けた分だけ後日相場と状態を見て埋める前提に切り替える' },
      use_secondary_market_for_missing_items: { id: 'media_secondary_market_missing', text: '欠けた分は Mercari / 駿河屋などで送料込み総額と状態を確認して補う' },
      do_not_force_completion: { id: 'media_do_not_force_completion', text: '「全部持っていない不安」を下げるためだけの追加購入は今日はしない' },
      step_back_from_completion_pressure: { id: 'media_step_back_completion_pressure', text: 'コンプ圧が下がるまで全版判断を止め、明日あらためて必要差分だけ見直す' },
      step_back_from_bonus_or_completion_pressure: { id: 'media_step_back_pressure', text: '今日は全版判断を保留し、bonus や comp 圧が引いてから再評価する' },
      choose_one_best_store: { id: 'media_choose_one_store', text: '店舗特典は比較しても最終的には 1店舗に絞り、他店追いは止める' },
      buy_product_but_do_not_chase_all_bonuses: { id: 'media_buy_product_skip_all_bonus_chase', text: '商品本体が欲しい店を1つ選び、all-bonus 回収は今回やらない' },
      split_orders_are_not_worth_it: { id: 'media_skip_split_orders', text: 'split order は見送り、送料と管理負担が少ない 1店舗案に戻す' },
      split_orders_are_justified: { id: 'media_split_orders_justified', text: 'split order をするなら対象店舗を最小限に固定し、総額上限を先に決める' },
      step_back_from_bonus_pressure: { id: 'media_step_back_store_bonus', text: '今日は店舗 bonus 比較をいったん止め、商品本体の必要性だけ残して再評価する' },
    };
    extraActions.unshift(actionText[mediaEditionPlan.chosenPath]);
  }

  if (venueLimitedGoodsPlan) {
    const pathText: Record<VenueLimitedPlannerPath, string> = {
      buy_now_if_it_is_truly_hard_to_recover: '回復経路が弱い根拠がある時だけ、今の確保を優先してよい。',
      wait_for_post_event_mailorder: '事後通販や後日販売のシグナルを待つ方が、FOMO 追いより安全。',
      skip_onsite_chase_and_check_later: '現地で追いかけ回すより、いったん離れて後で確認する方が合理的。',
      fallback_to_used_market_if_missed: '取り逃し後は panic-buy せず、中古・フリマ fallback を計画的に使う。',
      step_back_from_fomo_pressure: '今の圧は true scarcity より雰囲気要因が大きいので、一歩引く方が安全。',
      wait_for_post_event_followup: 'follow-up の見込みがあるなら、live 直後の勢いより後追い確認を優先する方が安全。',
      buy_live_goods_now_if_it_matches_core_motive: 'live goods が core motive に結びつき、回復経路も弱いなら今の確保は正当化できる。',
      skip_atmosphere_driven_goods_chase: 'その場の空気で膨らむ goods chase は止めて、後から残る価値がある物だけに戻す方が安全。',
    };
    extraReasons.unshift({
      id: `venue_limited_${venueLimitedGoodsPlan.chosenPath}`,
      severity: venueLimitedGoodsPlan.chosenPath === 'buy_now_if_it_is_truly_hard_to_recover' ? 'strong' : 'info',
      text: pathText[venueLimitedGoodsPlan.chosenPath],
    });
    if (venueLimitedGoodsPlan.recoveryChangedRecommendation) {
      extraReasons.push({
        id: 'venue_limited_recovery_changed',
        severity: 'info',
        text: '回復可能性が見えているため、限定感そのものでは urgent 推奨にしませんでした。',
      });
    }
    if (venueLimitedGoodsPlan.clampReason === 'atmosphere_pressure_outpaces_evidence') {
      extraReasons.push({
        id: 'venue_limited_fomo_clamp',
        severity: 'warn',
        text: 'いまの焦りは強い一方で、「本当に回復不能」という証拠はまだ薄めです。',
      });
    }

    const actionText: Record<VenueLimitedPlannerPath, ActionItem> = {
      buy_now_if_it_is_truly_hard_to_recover: { id: 'venue_limited_buy_now', text: '買うなら上限金額だけ決めて、回復不能の根拠がある時だけ確保する' },
      wait_for_post_event_mailorder: { id: 'venue_limited_wait_mailorder', text: '事後通販・後日販売の告知を待ち、出なければ再評価する' },
      skip_onsite_chase_and_check_later: { id: 'venue_limited_skip_onsite_chase', text: '現地で追いかけず、あとで公式告知と相場を見てから判断する' },
      fallback_to_used_market_if_missed: { id: 'venue_limited_used_fallback', text: '逃した後は Mercari / 駿河屋などの中古 fallback を前提に、送料込み総額で比較する' },
      step_back_from_fomo_pressure: { id: 'venue_limited_step_back', text: 'いったん離れて、限定表記・後日販売例・相場を確認してから戻る' },
      wait_for_post_event_followup: { id: 'venue_limited_wait_followup', text: 'follow-up 告知や後日販売の有無を待ち、最初の窓だけで決めない' },
      buy_live_goods_now_if_it_matches_core_motive: { id: 'venue_limited_buy_core_live_goods', text: '買うなら「後からも残したい 1点」に絞り、雰囲気買いの追加は止める' },
      skip_atmosphere_driven_goods_chase: { id: 'venue_limited_skip_atmosphere_goods', text: 'その場の勢いで広げず、イベント後にも意味が残るかを基準に残す/外すを決める' },
    };
    extraActions.unshift(actionText[venueLimitedGoodsPlan.chosenPath]);
  }

  let reasons = [...extraReasons, ...reasonsBase].slice(0, 6);
  let actions = [...extraActions, ...actionsBase].slice(0, 3);

  const scoreSpread = stdDev(Object.values(scores));
  const ambiguity = Math.max(0, 1 - Math.abs(scoreSigned));
  let confidence = Math.round(72 + Math.abs(scoreSigned) * 32 - ambiguity * 22 - unknownCount * 6 - (scoreSpread >= 15 ? 4 : 0));
  if (decision === 'THINK') confidence -= 5;
  confidence = clamp(0, 100, confidence);
  const storageNeedsCheck = shouldAskStorage(input.meta.itemKind, input.meta.goodsSubtype) && (input.answers.q_storage_fit === 'NONE' || input.answers.q_storage_fit === 'UNKNOWN');

  if (shouldAskStorage(input.meta.itemKind, input.meta.goodsSubtype)) {
    const storageFit = input.answers.q_storage_fit;
    if (storageFit === 'NONE' || storageFit === 'UNKNOWN') {
      if (decision === 'BUY') decision = 'THINK';
      scores.opportunityCost = clamp(0, 100, scores.opportunityCost + 20);
      confidence = clamp(0, 100, confidence - 10);
      const storageGuidance = getStorageGuidance(input.meta.goodsSubtype);
      reasons.push({ id: 'storage_unconfirmed', severity: 'warn', text: storageGuidance.reason });
      actions.push({ id: 'storage_plan_first', text: storageGuidance.action });
      if (decision === 'THINK') {
        holdSubtype = 'needs_check';
        subtypeReason = '保管・運用条件の確認が済むまで結論を固定しない方が安全。';
      }
    }
  }

  const trustGate = resolveTrustGateOutcome({
    randomGoodsPlan,
    mediaEditionPlan,
    venueLimitedGoodsPlan,
  });
  if (trustGate?.active) {
    tags.push(trustGate.tag, `critical_unknowns_${trustGate.scenario}_${trustGate.criticalUnknownCount}`);
    confidence = Math.min(confidence, trustGate.confidenceCap);
    if (decision === 'BUY' || trustGate.forceHold) {
      decision = 'THINK';
    }
    holdSubtype = 'needs_check';
    subtypeReason = '重要な前提が未回答で、1つの確認で結論が動く可能性があります。';
    reasons.unshift({
      id: `${trustGate.scenario}_trust_gate`,
      severity: 'warn',
      text: trustGate.reason,
    });
    actions.unshift({
      id: `${trustGate.scenario}_trust_gate_fill_missing`,
      text: trustGate.action,
    });
  }

  const rawDecision = decision;
  const preCanonicalDecision = decision;
  const preCanonicalHoldSubtype = holdSubtype;
  const canonicalVerdict = resolveCanonicalVerdict({
    rawDecision,
    scoreSigned,
    holdBand,
    unknownCount,
    factorBuckets,
    trustGateActive: Boolean(trustGate?.active),
    storageNeedsCheck,
    randomGoodsPlan,
    mediaEditionPlan,
    venueLimitedGoodsPlan,
  });
  decision = canonicalVerdict.decision;
  holdSubtype = canonicalVerdict.holdSubtype;
  if (
    canonicalVerdict.canonicalDecisionChanged ||
    decision !== initialReasonDecision ||
    holdSubtype !== initialReasonHoldSubtype ||
    decision !== preCanonicalDecision ||
    holdSubtype !== preCanonicalHoldSubtype
  ) {
    reasonsBase = pickReasons({ meta: input.meta, tags, scores, decision, blindDrawCap, holdSubtype, factorBuckets });
    actionsBase = pickActions({ meta: input.meta, tags, scores, decision, blindDrawCap, holdSubtype, factorBuckets });
    reasons = [...extraReasons, ...reasonsBase].slice(0, 6);
    actions = [...extraActions, ...actionsBase].slice(0, 3);
  }
  if (decision !== 'THINK') {
    subtypeReason = undefined;
  } else if (holdSubtype === 'needs_check') {
    subtypeReason = subtypeReason ?? 'まず1つの重要確認を済ませてから決めるケースです。';
  } else if (holdSubtype === 'conflicting') {
    subtypeReason = '買う根拠と止める根拠が強く衝突しているため、今は無理に決めない方が安全です。';
  } else if (holdSubtype === 'timing_wait') {
    subtypeReason = 'アイテム自体の否定ではなく、今このタイミングを外す判断です。';
  }

  const confidenceLevel = toConfidenceLevel(confidence);
  const verdictStrength = toVerdictStrength(scoreSigned);
  const usedExitPlan = buildUsedExitPlan({
    decision,
    holdSubtype,
    itemKind,
    goodsClass: input.meta.goodsClass,
    resultTags: tags,
    holdTriggers: canonicalVerdict.holdTriggers,
  });

  const downgradeFlags: string[] = [];
  if (unknownCount >= 3) downgradeFlags.push('unknown_count_ge_3');
  if (unknownCount >= 5) downgradeFlags.push('force_hold_unknown_count_ge_5');
  if (impulseFlag) downgradeFlags.push('impulse_nudge_applied');
  if (holdSubtype) downgradeFlags.push(`hold_subtype_${holdSubtype}`);
  if (canonicalVerdict.canonicalDecisionChanged) downgradeFlags.push(`canonical_verdict_promoted_to_${canonicalVerdict.verdictFamily}`);
  if (trustGate?.active) downgradeFlags.push(`${trustGate.tag}_active`);
  if (randomGoodsPlan) {
    downgradeFlags.push(`random_goods_path_${randomGoodsPlan.chosenPath}`);
    if (randomGoodsPlan.clampReason) downgradeFlags.push(`random_goods_clamp_${randomGoodsPlan.clampReason}`);
  }
  if (mediaEditionPlan) {
    downgradeFlags.push(`media_edition_path_${mediaEditionPlan.chosenPath}`);
    if (mediaEditionPlan.clampReason) downgradeFlags.push(`media_edition_clamp_${mediaEditionPlan.clampReason}`);
  }
  if (venueLimitedGoodsPlan) {
    downgradeFlags.push(`venue_limited_path_${venueLimitedGoodsPlan.chosenPath}`);
    if (venueLimitedGoodsPlan.clampReason) downgradeFlags.push(`venue_limited_clamp_${venueLimitedGoodsPlan.clampReason}`);
  }

  const decisionJa = decision === 'BUY' ? '買う' : decision === 'SKIP' ? 'やめる' : '保留';
  const positiveFactors = getTopFactors(scores, 'positive');
  const negativeFactors = getTopFactors(scores, 'negative');
  const explain = buildExplanations({ decision, holdSubtype, buckets: factorBuckets, unknownCount, itemKind });
  const shareText = buildShareText(decisionJa, reasons);
  const presentation = buildPresentation({ decision, actions, reasons });
  const bandTrace = computeResultBandTrace({
    questionSet: input.questionSet,
    answers: input.answers,
    output: {
      decision,
      holdSubtype,
      verdictFamily: canonicalVerdict.verdictFamily,
      displayVerdictKey: canonicalVerdict.displayVerdictKey,
      confidenceLevel,
      verdictStrength,
      confidence,
      score: clamp(-1, 1, scoreSigned),
      scoreSummary: scores,
      reasons,
      actions,
      merchMethod: {
        method: method.method,
        blindDrawCap,
        note: input.useCase === 'game_billing' ? 'ゲーム課金（共通ロジック）' : method.note,
      },
      shareText: '',
      positiveFactors: [],
      negativeFactors: [],
      blockingFactors: explain.blockingFactors,
      recommendationReasons: explain.recommendationReasons,
      subtypeReason,
      whyNotBuyYet: explain.whyNotBuyYet,
      whyNotSkipYet: explain.whyNotSkipYet,
      factorBuckets,
      presentation,
      mediaEditionPlan,
      randomGoodsPlan,
      venueLimitedGoodsPlan,
      diagnosticTrace: {
        resultInputsSummary: {
          tags: [...tags],
          unknownCount,
          impulseFlag,
          futureUseFlag,
          downgradeFlags,
          verdictFamily: canonicalVerdict.verdictFamily,
          holdSubtype: canonicalVerdict.holdSubtype ?? null,
          displayVerdictKey: canonicalVerdict.displayVerdictKey,
          confidenceLevel,
          verdictStrength,
          rawDecision,
          buySignals: getTopFactors(scores, 'positive'),
          stopSignals: getTopFactors(scores, 'negative'),
          blockers: explain.blockingFactors,
          holdTriggers: canonicalVerdict.holdTriggers,
          usedExit: {
            shown: Boolean(usedExitPlan?.providers.length),
            mode: usedExitPlan?.mode ?? null,
            providers: usedExitPlan?.providers.map((provider) => provider.key) ?? [],
            why: usedExitPlan?.why ?? [],
            checklistFirstSuppressed: usedExitPlan?.mode === 'check_first',
            suppressPurchaseTone: usedExitPlan?.suppressPurchaseTone === true,
          },
        },
        mediaEditionPlan,
        randomGoodsPlan,
        venueLimitedGoodsPlan,
        usedExitPlan,
      },
    },
  });

  return {
    decision,
    holdSubtype,
    verdictFamily: canonicalVerdict.verdictFamily,
    displayVerdictKey: canonicalVerdict.displayVerdictKey,
    confidenceLevel,
    verdictStrength,
    confidence,
    score: clamp(-1, 1, scoreSigned),
    scoreSummary: scores,
    reasons,
    actions,
    merchMethod: {
      method: method.method,
      blindDrawCap,
      note: input.useCase === 'game_billing' ? 'ゲーム課金（共通ロジック）' : method.note,
    },
    bandTrace,
    shareText,
    positiveFactors,
    negativeFactors,
    blockingFactors: explain.blockingFactors,
    recommendationReasons: explain.recommendationReasons,
    subtypeReason,
    whyNotBuyYet: explain.whyNotBuyYet,
    whyNotSkipYet: explain.whyNotSkipYet,
    factorBuckets,
    presentation,
    mediaEditionPlan,
    randomGoodsPlan,
    venueLimitedGoodsPlan,
    usedExitPlan,
    diagnosticTrace: {
      resultInputsSummary: {
        tags: [...tags],
        unknownCount,
        impulseFlag,
        futureUseFlag,
        downgradeFlags,
        verdictFamily: canonicalVerdict.verdictFamily,
        holdSubtype: canonicalVerdict.holdSubtype ?? null,
        displayVerdictKey: canonicalVerdict.displayVerdictKey,
        confidenceLevel,
        verdictStrength,
        rawDecision,
        buySignals: positiveFactors,
        stopSignals: negativeFactors,
        blockers: explain.blockingFactors,
        holdTriggers: canonicalVerdict.holdTriggers,
        usedExit: {
          shown: Boolean(usedExitPlan?.providers.length),
          mode: usedExitPlan?.mode ?? null,
          providers: usedExitPlan?.providers.map((provider) => provider.key) ?? [],
          why: usedExitPlan?.why ?? [],
          checklistFirstSuppressed: usedExitPlan?.mode === 'check_first',
          suppressPurchaseTone: usedExitPlan?.suppressPurchaseTone === true,
        },
        bandTrace,
      },
      mediaEditionPlan,
      randomGoodsPlan,
      venueLimitedGoodsPlan,
      usedExitPlan,
    },
  };
}
