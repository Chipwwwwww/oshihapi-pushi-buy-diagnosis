import {
  BONUS_KEYWORDS,
  CHARACTER_ALIASES,
  EDITION_KEYWORDS,
  ITEM_TYPE_ALIASES,
  type AliasEntry,
  WORK_ALIASES,
} from "@/src/oshihapi/input/aliasDictionary";
import { normalizeSearchClues } from "@/src/oshihapi/input/normalizeSearchClues";
import { scoreSearchClueConfidence } from "@/src/oshihapi/input/scoreSearchClueConfidence";
import type { ParsedSearchClues, SearchClueClarification, SearchClueDiagnostics } from "@/src/oshihapi/input/types";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectMatches(normalized: string, dictionary: AliasEntry[]) {
  const matchedCanonicals = new Set<string>();
  const matchedAliases = new Set<string>();
  let weakOnly = true;

  for (const entry of dictionary) {
    const hit = entry.aliases.some((alias) => {
      const pattern = new RegExp(`(^|\\s)${escapeRegExp(alias)}(?=$|\\s)`, "i");
      return pattern.test(normalized) || normalized.includes(alias);
    });
    if (!hit) continue;
    matchedCanonicals.add(entry.canonical);
    entry.aliases.forEach((alias) => {
      if (normalized.includes(alias)) matchedAliases.add(alias);
    });
    if ((entry.strength ?? "strong") === "strong") weakOnly = false;
  }

  return {
    canonical: [...matchedCanonicals],
    aliases: [...matchedAliases],
    weakOnly: matchedCanonicals.size > 0 ? weakOnly : false,
  };
}

function removeMatchedSegments(normalized: string, segments: string[]) {
  let remainder = normalized;
  for (const segment of segments) {
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(segment)}(?=$|\\s)`, "gi");
    remainder = remainder.replace(pattern, " ");
  }
  return remainder.replace(/\s+/g, " ").trim();
}

export function parseSearchClues(raw: string, clarification?: SearchClueClarification | null): ParsedSearchClues {
  const normalizedResult = normalizeSearchClues(raw);
  if (!normalizedResult.normalized) {
    return {
      raw,
      normalized: "",
      workCandidates: [],
      characterCandidates: [],
      itemTypeCandidates: [],
      editionClues: [],
      bonusClues: [],
      freeTextRemainder: [],
      mode: "empty",
      confidence: "low",
      clarification: clarification ?? undefined,
    };
  }

  const works = collectMatches(normalizedResult.normalized, WORK_ALIASES);
  const characters = collectMatches(normalizedResult.normalized, CHARACTER_ALIASES);
  const itemTypes = collectMatches(normalizedResult.normalized, ITEM_TYPE_ALIASES);
  const editions = collectMatches(normalizedResult.normalized, EDITION_KEYWORDS);
  const bonus = collectMatches(normalizedResult.normalized, BONUS_KEYWORDS);

  const extraItemTypes = clarification?.kind === "itemType" ? [clarification.value] : [];
  const extraBonus = clarification?.kind === "bonusFocus" ? [clarification.value] : [];
  const uniqueItemTypes = Array.from(new Set([...itemTypes.canonical, ...extraItemTypes]));
  const uniqueBonus = Array.from(new Set([...bonus.canonical, ...extraBonus]));

  const matchedSegments = [
    ...works.aliases,
    ...characters.aliases,
    ...itemTypes.aliases,
    ...editions.aliases,
    ...bonus.aliases,
  ];
  const remainder = removeMatchedSegments(normalizedResult.normalized, matchedSegments);
  const freeTextRemainder = remainder ? remainder.split(" ").filter(Boolean) : [];

  const scoreInput = {
    raw,
    normalized: normalizedResult.normalized,
    workCandidates: works.canonical,
    characterCandidates: characters.canonical,
    itemTypeCandidates: uniqueItemTypes,
    editionClues: editions.canonical,
    bonusClues: uniqueBonus,
    freeTextRemainder,
    clarification: clarification ?? undefined,
  };
  const scored = scoreSearchClueConfidence(scoreInput);

  const downgradedMode =
    scored.mode === "exact" && (works.weakOnly || characters.weakOnly) && !works.canonical.length
      ? "fuzzy"
      : scored.mode === "exact" && characters.weakOnly
        ? "fuzzy"
        : scored.mode;
  const downgradedConfidence =
    downgradedMode === "exact"
      ? scored.confidence
      : scored.confidence === "high" && (works.weakOnly || characters.weakOnly)
        ? "medium"
        : scored.confidence;

  return {
    ...scoreInput,
    mode: downgradedMode,
    confidence: downgradedConfidence,
  };
}

export function toSearchClueDiagnostics(parsed: ParsedSearchClues, options?: { clarificationShown?: boolean; clarificationResolved?: boolean }): SearchClueDiagnostics {
  return {
    searchClueMode: parsed.mode,
    searchClueConfidence: parsed.confidence,
    parsedWorkCandidates: parsed.workCandidates,
    parsedCharacterCandidates: parsed.characterCandidates,
    parsedItemTypeCandidates: parsed.itemTypeCandidates,
    clarificationShown: options?.clarificationShown ?? false,
    clarificationResolved: options?.clarificationResolved ?? false,
    originalSearchClueRaw: parsed.raw,
    normalizedSearchClue: parsed.normalized,
  };
}
