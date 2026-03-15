import fs from "node:fs";
import path from "node:path";
import { evaluate } from "@/src/oshihapi/engine";
import { getOptionalMetaHint, isGoodsClassApplicable } from "@/src/oshihapi/homeFunnel";
import { resolveFlowQuestions } from "@/src/oshihapi/flowResolver";
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
  if (questionId === "q_hot_cold") return "normal";
  if (questionId === "q_price_feel") return "normal";
  if (questionId === "q_alternative_plan") return "maybe";
  if (questionId === "q_rarity_restock") return "maybe";
  if (questionId === "q_urgency") return "low_stock";
  if (questionId === "q_regret_impulse") return "calm";
  if (questionId === "q_impulse_axis_short") return 3;
  if (questionId === "q_desire") return 3;
  if (questionId.includes("blind_draw")) return "maybe";
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
  if (!Number.isFinite(output.confidence)) throw new Error(`${id}: confidence missing`);
  if (!Array.isArray(output.reasons) || output.reasons.length === 0) throw new Error(`${id}: reasons missing`);
  if (!Array.isArray(output.actions) || output.actions.length === 0) throw new Error(`${id}: actions missing`);
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
  const build = (itemKind: ItemKind, overrides: Record<string, AnswerValue>) => {
    const flow = resolveFlowQuestions({
      mode: 'long',
      itemKind,
      goodsClass: 'small_collection',
      goodsSubtype: 'general',
      useCase: itemKind === 'game_billing' ? 'game_billing' : 'merch',
      answers: overrides,
      meta: { itemKind, goodsClass: 'small_collection', itemName: '検証', priceYen: 4000 },
      styleMode: 'standard',
    });
    const answers: Record<string, AnswerValue> = {};
    for (const q of flow.questions) {
      answers[q.id] = overrides[q.id] ?? defaultAnswer(q.id);
    }
    return evaluate({
      questionSet: { id: 'check', locale: 'ja', category: 'merch', version: 1, questions: flow.questions },
      meta: { itemKind, goodsClass: 'small_collection', itemName: '検証', priceYen: 4000 },
      answers,
      mode: 'long',
      useCase: itemKind === 'game_billing' ? 'game_billing' : 'merch',
    });
  };

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
    q_addon_blind_draw_trade_intent: 'no',
    q_regret_impulse: 'excited',
  });
  if (
    blindHighRisk.decision === plainGoods.decision &&
    blindHighRisk.holdSubtype === plainGoods.holdSubtype &&
    Math.abs(blindHighRisk.score - plainGoods.score) < 0.12
  ) {
    throw new Error('separation: blind_draw high risk should differ from normal goods');
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

  if ([highBuy, highRiskHold, lowDesireSkip, plainGoods, usedRisk, blindHighRisk, billingNeedClear, billingImpulsive].some((o) => o.confidence < 0 || o.confidence > 100)) {
    throw new Error('bounds: confidence must stay within 0..100');
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

const goodsClasses: GoodsClass[] = ["small_collection", "paper", "wearable", "display_large", "tech", "itabag_badge"];
for (const gc of goodsClasses) {
  scenarios.push({ id: `long_goods_${gc}`, mode: "long", itemKind: "goods", goodsClass: gc, styleMode: "standard", metaVariant: "full", minBranchHitIds: ["long_goods_class_addon"] });
  scenarios.push({ id: `long_used_${gc}`, mode: "long", itemKind: "used", goodsClass: gc, styleMode: "oshi", metaVariant: "full", minBranchHitIds: ["long_goods_class_addon"] });
}

const results = scenarios.map(runScenario);
runRefreshRestoreCheck();
runBackChangeCheck();
runStyleInvariantCheck();
runScoringSeparationChecks();
runHomepageFunnelChecks();
runDraftInvalidationCheck();
runReplaySeedCheck();

assertUniqueQuestion(results, "long_used_small_collection", "q_addon_used_authenticity");
assertUniqueQuestion(results, "long_goods_small_collection", "q_addon_goods_collection_goal");
assertUniqueQuestion(results, "long_goods_paper", "q_addon_goods_paper_care");
assertUniqueQuestion(results, "long_goods_wearable", "q_addon_goods_wear_fit");
assertUniqueQuestion(results, "long_goods_display_large", "q_addon_goods_display_space_plan");
assertUniqueQuestion(results, "long_goods_tech", "q_addon_goods_tech_compat");
assertUniqueQuestion(results, "long_goods_itabag_badge", "q_addon_goods_itabag_target");
assertUniqueQuestion(results, "long_blind_draw", "q_addon_blind_draw_miss_pain");
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
    homepageFunnel: "pass",
    draftInvalidation: "pass",
    replaySeed: "pass",
  },
  uniquePathGaps,
};

const outPath = path.join(process.cwd(), "docs/diagnostics/diagnosis_validation_report_latest.json");
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`diagnostics matrix pass: ${results.length} scenarios`);
console.log(`report: ${outPath}`);
if (uniquePathGaps.length > 0) {
  throw new Error(`unique path gaps detected: ${uniquePathGaps.join("; ")}`);
}
