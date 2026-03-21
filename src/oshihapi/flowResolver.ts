import type { AnswerValue, BranchTrace, DiagnosticTrace, GoodsClass, GoodsSubtype, InputMeta, ItemKind, Mode, Question, RunContextTrace, SkippedQuestionTrace } from "@/src/oshihapi/model";
import { toSearchClueDiagnostics } from "@/src/oshihapi/input/parseSearchClues";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { getGameBillingQuestions } from "@/src/oshihapi/gameBillingNeutralV1";
import { getScenarioCoverageSummary } from "@/src/oshihapi/scenarioCoverage";
import {
  ADDON_BY_GOODS_CLASS,
  ADDON_BY_ITEM_KIND,
  CORE_12_QUESTION_IDS,
  QUICK_QUESTION_IDS,
  shouldAskStorage,
} from "@/src/oshihapi/question_sets";
import type { ParsedSearchClues } from "@/src/oshihapi/input/types";

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
  coverage: ReturnType<typeof getScenarioCoverageSummary>;
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

function hasStrongExactSearchClue(parsed?: ParsedSearchClues): boolean {
  return Boolean(parsed && parsed.mode === "exact" && parsed.confidence === "high");
}

function hasResolvedMediaItemType(parsed?: ParsedSearchClues): boolean {
  if (!parsed) return false;
  if (!parsed.itemTypeCandidates.some((candidate) => candidate === "CD" || candidate === "Blu-ray")) return false;
  return hasStrongExactSearchClue(parsed) || parsed.clarification?.kind === "itemType";
}

function hasStrongBonusSignal(parsed?: ParsedSearchClues): boolean {
  if (!parsed) return false;
  if (parsed.clarification?.kind === "bonusFocus") return true;
  if (!hasResolvedMediaItemType(parsed)) return false;
  return parsed.bonusClues.length > 0 || parsed.editionClues.length > 0;
}

function moveQuestionBefore(ids: string[], questionId: string, beforeId: string) {
  const fromIndex = ids.indexOf(questionId);
  const toIndex = ids.indexOf(beforeId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex < toIndex) return;
  ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, questionId);
}

function resolveItemKindAddonIds(input: FlowResolverInput): string[] {
  if (input.mode === "short" || !input.itemKind) return [];
  const configured = ADDON_BY_ITEM_KIND[input.itemKind] ?? [];
  if (input.itemKind === "blind_draw") return [...configured];
  return [...configured].slice(0, input.mode === "medium" ? 2 : undefined);
}

export function resolveFlowQuestions(input: FlowResolverInput): FlowResolution {
  const coverage = getScenarioCoverageSummary({
    itemKind: input.itemKind,
    goodsClass: input.goodsClass,
    parsedSearchClues: input.meta.parsedSearchClues,
    searchClueRaw: input.meta.searchClueRaw,
    answers: input.answers,
  });

  if (input.useCase === "game_billing") {
    const questions = getGameBillingQuestions(input.mode, input.answers);
    return {
      coverage,
      questions,
      diagnosticTrace: {
        runContext: toTraceContext(input),
        scenario: {
          key: coverage.key,
          supportLevel: coverage.supportLevel,
          diagnosticsTag: coverage.diagnosticsTag,
        },
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
        searchClue: input.meta.parsedSearchClues ? toSearchClueDiagnostics(input.meta.parsedSearchClues) : undefined,
      },
    };
  }

  const baseIds = input.mode === "short" ? QUICK_QUESTION_IDS : CORE_12_QUESTION_IDS;
  const itemKindAddonIds = resolveItemKindAddonIds(input);
  const enableGoodsClass = input.mode === "long" && (input.itemKind === "goods" || input.itemKind === "preorder" || input.itemKind === "used");
  const goodsClassAddonIds = enableGoodsClass ? ADDON_BY_GOODS_CLASS[input.goodsClass] ?? [] : [];
  const ids = [...baseIds, ...itemKindAddonIds, ...goodsClassAddonIds];

  const hasUnknownStorage = input.answers.q_storage_fit === "UNKNOWN" || input.answers.q_storage_space === "tight";
  const hasUnknownBudget = input.answers.q_budget_pain == null || input.answers.q_budget_pain === "some";
  const lacksMeta = !input.meta.itemName || !input.meta.priceYen;
  const parsedSearchClues = input.meta.parsedSearchClues;
  const branchHits: BranchTrace[] = [];
  const branchMisses: BranchTrace[] = [];
  const skippedQuestionTraces: SkippedQuestionTrace[] = [];

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
  pushBranch("search_clue_media_resolved", hasResolvedMediaItemType(parsedSearchClues), `itemTypes=${parsedSearchClues?.itemTypeCandidates.join("|") ?? ""}`);
  pushBranch("search_clue_bonus_strong", hasStrongBonusSignal(parsedSearchClues), `bonus=${parsedSearchClues?.bonusClues.join("|") ?? ""},edition=${parsedSearchClues?.editionClues.join("|") ?? ""}`);
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

  if (input.goodsClass === "media" && hasResolvedMediaItemType(parsedSearchClues)) {
    moveQuestionBefore(ids, "q_addon_media_motive", "q_addon_common_priority");
  }
  if (input.goodsClass === "media" && hasStrongBonusSignal(parsedSearchClues)) {
    moveQuestionBefore(ids, "q_addon_media_limited_pressure", "q_addon_common_priority");
  }

  const deduped = Array.from(new Set(ids)).filter((id) => {
    if (id !== "q_storage_fit" && id !== "q_storage_space") return true;
    if (input.goodsClass === "itabag_badge" || input.goodsClass === "display_large") return false;
    return shouldAskStorage(input.itemKind, input.goodsSubtype);
  }).filter((id) => {
    if (
      id === "q_addon_media_limited_pressure" &&
      input.goodsClass === "media" &&
      hasStrongBonusSignal(parsedSearchClues)
    ) {
      skippedQuestionTraces.push({
        questionId: id,
        reason: "search_clue_already_covers_bonus_pressure",
        source: "search_clue",
        detail: `mode=${parsedSearchClues?.mode ?? "none"},confidence=${parsedSearchClues?.confidence ?? "none"}`,
      });
      return false;
    }

    if (
      (id === "q_addon_goods_collection_goal" || id === "q_addon_goods_trade_intent") &&
      input.goodsClass === "small_collection" &&
      input.answers.q_goal === "single"
    ) {
      skippedQuestionTraces.push({
        questionId: id,
        reason: "single_target_goal_already_resolved_collection_intent",
        source: "answer",
        detail: "q_goal=single",
      });
      return false;
    }

    return true;
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
    coverage,
    questions,
    diagnosticTrace: {
      runContext: toTraceContext(input),
      scenario: {
        key: coverage.key,
        supportLevel: coverage.supportLevel,
        diagnosticsTag: coverage.diagnosticsTag,
      },
      shownQuestionIds: questions.map((q) => q.id),
      skippedQuestionIds: [...universe].filter((id) => !questions.some((q) => q.id === id)),
      skippedQuestionTraces,
      branchHits,
      branchMisses,
      searchClue: input.meta.parsedSearchClues ? toSearchClueDiagnostics(input.meta.parsedSearchClues) : undefined,
    },
  };
}
