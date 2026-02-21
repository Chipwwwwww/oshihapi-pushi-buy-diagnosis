import type { Question } from "@/src/oshihapi/model";

export type BehaviorRelevance = {
  affectsScore: boolean;
  affectsImpulseFlag: boolean;
  affectsFutureUseFlag: boolean;
  affectsTrendOrVagueFlag: boolean;
  affectsMerchMethod: boolean;
  affectsStorageGate: boolean;
};

const IMPULSE_FLAG_QUESTION_IDS = new Set(["q_motives_multi", "q_impulse_axis_short"]);
const FUTURE_USE_FLAG_QUESTION_IDS = new Set(["q_motives_multi"]);
const TREND_OR_VAGUE_FLAG_QUESTION_IDS = new Set(["q_motives_multi"]);
const MERCH_METHOD_QUESTION_IDS = new Set(["q_goal"]);
const STORAGE_GATE_QUESTION_IDS = new Set(["q_storage_fit"]);

export function getBehaviorRelevance(question: Question): BehaviorRelevance {
  const affectsScore =
    Boolean(question.mapTo) ||
    Boolean(question.options?.some((option) => option.delta && Object.keys(option.delta).length > 0));

  return {
    affectsScore,
    affectsImpulseFlag: IMPULSE_FLAG_QUESTION_IDS.has(question.id),
    affectsFutureUseFlag: FUTURE_USE_FLAG_QUESTION_IDS.has(question.id),
    affectsTrendOrVagueFlag: TREND_OR_VAGUE_FLAG_QUESTION_IDS.has(question.id),
    affectsMerchMethod: MERCH_METHOD_QUESTION_IDS.has(question.id),
    affectsStorageGate: STORAGE_GATE_QUESTION_IDS.has(question.id),
  };
}

export function getRelevanceSummary(relevance: BehaviorRelevance): string {
  const segments = [
    relevance.affectsScore ? "score" : "",
    relevance.affectsImpulseFlag || relevance.affectsFutureUseFlag || relevance.affectsTrendOrVagueFlag ? "flags" : "",
    relevance.affectsMerchMethod ? "method" : "",
    relevance.affectsStorageGate ? "storage" : "",
  ].filter(Boolean);
  return segments.join("|") || "none";
}

export function getImpactCategory(relevance: BehaviorRelevance): "score" | "flags" | "method" | "storage_gate" | "survey_only" {
  if (relevance.affectsScore) return "score";
  if (relevance.affectsImpulseFlag || relevance.affectsFutureUseFlag || relevance.affectsTrendOrVagueFlag) return "flags";
  if (relevance.affectsMerchMethod) return "method";
  if (relevance.affectsStorageGate) return "storage_gate";
  return "survey_only";
}
