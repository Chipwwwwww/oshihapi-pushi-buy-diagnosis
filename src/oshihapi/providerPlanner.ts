import type { Decision, GoodsClass, ItemKind } from "@/src/oshihapi/model";
import type { AmazonAffiliateDestination } from "@/src/oshihapi/amazonAffiliateConfig";
import { isAmiamiRelevantScenario } from "@/src/oshihapi/amiamiConfig";
import { isAnimateRelevantScenario, resolveAnimateAffiliateDestination } from "@/src/oshihapi/animateConfig";
import { isGamersRelevantScenario } from "@/src/oshihapi/gamersConfig";
import { isTowerRecordsRelevantScenario, resolveTowerRecordsAffiliateDestination } from "@/src/oshihapi/towerRecordsConfig";
import { isYahooShoppingRelevantScenario, resolveYahooShoppingAffiliateDestination } from "@/src/oshihapi/yahooShoppingConfig";
import type { ProviderId } from "@/src/oshihapi/providerRegistry";
import { getProviderConfig, getProviderRankBase } from "@/src/oshihapi/providerRegistry";

export type ProviderVisibility = "public" | "internal";

export type ProviderCandidate = {
  providerId: ProviderId;
  rank: number;
  roleReason: string;
  ctaLabel: string;
  outHref: string;
  badge?: string;
  visibility: ProviderVisibility;
  suppressReason?: string;
  destinationReady: boolean;
  scenarioEligible?: boolean;
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
};

type PlannerInput = {
  runId: string;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  verdict?: Decision;
  mercariRelevant: boolean;
  mercariKeyword: string | null;
  amazonDestination: AmazonAffiliateDestination | null;
  rakutenAffiliateUrl: string | null;
  surugayaDestination: string | null;
  amiamiDestination: string | null;
  gamersDestination: string | null;
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

function isPubliclyRenderable(candidate: ProviderCandidate): boolean {
  const config = getProviderConfig(candidate.providerId);
  if (config.state !== "live") return false;
  if (!config.publicFacing) return false;
  return candidate.destinationReady;
}

export function planProviderCards(input: PlannerInput): {
  cards: ProviderCandidate[];
  diagnostics: ProviderDiagnostics;
} {
  const allCandidates: ProviderCandidate[] = PLANNED_PROVIDER_IDS.map((providerId) => {
    const config = getProviderConfig(providerId);
    const baseRank = getProviderRankBase(providerId) + verdictBoost(input.verdict);

    if (providerId === "mercari") {
      const destinationReady = Boolean(input.mercariRelevant && input.mercariKeyword);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        ctaLabel: config.defaultCtaLabel,
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
        suppressReason: destinationReady ? undefined : "destination_missing_or_not_relevant",
      };
    }

    if (providerId === "surugaya") {
      const destinationReady = Boolean(input.surugayaDestination);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        ctaLabel: config.defaultCtaLabel,
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
        ctaLabel: config.defaultCtaLabel,
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
        ctaLabel: config.defaultCtaLabel,
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

    if (providerId === "amazon") {
      const destinationReady = Boolean(input.amazonDestination);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        ctaLabel: input.amazonDestination?.label ?? config.defaultCtaLabel,
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
        suppressReason: destinationReady ? undefined : "destination_missing_or_not_relevant",
      };
    }

    if (providerId === "rakuten") {
      const destinationReady = Boolean(input.rakutenAffiliateUrl);
      return {
        providerId,
        rank: baseRank,
        roleReason: config.roleLabel,
        ctaLabel: config.defaultCtaLabel,
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
        suppressReason: destinationReady ? undefined : "destination_missing_or_not_relevant",
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
        ctaLabel: config.defaultCtaLabel,
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
        ctaLabel: config.defaultCtaLabel,
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
        ctaLabel: config.defaultCtaLabel,
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
      ctaLabel: config.defaultCtaLabel,
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

  const diagnostics: ProviderDiagnostics = {
    eligibleProviders: allCandidates.filter((candidate) => candidate.destinationReady).map((candidate) => candidate.providerId),
    suppressedProviders: allCandidates
      .filter((candidate) => !rendered.some((entry) => entry.providerId === candidate.providerId))
      .map((candidate) => ({
        providerId: candidate.providerId,
        reason:
          candidate.suppressReason ??
          (getProviderConfig(candidate.providerId).state !== "live" ? "not_live" : "not_public"),
      })),
    renderedProviders: rendered.map((candidate) => candidate.providerId),
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
  };

  return { cards: rendered, diagnostics };
}
