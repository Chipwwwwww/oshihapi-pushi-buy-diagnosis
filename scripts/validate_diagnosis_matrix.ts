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
      confidence: output.confidence,
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
