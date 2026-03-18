export type SearchClueMode = "empty" | "exact" | "fuzzy";
export type SearchClueConfidence = "high" | "medium" | "low";

export type SearchClueClarificationKind = "itemType" | "bonusFocus";

export type SearchClueClarification = {
  kind: SearchClueClarificationKind;
  value: string;
  label: string;
};

export type ParsedSearchClues = {
  raw: string;
  normalized: string;
  workCandidates: string[];
  characterCandidates: string[];
  itemTypeCandidates: string[];
  editionClues: string[];
  bonusClues: string[];
  freeTextRemainder: string[];
  mode: SearchClueMode;
  confidence: SearchClueConfidence;
  clarification?: SearchClueClarification;
};

export type SearchClueDiagnostics = {
  searchClueMode: SearchClueMode;
  searchClueConfidence: SearchClueConfidence;
  parsedWorkCandidates: string[];
  parsedCharacterCandidates: string[];
  parsedItemTypeCandidates: string[];
  clarificationShown: boolean;
  clarificationResolved: boolean;
  originalSearchClueRaw: string;
  normalizedSearchClue: string;
};
