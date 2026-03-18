import type { Decision, GoodsClass, ItemKind } from "@/src/oshihapi/model";
import type { AmazonAffiliateDestination } from "@/src/oshihapi/amazonAffiliateConfig";
import { isAmiamiRelevantScenario } from "@/src/oshihapi/amiamiConfig";
import { isHmvRelevantScenario } from "@/src/oshihapi/hmvConfig";
import { isAnimateRelevantScenario, resolveAnimateAffiliateDestination } from "@/src/oshihapi/animateConfig";
import { isGamersRelevantScenario } from "@/src/oshihapi/gamersConfig";
import { isTowerRecordsRelevantScenario, resolveTowerRecordsAffiliateDestination } from "@/src/oshihapi/towerRecordsConfig";
import { isYahooShoppingRelevantScenario, resolveYahooShoppingAffiliateDestination } from "@/src/oshihapi/yahooShoppingConfig";
import type { ProviderId, ProviderRole } from "@/src/oshihapi/providerRegistry";
import { getProviderConfig, getProviderRankBase } from "@/src/oshihapi/providerRegistry";
import { getAiModel, getGeminiApiKey, isAiRerankEnabled } from "@/src/oshihapi/ai/provider";
import { rerankProvidersWithAI, type AiRerankAction, type AiRerankAdjustment, type AiRerankRequest } from "@/src/oshihapi/ai/rerankProviders";

export type ProviderVisibility = "public" | "internal";

export type ProviderTier = "recommended" | "okay" | "lowProbability";

export type ProviderCandidate = {
  providerId: ProviderId;
  rank: number;
  roleReason: string;
  shortReason: string;
  ctaLabel: string;
  outHref: string;
  badge?: string;
  visibility: ProviderVisibility;
  suppressReason?: string;
  destinationReady: boolean;
  scenarioEligible?: boolean;
  tier?: ProviderTier;
};

export type ProviderDiagnostics = {
  eligibleProviders: ProviderId[];
  suppressedProviders: Array<{ providerId: ProviderId; reason: string }>;
  renderedProviders: ProviderId[];
  providerRanks: Array<{ providerId: ProviderId; rank: number }>;
  destinationAvailability: Array<{ providerId: ProviderId; ready: boolean }>;
  candidateEvaluations: Array<{
    providerId: ProviderId;
    role: string;
    scenarioEligible: boolean;
    rank: number;
    destinationReady: boolean;
    visibility: ProviderVisibility;
    suppressReason?: string;
  }>;
  aiRerankEligible: boolean;
  aiRerankEnabled: boolean;
  aiRerankInvoked: boolean;
  aiRerankApplied: boolean;
  aiRerankModel?: string;
  aiRerankFallbackReason?: string;
  aiRerankAdjustments: Array<{ providerId: ProviderId; action: AiRerankAction; reason: string }>;
};

type PlannerInput = {
  runId: string;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  verdict?: Decision;
  confidence?: number;
  resultTags?: string[];
  mercariRelevant: boolean;
  mercariKeyword: string | null;
  amazonDestination: AmazonAffiliateDestination | null;
  rakutenAffiliateUrl: string | null;
  surugayaDestination: string | null;
  amiamiDestination: string | null;
  gamersDestination: string | null;
  hmvDestination: string | null;
};

type AiEligibility = {
  eligible: boolean;
  reason: "media_preorder" | "low_confidence" | "recommended_crowded" | "ambiguous_candidates" | "not_needed";
};

const PLANNED_PROVIDER_IDS: ProviderId[] = [
  "mercari",
  "surugaya",
  "amiami",
  "gamers",
  "amazon",
  "rakuten",
  "animate",
  "hmv",
  "towerRecords",
  "yahooShopping",
  "a8Generic",
];

const TIER_ORDER: ProviderTier[] = ["recommended", "okay", "lowProbability"];

function buildOutHref(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return `/out?${query.toString()}`;
}

function verdictBoost(verdict?: Decision): number {
  if (verdict === "THINK") return -2;
  return 0;
}

function isAmazonScenarioEligible(input: Pick<PlannerInput, "itemKind" | "goodsClass">): boolean {
  if (!input.itemKind || input.itemKind === "ticket" || input.itemKind === "used") return false;
  return input.itemKind === "preorder" || input.itemKind === "blind_draw" || input.itemKind === "goods";
}

function isRakutenScenarioEligible(input: Pick<PlannerInput, "itemKind" | "goodsClass">): boolean {
  if (!input.itemKind) return false;
  if (input.itemKind === "used" || input.itemKind === "ticket") return false;
  if (input.goodsClass === "media") return false;
  return input.itemKind === "preorder" || input.itemKind === "goods";
}

function getScenarioRankDelta(providerId: ProviderId, input: Pick<PlannerInput, "itemKind" | "goodsClass">): number {
  const { itemKind, goodsClass } = input;

  if (goodsClass === "media") {
    if (providerId === "hmv") return -34;
    if (providerId === "amazon") return -12;
    if (providerId === "mercari") return 10;
    if (providerId === "surugaya") return 8;
    if (providerId === "rakuten") return 16;
  }

  if (itemKind === "used") {
    if (providerId === "mercari") return -18;
    if (providerId === "surugaya") return -14;
    if (providerId === "hmv") return goodsClass === "media" ? -10 : 22;
    if (providerId === "amiami" || providerId === "gamers") return 18;
    if (providerId === "amazon") return 24;
    if (providerId === "rakuten") return 28;
  }

  if (itemKind === "preorder") {
    if (providerId === "amiami") return -18;
    if (providerId === "gamers") return -14;
    if (providerId === "amazon") return -6;
    if (providerId === "rakuten") return -2;
    if (providerId === "mercari") return 26;
    if (providerId === "surugaya") return 18;
    if (providerId === "hmv") return goodsClass === "media" ? -10 : 20;
  }

  if (itemKind === "blind_draw") {
    if (providerId === "gamers") return -10;
    if (providerId === "amiami") return -8;
    if (providerId === "mercari") return 6;
    if (providerId === "surugaya") return 8;
    if (providerId === "amazon") return 10;
    if (providerId === "rakuten") return 12;
  }

  if (itemKind === "goods" && goodsClass !== "media") {
    if (providerId === "gamers" && (goodsClass === "paper" || goodsClass === "itabag_badge" || goodsClass === "small_collection" || goodsClass === "wearable")) return -8;
    if (providerId === "amiami" && (goodsClass === "display_large" || goodsClass === "small_collection" || goodsClass === "itabag_badge")) return -6;
    if (providerId === "mercari") return 10;
    if (providerId === "surugaya") return 12;
    if (providerId === "amazon") return -6;
    if (providerId === "rakuten") return 6;
  }

  return 0;
}

function buildShortReason(providerId: ProviderId, input: Pick<PlannerInput, "itemKind" | "goodsClass">): string {
  const { itemKind, goodsClass } = input;

  if (goodsClass === "media") {
    if (providerId === "hmv") return "媒体在庫を優先確認";
    if (providerId === "amazon") return "新品比較がしやすい";
    if (providerId === "mercari") return "中古相場の保険先";
    if (providerId === "surugaya") return "中古在庫の保険先";
  }

  if (itemKind === "used") {
    if (providerId === "mercari") return "中古相場を先確認";
    if (providerId === "surugaya") return "中古在庫を先確認";
    if (providerId === "hmv") return "中古媒体の補助先";
  }

  if (itemKind === "preorder") {
    if (providerId === "amiami") return "予約在庫を優先確認";
    if (providerId === "gamers") return "特典系を先確認";
    if (providerId === "amazon") return "新品比較の補助";
    if (providerId === "rakuten") return "横断比較の補助";
    if (providerId === "mercari") return "中古化後の逃げ道";
    if (providerId === "surugaya") return "中古店の保険先";
  }

  if (itemKind === "blind_draw") {
    if (providerId === "gamers") return "特典・箱買い向き";
    if (providerId === "amiami") return "予約枠を確認";
    if (providerId === "mercari") return "単品相場の確認";
    if (providerId === "surugaya") return "中古単品の補助";
  }

  if (itemKind === "goods" && goodsClass !== "media") {
    if (providerId === "gamers") return "専門店在庫を確認";
    if (providerId === "amiami") return "定番ホビー枠";
    if (providerId === "amazon") return "新品比較の候補";
    if (providerId === "rakuten") return "ショップ横断候補";
    if (providerId === "mercari") return "中古相場の保険先";
    if (providerId === "surugaya") return "中古店の保険先";
  }

  return "関連先を確認";
}

function buildCompactCta(providerId: ProviderId): string {
  switch (providerId) {
    case "amiami":
      return "あみあみで見る";
    case "gamers":
      return "ゲーマーズで見る";
    case "amazon":
      return "Amazonで確認";
    case "rakuten":
      return "楽天で確認";
    case "mercari":
      return "メルカリで相場を見る";
    case "surugaya":
      return "駿河屋で見る";
    case "hmv":
      return "HMVで見る";
    default:
      return getProviderConfig(providerId).defaultCtaLabel;
  }
}

function mapTier(rank: number, bestRank: number, role: ProviderRole): ProviderTier | null {
  const delta = rank - bestRank;
  if (delta <= 6) return "recommended";
  if (delta <= 18) return "okay";
  if (delta <= 34 || role === "used_market" || role === "used_shop") return "lowProbability";
  return null;
}

function isPubliclyRenderable(candidate: ProviderCandidate): boolean {
  const config = getProviderConfig(candidate.providerId);
  if (config.state !== "live") return false;
  if (!config.publicFacing) return false;
  return candidate.destinationReady;
}

function normalizeConfidence(confidence?: number): number {
  if (!Number.isFinite(confidence)) return 0;
  const numeric = Number(confidence);
  if (numeric <= 1) return Math.max(0, Math.min(1, numeric));
  return Math.max(0, Math.min(1, numeric / 100));
}

function getTierIndex(tier: ProviderTier): number {
  return TIER_ORDER.indexOf(tier);
}

function toTier(index: number): ProviderTier | null {
  return TIER_ORDER[index] ?? null;
}

function getCandidateSignals(candidate: ProviderCandidate, input: PlannerInput): string[] {
  const signals = new Set<string>();
  const config = getProviderConfig(candidate.providerId);

  if (input.goodsClass === "media" && candidate.providerId === "hmv") signals.add("media_fit");
  if (input.itemKind === "preorder" && (candidate.providerId === "amiami" || candidate.providerId === "gamers")) signals.add("preorder_fit");
  if (config.role === "general_new") signals.add("general_new");
  if (config.role === "used_market" || config.role === "used_shop") signals.add("used_fallback");
  if (candidate.destinationReady) signals.add("destination_ready");
  if (candidate.rank <= 45) signals.add("high_base_rank");
  if (candidate.tier === "recommended") signals.add("currently_recommended");
  if (candidate.providerId === "amazon") signals.add("broad_catalog");
  if (candidate.providerId === "mercari" || candidate.providerId === "surugaya") signals.add("secondary_market");
  if ((input.resultTags ?? []).includes("bonus_pressure_high")) signals.add("bonus_sensitive");

  return [...signals];
}

function buildAiRequest(input: PlannerInput, cards: Array<ProviderCandidate & { tier: ProviderTier }>): AiRerankRequest {
  const normalizedConfidence = normalizeConfidence(input.confidence);
  const tags = input.resultTags ?? [];

  return {
    scenario: {
      itemKind: input.itemKind,
      goodsClass: input.goodsClass,
      confidence: Number(normalizedConfidence.toFixed(2)),
      bonusSensitive: tags.includes("bonus_pressure_high"),
      usedIntent: input.itemKind === "used",
      mediaIntent: input.goodsClass === "media",
    },
    candidates: cards.map((candidate) => ({
      provider: candidate.providerId,
      baseTier: candidate.tier,
      score: Math.max(0, 100 - candidate.rank),
      hardBlocked: false,
      signals: getCandidateSignals(candidate, input),
    })),
    rules: {
      cannotIntroduceNewProviders: true,
      cannotOverrideHardBlocks: true,
      maxTierChange: 1,
    },
  };
}

function getAiEligibility(input: PlannerInput, cards: Array<ProviderCandidate & { tier: ProviderTier }>): AiEligibility {
  if (cards.length < 2) return { eligible: false, reason: "not_needed" };
  if (input.goodsClass === "media" && input.itemKind === "preorder") return { eligible: true, reason: "media_preorder" };

  const confidence = normalizeConfidence(input.confidence);
  if (confidence > 0 && confidence <= 0.62) return { eligible: true, reason: "low_confidence" };

  const recommendedCount = cards.filter((candidate) => candidate.tier === "recommended").length;
  if (recommendedCount >= 3) return { eligible: true, reason: "recommended_crowded" };

  const sortedRanks = cards.map((candidate) => candidate.rank).sort((a, b) => a - b);
  const topSpread = (sortedRanks[2] ?? sortedRanks[1] ?? sortedRanks[0]) - sortedRanks[0];
  if (topSpread <= 6) return { eligible: true, reason: "ambiguous_candidates" };

  return { eligible: false, reason: "not_needed" };
}

function applyAdjustment(baseTier: ProviderTier, action: AiRerankAction): ProviderTier | null {
  const currentIndex = getTierIndex(baseTier);
  if (currentIndex === -1) return null;
  if (action === "keep") return baseTier;
  if (action === "promote_one_level") return toTier(currentIndex - 1);
  if (action === "demote_one_level") return toTier(currentIndex + 1);
  return null;
}

function applyRecommendedCap(cards: Array<ProviderCandidate & { tier: ProviderTier }>, capRecommendedTo?: 0 | 1 | 2): Array<ProviderCandidate & { tier: ProviderTier }> {
  if (capRecommendedTo == null) return cards;
  const recommended = cards
    .filter((card) => card.tier === "recommended")
    .sort((a, b) => a.rank - b.rank || a.providerId.localeCompare(b.providerId));

  if (recommended.length <= capRecommendedTo) return cards;

  const demoted = new Set(recommended.slice(capRecommendedTo).map((card) => card.providerId));
  return cards.map((card) => (demoted.has(card.providerId) ? { ...card, tier: "okay" } : card));
}

function sortTieredCards(cards: Array<ProviderCandidate & { tier: ProviderTier }>): Array<ProviderCandidate & { tier: ProviderTier }> {
  return [...cards].sort((a, b) => {
    const tierDelta = getTierIndex(a.tier) - getTierIndex(b.tier);
    if (tierDelta !== 0) return tierDelta;
    return a.rank - b.rank || a.providerId.localeCompare(b.providerId);
  });
}

function buildDiagnostics(
  allCandidates: ProviderCandidate[],
  finalCards: Array<ProviderCandidate & { tier: ProviderTier }>,
  ai: {
    eligible: boolean;
    enabled: boolean;
    invoked: boolean;
    applied: boolean;
    model?: string;
    fallbackReason?: string;
    adjustments: AiRerankAdjustment[];
  },
): ProviderDiagnostics {
  return {
    eligibleProviders: allCandidates.filter((candidate) => candidate.destinationReady).map((candidate) => candidate.providerId),
    suppressedProviders: allCandidates
      .filter((candidate) => !finalCards.some((entry) => entry.providerId === candidate.providerId))
      .map((candidate) => ({
        providerId: candidate.providerId,
        reason:
          candidate.suppressReason ??
          (candidate.destinationReady ? "tier_filtered" : getProviderConfig(candidate.providerId).state !== "live" ? "not_live" : "not_public"),
      })),
    renderedProviders: finalCards.map((candidate) => candidate.providerId),
    providerRanks: allCandidates.map((candidate) => ({ providerId: candidate.providerId, rank: candidate.rank })),
    destinationAvailability: allCandidates.map((candidate) => ({
      providerId: candidate.providerId,
      ready: candidate.destinationReady,
    })),
    candidateEvaluations: allCandidates.map((candidate) => ({
      providerId: candidate.providerId,
      role: getProviderConfig(candidate.providerId).role,
      scenarioEligible: candidate.scenarioEligible ?? candidate.destinationReady,
      rank: candidate.rank,
      destinationReady: candidate.destinationReady,
      visibility: candidate.visibility,
      suppressReason: candidate.suppressReason,
    })),
    aiRerankEligible: ai.eligible,
    aiRerankEnabled: ai.enabled,
    aiRerankInvoked: ai.invoked,
    aiRerankApplied: ai.applied,
    aiRerankModel: ai.model,
    aiRerankFallbackReason: ai.fallbackReason,
    aiRerankAdjustments: ai.adjustments.map((adjustment) => ({
      providerId: adjustment.provider,
      action: adjustment.action,
      reason: adjustment.reason,
    })),
  };
}

export async function planProviderCards(input: PlannerInput): Promise<{
  cards: ProviderCandidate[];
  diagnostics: ProviderDiagnostics;
}> {
  const allCandidates: ProviderCandidate[] = PLANNED_PROVIDER_IDS.map((providerId) => {
    const config = getProviderConfig(providerId);
    const baseRank = getProviderRankBase(providerId) + verdictBoost(input.verdict) + getScenarioRankDelta(providerId, input);

    if (providerId === "mercari") {
      const scenarioEligible = input.mercariRelevant;
      const destinationReady = Boolean(scenarioEligible && input.mercariKeyword);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: destinationReady
          ? buildOutHref({
              provider: providerId,
              dest: "mercari-search",
              keyword: input.mercariKeyword ?? undefined,
              runId: input.runId,
              source: "result_page",
              itemKind: input.itemKind,
              gc: input.goodsClass,
              verdict: input.verdict,
            })
          : "",
        badge: config.badge,
        visibility: "public",
        destinationReady,
        scenarioEligible,
        suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
      };
    }

    if (providerId === "surugaya") {
      const scenarioEligible = Boolean(input.surugayaDestination);
      const destinationReady = scenarioEligible;
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: destinationReady
          ? buildOutHref({
              provider: providerId,
              dest: "surugaya-affiliate",
              runId: input.runId,
              source: "result_page",
              itemKind: input.itemKind,
              gc: input.goodsClass,
              verdict: input.verdict,
            })
          : "",
        badge: config.badge,
        visibility: "public",
        destinationReady,
        scenarioEligible,
        suppressReason: destinationReady ? undefined : "destination_missing_or_not_relevant",
      };
    }

    if (providerId === "amiami") {
      const scenarioEligible = isAmiamiRelevantScenario({
        itemKind: input.itemKind,
        goodsClass: input.goodsClass,
      });
      const destinationReady = Boolean(scenarioEligible && input.amiamiDestination);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: destinationReady
          ? buildOutHref({
              provider: providerId,
              dest: "amiami-affiliate",
              runId: input.runId,
              source: "result_page",
              itemKind: input.itemKind,
              gc: input.goodsClass,
              verdict: input.verdict,
            })
          : "",
        badge: config.badge,
        visibility: "public",
        destinationReady,
        suppressReason: destinationReady
          ? undefined
          : scenarioEligible
            ? "destination_missing_or_not_relevant"
            : "scenario_not_eligible",
      };
    }

    if (providerId === "gamers") {
      const scenarioEligible = isGamersRelevantScenario({
        itemKind: input.itemKind,
        goodsClass: input.goodsClass,
      });
      const destinationReady = Boolean(scenarioEligible && input.gamersDestination);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: destinationReady
          ? buildOutHref({
              provider: providerId,
              dest: "gamers-affiliate",
              runId: input.runId,
              source: "result_page",
              itemKind: input.itemKind,
              gc: input.goodsClass,
              verdict: input.verdict,
            })
          : "",
        badge: config.badge,
        visibility: "public",
        destinationReady,
        suppressReason: destinationReady
          ? undefined
          : scenarioEligible
            ? "destination_missing_or_not_relevant"
            : "scenario_not_eligible",
      };
    }

    if (providerId === "hmv") {
      const scenarioEligible = isHmvRelevantScenario({ itemKind: input.itemKind, goodsClass: input.goodsClass });
      const destinationReady = Boolean(scenarioEligible && input.hmvDestination);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: destinationReady
          ? buildOutHref({
              provider: providerId,
              dest: "hmv-affiliate",
              runId: input.runId,
              source: "result_page",
              itemKind: input.itemKind,
              gc: input.goodsClass,
              verdict: input.verdict,
            })
          : "",
        badge: config.badge,
        visibility: "public",
        destinationReady,
        scenarioEligible,
        suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
      };
    }

    if (providerId === "amazon") {
      const scenarioEligible = isAmazonScenarioEligible(input);
      const destinationReady = Boolean(scenarioEligible && input.amazonDestination);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: destinationReady
          ? buildOutHref({
              provider: providerId,
              dest: "amazon-static",
              id: input.amazonDestination?.id,
              runId: input.runId,
              source: "result_page",
              itemKind: input.itemKind,
              gc: input.goodsClass,
              verdict: input.verdict,
            })
          : "",
        badge: config.badge,
        visibility: "public",
        destinationReady,
        scenarioEligible,
        suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
      };
    }

    if (providerId === "rakuten") {
      const scenarioEligible = isRakutenScenarioEligible(input);
      const destinationReady = Boolean(scenarioEligible && input.rakutenAffiliateUrl);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: destinationReady
          ? buildOutHref({
              provider: providerId,
              dest: "rakuten-item",
              href: input.rakutenAffiliateUrl ?? undefined,
              runId: input.runId,
              source: "result_page",
              itemKind: input.itemKind,
              gc: input.goodsClass,
              verdict: input.verdict,
            })
          : "",
        badge: config.badge,
        visibility: "public",
        destinationReady,
        scenarioEligible,
        suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
      };
    }

    if (providerId === "towerRecords") {
      const scenarioEligible = isTowerRecordsRelevantScenario({
        itemKind: input.itemKind,
        goodsClass: input.goodsClass,
      });
      const destinationReady = Boolean(scenarioEligible && resolveTowerRecordsAffiliateDestination());
      return {
        providerId,
        rank: scenarioEligible ? baseRank - 4 : baseRank + 5,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: "",
        badge: config.badge,
        visibility: "internal",
        destinationReady,
        scenarioEligible,
        suppressReason: destinationReady
          ? "pending_provider_not_public"
          : scenarioEligible
            ? "awaiting_vc_affiliate_url"
            : "scenario_not_eligible",
      };
    }

    if (providerId === "animate") {
      const scenarioEligible = isAnimateRelevantScenario({
        itemKind: input.itemKind,
        goodsClass: input.goodsClass,
      });
      const destinationReady = Boolean(scenarioEligible && resolveAnimateAffiliateDestination());
      return {
        providerId,
        rank: scenarioEligible ? baseRank - 12 : baseRank + 6,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: "",
        badge: config.badge,
        visibility: "internal",
        destinationReady,
        scenarioEligible,
        suppressReason: destinationReady
          ? "pending_provider_not_public"
          : scenarioEligible
            ? "destination_unresolved"
            : "scenario_not_eligible",
      };
    }

    if (providerId === "yahooShopping") {
      const scenarioEligible = isYahooShoppingRelevantScenario({ itemKind: input.itemKind });
      const destinationReady = Boolean(scenarioEligible && resolveYahooShoppingAffiliateDestination());
      return {
        providerId,
        rank: scenarioEligible ? baseRank + 5 : baseRank + 9,
        roleReason: config.roleLabel,
        shortReason: buildShortReason(providerId, input),
        ctaLabel: buildCompactCta(providerId),
        outHref: "",
        badge: config.badge,
        visibility: "internal",
        destinationReady,
        scenarioEligible,
        suppressReason: destinationReady
          ? "pending_provider_not_public"
          : scenarioEligible
            ? "awaiting_vc_affiliate_url"
            : "scenario_not_eligible",
      };
    }

    return {
      providerId,
      rank: baseRank,
      roleReason: config.roleLabel,
      shortReason: buildShortReason(providerId, input),
      ctaLabel: buildCompactCta(providerId),
      outHref: "",
      badge: config.badge,
      visibility: "internal",
      destinationReady: false,
      scenarioEligible: false,
      suppressReason: `pending_provider_slot:${config.role}`,
    };
  });

  const rendered = allCandidates
    .filter(isPubliclyRenderable)
    .sort((a, b) => a.rank - b.rank || a.providerId.localeCompare(b.providerId));

  const bestRank = rendered[0]?.rank ?? 0;
  const deterministicCards = rendered
    .map((candidate) => ({
      ...candidate,
      tier: mapTier(candidate.rank, bestRank, getProviderConfig(candidate.providerId).role),
    }))
    .filter((candidate): candidate is ProviderCandidate & { tier: ProviderTier } => candidate.tier != null);

  const eligibility = getAiEligibility(input, deterministicCards);
  const aiEnabled = isAiRerankEnabled();
  const aiModel = getAiModel();

  if (!eligibility.eligible) {
    return {
      cards: sortTieredCards(deterministicCards),
      diagnostics: buildDiagnostics(allCandidates, sortTieredCards(deterministicCards), {
        eligible: false,
        enabled: aiEnabled,
        invoked: false,
        applied: false,
        model: aiModel,
        fallbackReason: eligibility.reason,
        adjustments: [],
      }),
    };
  }

  if (!aiEnabled) {
    const finalCards = sortTieredCards(deterministicCards);
    return {
      cards: finalCards,
      diagnostics: buildDiagnostics(allCandidates, finalCards, {
        eligible: true,
        enabled: false,
        invoked: false,
        applied: false,
        model: aiModel,
        fallbackReason: "disabled",
        adjustments: [],
      }),
    };
  }

  if (!getGeminiApiKey()) {
    const finalCards = sortTieredCards(deterministicCards);
    return {
      cards: finalCards,
      diagnostics: buildDiagnostics(allCandidates, finalCards, {
        eligible: true,
        enabled: true,
        invoked: false,
        applied: false,
        model: aiModel,
        fallbackReason: "missing_api_key",
        adjustments: [],
      }),
    };
  }

  const aiInput = buildAiRequest(input, deterministicCards);
  const aiAttempt = await rerankProvidersWithAI(aiInput);
  if (!aiAttempt.result) {
    const finalCards = sortTieredCards(deterministicCards);
    return {
      cards: finalCards,
      diagnostics: buildDiagnostics(allCandidates, finalCards, {
        eligible: true,
        enabled: true,
        invoked: aiAttempt.invoked,
        applied: false,
        model: aiAttempt.model,
        fallbackReason: aiAttempt.fallbackReason,
        adjustments: [],
      }),
    };
  }

  const visibleProviders = new Set(deterministicCards.map((candidate) => candidate.providerId));
  const baseByProvider = new Map(deterministicCards.map((candidate) => [candidate.providerId, candidate]));
  const sanitizedAdjustments: AiRerankAdjustment[] = [];

  for (const adjustment of aiAttempt.result.adjustments) {
    if (!visibleProviders.has(adjustment.provider)) continue;
    const base = baseByProvider.get(adjustment.provider);
    if (!base?.tier) continue;
    const nextTier = applyAdjustment(base.tier, adjustment.action);
    if (!nextTier) continue;
    if (Math.abs(getTierIndex(nextTier) - getTierIndex(base.tier)) > 1) continue;
    sanitizedAdjustments.push(adjustment);
  }

  const sanitizedByProvider = new Map<ProviderId, AiRerankAdjustment>();
  for (const adjustment of sanitizedAdjustments) {
    if (!sanitizedByProvider.has(adjustment.provider)) {
      sanitizedByProvider.set(adjustment.provider, adjustment);
    }
  }

  let finalCards = deterministicCards.map((candidate) => {
    const adjustment = sanitizedByProvider.get(candidate.providerId);
    if (!adjustment) return candidate;
    const nextTier = applyAdjustment(candidate.tier, adjustment.action);
    if (!nextTier) return candidate;
    return { ...candidate, tier: nextTier };
  });

  finalCards = applyRecommendedCap(finalCards, aiAttempt.result.capRecommendedTo);
  finalCards = sortTieredCards(finalCards);

  const aiApplied = finalCards.some((candidate) => {
    const base = baseByProvider.get(candidate.providerId);
    return base?.tier !== candidate.tier;
  });

  return {
    cards: finalCards,
    diagnostics: buildDiagnostics(allCandidates, finalCards, {
      eligible: true,
      enabled: true,
      invoked: aiAttempt.invoked,
      applied: aiApplied,
      model: aiAttempt.model,
      fallbackReason: aiApplied ? undefined : "no_legal_adjustment",
      adjustments: [...sanitizedByProvider.values()],
    }),
  };
}
