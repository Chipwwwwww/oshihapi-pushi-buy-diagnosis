import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GoodsSubtype, ItemKind, Question } from "@/src/oshihapi/model";
import { GAME_BILLING_OPTION_DELTAS, getGameBillingQuestions } from "@/src/oshihapi/gameBillingNeutralV1";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { basket_questions_ja } from "@/src/oshihapi/basket_questions_ja";
import { resolveOptionLabel, resolveQuestionText } from "@/src/oshihapi/modes/question_copy_resolver";
import {
  getBehaviorRelevance,
  getImpactCategory,
  getRelevanceSummary,
} from "@/src/oshihapi/question_behavior_relevance";
import {
  ADDON_BY_ITEM_KIND,
  CORE_12_QUESTION_IDS,
  GAME_BILLING_FULL_BASE_QUESTION_IDS,
  GAME_BILLING_Q10_SPLIT_RULE,
  GAME_BILLING_SHORT_QUESTION_IDS,
  QUICK_QUESTION_IDS,
  resolveGameBillingQ10QuestionId,
  shouldAskStorage,
} from "@/src/oshihapi/question_sets";

const ITEM_KINDS: ItemKind[] = ["goods", "blind_draw", "ticket", "preorder", "used"];
const GOODS_SUBTYPES: GoodsSubtype[] = ["general", "itaBag_badge"];
const STYLES = ["standard", "kawaii", "oshi"] as const;
type Style = (typeof STYLES)[number];

type BuyStopDelta = { buyDelta: number; stopDelta: number; netDelta: number };

const gameBillingQuestionMap = new Map(
  [
    ...getGameBillingQuestions("short", {}),
    ...getGameBillingQuestions("medium", { gb_q2_type: "gacha" }),
    ...getGameBillingQuestions("medium", { gb_q2_type: "pass" }),
  ].map((q) => [q.id, q]),
);

function getMerchQuestionIds(
  mode: "short" | "medium" | "long",
  itemKind: ItemKind,
  goodsSubtype: GoodsSubtype = "general",
): string[] {
  const baseIds = mode === "short" ? [...QUICK_QUESTION_IDS] : [...CORE_12_QUESTION_IDS];
  const addonIds = mode === "long" ? [...(ADDON_BY_ITEM_KIND[itemKind] ?? [])] : [];
  return [...baseIds, ...addonIds].filter(
    (id) => id !== "q_storage_fit" || shouldAskStorage(itemKind, goodsSubtype),
  );
}

function getScoringRelevance(useCase: "merch" | "game_billing" | "basket", question: Question): string {
  if (useCase === "game_billing") return "contributes_to_buy_stop_mapping";
  if (useCase === "basket") return "basket_context_or_item_schema";
  const hasMapTo = Boolean(question.mapTo);
  const hasDelta = Boolean(question.options?.some((option) => option.delta && Object.keys(option.delta).length > 0));
  const isStorageGate = question.id === "q_storage_fit";
  return [hasMapTo ? "mapTo" : "", hasDelta ? "delta" : "", isStorageGate ? "storage_gate" : ""]
    .filter(Boolean)
    .join("+") || "none";
}

function questionStyles(question: Question): { textByStyle: Record<Style, string>; sameAsStandard: boolean } {
  const byStyle = {
    standard: resolveQuestionText(question, "standard").text,
    kawaii: resolveQuestionText(question, "kawaii").text,
    oshi: resolveQuestionText(question, "oshi").text,
  };
  return { textByStyle: byStyle, sameAsStandard: byStyle.standard === byStyle.kawaii && byStyle.standard === byStyle.oshi };
}

function optionStyles(questionId: string, option: { id: string; label: string }) {
  const byStyle = {
    standard: resolveOptionLabel(questionId, option, "standard").label,
    kawaii: resolveOptionLabel(questionId, option, "kawaii").label,
    oshi: resolveOptionLabel(questionId, option, "oshi").label,
  };
  return { byStyle, sameAsStandard: byStyle.standard === byStyle.kawaii && byStyle.standard === byStyle.oshi };
}

function csvEscape(value: string): string {
  if (/[,"\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function toBuyStopDelta(questionId: string, optionId: string): BuyStopDelta | null {
  const delta = GAME_BILLING_OPTION_DELTAS[questionId]?.[optionId];
  if (!delta) return null;
  return { buyDelta: delta.buyDelta, stopDelta: delta.stopDelta, netDelta: delta.buyDelta - delta.stopDelta };
}

const getMerchBranchVariants = (mode: "short" | "medium" | "long", itemKind: ItemKind) => {
  if (itemKind !== "goods") {
    return [{ branchSuffix: "", questionIds: getMerchQuestionIds(mode, itemKind) }];
  }
  return GOODS_SUBTYPES.map((goodsSubtype) => ({
    branchSuffix: goodsSubtype === "general" ? "" : `#${goodsSubtype}`,
    questionIds: getMerchQuestionIds(mode, itemKind, goodsSubtype),
  }));
};

const merchBranching = {
  short: Object.fromEntries(
    ITEM_KINDS.flatMap((kind) =>
      getMerchBranchVariants("short", kind).map((variant) => [
        `${kind}${variant.branchSuffix}`,
        variant.questionIds,
      ]),
    ),
  ),
  medium: Object.fromEntries(
    ITEM_KINDS.flatMap((kind) =>
      getMerchBranchVariants("medium", kind).map((variant) => [
        `${kind}${variant.branchSuffix}`,
        variant.questionIds,
      ]),
    ),
  ),
  long: Object.fromEntries(
    ITEM_KINDS.flatMap((kind) =>
      getMerchBranchVariants("long", kind).map((variant) => [
        `${kind}${variant.branchSuffix}`,
        variant.questionIds,
      ]),
    ),
  ),
};

const gameBillingBranching = {
  short: [...GAME_BILLING_SHORT_QUESTION_IDS],
  medium: [...GAME_BILLING_FULL_BASE_QUESTION_IDS, resolveGameBillingQ10QuestionId("not_gacha")],
  long: [...GAME_BILLING_FULL_BASE_QUESTION_IDS, resolveGameBillingQ10QuestionId("not_gacha")],
  dynamicBranch: {
    rule: `${GAME_BILLING_Q10_SPLIT_RULE.conditionQuestionId} == ${GAME_BILLING_Q10_SPLIT_RULE.whenOptionId}`,
    then: GAME_BILLING_Q10_SPLIT_RULE.thenQuestionId,
    else: GAME_BILLING_Q10_SPLIT_RULE.elseQuestionId,
  },
};

const basketBranching = {
  core: basket_questions_ja.map((entry) => entry.question.id),
};

const appearsInByQuestionId = new Map<string, Set<string>>();
const appendAppearsIn = (questionId: string, branchKey: string) => {
  const current = appearsInByQuestionId.get(questionId) ?? new Set<string>();
  current.add(branchKey);
  appearsInByQuestionId.set(questionId, current);
};

for (const mode of ["short", "medium", "long"] as const) {
  for (const [branchItemKind, questionIds] of Object.entries(merchBranching[mode])) {
    for (const questionId of questionIds) {
      appendAppearsIn(questionId, `merch/${mode}/${branchItemKind}`);
    }
  }
}

for (const mode of ["short", "medium", "long"] as const) {
  for (const questionId of gameBillingBranching[mode]) {
    appendAppearsIn(questionId, `game_billing/${mode}`);
  }
}
appendAppearsIn(GAME_BILLING_Q10_SPLIT_RULE.thenQuestionId, "game_billing/q10_then_pity");
appendAppearsIn(GAME_BILLING_Q10_SPLIT_RULE.elseQuestionId, "game_billing/q10_else_value");
for (const questionId of basketBranching.core) {
  appendAppearsIn(questionId, "basket/core");
}

const allQuestions = [
  ...merch_v2_ja.questions.map((question) => ({ useCase: "merch" as const, question })),
  ...Array.from(gameBillingQuestionMap.values()).map((question) => ({ useCase: "game_billing" as const, question })),
  ...basket_questions_ja.map((entry) => ({ useCase: "basket" as const, question: entry.question })),
].sort((a, b) => a.question.id.localeCompare(b.question.id));

const questionsJson = allQuestions.map(({ useCase, question }) => {
  const styles = questionStyles(question);
  const behaviorRelevance = useCase === "merch" ? getBehaviorRelevance(question) : null;
  const appearsInBranches = [...(appearsInByQuestionId.get(question.id) ?? [])].sort((a, b) => a.localeCompare(b));
  const options = [...(question.options ?? [])]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((option) => {
      const styleLabels = optionStyles(question.id, option);
      return {
        optionId: option.id,
        labels: styleLabels.byStyle,
        sameAsStandard: styleLabels.sameAsStandard,
        mapTo: question.mapTo ?? null,
        delta: option.delta ?? null,
        tags: option.tags ?? [],
        buyStopDelta: useCase === "game_billing" ? toBuyStopDelta(question.id, option.id) : null,
      };
    });
  const tags = [...new Set((question.options ?? []).flatMap((option) => option.tags ?? []))].sort();
  return {
    useCase,
    questionId: question.id,
    questionType: question.type,
    scoringRelevance: getScoringRelevance(useCase, question),
    impactCategory: useCase === "merch" ? getImpactCategory(behaviorRelevance!) : null,
    behaviorRelevance,
    relevanceSummary: useCase === "merch" ? getRelevanceSummary(behaviorRelevance!) : "none",
    mapTo: question.mapTo ?? null,
    tags,
    unknownTagHints: tags.filter((tag) => tag.startsWith("unknown_")),
    appearsInBranches,
    isOrphan: appearsInBranches.length === 0,
    sameAsStandard: styles.sameAsStandard,
    styles: styles.textByStyle,
    scaleLabels: question.type === "scale" ? { left: question.leftLabel ?? null, right: question.rightLabel ?? null } : null,
    options,
  };
});

const orphanQuestionIds = questionsJson.filter((q) => q.isOrphan).map((q) => q.questionId).sort((a, b) => a.localeCompare(b));

const md: string[] = ["# Question Bank Branching Table", "", "## A. Branching Matrix", "", "### Merch"];
for (const mode of ["short", "medium", "long"] as const) {
  md.push(`#### mode=${mode}`);
  for (const [branchItemKind, questionIds] of Object.entries(merchBranching[mode])) {
    md.push(`- itemKind=${branchItemKind}: ${questionIds.join(" -> ")}`);
  }
  md.push("");
}
md.push("### Game Billing");
md.push(`- mode=short: ${gameBillingBranching.short.join(" -> ")}`);
md.push(`- mode=medium: ${gameBillingBranching.medium.join(" -> ")}`);
md.push(`- mode=long: ${gameBillingBranching.long.join(" -> ")}`);
md.push(`- dynamic branch: q10 = ${GAME_BILLING_Q10_SPLIT_RULE.thenQuestionId} if ${GAME_BILLING_Q10_SPLIT_RULE.conditionQuestionId} == ${GAME_BILLING_Q10_SPLIT_RULE.whenOptionId}, else ${GAME_BILLING_Q10_SPLIT_RULE.elseQuestionId}`);
md.push("", "### Basket");
md.push(`- mode=core: ${basketBranching.core.join(" -> ")}`);
md.push("", "## B. Orphan Questions", "");
md.push(orphanQuestionIds.length > 0 ? `- ${orphanQuestionIds.join(", ")}` : "- (none)");
md.push("", "## C. Question Catalog Detail", "");
for (const q of questionsJson) {
  md.push(`### ${q.questionId}`);
  md.push(`- useCase: ${q.useCase}`);
  md.push(`- type: ${q.questionType}`);
  md.push(`- scoring relevance: ${q.scoringRelevance}`);
  md.push(`- impactCategory: ${q.impactCategory ?? ""}`);
  md.push(`- relevanceSummary: ${q.relevanceSummary}`);
  md.push(`- behaviorRelevance: ${q.behaviorRelevance ? JSON.stringify(q.behaviorRelevance) : ""}`);
  md.push(`- appears in: ${q.appearsInBranches.join(" | ") || ""}`);
  md.push(`- isOrphan: ${q.isOrphan}`);
  md.push(`- mapTo: ${q.mapTo ?? ""}`);
  md.push(`- tags: ${q.tags.join(", ") || ""}`);
  md.push(`- unknown tags hints: ${q.unknownTagHints.join(", ") || ""}`);
  md.push(`- text_standard: ${q.styles.standard}`);
  md.push(`- text_kawaii: ${q.styles.kawaii}`);
  md.push(`- text_oshi: ${q.styles.oshi}`);
  md.push(`- sameAsStandard: ${q.sameAsStandard}`);
  if (q.scaleLabels) md.push(`- scaleLabels: left=${q.scaleLabels.left ?? ""}, right=${q.scaleLabels.right ?? ""}`);
  md.push("<details>", "<summary>Options</summary>", "");
  if (q.options.length === 0) md.push("(none)");
  else {
    md.push(
      "| optionId | standard | kawaii | oshi | sameAsStandard | tags | delta | gb_buy | gb_stop | gb_net |",
      "|---|---|---|---|---|---|---|---|---|---|",
    );
    for (const option of q.options) {
      const deltaSummary = option.delta ? Object.entries(option.delta).map(([k, v]) => `${k}:${v}`).sort().join(";") : "";
      md.push(
        `| ${option.optionId} | ${option.labels.standard} | ${option.labels.kawaii} | ${option.labels.oshi} | ${option.sameAsStandard} | ${option.tags.join(";")} | ${deltaSummary} | ${option.buyStopDelta?.buyDelta ?? ""} | ${option.buyStopDelta?.stopDelta ?? ""} | ${option.buyStopDelta?.netDelta ?? ""} |`,
      );
    }
  }
  md.push("", "</details>", "");
}

const csvHeaders = [
  "useCase",
  "questionId",
  "questionType",
  "optionId",
  "text_standard",
  "text_kawaii",
  "text_oshi",
  "option_standard",
  "option_kawaii",
  "option_oshi",
  "scoringRelevance",
  "impactCategory",
  "relevanceSummary",
  "appears_in",
  "is_orphan",
  "mapTo",
  "deltaSummary",
  "tagSummary",
  "gb_buy_delta",
  "gb_stop_delta",
  "gb_net_delta",
  "sameAsStandard",
];
const csvRows = [csvHeaders.join(",")];
for (const q of questionsJson) {
  const rows = q.options.length
    ? q.options
    : [
        {
          optionId: "",
          labels: { standard: "", kawaii: "", oshi: "" },
          sameAsStandard: q.sameAsStandard,
          delta: null,
          tags: [] as string[],
          buyStopDelta: null,
        },
      ];
  for (const option of rows) {
    const deltaSummary = option.delta ? Object.entries(option.delta).map(([k, v]) => `${k}:${v}`).sort().join(";") : "";
    const sameAsStandard = q.sameAsStandard && option.sameAsStandard;
    csvRows.push(
      [
        q.useCase,
        q.questionId,
        q.questionType,
        option.optionId,
        q.styles.standard,
        q.styles.kawaii,
        q.styles.oshi,
        option.labels.standard,
        option.labels.kawaii,
        option.labels.oshi,
        q.scoringRelevance,
        q.impactCategory ?? "",
        q.relevanceSummary,
        q.appearsInBranches.join("|"),
        String(q.isOrphan),
        q.mapTo ?? "",
        deltaSummary,
        option.tags.join(";"),
        option.buyStopDelta?.buyDelta ?? "",
        option.buyStopDelta?.stopDelta ?? "",
        option.buyStopDelta?.netDelta ?? "",
        String(sameAsStandard),
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }
}

const jsonOutput = {
  schemaVersion: 2,
  generated: { stable: true },
  branchingMatrix: { merch: merchBranching, game_billing: gameBillingBranching, basket: basketBranching },
  questions: questionsJson,
};
mkdirSync(join(process.cwd(), "docs"), { recursive: true });
writeFileSync(join(process.cwd(), "docs/question_bank_branch_table_latest.md"), `${md.join("\n")}\n`, "utf8");
writeFileSync(join(process.cwd(), "docs/question_bank_branch_table_latest.csv"), `${csvRows.join("\n")}\n`, "utf8");
writeFileSync(join(process.cwd(), "docs/question_bank_branch_table_latest.json"), `${JSON.stringify(jsonOutput, null, 2)}\n`, "utf8");
console.log("Generated docs/question_bank_branch_table_latest.{md,csv,json}");
