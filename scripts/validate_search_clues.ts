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

  const diagnostics = toSearchClueDiagnostics(refinedFuzzyB, { clarificationShown: true, clarificationResolved: true });
  assert(JSON.parse(JSON.stringify(diagnostics)).clarificationResolved === true, "search clue diagnostics should serialize safely");

  console.log("search clue checks pass");
}

main();
