import fs from "node:fs";
import path from "node:path";
import { evaluate } from "@/src/oshihapi/engine";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { getOptionalMetaHint, isGoodsClassApplicable } from "@/src/oshihapi/homeFunnel";
import { resolveFlowQuestions } from "@/src/oshihapi/flowResolver";
import { parseSearchClues } from "@/src/oshihapi/input/parseSearchClues";
import { pruneAnswersAfterQuestion } from "@/src/oshihapi/flowState";
import {
  saveDiagnosisState,
  loadDiagnosisState,
  type DiagnosisState,
  findLatestCompatibleDraft,
  clearCompatibleDrafts,
  createReplayDraft,
} from "@/src/store/diagnosisStore";
import type { AnswerValue, DecisionOutput, GoodsClass, ItemKind, Mode } from "@/src/oshihapi/model";

type Scenario = {
  id: string;
  mode: Mode;
  itemKind: ItemKind;
  goodsClass?: GoodsClass;
  styleMode: "standard" | "kawaii" | "oshi";
  metaVariant: "empty" | "price" | "deadline" | "full";
  answers?: Record<string, AnswerValue>;
  minBranchHitIds?: string[];
};

function buildMeta(metaVariant: Scenario["metaVariant"], itemKind: ItemKind, goodsClass: GoodsClass) {
  const base = { itemKind, goodsClass } as const;
  if (metaVariant === "empty") return { ...base };
  if (metaVariant === "price") return { ...base, priceYen: 3600 };
  if (metaVariant === "deadline") return { ...base, deadline: "tomorrow" as const };
  return { ...base, itemName: "テスト商品", priceYen: 4200, deadline: "in3days" as const };
}

function defaultAnswer(questionId: string): AnswerValue {
  if (questionId.startsWith("gb_")) {
    if (questionId === "gb_q2_type") return "gacha";
    if (questionId === "gb_q10_pity") return "near";
    return "some";
  }
  if (questionId === "q_storage_fit") return "PROBABLE";
  if (questionId === "q_storage_space") return "adjust";
  if (questionId === "q_budget_pain") return "some";
  if (questionId === "q_motives_multi") return ["use"];
  if (questionId === "q_goal") return "single";
  if (questionId === "q_addon_goods_event_limit_context") return "none";
  if (questionId === "q_addon_goods_post_event_mailorder") return "maybe";
  if (questionId === "q_addon_goods_wait_tolerance") return "medium";
  if (questionId === "q_addon_goods_first_chance_tolerance") return "medium";
  if (questionId === "q_addon_goods_used_fallback") return "medium";
  if (questionId === "q_addon_goods_scarcity_pressure") return "medium";
  if (questionId === "q_addon_goods_venue_motive") return "practical_collecting";
  if (questionId === "q_addon_goods_live_goods_motive") return "mixed";
  if (questionId === "q_addon_goods_regret_axis") return "balanced";
  if (questionId === "q_hot_cold") return "normal";
  if (questionId === "q_price_feel") return "normal";
  if (questionId === "q_alternative_plan") return "maybe";
  if (questionId === "q_rarity_restock") return "maybe";
  if (questionId === "q_urgency") return "low_stock";
  if (questionId === "q_regret_impulse") return "calm";
  if (questionId === "q_impulse_axis_short") return 3;
  if (questionId === "q_desire") return 3;
  if (questionId.includes("blind_draw")) return "maybe";
  if (questionId === "q_addon_media_single_vs_set_intent") return "one_best_fit_version";
  if (questionId === "q_addon_media_completion_satisfaction") return "medium";
  if (questionId === "q_addon_media_used_market_recovery") return "buy_now_primary";
  if (questionId === "q_addon_media_used_market_comfort") return "medium";
  if (questionId === "q_addon_media_completion_pressure_type") return "personal_standard";
  if (questionId === "q_addon_media_set_reward_strength") return "medium";
  if (questionId === "q_addon_media_bonus_importance") return "medium";
  if (questionId === "q_addon_media_multi_store_tolerance") return "compare_then_one";
  if (questionId === "q_addon_media_split_order_burden") return "medium";
  if (questionId === "q_addon_voice_cd_kind") return "drama_cd_main";
  if (questionId === "q_addon_voice_cast_check") return "important_confirmed";
  if (questionId === "q_addon_voice_bonus_is_audio" || questionId === "q_addon_voice_audio_bonus_value") return "nice_to_have";
  if (questionId === "q_addon_voice_listen_timing" || questionId === "q_addon_voice_listen_intent") return "maybe_later";
  if (questionId.includes("ticket")) return "partly";
  if (questionId.includes("preorder")) return "unknown";
  if (questionId.includes("used")) return "careful";
  if (questionId.includes("addon")) return "partial";
  return "some";
}

function runScenario(s: Scenario) {
  const goodsClass = s.goodsClass ?? "small_collection";
  const meta = buildMeta(s.metaVariant, s.itemKind, goodsClass);
  const flow = resolveFlowQuestions({
    mode: s.mode,
    itemKind: s.itemKind,
    goodsClass,
    goodsSubtype: "general",
    useCase: s.itemKind === "game_billing" ? "game_billing" : "merch",
    answers: s.answers ?? {},
    meta,
    styleMode: s.styleMode,
  });

  const answerMap: Record<string, AnswerValue> = {};
  for (const q of flow.questions) {
    answerMap[q.id] = s.answers?.[q.id] ?? defaultAnswer(q.id);
  }

  const output = evaluate({
    questionSet: { id: "scenario", locale: "ja", category: "merch", version: 1, questions: flow.questions },
    meta,
    answers: answerMap,
    mode: s.mode,
    useCase: s.itemKind === "game_billing" ? "game_billing" : "merch",
  });

  const hitIds = new Set(flow.diagnosticTrace.branchHits.map((b) => b.id));
  for (const branchId of s.minBranchHitIds ?? []) {
    if (!hitIds.has(branchId)) {
      throw new Error(`${s.id}: missing expected branch hit ${branchId}`);
    }
  }

  validateResultShape(s.id, output);

  return {
    id: s.id,
    questionCount: flow.questions.length,
    shownQuestionIds: flow.diagnosticTrace.shownQuestionIds,
    branchHits: flow.diagnosticTrace.branchHits.map((b) => b.id),
    result: {
      decision: output.decision,
      holdSubtype: output.holdSubtype,
      confidence: output.confidence,
      score: output.score,
      reasonCount: output.reasons.length,
      actionCount: output.actions.length,
    },
  };
}

function validateResultShape(id: string, output: DecisionOutput) {
  if (!output.decision) throw new Error(`${id}: decision missing`);
  if (!output.verdictFamily) throw new Error(`${id}: verdictFamily missing`);
  if (!output.displayVerdictKey) throw new Error(`${id}: displayVerdictKey missing`);
  if (!Number.isFinite(output.confidence)) throw new Error(`${id}: confidence missing`);
  if (!Array.isArray(output.reasons) || output.reasons.length === 0) throw new Error(`${id}: reasons missing`);
  if (!Array.isArray(output.actions) || output.actions.length === 0) throw new Error(`${id}: actions missing`);
  if (output.usedExitPlan) {
    if (!output.usedExitPlan.mode) throw new Error(`${id}: usedExitPlan mode missing`);
    if (!Array.isArray(output.usedExitPlan.why) || output.usedExitPlan.why.length === 0) {
      throw new Error(`${id}: usedExitPlan why missing`);
    }
    if (!Array.isArray(output.usedExitPlan.providers)) throw new Error(`${id}: usedExitPlan providers missing`);
  }
}

function buildEvaluatedOutput(
  itemKind: ItemKind,
  overrides: Record<string, AnswerValue>,
  goodsClass: GoodsClass = 'small_collection',
  metaOverrides: Partial<{
    itemName: string;
    searchClueRaw: string;
    parsedSearchClues: ReturnType<typeof parseSearchClues>;
    priceYen: number;
  }> = {},
) {
  const meta = {
    itemKind,
    goodsClass,
    itemName: metaOverrides.itemName ?? '検証',
    priceYen: metaOverrides.priceYen ?? 4000,
    searchClueRaw: metaOverrides.searchClueRaw,
    parsedSearchClues: metaOverrides.parsedSearchClues,
  };
  const flow = resolveFlowQuestions({
    mode: 'long',
    itemKind,
    goodsClass,
    goodsSubtype: 'general',
    useCase: itemKind === 'game_billing' ? 'game_billing' : 'merch',
    answers: overrides,
    meta,
    styleMode: 'standard',
  });
  const answers: Record<string, AnswerValue> = {};
  for (const q of flow.questions) {
    answers[q.id] = overrides[q.id] ?? defaultAnswer(q.id);
  }
  return evaluate({
    questionSet: { id: 'check', locale: 'ja', category: 'merch', version: 1, questions: flow.questions },
    meta,
    answers,
    mode: 'long',
    useCase: itemKind === 'game_billing' ? 'game_billing' : 'merch',
  });
}

function runRefreshRestoreCheck() {
  const store = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
  };
  const state: DiagnosisState = {
    answers: { q_desire: 4, q_budget_pain: "some" },
    currentQuestionIndex: 2,
    mode: "long",
    itemKind: "used",
    goodsClass: "tech",
    decisiveness: "careful",
    styleMode: "oshi",
    meta: { itemName: "A", priceYen: 5500, deadline: "today", itemKind: "used", goodsClass: "tech" },
  };
  saveDiagnosisState(state);
  const loaded = loadDiagnosisState();
  if (!loaded || loaded.mode !== "long" || loaded.itemKind !== "used" || loaded.styleMode !== "oshi" || loaded.currentQuestionIndex !== 2) {
    throw new Error("refresh_restore: critical fields not restored");
  }
  if (loaded.answers.q_desire !== 4) throw new Error("refresh_restore: answers not restored");
}

function runBackChangeCheck() {
  const initial = resolveFlowQuestions({
    mode: "short",
    itemKind: "goods",
    goodsClass: "small_collection",
    goodsSubtype: "general",
    useCase: "merch",
    answers: { q_storage_fit: "UNKNOWN" },
    meta: { itemKind: "goods", goodsClass: "small_collection" },
    styleMode: "standard",
  });
  if (!initial.questions.some((q) => q.id === "q_storage_space")) {
    throw new Error("back_change: expected q_storage_space before change");
  }

  const changedAnswers = pruneAnswersAfterQuestion(
    { q_storage_fit: "UNKNOWN", q_storage_space: "tight", q_desire: 2 },
    initial.questions,
    "q_storage_fit",
  );
  const recomputed = resolveFlowQuestions({
    mode: "short",
    itemKind: "goods",
    goodsClass: "small_collection",
    goodsSubtype: "general",
    useCase: "merch",
    answers: { ...changedAnswers, q_storage_fit: "OK" },
    meta: { itemKind: "goods", goodsClass: "small_collection" },
    styleMode: "standard",
  });

  if (Object.prototype.hasOwnProperty.call(changedAnswers, "q_storage_space")) {
    throw new Error("back_change: stale downstream answer not pruned");
  }
  if (recomputed.questions.length === 0) throw new Error("back_change: recompute failed");
}



function runDraftInvalidationCheck() {
  const store = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
  };

  (globalThis as any).window.localStorage.setItem(
    "oshihapi:diagnosis:drafts:v1",
    JSON.stringify([
      {
        draftId: "stale-1",
        createdAt: Date.now() - 20,
        updatedAt: Date.now() - 20,
        schemaVersion: 0,
        questionBankVersion: 0,
        flowConfigHash: "old",
        runContext: { mode: "short", itemKind: "goods", goodsClass: "small_collection", styleMode: "standard" },
        decisiveness: "standard",
        answers: { q_desire: 3 },
        shownQuestionIds: ["q_desire"],
        skippedQuestionIds: [],
        currentQuestionIndex: 0,
        currentQuestionId: "q_desire",
        persistenceState: "fresh",
      },
    ]),
  );

  const restored = findLatestCompatibleDraft({ mode: "short", itemKind: "goods", goodsClass: "small_collection", styleMode: "standard" });
  if (restored.status !== "invalidated") throw new Error("draft_invalidation: stale draft should be invalidated");
}

function runReplaySeedCheck() {
  const run = {
    runId: "run-old",
    createdAt: Date.now(),
    locale: "ja",
    category: "merch",
    mode: "medium",
    meta: { itemKind: "goods", goodsClass: "paper", itemName: "A", deadline: "tomorrow" },
    answers: { q_desire: 4 },
    output: {
      decision: "THINK", confidence: 50, score: 0, scoreSummary: {
        desire: 50, affordability: 50, urgency: 50, rarity: 50, restockChance: 50, regretRisk: 50, impulse: 50, opportunityCost: 50,
      },
      reasons: [{ id: "r", text: "r" }],
      actions: [{ id: "a", text: "a" }],
      merchMethod: { method: "PASS", note: "n" },
      shareText: "s",
    },
    diagnosticTrace: { runContext: { mode: "medium", itemKind: "goods", goodsClass: "paper", hasPrice: false, hasItemName: true }, shownQuestionIds: ["q_desire"], skippedQuestionIds: [], branchHits: [], branchMisses: [] },
  } as any;
  const replay = createReplayDraft(run, "oshi");
  if (replay.persistenceState !== "replaySeeded" || replay.replaySeedRunId !== "run-old") {
    throw new Error("replay_seed: replay draft metadata missing");
  }
  clearCompatibleDrafts({ mode: "medium", itemKind: "goods", goodsClass: "paper", styleMode: "oshi" });
  const afterClear = findLatestCompatibleDraft({ mode: "medium", itemKind: "goods", goodsClass: "paper", styleMode: "oshi" });
  if (afterClear.status === "restored") throw new Error("start_new: compatible draft should clear deterministically");
}

function runScoringSeparationChecks() {
  const build = (itemKind: ItemKind, overrides: Record<string, AnswerValue>) => buildEvaluatedOutput(itemKind, overrides);

  const highBuy = build('goods', {
    q_motives_multi: ['use'],
    q_budget_pain: 'ok',
    q_desire: 5,
    q_price_feel: 'good',
    q_regret_impulse: 'calm',
    q_impulse_axis_short: 1,
    q_addon_common_info: 'enough',
  });
  if (highBuy.decision !== 'BUY') throw new Error('separation: high desire low risk should allow BUY');

  const highRiskHold = build('goods', {
    q_motives_multi: ['fomo', 'rush'],
    q_budget_pain: 'force',
    q_desire: 3,
    q_price_feel: 'unknown',
    q_regret_impulse: 'tired',
    q_impulse_axis_short: 5,
    q_addon_common_info: 'lack',
  });
  if (highRiskHold.decision === 'BUY') throw new Error('separation: high impulse+uncertainty+budget pain should not BUY');

  const lowDesireSkip = build('goods', {
    q_motives_multi: ['vague'],
    q_budget_pain: 'hard',
    q_desire: 1,
    q_price_feel: 'high',
    q_regret_impulse: 'fomo',
    q_impulse_axis_short: 4,
    q_addon_common_info: 'lack',
  });
  if (lowDesireSkip.decision !== 'SKIP') throw new Error('separation: low desire + high cost should bias SKIP');

  const plainGoods = build('goods', { q_addon_common_info: 'enough', q_regret_impulse: 'calm' });
  const usedRisk = build('used', {
    q_addon_used_condition: 'hard',
    q_addon_used_price_gap: 'small',
    q_addon_used_defect_return: 'not_ok',
    q_addon_used_authenticity: 'unknown',
    q_addon_common_info: 'partial',
  });
  if (usedRisk.decision === plainGoods.decision && usedRisk.holdSubtype === plainGoods.holdSubtype) {
    throw new Error('separation: used-specific risk should differ from plain goods');
  }

  const blindHighRisk = build('blind_draw', {
    q_addon_blind_draw_cap: 'not_good',
    q_addon_blind_draw_exit: 'complete',
    q_addon_blind_draw_duplicate_tolerance: 'low',
    q_addon_blind_draw_trade_intent: 'no',
    q_addon_blind_draw_exchange_friction: 'high',
    q_addon_blind_draw_single_fallback: 'now',
    q_addon_blind_draw_stop_budget: 'over_limit',
    q_addon_blind_draw_miss_pain: 'high',
    q_regret_impulse: 'excited',
  });
  if (
    blindHighRisk.decision === plainGoods.decision &&
    blindHighRisk.holdSubtype === plainGoods.holdSubtype &&
    Math.abs(blindHighRisk.score - plainGoods.score) < 0.12
  ) {
    throw new Error('separation: blind_draw high risk should differ from normal goods');
  }
  if (blindHighRisk.randomGoodsPlan?.chosenPath !== 'step_back_from_completion_pressure') {
    throw new Error('separation: blind_draw high risk should clamp to completion-pressure step-back');
  }

  const blindExchange = build('blind_draw', {
    q_goal: 'set',
    q_addon_blind_draw_cap: 'used_to_it',
    q_addon_blind_draw_exit: 'mixed',
    q_addon_blind_draw_duplicate_tolerance: 'medium',
    q_addon_blind_draw_trade_intent: 'yes',
    q_addon_blind_draw_exchange_friction: 'low',
    q_addon_blind_draw_single_fallback: 'after_stop',
    q_addon_blind_draw_stop_budget: 'soft',
    q_regret_impulse: 'calm',
  });
  if (blindExchange.randomGoodsPlan?.chosenPath !== 'switch_to_exchange_path') {
    throw new Error('separation: exchange-friendly blind_draw should choose exchange path');
  }

  const blindFun = build('blind_draw', {
    q_goal: 'fun',
    q_addon_blind_draw_cap: 'used_to_it',
    q_addon_blind_draw_exit: 'fun',
    q_addon_blind_draw_duplicate_tolerance: 'high',
    q_addon_blind_draw_trade_intent: 'no',
    q_addon_blind_draw_exchange_friction: 'medium',
    q_addon_blind_draw_single_fallback: 'after_stop',
    q_addon_blind_draw_stop_budget: 'strict',
    q_regret_impulse: 'calm',
  });
  if (blindFun.randomGoodsPlan?.chosenPath !== 'continue_a_little_more') {
    throw new Error('separation: fun blind_draw should allow a limited continue path');
  }

  const shortFavorableBuy = evaluate({
    questionSet: merch_v2_ja,
    answers: {
      q_motives_multi: ['use'],
      q_budget_pain: 'ok',
      q_desire: 4,
      q_price_feel: 'good',
      q_regret_impulse: 'calm',
      q_impulse_axis_short: 1,
      q_addon_common_info: 'enough',
      q_addon_goods_event_limit_context: 'none',
      q_addon_goods_post_event_mailorder: 'likely',
      q_addon_goods_wait_tolerance: 'high',
      q_addon_goods_first_chance_tolerance: 'high',
      q_addon_goods_used_fallback: 'high',
      q_addon_goods_scarcity_pressure: 'low',
      q_addon_goods_live_goods_motive: 'symbolic_value',
      q_addon_goods_regret_axis: 'balanced',
    },
    meta: { itemKind: 'goods', goodsClass: 'small_collection' },
    mode: 'short',
    decisiveness: 'standard',
  });
  if (shortFavorableBuy.decision !== 'BUY') {
    throw new Error('separation: favorable informed short flow should allow BUY instead of defaulting to THINK');
  }

  const billingNeedClear = build('game_billing', {
    gb_q1_need: 'clear', gb_q2_type: 'pass', gb_q3_budget: 'easy', gb_q4_future_use: 'high', gb_q6_mood: 'calm', gb_q8_wait: 'same', gb_q9_info: 'done',
  });
  const billingImpulsive = build('game_billing', {
    gb_q1_need: 'unclear', gb_q2_type: 'gacha', gb_q3_budget: 'hard', gb_q4_future_use: 'low', gb_q6_mood: 'rush', gb_q8_wait: 'drop', gb_q9_info: 'none', gb_q10_pity: 'far',
  });
  if (billingNeedClear.decision === billingImpulsive.decision && billingNeedClear.holdSubtype === billingImpulsive.holdSubtype) {
    throw new Error('separation: game_billing clear-need should differ from impulsive uncertain gacha');
  }

  if ([highBuy, highRiskHold, lowDesireSkip, plainGoods, usedRisk, blindHighRisk, blindExchange, blindFun, billingNeedClear, billingImpulsive].some((o) => o.confidence < 0 || o.confidence > 100)) {
    throw new Error('bounds: confidence must stay within 0..100');
  }
}

function runBlindDrawAcceptanceChecks() {
  const cases = [
    {
      id: 'one_oshi_low_duplicate_low_exchange',
      output: buildEvaluatedOutput('blind_draw', {
        q_goal: 'single',
        q_addon_blind_draw_exit: 'oshi_only',
        q_addon_blind_draw_duplicate_tolerance: 'low',
        q_addon_blind_draw_trade_intent: 'no',
        q_addon_blind_draw_exchange_friction: 'medium',
        q_addon_blind_draw_single_fallback: 'after_stop',
        q_addon_blind_draw_stop_budget: 'soft',
        q_budget_pain: 'some',
        q_regret_impulse: 'calm',
      }, 'itabag_badge'),
      assert(output: DecisionOutput) {
        const plan = output.randomGoodsPlan;
        if (!plan) throw new Error('one_oshi_low_duplicate_low_exchange: randomGoodsPlan missing');
        if (plan.chosenPath !== 'stop_drawing_check_used_market') throw new Error('one_oshi_low_duplicate_low_exchange: should bias to early stop via used-market fallback');
        if (plan.continuingJustified) throw new Error('one_oshi_low_duplicate_low_exchange: continue optimism should not remain');
        if (!plan.usedMarketRecommended || plan.clampReason !== 'single_target_duplicate_risk') throw new Error('one_oshi_low_duplicate_low_exchange: should preserve duplicate-risk fallback clamp');
      },
    },
    {
      id: 'one_oshi_exchange_high_friction',
      output: buildEvaluatedOutput('blind_draw', {
        q_goal: 'single',
        q_addon_blind_draw_exit: 'oshi_only',
        q_addon_blind_draw_duplicate_tolerance: 'medium',
        q_addon_blind_draw_trade_intent: 'yes',
        q_addon_blind_draw_exchange_friction: 'high',
        q_addon_blind_draw_single_fallback: 'after_stop',
        q_addon_blind_draw_stop_budget: 'soft',
        q_budget_pain: 'some',
        q_regret_impulse: 'calm',
      }, 'itabag_badge'),
      assert(output: DecisionOutput) {
        const plan = output.randomGoodsPlan;
        if (!plan) throw new Error('one_oshi_exchange_high_friction: randomGoodsPlan missing');
        if (plan.exchangeWillingness !== 'high' || plan.exchangeFriction !== 'high') throw new Error('one_oshi_exchange_high_friction: exchange signals not captured');
        if (plan.chosenPath === 'switch_to_exchange_path' || plan.exchangeAssumptionChangedRecommendation) throw new Error('one_oshi_exchange_high_friction: high friction must block over-optimistic exchange recommendation');
        if (!plan.reasons.some((reason) => reason.includes('負担が高い'))) throw new Error('one_oshi_exchange_high_friction: reasons should preserve exchange-friction warning');
      },
    },
    {
      id: 'fun_casual_high_duplicate_loose_budget',
      output: buildEvaluatedOutput('blind_draw', {
        q_goal: 'fun',
        q_addon_blind_draw_exit: 'fun',
        q_addon_blind_draw_duplicate_tolerance: 'high',
        q_addon_blind_draw_trade_intent: 'no',
        q_addon_blind_draw_exchange_friction: 'medium',
        q_addon_blind_draw_single_fallback: 'after_stop',
        q_addon_blind_draw_stop_budget: 'soft',
        q_budget_pain: 'ok',
        q_regret_impulse: 'calm',
      }, 'small_collection'),
      assert(output: DecisionOutput) {
        const plan = output.randomGoodsPlan;
        if (!plan) throw new Error('fun_casual_high_duplicate_loose_budget: randomGoodsPlan missing');
        if (plan.chosenPath !== 'continue_a_little_more' || !plan.continuingJustified) throw new Error('fun_casual_high_duplicate_loose_budget: fun/casual case should allow limited continuation');
        if (!plan.stopLineOptimizingFor.includes('楽しさ')) throw new Error('fun_casual_high_duplicate_loose_budget: soft stop-line rationale should stay visible');
      },
    },
    {
      id: 'full_set_tight_budget_completion_fallback',
      output: buildEvaluatedOutput('blind_draw', {
        q_goal: 'set',
        q_addon_blind_draw_exit: 'complete',
        q_addon_blind_draw_duplicate_tolerance: 'medium',
        q_addon_blind_draw_trade_intent: 'yes',
        q_addon_blind_draw_exchange_friction: 'medium',
        q_addon_blind_draw_single_fallback: 'now',
        q_addon_blind_draw_stop_budget: 'soft',
        q_budget_pain: 'hard',
        q_regret_impulse: 'calm',
        q_addon_blind_draw_miss_pain: 'high',
      }, 'itabag_badge'),
      assert(output: DecisionOutput) {
        const plan = output.randomGoodsPlan;
        if (!plan) throw new Error('full_set_tight_budget_completion_fallback: randomGoodsPlan missing');
        if (plan.chosenPath !== 'stop_drawing_buy_singles') throw new Error('full_set_tight_budget_completion_fallback: full-set+tight-budget should prefer completion fallback');
        if (plan.continuingJustified) throw new Error('full_set_tight_budget_completion_fallback: continued draw should be discouraged');
        if (!plan.usedMarketRecommended || plan.clampReason !== 'full_set_budget_unfavorable') throw new Error('full_set_tight_budget_completion_fallback: budget clamp should drive singles/used fallback');
      },
    },
  ];

  return cases.map((entry) => {
    entry.assert(entry.output);
    const plan = entry.output.randomGoodsPlan!;
    return {
      id: entry.id,
      decision: entry.output.decision,
      chosenPath: plan.chosenPath,
      clampReason: plan.clampReason ?? null,
      continuingJustified: plan.continuingJustified,
      exchangeAssumptionChangedRecommendation: plan.exchangeAssumptionChangedRecommendation,
      usedMarketRecommended: plan.usedMarketRecommended,
      reasons: plan.reasons,
    };
  });
}

function runMediaEditionAcceptanceChecks() {
  const cases = [
    {
      id: 'one_oshi_budget_constrained_limited_temptation',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'single',
        q_motives_multi: ['content'],
        q_budget_pain: 'hard',
        q_addon_media_motive: 'character_ip',
        q_addon_media_support_scope: 'one_oshi',
        q_addon_media_collection_budget: 'efficient',
        q_addon_media_edition_intent: 'limited_preferred',
        q_addon_media_member_version: 'specific_version',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'maybe',
        q_addon_media_bonus_importance: 'low',
        q_addon_media_multi_store_tolerance: 'one_store_ok',
        q_addon_media_split_order_burden: 'medium',
        q_addon_media_random_goods_intent: 'none',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('one_oshi_budget_constrained_limited_temptation: mediaEditionPlan missing');
        if (!['buy_one_best_fit_edition', 'buy_limited_only', 'choose_one_best_store', 'buy_product_but_do_not_chase_all_bonuses'].includes(plan.chosenPath)) {
          throw new Error('one_oshi_budget_constrained_limited_temptation: should avoid all-edition chase');
        }
        if (plan.oneOshiVsBox !== 'one_oshi' || plan.budgetAlignment !== 'weak') throw new Error('one_oshi_budget_constrained_limited_temptation: core axes not captured');
      },
    },
    {
      id: 'box_group_high_completeness_healthy_budget',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'set',
        q_motives_multi: ['support', 'complete'],
        q_budget_pain: 'ok',
        q_addon_media_motive: 'balanced',
        q_addon_media_support_scope: 'box_group',
        q_addon_media_collection_budget: 'complete',
        q_addon_media_edition_intent: 'all_editions',
        q_addon_media_single_vs_set_intent: 'full_set_bundle',
        q_addon_media_completion_satisfaction: 'low',
        q_addon_media_used_market_recovery: 'buy_now_primary',
        q_addon_media_used_market_comfort: 'low',
        q_addon_media_completion_pressure_type: 'box_group_desire',
        q_addon_media_set_reward_strength: 'strong',
        q_addon_media_member_version: 'multiple_versions',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'yes',
        q_addon_media_bonus_importance: 'low',
        q_addon_media_multi_store_tolerance: 'one_store_ok',
        q_addon_media_split_order_burden: 'low',
        q_addon_media_random_goods_intent: 'none',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('box_group_high_completeness_healthy_budget: mediaEditionPlan missing');
        if (plan.chosenPath !== 'full_set_is_justified') throw new Error('box_group_high_completeness_healthy_budget: aligned box-support case should justify full set');
      },
    },
    {
      id: 'one_oshi_selective_satisfaction',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'single',
        q_motives_multi: ['content'],
        q_budget_pain: 'some',
        q_addon_media_motive: 'character_ip',
        q_addon_media_support_scope: 'one_oshi',
        q_addon_media_collection_budget: 'efficient',
        q_addon_media_edition_intent: 'one_best_fit',
        q_addon_media_single_vs_set_intent: 'one_symbolic_item',
        q_addon_media_completion_satisfaction: 'high',
        q_addon_media_used_market_recovery: 'buy_now_primary',
        q_addon_media_used_market_comfort: 'low',
        q_addon_media_completion_pressure_type: 'personal_standard',
        q_addon_media_set_reward_strength: 'weak',
        q_addon_media_member_version: 'specific_version',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'yes',
        q_addon_media_bonus_importance: 'low',
        q_addon_media_multi_store_tolerance: 'one_store_ok',
        q_addon_media_split_order_burden: 'medium',
        q_addon_media_random_goods_intent: 'none',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('one_oshi_selective_satisfaction: mediaEditionPlan missing');
        if (plan.chosenPath !== 'buy_one_only_and_stop') throw new Error('one_oshi_selective_satisfaction: should stop at one meaningful item');
        if (plan.motiveRefinementAxis !== 'character_one_oshi') throw new Error('one_oshi_selective_satisfaction: motive refinement axis should capture character x one-oshi');
      },
    },
    {
      id: 'completion_anxiety_weak_motive',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'set',
        q_motives_multi: ['fomo'],
        q_budget_pain: 'some',
        q_addon_media_motive: 'balanced',
        q_addon_media_support_scope: 'balanced',
        q_addon_media_collection_budget: 'balanced',
        q_addon_media_edition_intent: 'all_editions',
        q_addon_media_single_vs_set_intent: 'full_set_bundle',
        q_addon_media_completion_satisfaction: 'low',
        q_addon_media_used_market_recovery: 'buy_now_primary',
        q_addon_media_used_market_comfort: 'low',
        q_addon_media_completion_pressure_type: 'complete_collection_image',
        q_addon_media_set_reward_strength: 'weak',
        q_addon_media_member_version: 'none',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'maybe',
        q_addon_media_bonus_importance: 'low',
        q_addon_media_multi_store_tolerance: 'one_store_ok',
        q_addon_media_split_order_burden: 'medium',
        q_addon_media_random_goods_intent: 'none',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('completion_anxiety_weak_motive: mediaEditionPlan missing');
        if (!['do_not_force_completion', 'step_back_from_completion_pressure', 'full_set_is_not_worth_it'].includes(plan.chosenPath)) {
          throw new Error('completion_anxiety_weak_motive: should clamp anxiety-driven completion');
        }
        if (plan.completionPressureType !== 'complete_collection_image') throw new Error('completion_anxiety_weak_motive: diagnostics should expose pressure type');
      },
    },
    {
      id: 'missed_item_wait_and_patch',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'single',
        q_motives_multi: ['content'],
        q_budget_pain: 'some',
        q_addon_media_motive: 'cast_performer',
        q_addon_media_support_scope: 'one_oshi',
        q_addon_media_collection_budget: 'balanced',
        q_addon_media_edition_intent: 'one_best_fit',
        q_addon_media_single_vs_set_intent: 'selective_subset',
        q_addon_media_completion_satisfaction: 'high',
        q_addon_media_used_market_recovery: 'wait_and_patch',
        q_addon_media_used_market_comfort: 'high',
        q_addon_media_completion_pressure_type: 'personal_standard',
        q_addon_media_set_reward_strength: 'weak',
        q_addon_media_member_version: 'specific_version',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'yes',
        q_addon_media_bonus_importance: 'low',
        q_addon_media_multi_store_tolerance: 'one_store_ok',
        q_addon_media_split_order_burden: 'medium',
        q_addon_media_random_goods_intent: 'none',
        q_addon_goods_regret_axis: 'overpay_more',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('missed_item_wait_and_patch: mediaEditionPlan missing');
        if (!['wait_and_patch_holes_later', 'use_secondary_market_for_missing_items'].includes(plan.chosenPath)) {
          throw new Error('missed_item_wait_and_patch: should prefer patch-holes-later guidance');
        }
        if (!plan.usedMarketCompletionScenarioDetected || !plan.secondaryMarketFallbackChangedRecommendation) {
          throw new Error('missed_item_wait_and_patch: diagnostics should expose secondary-market completion impact');
        }
      },
    },
    {
      id: 'bonus_pressure_clamp',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'single',
        q_motives_multi: ['fomo'],
        q_budget_pain: 'some',
        q_addon_media_motive: 'character_ip',
        q_addon_media_support_scope: 'one_oshi',
        q_addon_media_collection_budget: 'balanced',
        q_addon_media_edition_intent: 'limited_preferred',
        q_addon_media_single_vs_set_intent: 'one_best_fit_version',
        q_addon_media_completion_satisfaction: 'medium',
        q_addon_media_used_market_recovery: 'buy_now_primary',
        q_addon_media_used_market_comfort: 'low',
        q_addon_media_completion_pressure_type: 'bonus_store_pressure',
        q_addon_media_set_reward_strength: 'medium',
        q_addon_media_member_version: 'none',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'no',
        q_addon_media_bonus_importance: 'low',
        q_addon_media_multi_store_tolerance: 'one_store_ok',
        q_addon_media_split_order_burden: 'medium',
        q_addon_media_random_goods_intent: 'none',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('bonus_pressure_clamp: mediaEditionPlan missing');
        if (!['step_back_from_bonus_or_completion_pressure', 'step_back_from_bonus_pressure'].includes(plan.chosenPath) || plan.clampReason !== 'bonus_pressure_exceeds_stated_need') {
          throw new Error('bonus_pressure_clamp: bonus/FOMO-heavy case should clamp back');
        }
      },
    },
    {
      id: 'store_bonus_choose_one_store',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'single',
        q_motives_multi: ['content', 'bonus'],
        q_budget_pain: 'some',
        q_addon_media_motive: 'cast_performer',
        q_addon_media_support_scope: 'one_oshi',
        q_addon_media_collection_budget: 'balanced',
        q_addon_media_edition_intent: 'one_best_fit',
        q_addon_media_single_vs_set_intent: 'one_best_fit_version',
        q_addon_media_completion_satisfaction: 'medium',
        q_addon_media_used_market_recovery: 'buy_now_primary',
        q_addon_media_used_market_comfort: 'medium',
        q_addon_media_completion_pressure_type: 'bonus_store_pressure',
        q_addon_media_set_reward_strength: 'medium',
        q_addon_media_member_version: 'specific_version',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'maybe',
        q_addon_media_bonus_importance: 'high',
        q_addon_media_multi_store_tolerance: 'compare_then_one',
        q_addon_media_split_order_burden: 'medium',
        q_addon_media_random_goods_intent: 'none',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('store_bonus_choose_one_store: mediaEditionPlan missing');
        if (plan.chosenPath !== 'choose_one_best_store') throw new Error('store_bonus_choose_one_store: should optimize to one store');
        if (!plan.bonusPressureChangedRecommendation || plan.bonusInflationRisk === 'unknown') {
          throw new Error('store_bonus_choose_one_store: diagnostics should expose bonus-pressure impact and inflation risk');
        }
      },
    },
    {
      id: 'split_orders_not_worth_it',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'set',
        q_motives_multi: ['bonus', 'fomo'],
        q_budget_pain: 'some',
        q_addon_media_motive: 'balanced',
        q_addon_media_support_scope: 'balanced',
        q_addon_media_collection_budget: 'balanced',
        q_addon_media_edition_intent: 'limited_preferred',
        q_addon_media_single_vs_set_intent: 'selective_subset',
        q_addon_media_completion_satisfaction: 'medium',
        q_addon_media_used_market_recovery: 'buy_now_primary',
        q_addon_media_used_market_comfort: 'medium',
        q_addon_media_completion_pressure_type: 'bonus_store_pressure',
        q_addon_media_set_reward_strength: 'medium',
        q_addon_media_member_version: 'none',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'no',
        q_addon_media_bonus_importance: 'high',
        q_addon_media_multi_store_tolerance: 'all_bonuses_or_bust',
        q_addon_media_split_order_burden: 'high',
        q_addon_media_random_goods_intent: 'none',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('split_orders_not_worth_it: mediaEditionPlan missing');
        if (plan.chosenPath !== 'split_orders_are_not_worth_it') throw new Error('split_orders_not_worth_it: should explicitly reject split orders');
        if (!plan.splitOrderBurdenChangedRecommendation) throw new Error('split_orders_not_worth_it: diagnostics should expose split-order burden impact');
      },
    },
    {
      id: 'buy_product_skip_all_bonuses',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'single',
        q_motives_multi: ['content'],
        q_budget_pain: 'ok',
        q_addon_media_motive: 'character_ip',
        q_addon_media_support_scope: 'one_oshi',
        q_addon_media_collection_budget: 'efficient',
        q_addon_media_edition_intent: 'limited_preferred',
        q_addon_media_single_vs_set_intent: 'one_best_fit_version',
        q_addon_media_completion_satisfaction: 'high',
        q_addon_media_used_market_recovery: 'buy_now_primary',
        q_addon_media_used_market_comfort: 'medium',
        q_addon_media_completion_pressure_type: 'personal_standard',
        q_addon_media_set_reward_strength: 'medium',
        q_addon_media_member_version: 'specific_version',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'maybe',
        q_addon_media_bonus_importance: 'medium',
        q_addon_media_multi_store_tolerance: 'one_store_ok',
        q_addon_media_split_order_burden: 'medium',
        q_addon_media_random_goods_intent: 'none',
      }, 'media'),
      assert(output: DecisionOutput) {
        const plan = output.mediaEditionPlan;
        if (!plan) throw new Error('buy_product_skip_all_bonuses: mediaEditionPlan missing');
        if (plan.chosenPath !== 'buy_product_but_do_not_chase_all_bonuses') throw new Error('buy_product_skip_all_bonuses: product value should survive without all-bonus chase');
      },
    },
    {
      id: 'mixed_media_random_goods_addon',
      output: buildEvaluatedOutput('goods', {
        q_goal: 'single',
        q_motives_multi: ['content'],
        q_budget_pain: 'some',
        q_addon_media_motive: 'cast_performer',
        q_addon_media_support_scope: 'one_oshi',
        q_addon_media_collection_budget: 'balanced',
        q_addon_media_edition_intent: 'one_best_fit',
        q_addon_media_single_vs_set_intent: 'one_best_fit_version',
        q_addon_media_completion_satisfaction: 'medium',
        q_addon_media_used_market_recovery: 'buy_now_primary',
        q_addon_media_used_market_comfort: 'medium',
        q_addon_media_completion_pressure_type: 'personal_standard',
        q_addon_media_set_reward_strength: 'medium',
        q_addon_media_member_version: 'specific_version',
        q_addon_media_playback_space: 'ready',
        q_addon_media_limited_pressure: 'maybe',
        q_addon_media_random_goods_intent: 'present',
        q_addon_blind_draw_cap: 'used_to_it',
        q_addon_blind_draw_exit: 'oshi_only',
        q_addon_blind_draw_duplicate_tolerance: 'low',
        q_addon_blind_draw_trade_intent: 'no',
        q_addon_blind_draw_exchange_friction: 'medium',
        q_addon_blind_draw_single_fallback: 'after_stop',
        q_addon_blind_draw_stop_budget: 'soft',
        q_addon_blind_draw_miss_pain: 'high',
      }, 'media'),
      assert(output: DecisionOutput) {
        const mediaPlan = output.mediaEditionPlan;
        const randomPlan = output.randomGoodsPlan;
        if (!mediaPlan || !randomPlan) throw new Error('mixed_media_random_goods_addon: both mediaEditionPlan and randomGoodsPlan should exist');
        if (!mediaPlan.randomGoodsStopLineAddonInvoked) throw new Error('mixed_media_random_goods_addon: media diagnostics should record addon invocation');
        if (randomPlan.chosenPath !== 'stop_drawing_check_used_market') throw new Error('mixed_media_random_goods_addon: should reuse stop-line logic, not invent a new path');
      },
    },
  ];

  return cases.map((entry) => {
    entry.assert(entry.output);
    const plan = entry.output.mediaEditionPlan!;
    return {
      id: entry.id,
      decision: entry.output.decision,
      chosenPath: plan.chosenPath,
      clampReason: plan.clampReason ?? null,
      budgetAlignment: plan.budgetAlignment,
      randomGoodsStopLineAddonInvoked: plan.randomGoodsStopLineAddonInvoked,
      reasons: plan.reasons,
    };
  });
}

function runMixedMediaFlowCheck() {
  const flow = resolveFlowQuestions({
    mode: "long",
    itemKind: "goods",
    goodsClass: "media",
    goodsSubtype: "general",
    useCase: "merch",
    answers: { q_addon_media_random_goods_intent: "present" },
    meta: { itemKind: "goods", goodsClass: "media", itemName: "検証", priceYen: 4000 },
    styleMode: "standard",
  });
  const questionIds = flow.questions.map((question) => question.id);
  if (!questionIds.includes("q_addon_blind_draw_exit") || !questionIds.includes("q_addon_blind_draw_stop_budget")) {
    throw new Error("mixed_media_flow: random-goods addon should inject existing blind-draw questions");
  }
}

function runTrustRepairAcceptanceChecks() {
  const blindUnknownHeavy = buildEvaluatedOutput('blind_draw', {
    q_goal: 'single',
    q_budget_pain: 'ok',
    q_addon_blind_draw_exit: 'unknown',
    q_addon_blind_draw_duplicate_tolerance: 'unknown',
    q_addon_blind_draw_trade_intent: 'unknown',
    q_addon_blind_draw_exchange_friction: 'unknown',
    q_addon_blind_draw_single_fallback: 'unknown',
    q_addon_blind_draw_stop_budget: 'unknown',
    q_regret_impulse: 'calm',
  }, 'small_collection');
  if (blindUnknownHeavy.decision === 'BUY') {
    throw new Error('trust_repair_blind_unknown: unknown-heavy blind draw should not stay BUY');
  }
  if (blindUnknownHeavy.holdSubtype !== 'needs_check' || (blindUnknownHeavy.confidence ?? 100) > 54) {
    throw new Error('trust_repair_blind_unknown: unknown-heavy blind draw should downgrade confidence and hold subtype');
  }

  const venueUnknownRecovery = buildEvaluatedOutput('goods', {
    q_addon_goods_event_limit_context: 'venue_limited',
    q_addon_goods_post_event_mailorder: 'unknown',
    q_addon_goods_wait_tolerance: 'unknown',
    q_addon_goods_first_chance_tolerance: 'medium',
    q_addon_goods_used_fallback: 'unknown',
    q_addon_goods_scarcity_pressure: 'medium',
    q_addon_goods_venue_motive: 'mixed',
    q_addon_goods_live_goods_motive: 'unknown',
    q_addon_goods_regret_axis: 'unknown',
    q_regret_impulse: 'calm',
  }, 'small_collection');
  if (venueUnknownRecovery.venueLimitedGoodsPlan?.chosenPath === 'wait_for_post_event_mailorder' && venueUnknownRecovery.decision === 'BUY') {
    throw new Error('trust_repair_venue_unknown: weakly known recovery path should not produce a hard wait recommendation');
  }
  if (venueUnknownRecovery.holdSubtype !== 'needs_check') {
    throw new Error('trust_repair_venue_unknown: weakly known recovery path should mark needs_check');
  }

  const mediaUnknownHeavy = buildEvaluatedOutput('goods', {
    q_goal: 'single',
    q_budget_pain: 'some',
    q_addon_media_motive: 'unknown',
    q_addon_media_support_scope: 'unknown',
    q_addon_media_collection_budget: 'unknown',
    q_addon_media_edition_intent: 'unknown',
    q_addon_media_member_version: 'unknown',
    q_addon_media_playback_space: 'ready',
    q_addon_media_limited_pressure: 'unknown',
    q_addon_media_bonus_importance: 'unknown',
    q_addon_media_multi_store_tolerance: 'unknown',
    q_addon_media_split_order_burden: 'unknown',
    q_addon_media_random_goods_intent: 'present',
    q_addon_blind_draw_cap: 'unknown',
    q_addon_blind_draw_exit: 'unknown',
    q_addon_blind_draw_duplicate_tolerance: 'unknown',
    q_addon_blind_draw_trade_intent: 'unknown',
    q_addon_blind_draw_exchange_friction: 'unknown',
    q_addon_blind_draw_single_fallback: 'unknown',
    q_addon_blind_draw_stop_budget: 'unknown',
  }, 'media');
  if (mediaUnknownHeavy.decision === 'BUY') {
    throw new Error('trust_repair_media_unknown: unknown-heavy media edition flow should not stay BUY');
  }
  if ((mediaUnknownHeavy.confidence ?? 100) > 55 || mediaUnknownHeavy.holdSubtype !== 'needs_check') {
    throw new Error('trust_repair_media_unknown: unknown-heavy media edition flow should downgrade confidence and hold subtype');
  }
}


function runBandNarrowingAcceptanceChecks() {
  const highSignalBuy = buildEvaluatedOutput('goods', {
    q_desire: 5,
    q_budget_pain: 'ok',
    q_urgency: 'last',
    q_rarity_restock: 'unlikely',
    q_price_feel: 'good',
    q_goal: 'single',
    q_motives_multi: ['use', 'content'],
    q_hot_cold: 'hot',
    q_alternative_plan: 'none',
    q_regret_impulse: 'calm',
    q_storage_fit: 'CONFIRMED',
    q_storage_space: 'enough',
    q_addon_goods_event_limit_context: 'none',
    q_addon_common_info: 'enough',
    q_addon_common_priority: 'this_one',
    q_addon_goods_compare: 'enough',
    q_addon_goods_portability: 'easy',
    q_addon_goods_collection_goal: 'focused',
    q_addon_goods_trade_intent: 'no_need',
  });
  if (!highSignalBuy.bandTrace?.bandNarrowingApplied || highSignalBuy.bandTrace.effectiveBandHalfWidth !== 10) {
    throw new Error('band_high_signal_buy: expected narrowing to apply at ±10');
  }

  const highSignalWait = buildEvaluatedOutput('goods', {
    q_desire: 5,
    q_budget_pain: 'ok',
    q_urgency: 'last',
    q_rarity_restock: 'unlikely',
    q_price_feel: 'good',
    q_goal: 'single',
    q_motives_multi: ['use'],
    q_hot_cold: 'hot',
    q_alternative_plan: 'none',
    q_regret_impulse: 'calm',
    q_storage_fit: 'NONE',
    q_storage_space: 'tight',
    q_addon_goods_event_limit_context: 'none',
    q_addon_common_info: 'enough',
    q_addon_common_priority: 'this_one',
    q_addon_goods_compare: 'enough',
    q_addon_goods_portability: 'easy',
    q_addon_goods_collection_goal: 'focused',
    q_addon_goods_trade_intent: 'no_need',
  });
  if (highSignalWait.decision !== 'THINK' || highSignalWait.holdSubtype !== 'needs_check' || highSignalWait.bandTrace?.bandNarrowingApplied) {
    throw new Error('band_high_signal_wait: needs_check hold should stay explainable without forcing a narrow band');
  }

  const lowSignalIncomplete = buildEvaluatedOutput('goods', {
    q_desire: 4,
    q_budget_pain: 'some',
    q_urgency: 'unknown',
    q_rarity_restock: 'unknown',
    q_price_feel: 'unknown',
    q_goal: 'unknown',
    q_motives_multi: ['fomo'],
    q_hot_cold: 'unknown',
    q_alternative_plan: 'maybe',
    q_regret_impulse: 'fomo',
    q_storage_fit: 'UNKNOWN',
    q_storage_space: 'tight',
    q_addon_goods_event_limit_context: 'unknown',
    q_addon_common_info: 'lack',
    q_addon_common_priority: 'unknown',
    q_addon_goods_compare: 'none',
    q_addon_goods_portability: 'unknown',
    q_addon_goods_collection_goal: 'unknown',
    q_addon_goods_trade_intent: 'unknown',
  });
  if (lowSignalIncomplete.bandTrace?.bandNarrowingApplied) {
    throw new Error('band_low_signal_incomplete: narrowing should stay off');
  }
  if (!lowSignalIncomplete.bandTrace?.bandNarrowingBlockedBy.includes('incomplete_high_impact_inputs')) {
    throw new Error('band_low_signal_incomplete: incomplete blocker should be visible');
  }

  const conflictingSignals = buildEvaluatedOutput('goods', {
    q_desire: 5,
    q_budget_pain: 'some',
    q_urgency: 'last',
    q_rarity_restock: 'likely',
    q_price_feel: 'high',
    q_goal: 'set',
    q_motives_multi: ['bonus', 'use', 'fomo'],
    q_hot_cold: 'hot',
    q_alternative_plan: 'clear',
    q_regret_impulse: 'excited',
    q_storage_fit: 'PROBABLE',
    q_storage_space: 'adjust',
    q_addon_goods_event_limit_context: 'event_limited',
    q_addon_common_info: 'partial',
    q_addon_common_priority: 'this_one',
    q_addon_goods_compare: 'some',
    q_addon_goods_portability: 'light',
    q_addon_goods_collection_goal: 'broaden',
    q_addon_goods_trade_intent: 'yes',
  });
  if (conflictingSignals.bandTrace?.bandNarrowingApplied) {
    throw new Error('band_conflicting_signals: narrowing should be blocked');
  }
  if (conflictingSignals.bandTrace?.bandNarrowingReason !== 'conflicting_signals') {
    throw new Error('band_conflicting_signals: reason should expose conflict');
  }

  const replayRun = {
    runId: 'band-replay-source',
    createdAt: Date.now(),
    locale: 'ja',
    category: 'merch',
    mode: 'long',
    meta: { itemKind: 'goods', goodsClass: 'small_collection', itemName: 'Band replay', priceYen: 4200 },
    answers: {
      q_desire: 5,
      q_budget_pain: 'ok',
      q_urgency: 'last',
      q_rarity_restock: 'unlikely',
      q_price_feel: 'good',
      q_goal: 'single',
      q_motives_multi: ['use', 'content'],
      q_hot_cold: 'hot',
      q_alternative_plan: 'none',
      q_regret_impulse: 'calm',
      q_storage_fit: 'CONFIRMED',
      q_storage_space: 'enough',
      q_addon_goods_event_limit_context: 'none',
      q_addon_common_info: 'enough',
      q_addon_common_priority: 'this_one',
      q_addon_goods_compare: 'enough',
      q_addon_goods_portability: 'easy',
      q_addon_goods_collection_goal: 'focused',
      q_addon_goods_trade_intent: 'no_need',
    },
    output: highSignalBuy,
    diagnosticTrace: { runContext: { mode: 'long', itemKind: 'goods', goodsClass: 'small_collection', hasPrice: true, hasItemName: true }, shownQuestionIds: Object.keys(highSignalBuy.scoreSummary), skippedQuestionIds: [], branchHits: [], branchMisses: [] },
  } as any;
  const replay = createReplayDraft(replayRun, 'standard');
  const replayOutput = buildEvaluatedOutput('goods', replay.answers, 'small_collection');
  if (replayOutput.bandTrace?.effectiveBandHalfWidth !== highSignalBuy.bandTrace?.effectiveBandHalfWidth || replayOutput.bandTrace?.bandNarrowingReason !== highSignalBuy.bandTrace?.bandNarrowingReason) {
    throw new Error('band_replay_stability: replayed answers should preserve band behavior');
  }

  return {
    highSignalBuy: highSignalBuy.bandTrace,
    highSignalWait: highSignalWait.bandTrace,
    lowSignalIncomplete: lowSignalIncomplete.bandTrace,
    conflictingSignals: conflictingSignals.bandTrace,
    replayStable: true,
  };
}

function runCanonicalVerdictAcceptanceChecks() {
  const assertNoHoldCopyOnDirectionalVerdict = (id: string, output: DecisionOutput) => {
    if (output.decision === 'THINK') return;
    if (output.reasons.some((reason) => reason.id.startsWith('hold_'))) {
      throw new Error(`${id}: directional verdict should not retain hold-only reason copy`);
    }
    if (output.actions.some((action) => ['info_gap_close', 'conflict_sort', 'timing_wait'].includes(action.id))) {
      throw new Error(`${id}: directional verdict should not retain hold-only actions`);
    }
  };
  const assertHoldReasonMatchesSubtype = (id: string, output: DecisionOutput) => {
    if (output.decision !== 'THINK' || !output.holdSubtype) return;
    const expectedReasonId = `hold_${output.holdSubtype}`;
    const staleHoldReasons = output.reasons
      .filter((reason) => reason.id.startsWith('hold_') && reason.id !== expectedReasonId)
      .map((reason) => reason.id);
    if (staleHoldReasons.length > 0) {
      throw new Error(`${id}: stale hold reason copy leaked (${staleHoldReasons.join(', ')})`);
    }
  };

  const strongBuy = buildEvaluatedOutput('goods', {
    q_desire: 5,
    q_budget_pain: 'ok',
    q_price_feel: 'good',
    q_regret_impulse: 'calm',
    q_addon_common_info: 'enough',
    q_addon_common_priority: 'this_one',
    q_goal: 'single',
    q_motives_multi: ['use', 'content'],
  });
  if (strongBuy.decision !== 'BUY' || strongBuy.verdictFamily !== 'buy' || strongBuy.holdSubtype != null) {
    throw new Error('canonical_buy: aligned positive case should stay BUY with buy family');
  }
  if (strongBuy.usedExitPlan?.mode !== 'secondary_compare') {
    throw new Error('canonical_buy: buy should only expose secondary_compare used-exit mode');
  }
  assertNoHoldCopyOnDirectionalVerdict('canonical_buy', strongBuy);

  const strongStop = buildEvaluatedOutput('goods', {
    q_desire: 1,
    q_budget_pain: 'force',
    q_price_feel: 'high',
    q_regret_impulse: 'fomo',
    q_addon_common_info: 'lack',
    q_goal: 'set',
    q_motives_multi: ['vague', 'fomo'],
  });
  if (strongStop.decision !== 'SKIP' || strongStop.verdictFamily !== 'stop' || strongStop.holdSubtype != null) {
    throw new Error('canonical_stop: aligned negative case should stay SKIP with stop family');
  }
  if (strongStop.usedExitPlan?.mode !== 'delayed_recheck') {
    throw new Error('canonical_stop: stop should only expose delayed_recheck used-exit mode');
  }
  assertNoHoldCopyOnDirectionalVerdict('canonical_stop', strongStop);

  const holdNeedsCheck = buildEvaluatedOutput('goods', {
    q_desire: 4,
    q_budget_pain: 'ok',
    q_price_feel: 'unknown',
    q_regret_impulse: 'calm',
    q_addon_common_info: 'lack',
    q_addon_goods_event_limit_context: 'venue_limited',
    q_addon_goods_post_event_mailorder: 'unknown',
    q_addon_goods_wait_tolerance: 'unknown',
    q_addon_goods_used_fallback: 'unknown',
    q_addon_goods_live_goods_motive: 'unknown',
  });
  if (holdNeedsCheck.decision !== 'THINK' || holdNeedsCheck.holdSubtype !== 'needs_check' || holdNeedsCheck.displayVerdictKey !== 'hold_needs_check') {
    throw new Error('canonical_hold_needs_check: missing high-impact check should route to hold.needs_check');
  }
  if (holdNeedsCheck.usedExitPlan?.mode !== 'check_first' || !holdNeedsCheck.usedExitPlan.whatToCheck?.length) {
    throw new Error('canonical_hold_needs_check: hold.needs_check should expose checklist-first used exit guidance');
  }
  assertHoldReasonMatchesSubtype('canonical_hold_needs_check', holdNeedsCheck);

  const holdConflicting = buildEvaluatedOutput('used', {
    q_desire: 5,
    q_budget_pain: 'ok',
    q_price_feel: 'good',
    q_regret_impulse: 'calm',
    q_goal: 'single',
    q_motives_multi: ['use'],
    q_addon_common_info: 'enough',
    q_addon_used_condition: 'hard',
    q_addon_used_price_gap: 'small',
    q_addon_used_defect_return: 'not_ok',
    q_addon_used_authenticity: 'must',
    q_addon_used_seller_trust: 'low',
  });
  if (holdConflicting.decision !== 'THINK' || holdConflicting.holdSubtype !== 'conflicting' || holdConflicting.displayVerdictKey !== 'hold_conflicting') {
    throw new Error('canonical_hold_conflicting: major buy/stop signals should route to hold.conflicting');
  }
  if (holdConflicting.usedExitPlan?.mode !== 'reference_only' || holdConflicting.usedExitPlan.suppressPurchaseTone !== true) {
    throw new Error('canonical_hold_conflicting: hold.conflicting should suppress purchase tone and stay reference_only');
  }
  assertHoldReasonMatchesSubtype('canonical_hold_conflicting', holdConflicting);

  const holdTimingWait = buildEvaluatedOutput('goods', {
    q_desire: 4,
    q_budget_pain: 'some',
    q_price_feel: 'normal',
    q_regret_impulse: 'calm',
    q_goal: 'single',
    q_motives_multi: ['content'],
    q_addon_common_info: 'enough',
    q_addon_goods_event_limit_context: 'event_limited',
    q_addon_goods_post_event_mailorder: 'likely',
    q_addon_goods_wait_tolerance: 'high',
    q_addon_goods_first_chance_tolerance: 'high',
    q_addon_goods_used_fallback: 'high',
    q_addon_goods_scarcity_pressure: 'medium',
    q_addon_goods_venue_motive: 'practical_collecting',
    q_addon_goods_live_goods_motive: 'symbolic_value',
    q_addon_goods_regret_axis: 'overpay_more',
  });
  if (holdTimingWait.decision !== 'THINK' || holdTimingWait.holdSubtype !== 'timing_wait' || holdTimingWait.displayVerdictKey !== 'hold_timing_wait') {
    throw new Error('canonical_hold_timing_wait: timing-based defer should route to hold.timing_wait');
  }
  if (
    holdTimingWait.usedExitPlan?.mode !== 'timing_wait_route' ||
    !holdTimingWait.usedExitPlan.whenToRecheck ||
    !holdTimingWait.usedExitPlan.providers.some((provider) => provider.key === 'mercari' || provider.key === 'surugaya')
  ) {
    throw new Error('canonical_hold_timing_wait: hold.timing_wait should expose timing_wait_route used-exit guidance');
  }
  assertHoldReasonMatchesSubtype('canonical_hold_timing_wait', holdTimingWait);

  const nearCenterBiased = buildEvaluatedOutput('goods', {
    q_desire: 4,
    q_budget_pain: 'some',
    q_price_feel: 'normal',
    q_regret_impulse: 'calm',
    q_goal: 'single',
    q_motives_multi: ['use'],
    q_addon_common_info: 'enough',
    q_addon_goods_compare: 'enough',
    q_addon_common_priority: 'this_one',
  });
  if (nearCenterBiased.decision === 'THINK') {
    throw new Error('canonical_near_center_bias: directionally biased case should no longer default to generic hold');
  }
  assertNoHoldCopyOnDirectionalVerdict('canonical_near_center_bias', nearCenterBiased);

  const nearCenterStopBiased = buildEvaluatedOutput('goods', {
    q_desire: 3,
    q_budget_pain: 'hard',
    q_price_feel: 'normal',
    q_regret_impulse: 'calm',
    q_goal: 'single',
    q_motives_multi: ['vague'],
    q_addon_common_info: 'enough',
    q_addon_goods_compare: 'enough',
    q_addon_common_priority: 'not_now',
    q_alternative_plan: 'clear',
    q_rarity_restock: 'likely',
    q_urgency: 'low_stock',
  });
  if (nearCenterStopBiased.decision !== 'SKIP' || nearCenterStopBiased.verdictFamily !== 'stop') {
    throw new Error('canonical_near_center_stop_bias: stop-biased near-center case should resolve to stop family');
  }
  assertNoHoldCopyOnDirectionalVerdict('canonical_near_center_stop_bias', nearCenterStopBiased);

  const replayOutput = buildEvaluatedOutput('used', {
    q_desire: 5,
    q_budget_pain: 'ok',
    q_price_feel: 'good',
    q_regret_impulse: 'calm',
    q_goal: 'single',
    q_motives_multi: ['use'],
    q_addon_common_info: 'enough',
    q_addon_used_condition: 'hard',
    q_addon_used_price_gap: 'small',
    q_addon_used_defect_return: 'not_ok',
    q_addon_used_authenticity: 'must',
    q_addon_used_seller_trust: 'low',
  });
  const replayRun = {
    runId: 'canonical-replay-source',
    createdAt: Date.now(),
    locale: 'ja',
    category: 'merch',
    mode: 'long',
    meta: { itemKind: 'used', goodsClass: 'small_collection', itemName: 'Replay verdict', priceYen: 4200 },
    answers: {
      q_desire: 5,
      q_budget_pain: 'ok',
      q_price_feel: 'good',
      q_regret_impulse: 'calm',
      q_goal: 'single',
      q_motives_multi: ['use'],
      q_addon_common_info: 'enough',
      q_addon_used_condition: 'hard',
      q_addon_used_price_gap: 'small',
      q_addon_used_defect_return: 'not_ok',
      q_addon_used_authenticity: 'must',
      q_addon_used_seller_trust: 'low',
    },
    output: replayOutput,
    diagnosticTrace: { runContext: { mode: 'long', itemKind: 'used', goodsClass: 'small_collection', hasPrice: true, hasItemName: true }, shownQuestionIds: Object.keys(replayOutput.scoreSummary), skippedQuestionIds: [], branchHits: [], branchMisses: [] },
  } as any;
  const replayDraft = createReplayDraft(replayRun, 'standard');
  const replayed = buildEvaluatedOutput('used', replayDraft.answers, 'small_collection');
  if (
    replayed.verdictFamily !== replayOutput.verdictFamily ||
    replayed.holdSubtype !== replayOutput.holdSubtype ||
    replayed.displayVerdictKey !== replayOutput.displayVerdictKey ||
    replayed.usedExitPlan?.mode !== replayOutput.usedExitPlan?.mode ||
    JSON.stringify(replayed.usedExitPlan?.providers ?? []) !== JSON.stringify(replayOutput.usedExitPlan?.providers ?? [])
  ) {
    throw new Error('canonical_replay_stability: restore/replay should preserve verdict family/subtype/display key and used-exit plan');
  }

  return {
    strongBuy: { decision: strongBuy.decision, verdictFamily: strongBuy.verdictFamily, displayVerdictKey: strongBuy.displayVerdictKey },
    strongStop: { decision: strongStop.decision, verdictFamily: strongStop.verdictFamily, displayVerdictKey: strongStop.displayVerdictKey },
    holdNeedsCheck: { decision: holdNeedsCheck.decision, holdSubtype: holdNeedsCheck.holdSubtype, displayVerdictKey: holdNeedsCheck.displayVerdictKey },
    holdConflicting: { decision: holdConflicting.decision, holdSubtype: holdConflicting.holdSubtype, displayVerdictKey: holdConflicting.displayVerdictKey },
    holdTimingWait: { decision: holdTimingWait.decision, holdSubtype: holdTimingWait.holdSubtype, displayVerdictKey: holdTimingWait.displayVerdictKey },
    nearCenterBiased: { decision: nearCenterBiased.decision, verdictFamily: nearCenterBiased.verdictFamily, displayVerdictKey: nearCenterBiased.displayVerdictKey },
    nearCenterStopBiased: { decision: nearCenterStopBiased.decision, verdictFamily: nearCenterStopBiased.verdictFamily, displayVerdictKey: nearCenterStopBiased.displayVerdictKey },
    replayStable: true,
  };
}

function runMediumMediaCoverageCheck() {
  const flow = resolveFlowQuestions({
    mode: "medium",
    itemKind: "goods",
    goodsClass: "media",
    goodsSubtype: "general",
    useCase: "merch",
    answers: {},
    meta: { itemKind: "goods", goodsClass: "media", itemName: "検証", priceYen: 4000 },
    styleMode: "standard",
  });
  const questionIds = flow.questions.map((question) => question.id);
  for (const required of [
    "q_addon_media_motive",
    "q_addon_media_support_scope",
    "q_addon_media_collection_budget",
    "q_addon_media_edition_intent",
    "q_addon_media_bonus_importance",
    "q_addon_media_multi_store_tolerance",
    "q_addon_media_split_order_burden",
    "q_addon_media_random_goods_intent",
  ]) {
    if (!questionIds.includes(required)) {
      throw new Error(`medium_media_coverage: expected ${required} in medium media flow`);
    }
  }
}


function runVTMediaAcceptanceChecks() {
  const vtBluray = parseSearchClues('hololive 初回限定 Blu-ray 特典');
  const vtCd = parseSearchClues('VT 特典付きCD 法人特典');
  const vtBook = parseSearchClues('VT 写真集 法人特典');

  const vtBlurayFlow = resolveFlowQuestions({
    mode: 'long',
    itemKind: 'goods',
    goodsClass: 'media',
    goodsSubtype: 'general',
    useCase: 'merch',
    answers: {},
    meta: { itemKind: 'goods', goodsClass: 'media', searchClueRaw: vtBluray.raw, parsedSearchClues: vtBluray, itemName: 'VT Blu-ray', priceYen: 8800 },
    styleMode: 'standard',
  });
  if (!vtBlurayFlow.questions.some((q) => q.id === 'q_addon_media_edition_intent')) {
    throw new Error('vt_media_bluray: existing media addon path should remain active');
  }
  if (!vtBlurayFlow.diagnosticTrace.branchHits.some((branch) => branch.id === 'search_clue_media_resolved')) {
    throw new Error('vt_media_bluray: resolved media clue diagnostics should remain stable');
  }
  if (vtBlurayFlow.coverage.key !== 'store_bonus_collection' && vtBlurayFlow.coverage.key !== 'limited_vs_standard_media' && vtBlurayFlow.coverage.key !== 'media_purchase_decision') {
    throw new Error('vt_media_bluray: coverage should remain inside existing media scenarios');
  }

  const vtBlurayAnswers = Object.fromEntries(vtBlurayFlow.questions.map((q) => [q.id, defaultAnswer(q.id)]));
  const vtBlurayOutput = evaluate({
    questionSet: { id: 'vt-bluray', locale: 'ja', category: 'merch', version: 1, questions: vtBlurayFlow.questions },
    meta: { itemKind: 'goods', goodsClass: 'media', searchClueRaw: vtBluray.raw, parsedSearchClues: vtBluray, itemName: 'VT Blu-ray', priceYen: 8800 },
    answers: vtBlurayAnswers,
    mode: 'long',
    useCase: 'merch',
  });
  const vtVerdictFamily = vtBlurayOutput.verdictFamily ?? '';
  const vtDisplayVerdict = vtBlurayOutput.displayVerdictKey ?? '';
  if (!['buy', 'hold', 'stop'].includes(vtVerdictFamily) || !['buy', 'hold_needs_check', 'hold_conflicting', 'hold_timing_wait', 'stop'].includes(vtDisplayVerdict)) {
    throw new Error('vt_media_bluray: canonical verdict routing should stay intact');
  }

  const vtCdFlow = resolveFlowQuestions({
    mode: 'long',
    itemKind: 'goods',
    goodsClass: 'media',
    goodsSubtype: 'general',
    useCase: 'merch',
    answers: {},
    meta: { itemKind: 'goods', goodsClass: 'media', searchClueRaw: vtCd.raw, parsedSearchClues: vtCd, itemName: 'VT CD', priceYen: 2500 },
    styleMode: 'standard',
  });
  if (!vtCdFlow.diagnosticTrace.branchHits.some((branch) => branch.id === 'search_clue_bonus_strong')) {
    throw new Error('vt_media_cd: bonus-heavy VT CD clue should preserve media bonus-sensitive routing');
  }

  const vtBookFlow = resolveFlowQuestions({
    mode: 'long',
    itemKind: 'goods',
    goodsClass: 'media',
    goodsSubtype: 'general',
    useCase: 'merch',
    answers: {},
    meta: { itemKind: 'goods', goodsClass: 'media', searchClueRaw: vtBook.raw, parsedSearchClues: vtBook, itemName: 'VT 写真集', priceYen: 3300 },
    styleMode: 'standard',
  });
  if (vtBookFlow.coverage.key !== 'store_bonus_collection' && vtBookFlow.coverage.key !== 'media_purchase_decision') {
    throw new Error('vt_media_book: VT book clue should stay inside the media wedge when media is selected');
  }

  const genericMediaFlow = resolveFlowQuestions({
    mode: 'long',
    itemKind: 'goods',
    goodsClass: 'media',
    goodsSubtype: 'general',
    useCase: 'merch',
    answers: {},
    meta: { itemKind: 'goods', goodsClass: 'media', searchClueRaw: '初回限定 Blu-ray', parsedSearchClues: parseSearchClues('初回限定 Blu-ray'), itemName: '通常メディア', priceYen: 7000 },
    styleMode: 'standard',
  });
  if (!genericMediaFlow.questions.some((q) => q.id === 'q_addon_media_motive')) {
    throw new Error('vt_media_regression: generic media flow should remain unchanged');
  }
}

function runVoiceMediaAcceptanceChecks() {
  const unresolvedBonusClue = parseSearchClues('ドラマCD 店舗特典 先着特典 特典は無くなり次第終了');
  const unresolvedBonusFlow = resolveFlowQuestions({
    mode: 'long',
    itemKind: 'goods',
    goodsClass: 'media',
    goodsSubtype: 'general',
    useCase: 'merch',
    answers: {},
    meta: {
      itemKind: 'goods',
      goodsClass: 'media',
      itemName: '店舗特典付きドラマCD',
      priceYen: 4400,
      searchClueRaw: unresolvedBonusClue.raw,
      parsedSearchClues: unresolvedBonusClue,
    },
    styleMode: 'standard',
  });
  for (const questionId of ['q_addon_voice_cd_kind', 'q_addon_voice_cast_check', 'q_addon_voice_bonus_is_audio', 'q_addon_voice_listen_timing']) {
    if (!unresolvedBonusFlow.questions.some((question) => question.id === questionId)) {
      throw new Error(`voice_media_questions: expected ${questionId} for eligible drama CD flow`);
    }
  }

  const unresolvedBonusOutput = buildEvaluatedOutput(
    'goods',
    {
      q_goal: 'single',
      q_motives_multi: ['content', 'bonus', 'seiyuu_cast'],
      q_budget_pain: 'some',
      q_addon_media_motive: 'cast_performer',
      q_addon_media_support_scope: 'one_oshi',
      q_addon_media_collection_budget: 'balanced',
      q_addon_media_edition_intent: 'one_best_fit',
      q_addon_media_single_vs_set_intent: 'one_best_fit_version',
      q_addon_media_completion_satisfaction: 'medium',
      q_addon_media_used_market_recovery: 'buy_now_primary',
      q_addon_media_used_market_comfort: 'medium',
      q_addon_media_completion_pressure_type: 'bonus_store_pressure',
      q_addon_media_set_reward_strength: 'medium',
      q_addon_media_member_version: 'specific_version',
      q_addon_media_playback_space: 'ready',
      q_addon_media_bonus_importance: 'medium',
      q_addon_media_multi_store_tolerance: 'compare_then_one',
      q_addon_media_split_order_burden: 'medium',
      q_addon_media_random_goods_intent: 'none',
      q_addon_voice_cd_kind: 'store_bonus_audio',
      q_addon_voice_cast_check: 'important_unconfirmed',
      q_addon_voice_bonus_is_audio: 'not_checked',
      q_addon_voice_listen_timing: 'maybe_later',
    },
    'media',
    {
      itemName: '店舗特典付きドラマCD',
      searchClueRaw: unresolvedBonusClue.raw,
      parsedSearchClues: unresolvedBonusClue,
      priceYen: 4400,
    },
  );
  if (unresolvedBonusOutput.holdSubtype !== 'needs_check') {
    throw new Error('voice_media_needs_check: unresolved cast/bonus should land on hold.needs_check');
  }
  if (unresolvedBonusOutput.reasons.some((reason) => reason.id === 'hold_timing_wait')) {
    throw new Error('voice_media_needs_check: unresolved cast/bonus should not leak timing_wait copy');
  }
  if (!unresolvedBonusOutput.reasons.some((reason) => reason.text.includes('確認'))) {
    throw new Error('voice_media_needs_check: result should explain what needs checking');
  }
  if (unresolvedBonusOutput.displayVerdictKey === 'hold_timing_wait') {
    throw new Error('voice_media_needs_check: first-come/store-bonus uncertainty should not lazily become timing_wait');
  }

  const buyClue = parseSearchClues('ドラマCD キャスト 収録内容');
  const confirmedBuyOutput = buildEvaluatedOutput(
    'goods',
    {
      q_desire: 5,
      q_goal: 'single',
      q_motives_multi: ['content', 'use', 'seiyuu_cast'],
      q_budget_pain: 'ok',
      q_urgency: 'low_stock',
      q_rarity_restock: 'unlikely',
      q_price_feel: 'good',
      q_regret_impulse: 'calm',
      q_addon_media_motive: 'cast_performer',
      q_addon_media_support_scope: 'one_oshi',
      q_addon_media_collection_budget: 'efficient',
      q_addon_media_edition_intent: 'one_best_fit',
      q_addon_media_single_vs_set_intent: 'one_best_fit_version',
      q_addon_media_completion_satisfaction: 'high',
      q_addon_media_used_market_recovery: 'buy_now_primary',
      q_addon_media_used_market_comfort: 'low',
      q_addon_media_completion_pressure_type: 'personal_standard',
      q_addon_media_set_reward_strength: 'medium',
      q_addon_media_member_version: 'specific_version',
      q_addon_media_playback_space: 'ready',
      q_addon_media_bonus_importance: 'low',
      q_addon_media_multi_store_tolerance: 'one_store_ok',
      q_addon_media_split_order_burden: 'low',
      q_addon_media_random_goods_intent: 'none',
      q_addon_voice_cd_kind: 'drama_cd_main',
      q_addon_voice_cast_check: 'important_confirmed',
      q_addon_voice_bonus_is_audio: 'not_important',
      q_addon_voice_listen_timing: 'listen_soon',
    },
    'media',
    {
      itemName: 'ドラマCD 本編',
      searchClueRaw: buyClue.raw,
      parsedSearchClues: buyClue,
      priceYen: 3300,
    },
  );
  if (confirmedBuyOutput.decision !== 'BUY') {
    throw new Error('voice_media_buy: confirmed cast + strong listen intent should be able to resolve to buy');
  }
  if (confirmedBuyOutput.reasons.some((reason) => reason.id.startsWith('hold_'))) {
    throw new Error('voice_media_buy: promoted buy should not retain stale hold-only copy');
  }

  const bonusConflictOutput = buildEvaluatedOutput(
    'goods',
    {
      q_goal: 'single',
      q_motives_multi: ['bonus', 'fomo'],
      q_budget_pain: 'some',
      q_regret_impulse: 'fomo',
      q_addon_media_motive: 'cast_performer',
      q_addon_media_support_scope: 'one_oshi',
      q_addon_media_collection_budget: 'balanced',
      q_addon_media_edition_intent: 'limited_preferred',
      q_addon_media_single_vs_set_intent: 'one_best_fit_version',
      q_addon_media_completion_satisfaction: 'medium',
      q_addon_media_used_market_recovery: 'buy_now_primary',
      q_addon_media_used_market_comfort: 'low',
      q_addon_media_completion_pressure_type: 'bonus_store_pressure',
      q_addon_media_set_reward_strength: 'weak',
      q_addon_media_member_version: 'none',
      q_addon_media_playback_space: 'ready',
      q_addon_media_bonus_importance: 'high',
      q_addon_media_multi_store_tolerance: 'all_bonuses_or_bust',
      q_addon_media_split_order_burden: 'high',
      q_addon_media_random_goods_intent: 'none',
      q_addon_voice_cd_kind: 'store_bonus_audio',
      q_addon_voice_cast_check: 'important_confirmed',
      q_addon_voice_bonus_is_audio: 'core_audio',
      q_addon_voice_listen_timing: 'archive_main',
    },
    'media',
    {
      itemName: '店舗特典付きドラマCD',
      searchClueRaw: unresolvedBonusClue.raw,
      parsedSearchClues: unresolvedBonusClue,
      priceYen: 4800,
    },
  );
  if (bonusConflictOutput.decision === 'BUY') {
    throw new Error('voice_media_conflict: bonus-heavy low-listen case should not stay BUY');
  }
  if (bonusConflictOutput.decision === 'THINK' && bonusConflictOutput.holdSubtype !== 'conflicting') {
    throw new Error('voice_media_conflict: hold result should use hold.conflicting for bonus-vs-listen mismatch');
  }
  if (bonusConflictOutput.reasons.some((reason) => reason.id === 'hold_timing_wait')) {
    throw new Error('voice_media_conflict: mismatch case should not leak timing_wait framing');
  }
  if (!bonusConflictOutput.reasons.some((reason) => reason.text.includes('特典') || reason.text.includes('聴く'))) {
    throw new Error('voice_media_conflict: mismatch explanation should mention bonus/listen mismatch');
  }

  const genericMediaFlow = resolveFlowQuestions({
    mode: 'long',
    itemKind: 'goods',
    goodsClass: 'media',
    goodsSubtype: 'general',
    useCase: 'merch',
    answers: {},
    meta: {
      itemKind: 'goods',
      goodsClass: 'media',
      itemName: '初回限定 Blu-ray',
      priceYen: 7000,
      searchClueRaw: '初回限定 Blu-ray',
      parsedSearchClues: parseSearchClues('初回限定 Blu-ray'),
    },
    styleMode: 'standard',
  });
  if (genericMediaFlow.questions.some((question) => question.id.startsWith('q_addon_voice_'))) {
    throw new Error('voice_media_generic_regression: generic media must not show voice-media addon questions');
  }

  const usedWaitClue = parseSearchClues('ドラマCD キャスト');
  const usedWaitOutput = buildEvaluatedOutput(
    'used',
    {
      q_goal: 'single',
      q_motives_multi: ['content', 'seiyuu_cast'],
      q_budget_pain: 'some',
      q_regret_impulse: 'calm',
      q_addon_media_motive: 'cast_performer',
      q_addon_media_support_scope: 'one_oshi',
      q_addon_media_collection_budget: 'balanced',
      q_addon_media_edition_intent: 'one_best_fit',
      q_addon_media_single_vs_set_intent: 'selective_subset',
      q_addon_media_completion_satisfaction: 'high',
      q_addon_media_used_market_recovery: 'wait_and_patch',
      q_addon_media_used_market_comfort: 'high',
      q_addon_media_completion_pressure_type: 'personal_standard',
      q_addon_media_set_reward_strength: 'weak',
      q_addon_media_member_version: 'specific_version',
      q_addon_media_playback_space: 'ready',
      q_addon_media_bonus_importance: 'low',
      q_addon_media_multi_store_tolerance: 'one_store_ok',
      q_addon_media_split_order_burden: 'medium',
      q_addon_media_random_goods_intent: 'none',
      q_addon_voice_cd_kind: 'drama_cd_main',
      q_addon_voice_cast_check: 'important_confirmed',
      q_addon_voice_bonus_is_audio: 'not_important',
      q_addon_voice_listen_timing: 'maybe_later',
      q_addon_goods_regret_axis: 'overpay_more',
    },
    'media',
    {
      itemName: '中古で追うドラマCD',
      searchClueRaw: usedWaitClue.raw,
      parsedSearchClues: usedWaitClue,
      priceYen: 2800,
    },
  );
  if (usedWaitOutput.holdSubtype !== 'timing_wait') {
    throw new Error('voice_media_used_wait: used fallback should become timing_wait only when the used-route logic is explicit');
  }
  if (!usedWaitOutput.reasons.some((reason) => reason.id === 'hold_timing_wait')) {
    throw new Error('voice_media_used_wait: timing_wait scenario should retain timing_wait-specific copy');
  }
  if (!usedWaitOutput.reasons.some((reason) => reason.text.includes('後から埋める') || reason.text.includes('中古'))) {
    throw new Error('voice_media_used_wait: used-route explanation should stay clear and secondary');
  }

  const replaySource = {
    runId: 'voice-media-replay',
    createdAt: new Date().toISOString(),
    mode: 'long' as const,
    useCase: 'merch' as const,
    itemKind: 'goods' as const,
    goodsClass: 'media' as const,
    styleMode: 'standard' as const,
    answers: {
      q_addon_voice_cd_kind: 'drama_cd_main',
      q_addon_voice_cast_check: 'important_confirmed',
      q_addon_voice_bonus_is_audio: 'nice_to_have',
      q_addon_voice_listen_timing: 'listen_soon',
    },
    meta: {
      itemKind: 'goods' as const,
      goodsClass: 'media' as const,
      itemName: 'ドラマCD replay',
      priceYen: 3200,
      searchClueRaw: buyClue.raw,
      parsedSearchClues: buyClue,
    },
    output: confirmedBuyOutput,
    diagnosticTrace: {
      runContext: { mode: 'long', itemKind: 'goods', goodsClass: 'media', hasPrice: true, hasItemName: true },
      shownQuestionIds: unresolvedBonusFlow.diagnosticTrace.shownQuestionIds,
      skippedQuestionIds: unresolvedBonusFlow.diagnosticTrace.skippedQuestionIds,
      branchHits: [],
      branchMisses: [],
    },
  };
  const replayDraft = createReplayDraft(replaySource as never, 'standard');
  if (replayDraft.answers.q_addon_voice_cast_check !== 'important_confirmed' || replayDraft.answers.q_addon_voice_listen_timing !== 'listen_soon') {
    throw new Error('voice_media_replay: addon answers should persist into replay draft');
  }
}

function runHomepageFunnelChecks() {
  if (!isGoodsClassApplicable("goods") || !isGoodsClassApplicable("used") || !isGoodsClassApplicable("preorder")) {
    throw new Error("homepage_funnel: goods-like item kinds should allow goodsClass step");
  }
  if (isGoodsClassApplicable("ticket") || isGoodsClassApplicable("blind_draw") || isGoodsClassApplicable("game_billing")) {
    throw new Error("homepage_funnel: non-goods item kinds should not require goodsClass step");
  }
  const ticketHint = getOptionalMetaHint("ticket");
  const blindHint = getOptionalMetaHint("blind_draw");
  if (!ticketHint.includes("日程") || !blindHint.includes("被り")) {
    throw new Error("homepage_funnel: optional meta hint should reflect item kind");
  }
}

function assertUniqueQuestion(results: ReturnType<typeof runScenario>[], scenarioId: string, questionId: string) {
  const scenario = results.find((r) => r.id === scenarioId);
  if (!scenario || !scenario.shownQuestionIds.includes(questionId)) {
    throw new Error(`${scenarioId}: expected unique question ${questionId}`);
  }
}

function runStyleInvariantCheck() {
  const base = resolveFlowQuestions({
    mode: "medium",
    itemKind: "goods",
    goodsClass: "paper",
    goodsSubtype: "general",
    useCase: "merch",
    answers: {},
    meta: { itemKind: "goods", goodsClass: "paper", itemName: "X", priceYen: 3000 },
    styleMode: "standard",
  });
  const other = resolveFlowQuestions({
    mode: "medium",
    itemKind: "goods",
    goodsClass: "paper",
    goodsSubtype: "general",
    useCase: "merch",
    answers: {},
    meta: { itemKind: "goods", goodsClass: "paper", itemName: "X", priceYen: 3000 },
    styleMode: "kawaii",
  });
  if (JSON.stringify(base.questions.map((q) => q.id)) !== JSON.stringify(other.questions.map((q) => q.id))) {
    throw new Error("style_invariant: style mode changed logic path");
  }
  const makeAnswers = (questions: typeof base.questions) => {
    const ans: Record<string, AnswerValue> = {};
    for (const q of questions) ans[q.id] = defaultAnswer(q.id);
    return ans;
  };
  const outBase = evaluate({
    questionSet: { id: 'style_base', locale: 'ja', category: 'merch', version: 1, questions: base.questions },
    meta: { itemKind: 'goods', goodsClass: 'paper', itemName: 'X', priceYen: 3000 },
    answers: makeAnswers(base.questions),
    mode: 'medium',
  });
  const outOther = evaluate({
    questionSet: { id: 'style_other', locale: 'ja', category: 'merch', version: 1, questions: other.questions },
    meta: { itemKind: 'goods', goodsClass: 'paper', itemName: 'X', priceYen: 3000 },
    answers: makeAnswers(other.questions),
    mode: 'medium',
  });
  if (outBase.decision !== outOther.decision || outBase.holdSubtype !== outOther.holdSubtype || Math.round(outBase.score * 1000) !== Math.round(outOther.score * 1000)) {
    throw new Error('style_invariant: style mode changed scoring outcome');
  }
}

const modes: Mode[] = ["short", "medium", "long"];
const itemKinds: ItemKind[] = ["goods", "blind_draw", "used", "preorder", "ticket", "game_billing"];
const styleModes: Scenario["styleMode"][] = ["standard", "kawaii", "oshi"];
const metaVariants: Scenario["metaVariant"][] = ["empty", "price", "deadline", "full"];

const scenarios: Scenario[] = [];
for (const mode of modes) {
  for (let i = 0; i < itemKinds.length; i += 1) {
    const itemKind = itemKinds[i];
    scenarios.push({
      id: `${mode}_${itemKind}`,
      mode,
      itemKind,
      styleMode: styleModes[i % styleModes.length],
      metaVariant: metaVariants[i % metaVariants.length],
      minBranchHitIds: itemKind === "game_billing" ? ["usecase_game_billing"] : itemKind === "goods" ? [`mode_${mode}`] : [`mode_${mode}`, `kind_${itemKind}`],
    });
  }
}

const goodsClasses: GoodsClass[] = ["small_collection", "paper", "wearable", "display_large", "tech", "media", "itabag_badge"];
for (const gc of goodsClasses) {
  scenarios.push({ id: `long_goods_${gc}`, mode: "long", itemKind: "goods", goodsClass: gc, styleMode: "standard", metaVariant: "full", minBranchHitIds: ["long_goods_class_addon"] });
  scenarios.push({ id: `long_used_${gc}`, mode: "long", itemKind: "used", goodsClass: gc, styleMode: "oshi", metaVariant: "full", minBranchHitIds: ["long_goods_class_addon"] });
}

const results = scenarios.map(runScenario);
runRefreshRestoreCheck();
runBackChangeCheck();
runStyleInvariantCheck();
runScoringSeparationChecks();
const blindDrawAcceptanceCases = runBlindDrawAcceptanceChecks();
const mediaEditionAcceptanceCases = runMediaEditionAcceptanceChecks();
runMixedMediaFlowCheck();
runMediumMediaCoverageCheck();
runVTMediaAcceptanceChecks();
runVoiceMediaAcceptanceChecks();
runTrustRepairAcceptanceChecks();
const bandNarrowingAcceptance = runBandNarrowingAcceptanceChecks();
const canonicalVerdictAcceptance = runCanonicalVerdictAcceptanceChecks();
runHomepageFunnelChecks();
runDraftInvalidationCheck();
runReplaySeedCheck();

assertUniqueQuestion(results, "long_used_small_collection", "q_addon_used_authenticity");
assertUniqueQuestion(results, "long_goods_small_collection", "q_addon_goods_collection_goal");
assertUniqueQuestion(results, "long_goods_paper", "q_addon_goods_paper_care");
assertUniqueQuestion(results, "long_goods_wearable", "q_addon_goods_wear_fit");
assertUniqueQuestion(results, "long_goods_display_large", "q_addon_goods_display_space_plan");
assertUniqueQuestion(results, "long_goods_tech", "q_addon_goods_tech_compat");
assertUniqueQuestion(results, "long_goods_media", "q_addon_media_motive");
assertUniqueQuestion(results, "long_goods_media", "q_addon_media_edition_intent");
assertUniqueQuestion(results, "long_goods_itabag_badge", "q_addon_goods_itabag_target");
assertUniqueQuestion(results, "long_blind_draw", "q_addon_blind_draw_miss_pain");
assertUniqueQuestion(results, "long_blind_draw", "q_addon_blind_draw_duplicate_tolerance");
assertUniqueQuestion(results, "long_preorder", "q_addon_preorder_decay");
assertUniqueQuestion(results, "long_ticket", "q_addon_ticket_trip_load");

const itemKindCoverage = Object.fromEntries(itemKinds.map((kind) => [kind, results.some((r) => r.id.includes(`_${kind}`) || r.id.includes(`-${kind}`))]));

const uniquePathGaps: string[] = [];
for (const kind of itemKinds) {
  const candidates = results.filter((r) => r.id.includes(`_${kind}`));
  const hasUnique = candidates.some((r) =>
    r.shownQuestionIds.some((id) => id.startsWith(`q_addon_${kind}`) || id.startsWith("gb_")),
  );
  if (!hasUnique) {
    uniquePathGaps.push(`itemKind=${kind} has no unique question path in current matrix`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  scenarioCount: results.length,
  scenarios: results,
  itemKindCoverage,
  checks: {
    refreshRestore: "pass",
    backThenChangeAnswer: "pass",
    styleInvariant: "pass",
    scoringSeparation: "pass",
    blindDrawAcceptance: "pass",
    mediaEditionAcceptance: "pass",
    mixedMediaFlow: "pass",
    mediumMediaCoverage: "pass",
    vtMediaAcceptance: "pass",
    voiceMediaAcceptance: "pass",
    trustRepairAcceptance: "pass",
    homepageFunnel: "pass",
    draftInvalidation: "pass",
    replaySeed: "pass",
    bandNarrowing: bandNarrowingAcceptance,
    canonicalVerdict: canonicalVerdictAcceptance,
  },
  blindDrawAcceptanceCases,
  mediaEditionAcceptanceCases,
  uniquePathGaps,
};

const outPath = path.join(process.cwd(), "docs/diagnostics/diagnosis_validation_report_latest.json");
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`diagnostics matrix pass: ${results.length} scenarios`);
console.log(`report: ${outPath}`);
if (uniquePathGaps.length > 0) {
  throw new Error(`unique path gaps detected: ${uniquePathGaps.join("; ")}`);
}


const venueRecoveryWait = buildEvaluatedOutput('goods', {
  q_addon_goods_event_limit_context: 'event_limited',
  q_addon_goods_post_event_mailorder: 'likely',
  q_addon_goods_wait_tolerance: 'high',
  q_addon_goods_first_chance_tolerance: 'high',
  q_addon_goods_used_fallback: 'medium',
  q_addon_goods_scarcity_pressure: 'high',
  q_addon_goods_venue_motive: 'event_memory',
  q_addon_goods_live_goods_motive: 'event_atmosphere',
  q_addon_goods_regret_axis: 'overpay_more',
  q_regret_impulse: 'fomo',
});
if (venueRecoveryWait.venueLimitedGoodsPlan?.chosenPath !== 'wait_for_post_event_followup') {
  throw new Error('venue_recovery_wait: venueLimitedGoodsPlan should prefer wait_for_post_event_followup');
}
if (venueRecoveryWait.venueLimitedGoodsPlan?.postEventFollowupPlausibility !== 'high' || venueRecoveryWait.venueLimitedGoodsPlan?.scarcityAssessment !== 'followup_plausible') {
  throw new Error('venue_recovery_wait: diagnostics should expose follow-up plausibility and follow-up-driven scarcity assessment');
}

const venueUsedFallback = buildEvaluatedOutput('goods', {
  q_addon_goods_event_limit_context: 'missed_onsite',
  q_addon_goods_post_event_mailorder: 'maybe',
  q_addon_goods_wait_tolerance: 'medium',
  q_addon_goods_first_chance_tolerance: 'medium',
  q_addon_goods_used_fallback: 'high',
  q_addon_goods_scarcity_pressure: 'medium',
  q_addon_goods_venue_motive: 'practical_collecting',
  q_addon_goods_live_goods_motive: 'symbolic_value',
  q_addon_goods_regret_axis: 'overpay_more',
});
if (venueUsedFallback.venueLimitedGoodsPlan?.chosenPath !== 'wait_for_post_event_followup') {
  throw new Error('venue_used_fallback: venueLimitedGoodsPlan should prefer wait_for_post_event_followup when follow-up is plausible');
}

const venueTrueScarcity = buildEvaluatedOutput('goods', {
  q_addon_goods_event_limit_context: 'venue_limited',
  q_addon_goods_post_event_mailorder: 'unlikely',
  q_addon_goods_wait_tolerance: 'low',
  q_addon_goods_first_chance_tolerance: 'low',
  q_addon_goods_used_fallback: 'low',
  q_addon_goods_scarcity_pressure: 'high',
  q_addon_goods_venue_motive: 'event_memory',
  q_addon_goods_live_goods_motive: 'core_attachment',
  q_addon_goods_regret_axis: 'miss_more',
});
if (venueTrueScarcity.venueLimitedGoodsPlan?.chosenPath !== 'buy_live_goods_now_if_it_matches_core_motive') {
  throw new Error('venue_true_scarcity: venueLimitedGoodsPlan should allow buy_live_goods_now_if_it_matches_core_motive');
}
if (venueTrueScarcity.venueLimitedGoodsPlan?.scarcityAssessment !== 'true_scarcity') {
  throw new Error('venue_true_scarcity: diagnostics should preserve true scarcity assessment');
}

const venueFomoClamp = buildEvaluatedOutput('goods', {
  q_addon_goods_event_limit_context: 'venue_limited',
  q_addon_goods_post_event_mailorder: 'likely',
  q_addon_goods_wait_tolerance: 'medium',
  q_addon_goods_first_chance_tolerance: 'high',
  q_addon_goods_used_fallback: 'medium',
  q_addon_goods_scarcity_pressure: 'high',
  q_addon_goods_venue_motive: 'collection_completeness',
  q_addon_goods_live_goods_motive: 'event_atmosphere',
  q_addon_goods_regret_axis: 'overpay_more',
  q_regret_impulse: 'fomo',
});
if (venueFomoClamp.venueLimitedGoodsPlan?.chosenPath !== 'wait_for_post_event_followup' && venueFomoClamp.venueLimitedGoodsPlan?.chosenPath !== 'skip_atmosphere_driven_goods_chase') {
  throw new Error('venue_fomo_clamp: venueLimitedGoodsPlan should clamp urgency when recovery is realistic');
}
if (!venueFomoClamp.venueLimitedGoodsPlan?.atmospherePressureChangedRecommendation) {
  throw new Error('venue_fomo_clamp: diagnostics should show atmosphere pressure changing the recommendation');
}
