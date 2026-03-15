import type { AnswerValue, BranchTrace, DiagnosticTrace, GoodsClass, GoodsSubtype, InputMeta, ItemKind, Mode, Question, RunContextTrace } from "@/src/oshihapi/model";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { getGameBillingQuestions } from "@/src/oshihapi/gameBillingNeutralV1";
import {
  ADDON_BY_GOODS_CLASS,
  ADDON_BY_ITEM_KIND,
  CORE_12_QUESTION_IDS,
  QUICK_QUESTION_IDS,
  shouldAskStorage,
} from "@/src/oshihapi/question_sets";

export type FlowResolverInput = {
  mode: Mode;
  itemKind?: ItemKind;
  goodsClass: GoodsClass;
  goodsSubtype: GoodsSubtype;
  useCase: "merch" | "game_billing";
  answers: Record<string, AnswerValue>;
  meta: InputMeta;
  styleMode?: string;
};

export type FlowResolution = {
  questions: Question[];
  diagnosticTrace: DiagnosticTrace;
};

function toTraceContext(input: FlowResolverInput): RunContextTrace {
  return {
    mode: input.mode,
    itemKind: input.itemKind ?? "goods",
    goodsClass: input.goodsClass,
    styleMode: input.styleMode,
    deadline: input.meta.deadline,
    hasPrice: Number.isFinite(input.meta.priceYen ?? Number.NaN),
    hasItemName: Boolean(input.meta.itemName?.trim()),
  };
}

export function resolveFlowQuestions(input: FlowResolverInput): FlowResolution {
  if (input.useCase === "game_billing") {
    const questions = getGameBillingQuestions(input.mode, input.answers);
    return {
      questions,
      diagnosticTrace: {
        runContext: toTraceContext(input),
        shownQuestionIds: questions.map((q) => q.id),
        skippedQuestionIds: [],
        branchHits: [
          {
            id: "usecase_game_billing",
            matched: true,
            detail: `mode=${input.mode}`,
          },
        ],
        branchMisses: [],
      },
    };
  }

  const baseIds = input.mode === "short" ? QUICK_QUESTION_IDS : CORE_12_QUESTION_IDS;
  const itemKindAddonIds =
    input.mode !== "short" && input.itemKind
      ? (ADDON_BY_ITEM_KIND[input.itemKind] ?? []).slice(0, input.mode === "medium" ? 2 : undefined)
      : [];
  const enableGoodsClass = input.mode === "long" && (input.itemKind === "goods" || input.itemKind === "preorder" || input.itemKind === "used");
  const goodsClassAddonIds = enableGoodsClass ? ADDON_BY_GOODS_CLASS[input.goodsClass] ?? [] : [];
  const ids = [...baseIds, ...itemKindAddonIds, ...goodsClassAddonIds];

  const hasUnknownStorage = input.answers.q_storage_fit === "UNKNOWN" || input.answers.q_storage_space === "tight";
  const hasUnknownBudget = input.answers.q_budget_pain == null || input.answers.q_budget_pain === "some";
  const lacksMeta = !input.meta.itemName || !input.meta.priceYen;
  const branchHits: BranchTrace[] = [];
  const branchMisses: BranchTrace[] = [];

  const pushBranch = (id: string, matched: boolean, detail?: string) => {
    const branch = { id, matched, detail };
    if (matched) branchHits.push(branch);
    else branchMisses.push(branch);
  };

  pushBranch("mode_short", input.mode === "short");
  pushBranch("mode_medium", input.mode === "medium");
  pushBranch("mode_long", input.mode === "long");
  pushBranch("kind_used", input.itemKind === "used");
  pushBranch("kind_blind_draw", input.itemKind === "blind_draw");
  pushBranch("kind_preorder", input.itemKind === "preorder");
  pushBranch("kind_ticket", input.itemKind === "ticket");
  pushBranch("long_goods_class_addon", enableGoodsClass, `goodsClass=${input.goodsClass}`);
  pushBranch(`goods_class_${input.goodsClass}`, enableGoodsClass, `mode=${input.mode}`);
  pushBranch("unknown_storage_or_short", hasUnknownStorage || input.mode === "short", `unknownStorage=${String(hasUnknownStorage)}`);
  pushBranch("unknown_budget_or_short_or_lacks_meta", hasUnknownBudget || input.mode === "short" || lacksMeta, `unknownBudget=${String(hasUnknownBudget)},lacksMeta=${String(lacksMeta)}`);
  pushBranch(
    "force_common_info",
    input.mode !== "long" || lacksMeta || input.itemKind === "preorder" || input.itemKind === "ticket" || input.itemKind === "used",
    `itemKind=${input.itemKind ?? "goods"}`,
  );

  if (!ids.includes("q_storage_space") && (hasUnknownStorage || input.mode === "short")) ids.push("q_storage_space");
  if (!ids.includes("q_price_feel") && (hasUnknownBudget || input.mode === "short" || lacksMeta)) ids.push("q_price_feel");
  if (!ids.includes("q_addon_common_info") && (input.mode !== "long" || lacksMeta || input.itemKind === "preorder" || input.itemKind === "ticket" || input.itemKind === "used")) {
    ids.push("q_addon_common_info");
  }

  const deduped = Array.from(new Set(ids)).filter((id) => {
    if (id !== "q_storage_fit" && id !== "q_storage_space") return true;
    if (input.goodsClass === "itabag_badge" || input.goodsClass === "display_large") return false;
    return shouldAskStorage(input.itemKind, input.goodsSubtype);
  });

  const questions = deduped
    .map((id) => merch_v2_ja.questions.find((question) => question.id === id))
    .filter((question): question is Question => Boolean(question));

  const universe = new Set<string>([
    ...QUICK_QUESTION_IDS,
    ...CORE_12_QUESTION_IDS,
    ...Object.values(ADDON_BY_ITEM_KIND).flat(),
    ...Object.values(ADDON_BY_GOODS_CLASS).flat(),
    "q_storage_space",
    "q_price_feel",
    "q_addon_common_info",
  ]);

  return {
    questions,
    diagnosticTrace: {
      runContext: toTraceContext(input),
      shownQuestionIds: questions.map((q) => q.id),
      skippedQuestionIds: [...universe].filter((id) => !questions.some((q) => q.id === id)),
      branchHits,
      branchMisses,
    },
  };
}
