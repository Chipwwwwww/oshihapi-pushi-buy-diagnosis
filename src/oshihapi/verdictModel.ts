import type {
  Decision,
  DisplayVerdictKey,
  HoldSubtype,
  VerdictFamily,
  RandomGoodsPlan,
  MediaEditionPlan,
  VenueLimitedGoodsPlan,
  ConfidenceLevel,
} from "./model";

type FactorBuckets = {
  desireAttachment: number;
  urgencyOpportunity: number;
  budgetPressure: number;
  readinessLogistics: number;
  uncertaintyUnknowns: number;
  impulseVolatility: number;
  itemKindRisk: number;
};

type ResolveCanonicalVerdictInput = {
  rawDecision: Decision;
  scoreSigned: number;
  holdBand: number;
  unknownCount: number;
  factorBuckets: FactorBuckets;
  trustGateActive: boolean;
  storageNeedsCheck: boolean;
  randomGoodsPlan?: RandomGoodsPlan;
  mediaEditionPlan?: MediaEditionPlan;
  venueLimitedGoodsPlan?: VenueLimitedGoodsPlan;
};

export type CanonicalVerdict = {
  decision: Decision;
  verdictFamily: VerdictFamily;
  holdSubtype: HoldSubtype | undefined;
  displayVerdictKey: DisplayVerdictKey;
  holdTriggers: string[];
  canonicalDecisionChanged: boolean;
};

const TIMING_WAIT_RANDOM_PATHS = new Set([
  "stop_drawing_check_used_market",
]);

const TIMING_WAIT_MEDIA_PATHS = new Set([
  "wait_and_patch_holes_later",
  "use_secondary_market_for_missing_items",
]);

const TIMING_WAIT_VENUE_PATHS = new Set([
  "wait_for_post_event_mailorder",
  "wait_for_post_event_followup",
  "skip_onsite_chase_and_check_later",
  "fallback_to_used_market_if_missed",
]);

function getDirectionalFamily(scoreSigned: number, factorBuckets: FactorBuckets): Exclude<VerdictFamily, "hold"> {
  if (scoreSigned > 0.02) return "buy";
  if (scoreSigned < -0.02) return "stop";
  return factorBuckets.desireAttachment >= factorBuckets.budgetPressure ? "buy" : "stop";
}

function hasNeedsCheckTrigger(input: ResolveCanonicalVerdictInput): string[] {
  const triggers: string[] = [];
  if (input.trustGateActive) triggers.push("trust_gate_active");
  if (input.storageNeedsCheck) triggers.push("storage_or_readiness_check");
  if (input.unknownCount >= 2 || input.factorBuckets.uncertaintyUnknowns >= 66) triggers.push("high_impact_unknowns");
  if (input.factorBuckets.readinessLogistics >= 72) triggers.push("readiness_not_locked");
  return triggers;
}

function hasTimingWaitTrigger(input: ResolveCanonicalVerdictInput): string[] {
  const triggers: string[] = [];
  if (input.randomGoodsPlan && TIMING_WAIT_RANDOM_PATHS.has(input.randomGoodsPlan.chosenPath)) {
    triggers.push(`random_goods:${input.randomGoodsPlan.chosenPath}`);
  }
  if (input.mediaEditionPlan && TIMING_WAIT_MEDIA_PATHS.has(input.mediaEditionPlan.chosenPath)) {
    triggers.push(`media_edition:${input.mediaEditionPlan.chosenPath}`);
  }
  if (input.venueLimitedGoodsPlan && TIMING_WAIT_VENUE_PATHS.has(input.venueLimitedGoodsPlan.chosenPath)) {
    triggers.push(`venue_limited:${input.venueLimitedGoodsPlan.chosenPath}`);
  }
  if (input.factorBuckets.urgencyOpportunity >= 62 && input.factorBuckets.uncertaintyUnknowns < 66 && input.scoreSigned >= -0.12 && input.scoreSigned <= 0.18) {
    triggers.push("timing_window_not_favorable");
  }
  return triggers;
}

function hasConflictingTrigger(input: ResolveCanonicalVerdictInput): string[] {
  const triggers: string[] = [];
  const strongBuySignals = input.factorBuckets.desireAttachment >= 72 || input.factorBuckets.urgencyOpportunity >= 70;
  const strongStopSignals =
    input.factorBuckets.budgetPressure >= 68 ||
    input.factorBuckets.impulseVolatility >= 68 ||
    input.factorBuckets.itemKindRisk >= 68;

  if (strongBuySignals && strongStopSignals) {
    triggers.push("high_buy_and_stop_signals_collide");
  }
  if (input.factorBuckets.desireAttachment >= 74 && input.factorBuckets.budgetPressure >= 70) {
    triggers.push("desire_vs_budget");
  }
  if (input.factorBuckets.urgencyOpportunity >= 70 && input.factorBuckets.impulseVolatility >= 68) {
    triggers.push("urgency_vs_impulse");
  }
  if (Math.abs(input.scoreSigned) <= Math.max(0.05, input.holdBand * 0.55) && strongBuySignals && strongStopSignals) {
    triggers.push("near_center_collision");
  }
  return triggers;
}

export function resolveCanonicalVerdict(input: ResolveCanonicalVerdictInput): CanonicalVerdict {
  const directionalFamily = getDirectionalFamily(input.scoreSigned, input.factorBuckets);

  if (input.rawDecision === "BUY" || input.rawDecision === "SKIP") {
    const verdictFamily = input.rawDecision === "BUY" ? "buy" : "stop";
    return {
      decision: input.rawDecision,
      verdictFamily,
      holdSubtype: undefined,
      displayVerdictKey: verdictFamily,
      holdTriggers: [],
      canonicalDecisionChanged: false,
    };
  }

  const needsCheckTriggers = hasNeedsCheckTrigger(input);
  const timingWaitTriggers = hasTimingWaitTrigger(input);
  const conflictingTriggers = hasConflictingTrigger(input);

  let holdSubtype: HoldSubtype | undefined;
  let holdTriggers: string[] = [];

  if (needsCheckTriggers.length > 0) {
    holdSubtype = "needs_check";
    holdTriggers = needsCheckTriggers;
  } else if (conflictingTriggers.length > 0) {
    holdSubtype = "conflicting";
    holdTriggers = conflictingTriggers;
  } else if (timingWaitTriggers.length > 0) {
    holdSubtype = "timing_wait";
    holdTriggers = timingWaitTriggers;
  }

  if (!holdSubtype) {
    const decision = directionalFamily === "buy" ? "BUY" : "SKIP";
    return {
      decision,
      verdictFamily: directionalFamily,
      holdSubtype: undefined,
      displayVerdictKey: directionalFamily,
      holdTriggers: [],
      canonicalDecisionChanged: true,
    };
  }

  return {
    decision: "THINK",
    verdictFamily: "hold",
    holdSubtype,
    displayVerdictKey: `hold_${holdSubtype}` as DisplayVerdictKey,
    holdTriggers,
    canonicalDecisionChanged: false,
  };
}

export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 75) return "high";
  if (confidence >= 55) return "medium";
  return "low";
}

export function toVerdictStrength(score: number): "strong" | "clear" | "lean" {
  const distance = Math.abs(score);
  if (distance >= 0.5) return "strong";
  if (distance >= 0.22) return "clear";
  return "lean";
}
