import { resolveFlowQuestions } from "@/src/oshihapi/flowResolver";
import { getSearchClueClarification } from "@/src/oshihapi/input/getSearchClueClarification";
import { normalizeSearchClues } from "@/src/oshihapi/input/normalizeSearchClues";
import { parseSearchClues, toSearchClueDiagnostics } from "@/src/oshihapi/input/parseSearchClues";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const normalized = normalizeSearchClues("  IM@S  缶バ  BD  ");
  assert(normalized.normalized === "アイマス 缶バッジ blu-ray", "normalization should expand common shorthand");

  const empty = parseSearchClues("   ");
  assert(empty.mode === "empty", "empty input should stay empty mode");

  const exactA = parseSearchClues("うたプリ 特典付きCD");
  assert(exactA.mode === "exact" && exactA.confidence === "high", "work + bonus + item type should classify as exact/high");

  const exactB = parseSearchClues("倉本千奈 缶バッジ");
  assert(exactB.mode === "exact", "strong character + item type should classify as exact");

  const exactC = parseSearchClues("初回限定 Blu-ray");
  assert(exactC.mode === "exact", "edition + media item type should classify as exact");

  const fuzzyA = parseSearchClues("学マス ちな 缶バ");
  assert(fuzzyA.mode === "fuzzy" && fuzzyA.confidence === "medium", "weak alias clue should stay fuzzy/medium");

  const fuzzyB = parseSearchClues("うたプリ 特典");
  assert(fuzzyB.mode === "fuzzy", "partial work + bonus clue should stay fuzzy");
  const promptB = getSearchClueClarification(fuzzyB);
  assert(promptB?.options.some((option) => option.kind === "itemType" && option.value === "Blu-ray"), "fuzzy clue should offer one-step clarification");

  const refinedFuzzyB = parseSearchClues("うたプリ 特典", { kind: "itemType", value: "Blu-ray", label: "CD・Blu-ray" });
  assert(refinedFuzzyB.itemTypeCandidates.includes("Blu-ray"), "clarification should refine item type clues");

  const fuzzyC = parseSearchClues("二手店看到的藍光");
  assert(fuzzyC.mode === "fuzzy", "foreign-language partial clue should stay fuzzy");

  const lowA = parseSearchClues("china");
  assert(lowA.confidence === "low", "noisy roman text should stay low confidence");

  const lowB = parseSearchClues("限定");
  assert(lowB.confidence === "low", "single vague keyword should stay low confidence");

  const lowC = parseSearchClues("アイマス");
  assert(lowC.confidence === "low", "single work alias should stay low confidence");

  const flow = resolveFlowQuestions({
    mode: "medium",
    itemKind: "goods",
    goodsClass: "paper",
    goodsSubtype: "general",
    useCase: "merch",
    answers: {},
    meta: {
      itemKind: "goods",
      goodsClass: "paper",
      searchClueRaw: "うたプリ 特典",
      parsedSearchClues: refinedFuzzyB,
    },
    styleMode: "standard",
  });
  assert(Array.isArray(flow.questions) && flow.questions.length > 0, "planner flow should still resolve with clue input");
  assert(flow.diagnosticTrace.searchClue?.searchClueMode === refinedFuzzyB.mode, "diagnostics should include search clue mode");
  assert(JSON.stringify(flow.diagnosticTrace).includes("normalizedSearchClue"), "diagnostics should stay JSON-safe");

  const exactBonusMedia = parseSearchClues("うたプリ 初回限定 Blu-ray 特典");
  const mediaFlow = resolveFlowQuestions({
    mode: "long",
    itemKind: "goods",
    goodsClass: "media",
    goodsSubtype: "general",
    useCase: "merch",
    answers: {},
    meta: {
      itemKind: "goods",
      goodsClass: "media",
      searchClueRaw: exactBonusMedia.raw,
      parsedSearchClues: exactBonusMedia,
      itemName: "特典付き円盤",
      priceYen: 7800,
    },
    styleMode: "standard",
  });
  assert(!mediaFlow.questions.some((question) => question.id === "q_addon_media_limited_pressure"), "strong bonus clue should skip duplicate media bonus pressure question");
  assert(
    mediaFlow.diagnosticTrace.skippedQuestionTraces?.some(
      (trace) =>
        trace.questionId === "q_addon_media_limited_pressure" &&
        trace.reason === "search_clue_already_covers_bonus_pressure",
    ),
    "skipped media bonus question should remain diagnosable",
  );

  const mediaMotiveIndex = mediaFlow.questions.findIndex((question) => question.id === "q_addon_media_motive");
  const commonPriorityIndex = mediaFlow.questions.findIndex((question) => question.id === "q_addon_common_priority");
  assert(
    mediaMotiveIndex !== -1 && commonPriorityIndex !== -1 && mediaMotiveIndex < commonPriorityIndex,
    "resolved media clue should move motive disambiguation ahead of generic common priority",
  );

  const noClueFlow = resolveFlowQuestions({
    mode: "medium",
    itemKind: "goods",
    goodsClass: "paper",
    goodsSubtype: "general",
    useCase: "merch",
    answers: {},
    meta: {
      itemKind: "goods",
      goodsClass: "paper",
      itemName: "テスト商品",
    },
    styleMode: "standard",
  });
  assert(noClueFlow.questions.length > 0, "planner flow should still work without clue input");

  const singleFocusLongFlow = resolveFlowQuestions({
    mode: "long",
    itemKind: "goods",
    goodsClass: "small_collection",
    goodsSubtype: "general",
    useCase: "merch",
    answers: { q_goal: "single" },
    meta: {
      itemKind: "goods",
      goodsClass: "small_collection",
      itemName: "アクスタ",
      priceYen: 2200,
    },
    styleMode: "standard",
  });
  assert(
    !singleFocusLongFlow.questions.some((question) => question.id === "q_addon_goods_collection_goal"),
    "single-target goal should skip duplicate collection-goal question",
  );
  assert(
    !singleFocusLongFlow.questions.some((question) => question.id === "q_addon_goods_trade_intent"),
    "single-target goal should skip duplicate trade-intent question",
  );
  assert(
    singleFocusLongFlow.diagnosticTrace.skippedQuestionTraces?.filter(
      (trace) => trace.reason === "single_target_goal_already_resolved_collection_intent",
    ).length === 2,
    "single-target skip rules should stay diagnosable",
  );

  const diagnostics = toSearchClueDiagnostics(refinedFuzzyB, { clarificationShown: true, clarificationResolved: true });
  assert(JSON.parse(JSON.stringify(diagnostics)).clarificationResolved === true, "search clue diagnostics should serialize safely");

  console.log("search clue checks pass");
}

main();
