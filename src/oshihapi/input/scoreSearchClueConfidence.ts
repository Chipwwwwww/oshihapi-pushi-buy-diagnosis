import type { ParsedSearchClues, SearchClueConfidence, SearchClueMode } from "@/src/oshihapi/input/types";

export function scoreSearchClueConfidence(input: Omit<ParsedSearchClues, "mode" | "confidence">): {
  score: number;
  confidence: SearchClueConfidence;
  mode: SearchClueMode;
} {
  if (!input.normalized) {
    return { score: 0, confidence: "low", mode: "empty" };
  }

  let score = 0;
  const hasWork = input.workCandidates.length > 0;
  const hasCharacter = input.characterCandidates.length > 0;
  const hasItemType = input.itemTypeCandidates.length > 0;
  const hasEdition = input.editionClues.length > 0;
  const hasBonus = input.bonusClues.length > 0;

  if (hasWork) score += 2;
  if (hasCharacter) score += 2;
  if (hasItemType) score += 3;
  if (hasEdition) score += 1;
  if (hasBonus) score += 1;
  if (hasWork && hasItemType) score += 2;
  if (hasCharacter && hasItemType) score += 2;
  if (hasWork && hasCharacter && hasItemType) score += 1;
  if (hasEdition && hasItemType) score += 1;
  if (hasBonus && hasItemType) score += 1;

  if (!hasItemType && !hasEdition && !hasBonus && (hasWork || hasCharacter)) score -= 2;
  if (input.normalized.length <= 4) score -= 2;
  if (/^[a-z\-\s]+$/.test(input.normalized) && input.normalized.replace(/\s+/g, "").length <= 6) score -= 2;
  if (input.freeTextRemainder.length >= 3 && !hasItemType) score -= 1;

  const confidence: SearchClueConfidence = score >= 7 ? "high" : score >= 4 ? "medium" : "low";
  const mode: SearchClueMode =
    confidence === "high" && (hasItemType || hasEdition || hasBonus)
      ? "exact"
      : score > 0 || hasItemType || hasBonus || hasEdition
        ? "fuzzy"
        : "fuzzy";

  return { score, confidence, mode };
}
