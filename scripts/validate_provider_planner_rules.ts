import { planProviderCards } from "@/src/oshihapi/providerPlanner";

type ProviderPlanInput = Parameters<typeof planProviderCards>[0];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const DELIVERY_READY_BASE: Pick<
  ProviderPlanInput,
  | "mercariRelevant"
  | "mercariKeyword"
  | "amazonDestination"
  | "rakutenAffiliateUrl"
  | "surugayaDestination"
  | "amiamiDestination"
  | "gamersDestination"
  | "hmvDestination"
> = {
  mercariRelevant: true,
  mercariKeyword: "テスト",
  amazonDestination: { id: "fallback", label: "Amazon", href: "https://example.com/amazon" },
  rakutenAffiliateUrl: "https://example.com/rakuten",
  surugayaDestination: "https://example.com/surugaya",
  amiamiDestination: "https://example.com/amiami",
  gamersDestination: "https://example.com/gamers",
  hmvDestination: "https://example.com/hmv",
};

async function scenario(overrides: Partial<ProviderPlanInput>) {
  return planProviderCards({
    runId: "provider-rules-check",
    itemKind: "goods",
    goodsClass: "small_collection",
    verdict: "THINK",
    confidence: 72,
    resultTags: [],
    searchClues: {
      raw: "",
      normalized: "",
      workCandidates: [],
      characterCandidates: [],
      itemTypeCandidates: [],
      editionClues: [],
      bonusClues: [],
      freeTextRemainder: [],
      mode: "empty",
      confidence: "low",
    },
    ...DELIVERY_READY_BASE,
    ...overrides,
  });
}

async function main() {
  const truthVsDelivery = await scenario({
    goodsClass: "paper",
    confidence: 74,
    resultTags: ["bonus_pressure_high"],
    searchClues: {
      raw: "特典 ブロマイド",
      normalized: "特典 ブロマイド",
      workCandidates: ["作品A"],
      characterCandidates: [],
      itemTypeCandidates: [],
      editionClues: [],
      bonusClues: ["特典"],
      freeTextRemainder: [],
      mode: "fuzzy",
      confidence: "medium",
    },
  });
  assert(truthVsDelivery.diagnostics.truthCandidates.includes("melonbooks"), "melonbooks should exist in truth-layer candidates");
  assert(!truthVsDelivery.diagnostics.deliveryCandidates.includes("melonbooks"), "melonbooks must stay out of delivery candidates");
  assert(
    truthVsDelivery.diagnostics.deliveryFilteredProviders.some((entry) => entry.providerId === "melonbooks" && entry.reason === "not_delivery_enabled"),
    "truth-layer-only Melonbooks should explain delivery exclusion",
  );

  const smallCollectionFit = await scenario({
    goodsClass: "itabag_badge",
    confidence: 76,
  });
  const smallCollectionIds = smallCollectionFit.cards.map((card) => card.providerId);
  assert(!smallCollectionFit.cards.some((card) => card.providerId === "amiami" && card.tier === "recommended"), "amiami should not win badge-like builder scenarios");
  assert(smallCollectionIds.includes("mercari") || smallCollectionIds.includes("surugaya"), "used-market specialists should remain visible for badge-like scenarios");
  assert(
    smallCollectionFit.diagnostics.candidateEvaluations.some(
      (entry) => entry.providerId === "amiami" && entry.demotionReasons.includes("goods_class_mismatch"),
    ),
    "diagnostics should record hobby/provider demotion for badge-like scenarios",
  );

  const mediaPreorder = await scenario({
    itemKind: "preorder",
    goodsClass: "media",
    confidence: 82,
    resultTags: ["bonus_pressure_high"],
    searchClues: {
      raw: "Blu-ray 特典",
      normalized: "Blu-ray 特典",
      workCandidates: ["作品B"],
      characterCandidates: [],
      itemTypeCandidates: ["Blu-ray"],
      editionClues: [],
      bonusClues: ["店舗特典"],
      freeTextRemainder: [],
      mode: "exact",
      confidence: "high",
    },
  });
  assert(mediaPreorder.cards[0]?.providerId === "hmv", "media preorder should prefer HMV in delivery layer");
  assert(!mediaPreorder.cards.some((card) => (card.providerId === "amazon" || card.providerId === "rakuten") && card.tier === "recommended"), "general retail should not dominate media preorder");
  assert(
    !mediaPreorder.diagnostics.renderedProviders.includes("melonbooks"),
    "media preorder should keep Melonbooks hidden when the clue is media-only",
  );

  const lowConfidence = await scenario({
    itemKind: "goods",
    goodsClass: "small_collection",
    confidence: 35,
  });
  assert(lowConfidence.cards.filter((card) => card.tier === "recommended").length <= 1, "low-confidence clamp should keep recommended tier conservative");
  assert(
    !lowConfidence.cards.some((card) => (card.providerId === "amazon" || card.providerId === "rakuten") && card.tier === "recommended"),
    "fallback retail should not flood low-confidence recommendations",
  );

  const builderEligibility = await scenario({
    itemKind: "goods",
    goodsClass: "paper",
    confidence: 78,
    resultTags: ["bonus_pressure_high"],
    searchClues: {
      raw: "紙 特典",
      normalized: "紙 特典",
      workCandidates: [],
      characterCandidates: [],
      itemTypeCandidates: [],
      editionClues: [],
      bonusClues: ["特典"],
      freeTextRemainder: [],
      mode: "fuzzy",
      confidence: "medium",
    },
  });
  const amiamiEval = builderEligibility.diagnostics.candidateEvaluations.find((entry) => entry.providerId === "amiami");
  assert(amiamiEval?.builderEligibility === "ineligible", "amiami builder eligibility should be constrained outside its intended classes");
  assert(amiamiEval?.demotionReasons.includes("builder_ineligible"), "builder ineligibility should remain explainable");

  const blindUnknownHeavy = await scenario({
    itemKind: "blind_draw",
    goodsClass: "small_collection",
    confidence: 46,
    resultTags: ["trust_gate_random_goods_unknown_heavy"],
    searchClues: {
      raw: "ブラインド グッズ",
      normalized: "ブラインド グッズ",
      workCandidates: [],
      characterCandidates: [],
      itemTypeCandidates: [],
      editionClues: [],
      bonusClues: [],
      freeTextRemainder: [],
      mode: "fuzzy",
      confidence: "low",
    },
  });
  assert(
    !blindUnknownHeavy.cards.some((card) => (card.providerId === "mercari" || card.providerId === "surugaya") && card.tier === "recommended"),
    "unknown-heavy blind-draw routing should not over-promote used-market fallback before the diagnosis is established",
  );

  const venueUnknownHeavy = await scenario({
    itemKind: "goods",
    goodsClass: "small_collection",
    confidence: 48,
    resultTags: ["trust_gate_venue_unknown_heavy"],
    searchClues: {
      raw: "会場限定 かも",
      normalized: "会場限定 かも",
      workCandidates: [],
      characterCandidates: [],
      itemTypeCandidates: [],
      editionClues: [],
      bonusClues: [],
      freeTextRemainder: [],
      mode: "fuzzy",
      confidence: "medium",
    },
  });
  assert(
    !venueUnknownHeavy.cards.some((card) => card.providerId === "amazon" || card.providerId === "rakuten"),
    "unknown-heavy venue routing should not push generic retail before the recovery path is established",
  );

  const mixedMediaFollowupWait = await scenario({
    itemKind: "goods",
    goodsClass: "small_collection",
    confidence: 78,
    resultTags: ["venue_limited_path_wait_for_post_event_followup", "venue_limited_followup_high"],
    searchClues: {
      raw: "会場限定 事後通販",
      normalized: "会場限定 事後通販",
      workCandidates: ["作品C"],
      characterCandidates: [],
      itemTypeCandidates: [],
      editionClues: [],
      bonusClues: [],
      freeTextRemainder: [],
      mode: "fuzzy",
      confidence: "medium",
    },
  });
  assert(
    !mixedMediaFollowupWait.cards.some((card) => card.providerId === "amazon" && card.tier === "recommended"),
    "wait_for_post_event_followup should keep generic retail from acting like the primary recommendation",
  );
  assert(
    mixedMediaFollowupWait.diagnostics.candidateEvaluations.some(
      (entry) => entry.providerId === "amazon" && entry.demotionReasons.includes("standard_retail_only_if_continuation_realistic"),
    ),
    "wait_for_post_event_followup should remain visible in provider diagnostics",
  );

  const noRegression = await scenario({
    itemKind: "preorder",
    goodsClass: "small_collection",
    confidence: 88,
  });
  assert(noRegression.cards.length > 0, "delivery-enabled active providers should still render");
  assert(noRegression.cards.some((card) => card.providerId === "gamers" || card.providerId === "amiami"), "existing active preorder providers should still surface under delivery constraints");

  console.log("provider planner rules checks pass");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
