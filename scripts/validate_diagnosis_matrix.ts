import fs from "node:fs";
import path from "node:path";
import { evaluate } from "@/src/oshihapi/engine";
import { resolveFlowQuestions } from "@/src/oshihapi/flowResolver";
import { pruneAnswersAfterQuestion } from "@/src/oshihapi/flowState";
import { saveDiagnosisState, loadDiagnosisState, type DiagnosisState } from "@/src/store/diagnosisStore";
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
    if (questionId.endsWith("type")) return "gacha";
    return "some";
  }
  if (questionId.includes("storage_fit")) return "OK";
  if (questionId.includes("storage_space")) return "ok";
  if (questionId.includes("budget_pain")) return "low";
  if (questionId.includes("motives_multi")) return ["use"];
  if (questionId.includes("goal")) return "single";
  if (questionId.includes("hot_cold")) return "normal";
  if (questionId.includes("price_feel")) return "fair";
  if (questionId.includes("alternative_plan")) return "none";
  if (questionId.includes("rarity_restock")) return "restock";
  if (questionId.includes("urgency")) return "normal";
  if (questionId.includes("regret_impulse")) return "stable";
  if (questionId.includes("impulse_axis_short")) return 3;
  if (questionId.includes("desire")) return 3;
  if (questionId.includes("addon")) return "yes";
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
      minBranchHitIds: itemKind === "game_billing" ? ["usecase_game_billing"] : [`mode_${mode}`],
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
