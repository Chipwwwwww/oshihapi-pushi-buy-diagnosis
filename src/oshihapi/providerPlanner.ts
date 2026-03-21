import type { Decision, GoodsClass, ItemKind } from "@/src/oshihapi/model";
import type { AmazonAffiliateDestination } from "@/src/oshihapi/amazonAffiliateConfig";
import { isAmiamiRelevantScenario } from "@/src/oshihapi/amiamiConfig";
import { isHmvRelevantScenario } from "@/src/oshihapi/hmvConfig";
import { isAnimateRelevantScenario, resolveAnimateAffiliateDestination } from "@/src/oshihapi/animateConfig";
import { isGamersRelevantScenario } from "@/src/oshihapi/gamersConfig";
import { resolveMelonbooksReferenceUrl } from "@/src/oshihapi/melonbooksConfig";
import { isSurugayaRelevantScenario } from "@/src/oshihapi/surugayaConfig";
import { isTowerRecordsRelevantScenario, resolveTowerRecordsAffiliateDestination } from "@/src/oshihapi/towerRecordsConfig";
import { isYahooShoppingRelevantScenario, resolveYahooShoppingAffiliateDestination } from "@/src/oshihapi/yahooShoppingConfig";
import type { ProviderBuilderMode, ProviderId, ProviderRole, ProviderUniverseStatus } from "@/src/oshihapi/providerRegistry";
import { getProviderConfig, getProviderRankBase } from "@/src/oshihapi/providerRegistry";
import { getAiModel, getGeminiApiKey, isAiRerankEnabled } from "@/src/oshihapi/ai/provider";
import { rerankProvidersWithAI, type AiRerankAction, type AiRerankAdjustment, type AiRerankRequest } from "@/src/oshihapi/ai/rerankProviders";
import type { ParsedSearchClues } from "@/src/oshihapi/input/types";

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
  renderMode?: "primary" | "reference" | "fallback";
  suppressReason?: string;
  destinationReady: boolean;
  scenarioEligible?: boolean;
  tier?: ProviderTier;
};

export type ProviderDiagnostics = {
  eligibleProviders: ProviderId[];
  truthCandidates: ProviderId[];
  truthRankedProviders: Array<{ providerId: ProviderId; rank: number }>;
  deliveryCandidates: ProviderId[];
  deliveryFilteredProviders: Array<{ providerId: ProviderId; reason: string }>;
  suppressedProviders: Array<{ providerId: ProviderId; reason: string }>;
  renderedProviders: ProviderId[];
  providerRanks: Array<{ providerId: ProviderId; rank: number }>;
  destinationAvailability: Array<{ providerId: ProviderId; ready: boolean }>;
  candidateEvaluations: Array<{
    providerId: ProviderId;
    role: string;
    universeStatus: ProviderUniverseStatus;
    truthLayerEligible: boolean;
    deliveryEnabled: boolean;
    displayable: boolean;
    builderEligibility: ProviderBuilderMode | "ineligible";
    scenarioEligible: boolean;
    rank: number;
    destinationReady: boolean;
    visibility: ProviderVisibility;
    renderMode?: "primary" | "reference" | "fallback";
    hardBlocked: boolean;
    hardBlockReasons: string[];
    demotionReasons: string[];
    suppressReason?: string;
    referenceReason?: string;
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
  searchClues?: ParsedSearchClues;
};

type AiEligibility = {
  eligible: boolean;
  reason: "media_preorder" | "low_confidence" | "recommended_crowded" | "ambiguous_candidates" | "not_needed";
};

type RawProviderCandidate = ProviderCandidate & {
  scenarioEligible: boolean;
};

type ProviderEvaluation = RawProviderCandidate & {
  universeStatus: ProviderUniverseStatus;
  truthLayerEligible: boolean;
  deliveryEnabled: boolean;
  displayable: boolean;
  builderEligibility: ProviderBuilderMode | "ineligible";
  hardBlocked: boolean;
  hardBlockReasons: string[];
  demotionReasons: string[];
  maxTier?: ProviderTier;
  truthRank?: number;
  truthOnly: boolean;
  referenceRenderable: boolean;
  referenceReason?: string;
  deliverySuppressedReason?: string;
  finalSuppressReason?: string;
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
  "melonbooks",
  "a8Generic",
];

const TIER_ORDER: ProviderTier[] = ["recommended", "okay", "lowProbability"];
const SMALL_COLLECTION_FAMILY = new Set<GoodsClass>(["small_collection", "paper", "itabag_badge"]);
const BOOKSTORE_CONTEXT_KEYWORDS = ["書籍", "本", "新刊", "漫画", "コミック", "同人", "小説", "冊子"];
const BONUS_EXPLICIT_KEYWORDS = ["特典", "有償特典", "無償特典", "店舗別", "店舗特典", "予約特典"];

type SpecialtyScenario =
  | "book_bonus"
  | "media_bonus"
  | "doujin_bonus_extreme"
  | "generic";

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

function hasKeyword(raw: string | undefined, keywords: string[]): boolean {
  if (!raw) return false;
  return keywords.some((keyword) => raw.includes(keyword));
}

function isBookOrComicContext(input: Pick<PlannerInput, "goodsClass" | "searchClues" | "itemKind">): boolean {
  if (input.goodsClass === "paper") return true;
  if (input.searchClues?.itemTypeCandidates.includes("紙類")) return true;
  if (hasKeyword(input.searchClues?.raw, BOOKSTORE_CONTEXT_KEYWORDS)) return true;
  if (hasKeyword(input.searchClues?.normalized, BOOKSTORE_CONTEXT_KEYWORDS)) return true;
  return false;
}

function isDoujinOrComicContext(input: Pick<PlannerInput, "searchClues">): boolean {
  return hasKeyword(input.searchClues?.raw, ["同人", "漫画", "コミック", "新刊"]) || hasKeyword(input.searchClues?.normalized, ["同人", "漫画", "コミック", "新刊"]);
}

function hasExplicitBonusMentions(input: Pick<PlannerInput, "searchClues">): boolean {
  if (input.searchClues?.bonusClues.some((clue) => clue === "特典")) return true;
  return hasKeyword(input.searchClues?.raw, BONUS_EXPLICIT_KEYWORDS) || hasKeyword(input.searchClues?.normalized, BONUS_EXPLICIT_KEYWORDS);
}

function countMelonbooksSignals(input: Pick<PlannerInput, "itemKind" | "goodsClass" | "searchClues" | "resultTags">): number {
  let count = 0;
  if (input.itemKind === "goods" || input.itemKind === "preorder") count += 1;
  if (isBookOrComicContext(input) || isDoujinOrComicContext(input)) count += 1;
  if (hasBonusSensitiveSignals(input)) count += 1;
  if (hasExplicitBonusMentions(input)) count += 1;
  if ((input.resultTags ?? []).includes("collection_pressure")) count += 1;
  if (input.goodsClass === "paper" || isDoujinOrComicContext(input)) count += 1;
  return count;
}

function isMelonbooksRelevantScenario(input: Pick<PlannerInput, "itemKind" | "goodsClass" | "searchClues" | "resultTags">): boolean {
  if (!input.itemKind) return false;
  if (input.itemKind === "used" || input.itemKind === "ticket" || input.itemKind === "blind_draw") return false;
  if (input.goodsClass === "tech" || input.goodsClass === "display_large") return false;
  const bookstoreContext = isBookOrComicContext(input) || isDoujinOrComicContext(input);
  const pressureOrPath =
    hasBonusSensitiveSignals(input) ||
    hasExplicitBonusMentions(input) ||
    (input.resultTags ?? []).includes("collection_pressure") ||
    input.itemKind === "preorder";
  return bookstoreContext && pressureOrPath && countMelonbooksSignals(input) >= 2;
}

function classifySpecialtyScenario(input: Pick<PlannerInput, "itemKind" | "goodsClass" | "searchClues" | "resultTags">): SpecialtyScenario {
  const bonusSensitive = hasBonusSensitiveSignals(input);
  const bookContext = isBookOrComicContext(input);
  const doujinContext = isDoujinOrComicContext(input);
  const mediaContext =
    input.goodsClass === "media" ||
    Boolean(input.searchClues?.itemTypeCandidates.some((candidate) => candidate === "Blu-ray" || candidate === "CD")) ||
    (input.resultTags ?? []).includes("actor_fan_primary");

  if (bonusSensitive && doujinContext) return "doujin_bonus_extreme";
  if (bonusSensitive && mediaContext) return "media_bonus";
  if (bonusSensitive && bookContext) return "book_bonus";
  return "generic";
}

function getScenarioOrderWeight(providerId: ProviderId, input: Pick<PlannerInput, "itemKind" | "goodsClass" | "searchClues" | "resultTags">): number {
  const orderMap: Record<SpecialtyScenario, ProviderId[]> = {
    book_bonus: ["melonbooks", "gamers", "hmv", "amazon"],
    media_bonus: ["hmv", "gamers", "melonbooks", "amazon"],
    doujin_bonus_extreme: ["melonbooks", "gamers", "amazon", "hmv"],
    generic: [],
  };
  const order = orderMap[classifySpecialtyScenario(input)];
  const index = order.indexOf(providerId);
  if (index === -1) return 0;
  return -28 + index * 8;
}

function getScenarioRankDelta(providerId: ProviderId, input: Pick<PlannerInput, "itemKind" | "goodsClass" | "searchClues" | "resultTags">): number {
  const { itemKind, goodsClass, searchClues } = input;
  let delta = 0;

  const hasBonusClue = Boolean(searchClues?.bonusClues.length);
  const hasMediaClue = Boolean(searchClues?.itemTypeCandidates.some((candidate) => candidate === "Blu-ray" || candidate === "CD"));

  if (goodsClass === "media") {
    if (providerId === "hmv") delta -= 34;
    if (providerId === "towerRecords") delta -= 24;
    if (providerId === "melonbooks") delta -= 18;
    if (providerId === "amazon") delta -= 12;
    if (providerId === "mercari") delta += 10;
    if (providerId === "surugaya") delta += 8;
    if (providerId === "rakuten") delta += 16;
  }

  if (itemKind === "used") {
    if (providerId === "mercari") delta -= 18;
    if (providerId === "surugaya") delta -= 14;
    if (providerId === "hmv") delta += goodsClass === "media" ? -10 : 22;
    if (providerId === "amiami" || providerId === "gamers") delta += 18;
    if (providerId === "amazon") delta += 24;
    if (providerId === "rakuten") delta += 28;
  }

  if (itemKind === "preorder") {
    if (providerId === "amiami") delta -= 18;
    if (providerId === "gamers") delta -= 14;
    if (providerId === "melonbooks") delta -= 10;
    if (providerId === "amazon") delta -= 6;
    if (providerId === "rakuten") delta -= 2;
    if (providerId === "mercari") delta += 26;
    if (providerId === "surugaya") delta += 18;
    if (providerId === "hmv") delta += goodsClass === "media" ? -10 : 20;
  }

  if (itemKind === "blind_draw") {
    if (providerId === "gamers") delta -= 10;
    if (providerId === "amiami") delta -= 8;
    if (providerId === "melonbooks") delta -= 7;
    if (providerId === "mercari") delta += 6;
    if (providerId === "surugaya") delta += 8;
    if (providerId === "amazon") delta += 10;
    if (providerId === "rakuten") delta += 12;
  }

  if (itemKind === "goods" && goodsClass !== "media") {
    if (providerId === "gamers" && (goodsClass === "paper" || goodsClass === "itabag_badge" || goodsClass === "small_collection" || goodsClass === "wearable")) delta -= 8;
    if (providerId === "melonbooks" && (goodsClass === "paper" || goodsClass === "itabag_badge" || goodsClass === "small_collection")) delta -= 12;
    if (providerId === "amiami" && (goodsClass === "display_large" || goodsClass === "small_collection" || goodsClass === "itabag_badge")) delta -= 6;
    if (providerId === "mercari") delta += 10;
    if (providerId === "surugaya") delta += 12;
    if (providerId === "amazon") delta -= 6;
    if (providerId === "rakuten") delta += 6;
  }

  if (hasBonusClue) {
    if (providerId === "gamers" || providerId === "animate" || providerId === "melonbooks") delta -= 4;
    if (providerId === "mercari") delta += 4;
  }

  if (hasMediaClue && (providerId === "hmv" || providerId === "towerRecords")) delta -= 6;

  return delta + getScenarioOrderWeight(providerId, input);
}

function buildShortReason(providerId: ProviderId, input: Pick<PlannerInput, "itemKind" | "goodsClass" | "searchClues" | "resultTags">): string {
  const { itemKind, goodsClass, searchClues } = input;
  const specialtyScenario = classifySpecialtyScenario(input);
  const randomGoodsSinglesPath =
    (input.resultTags ?? []).includes("random_goods_path_stop_drawing_buy_singles") ||
    (input.resultTags ?? []).includes("random_goods_path_stop_drawing_check_used_market");

  if (searchClues?.bonusClues.length || specialtyScenario !== "generic") {
    if (providerId === "gamers") return goodsClass === "media" ? "特典重視の専門店候補" : "店舗別特典を見比べやすい";
    if (providerId === "animate") return "店舗特典の確認向き";
    if (providerId === "melonbooks") return "新刊・店舗別特典の確認先";
  }

  if (goodsClass === "media") {
    if (providerId === "hmv") return "CD・映像・書籍の発売情報に強い";
    if (providerId === "towerRecords") return "媒体特化の補助候補";
    if (providerId === "melonbooks") return "書籍系特典の参考先";
    if (providerId === "amazon") return "一般流通の比較先";
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
    if (providerId === "gamers") return "特典重視なら先に確認";
    if (providerId === "melonbooks") return "特典確認先の専門店参考";
    if (providerId === "hmv") return goodsClass === "paper" ? "書籍の発売情報を確認" : "CD・映像の発売情報を確認";
    if (providerId === "amazon") return "一般流通の比較補助";
    if (providerId === "rakuten") return "横断比較の補助";
    if (providerId === "mercari") return "中古化後の逃げ道";
    if (providerId === "surugaya") return "中古店の保険先";
  }

  if (itemKind === "blind_draw") {
    if (randomGoodsSinglesPath) {
      if (providerId === "mercari") return "単品回収の相場確認";
      if (providerId === "surugaya") return "中古単品の在庫確認";
      if (providerId === "amazon" || providerId === "rakuten") return "重複回避の主経路ではない";
    }
    if (providerId === "gamers") return "特典・箱買い向き";
    if (providerId === "amiami") return "予約枠を確認";
    if (providerId === "melonbooks") return "書店特典文脈のみ参考";
    if (providerId === "mercari") return "単品相場の確認";
    if (providerId === "surugaya") return "中古単品の補助";
  }

  if (itemKind === "goods" && goodsClass !== "media") {
    if (providerId === "gamers") return "専門店の特典・在庫を確認";
    if (providerId === "melonbooks") return "書籍・漫画・同人の特典確認向き";
    if (providerId === "hmv") return goodsClass === "paper" ? "書籍の通常流通も確認" : "一般流通の発売情報を確認";
    if (providerId === "amiami") return "定番ホビー枠";
    if (providerId === "amazon") return "一般小売の比較候補";
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
      return "ゲーマーズで特典を確認";
    case "melonbooks":
      return "メロンブックスで特典情報を見る";
    case "amazon":
      return "Amazonで一般流通を比較";
    case "rakuten":
      return "楽天で確認";
    case "mercari":
      return "メルカリで相場を見る";
    case "surugaya":
      return "駿河屋で見る";
    case "hmv":
      return "HMVで発売情報を確認";
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

function normalizeConfidence(confidence?: number): number {
  if (!Number.isFinite(confidence)) return 0;
  const numeric = Number(confidence);
  if (numeric <= 1) return Math.max(0, Math.min(1, numeric));
  return Math.max(0, Math.min(1, numeric / 100));
}

function isLowConfidenceScenario(input: Pick<PlannerInput, "confidence" | "itemKind" | "goodsClass">): boolean {
  const confidence = normalizeConfidence(input.confidence);
  if (!input.itemKind || !input.goodsClass) return true;
  return confidence > 0 ? confidence <= 0.58 : true;
}

function getTierIndex(tier: ProviderTier): number {
  return TIER_ORDER.indexOf(tier);
}

function toTier(index: number): ProviderTier | null {
  return TIER_ORDER[index] ?? null;
}

function tightenMaxTier(current: ProviderTier | undefined, next: ProviderTier): ProviderTier {
  if (!current) return next;
  return getTierIndex(next) > getTierIndex(current) ? next : current;
}

function isSmallCollectionFamily(goodsClass?: GoodsClass): boolean {
  return Boolean(goodsClass && SMALL_COLLECTION_FAMILY.has(goodsClass));
}

function hasBonusSensitiveSignals(input: Pick<PlannerInput, "resultTags" | "searchClues">): boolean {
  if ((input.resultTags ?? []).includes("bonus_pressure_high")) return true;
  if ((input.resultTags ?? []).includes("bonus_pressure_mid")) return true;
  return Boolean(input.searchClues?.bonusClues.some((clue) => clue === "特典"));
}

function getCandidateSignals(candidate: ProviderCandidate, input: PlannerInput): string[] {
  const signals = new Set<string>();
  const config = getProviderConfig(candidate.providerId);

  if (input.goodsClass === "media" && candidate.providerId === "hmv") signals.add("media_fit");
  if (input.itemKind === "preorder" && (candidate.providerId === "amiami" || candidate.providerId === "gamers" || candidate.providerId === "melonbooks")) signals.add("preorder_fit");
  if (config.role === "generic_retail_fallback") signals.add("general_new");
  if (config.role === "used_market" || config.role === "used_shop") signals.add("used_fallback");
  if (candidate.destinationReady) signals.add("destination_ready");
  if (candidate.rank <= 45) signals.add("high_base_rank");
  if (candidate.tier === "recommended") signals.add("currently_recommended");
  if (candidate.providerId === "amazon") signals.add("broad_catalog");
  if (candidate.providerId === "mercari" || candidate.providerId === "surugaya") signals.add("secondary_market");
  if ((input.resultTags ?? []).includes("bonus_pressure_high")) signals.add("bonus_sensitive");
  if (input.searchClues?.bonusClues.length) signals.add("search_bonus_clue");
  if (input.searchClues?.itemTypeCandidates.includes("Blu-ray")) signals.add("search_bluray_clue");
  if (input.searchClues?.workCandidates.length) signals.add("search_work_clue");
  if (candidate.renderMode === "reference") signals.add("reference_only_display");
  if (candidate.providerId === "melonbooks" && isBookOrComicContext(input)) signals.add("bookstore_specialty_path");

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

function dedupeReasons(reasons: string[]): string[] {
  return [...new Set(reasons)];
}

function resolveBuilderEligibility(providerId: ProviderId, input: PlannerInput): ProviderBuilderMode | "ineligible" {
  const config = getProviderConfig(providerId);

  if (config.canonicalOnly) return "canonical_only";
  if (config.fallbackOnly) return "fallback_only";
  if (!config.supportsBuilder) return "ineligible";

  if (config.builderItemKinds?.length && input.itemKind && !config.builderItemKinds.includes(input.itemKind)) {
    if (input.itemKind === "preorder" && (providerId === "amiami" || providerId === "gamers" || providerId === "melonbooks")) {
      return "limited";
    }
    return "ineligible";
  }

  if (config.builderGoodsClasses?.length && input.goodsClass && !config.builderGoodsClasses.includes(input.goodsClass)) {
    if (input.itemKind === "preorder" && (providerId === "amiami" || providerId === "gamers" || providerId === "melonbooks")) {
      return "limited";
    }
    return "ineligible";
  }

  if (config.usedMarketCheck && (input.itemKind === "used" || isSmallCollectionFamily(input.goodsClass))) return "precision";
  if (config.mediaSpecialty && input.goodsClass === "media") return "precision";
  if (config.bonusSpecialty && hasBonusSensitiveSignals(input)) return "precision";
  return config.builderMode ?? "limited";
}

function evaluateCandidate(rawCandidate: RawProviderCandidate, input: PlannerInput): ProviderEvaluation {
  const config = getProviderConfig(rawCandidate.providerId);
  const lowConfidence = isLowConfidenceScenario(input);
  const bonusSensitive = hasBonusSensitiveSignals(input);
  const smallCollectionFamily = isSmallCollectionFamily(input.goodsClass);
  const mediaPreorder = input.goodsClass === "media" && input.itemKind === "preorder";
  const mediaChooseOneStorePath =
    (input.resultTags ?? []).includes("media_edition_path_choose_one_best_store") ||
    (input.resultTags ?? []).includes("media_edition_path_buy_product_but_do_not_chase_all_bonuses") ||
    (input.resultTags ?? []).includes("media_edition_path_step_back_from_bonus_pressure");
  const mediaSplitJustifiedPath = (input.resultTags ?? []).includes("media_edition_path_split_orders_are_justified");
  const mediaSplitNotWorthItPath = (input.resultTags ?? []).includes("media_edition_path_split_orders_are_not_worth_it");
  const randomGoodsSinglesPath =
    (input.resultTags ?? []).includes("random_goods_path_stop_drawing_buy_singles") ||
    (input.resultTags ?? []).includes("random_goods_path_stop_drawing_check_used_market");
  const randomGoodsExchangePath = (input.resultTags ?? []).includes("random_goods_path_switch_to_exchange_path");
  const venueUsedFallbackPath =
    (input.resultTags ?? []).includes("venue_limited_path_fallback_to_used_market_if_missed") ||
    (input.resultTags ?? []).includes("venue_limited_path_skip_onsite_chase_and_check_later");
  const venueWaitPath =
    (input.resultTags ?? []).includes("venue_limited_path_wait_for_post_event_mailorder") ||
    (input.resultTags ?? []).includes("venue_limited_path_wait_for_post_event_followup");
  const venueFomoClampPath =
    (input.resultTags ?? []).includes("venue_limited_path_step_back_from_fomo_pressure") ||
    (input.resultTags ?? []).includes("venue_limited_path_skip_atmosphere_driven_goods_chase");
  const randomGoodsUnknownHeavy = (input.resultTags ?? []).includes("trust_gate_random_goods_unknown_heavy");
  const mediaUnknownHeavy = (input.resultTags ?? []).includes("trust_gate_media_unknown_heavy");
  const venueUnknownHeavy = (input.resultTags ?? []).includes("trust_gate_venue_unknown_heavy");

  const hardBlockReasons: string[] = [];
  const demotionReasons: string[] = [];
  let rank = rawCandidate.rank;
  let maxTier: ProviderTier | undefined;

  if (!config.truthLayerEligible) hardBlockReasons.push("truth_layer_disabled");
  if (!rawCandidate.scenarioEligible) hardBlockReasons.push("scenario_not_eligible");
  if (config.supportedItemKinds?.length && input.itemKind && !config.supportedItemKinds.includes(input.itemKind)) {
    hardBlockReasons.push("item_kind_mismatch");
  }
  if (config.supportedGoodsClasses?.length && input.goodsClass && !config.supportedGoodsClasses.includes(input.goodsClass)) {
    hardBlockReasons.push("goods_class_mismatch");
  }

  const builderEligibility = resolveBuilderEligibility(rawCandidate.providerId, input);

  if (builderEligibility === "ineligible" && (config.specialtyRetail || config.mediaSpecialty || config.bonusSpecialty)) {
    demotionReasons.push("builder_ineligible");
    rank += 14;
    maxTier = tightenMaxTier(maxTier, "okay");
  }

  if (config.fallbackOnly) {
    demotionReasons.push("fallback_only");
    rank += 12;
    maxTier = tightenMaxTier(maxTier, lowConfidence ? "lowProbability" : "okay");
  }

  if (config.highNoiseRisk && lowConfidence) {
    demotionReasons.push("low_confidence_clamp");
    rank += 8;
    maxTier = tightenMaxTier(maxTier, "lowProbability");
  }

  if (config.canonicalOnly) {
    demotionReasons.push("canonical_only");
    maxTier = tightenMaxTier(maxTier, input.goodsClass === "media" || bonusSensitive ? "recommended" : "okay");
  }

  if (smallCollectionFamily && input.itemKind !== "preorder") {
    if (rawCandidate.providerId === "mercari") rank -= 12;
    if (rawCandidate.providerId === "surugaya") rank -= 10;
    if (rawCandidate.providerId === "melonbooks") rank -= 14;
    if (rawCandidate.providerId === "gamers") rank -= input.goodsClass === "paper" ? 6 : 2;
    if (rawCandidate.providerId === "amiami") {
      demotionReasons.push("goods_class_mismatch");
      rank += 18;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten" || rawCandidate.providerId === "yahooShopping") {
      demotionReasons.push("goods_class_mismatch");
      rank += 18;
      maxTier = tightenMaxTier(maxTier, lowConfidence ? "lowProbability" : "okay");
    }
  }

  if (input.itemKind === "blind_draw" && randomGoodsSinglesPath) {
    if (rawCandidate.providerId === "mercari") rank -= 18;
    if (rawCandidate.providerId === "surugaya") rank -= 16;
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten" || rawCandidate.providerId === "yahooShopping") {
      demotionReasons.push("duplicate_risk_recovery_mismatch");
      rank += 22;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
    if (rawCandidate.providerId === "amiami" || rawCandidate.providerId === "gamers") {
      demotionReasons.push("secondary_completion_preferred");
      rank += 12;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.itemKind === "goods" && venueUsedFallbackPath) {
    if (rawCandidate.providerId === "mercari") rank -= 18;
    if (rawCandidate.providerId === "surugaya") rank -= 16;
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten" || rawCandidate.providerId === "yahooShopping") {
      demotionReasons.push("post_event_used_market_preferred");
      rank += 22;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
    if (rawCandidate.providerId === "amiami" || rawCandidate.providerId === "gamers") {
      demotionReasons.push("later_recovery_not_primary");
      rank += 8;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.itemKind === "goods" && venueWaitPath) {
    if (rawCandidate.providerId === "mercari" || rawCandidate.providerId === "surugaya") {
      demotionReasons.push("official_wait_signal_first");
      rank += 6;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten") {
      demotionReasons.push("standard_retail_only_if_continuation_realistic");
      rank += 6;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.itemKind === "goods" && venueFomoClampPath) {
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten" || rawCandidate.providerId === "yahooShopping") {
      demotionReasons.push("fomo_pressure_not_evidence");
      rank += 12;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
  }

  if (input.itemKind === "blind_draw" && randomGoodsExchangePath) {
    if (rawCandidate.providerId === "mercari" || rawCandidate.providerId === "surugaya") rank -= 6;
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten") {
      demotionReasons.push("exchange_path_not_primary");
      rank += 12;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.itemKind === "blind_draw" && randomGoodsUnknownHeavy) {
    if (rawCandidate.providerId === "mercari" || rawCandidate.providerId === "surugaya") {
      demotionReasons.push("diagnosis_not_yet_singles_ready");
      rank += 14;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten" || rawCandidate.providerId === "yahooShopping") {
      demotionReasons.push("unknown_heavy_blind_draw");
      rank += 18;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
  }

  if (mediaPreorder) {
    if (rawCandidate.providerId === "hmv") rank -= 18;
    if (rawCandidate.providerId === "towerRecords") rank -= 14;
    if (rawCandidate.providerId === "melonbooks") rank -= bonusSensitive ? 16 : 10;
    if (rawCandidate.providerId === "gamers") rank -= bonusSensitive ? 10 : 6;
    if (rawCandidate.providerId === "animate") rank -= bonusSensitive ? 12 : 6;
    if (rawCandidate.providerId === "amiami") {
      demotionReasons.push("goods_class_mismatch");
      rank += 18;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten" || rawCandidate.providerId === "yahooShopping") {
      demotionReasons.push("media_specialty_mismatch");
      rank += 14;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
    if (rawCandidate.providerId === "mercari" || rawCandidate.providerId === "surugaya") {
      demotionReasons.push("secondary_market_not_primary");
      rank += bonusSensitive ? 10 : 6;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.goodsClass === "media" && mediaChooseOneStorePath) {
    if (rawCandidate.providerId === "hmv") rank -= 8;
    if (rawCandidate.providerId === "gamers") rank -= 6;
    if (rawCandidate.providerId === "amazon") {
      demotionReasons.push("one_store_bonus_optimization_prefers_specialty");
      rank += 8;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
    if (rawCandidate.providerId === "mercari" || rawCandidate.providerId === "surugaya") {
      demotionReasons.push("post_followup_recovery_not_primary");
      rank += 10;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.goodsClass === "media" && mediaSplitNotWorthItPath) {
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten") {
      demotionReasons.push("split_order_burden_not_worth_it");
      rank += 10;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
    if (rawCandidate.providerId === "gamers") {
      demotionReasons.push("secondary_bonus_split_not_worth_it");
      rank += 6;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.goodsClass === "media" && mediaSplitJustifiedPath) {
    if (rawCandidate.providerId === "hmv") rank -= 6;
    if (rawCandidate.providerId === "gamers") rank -= 8;
    if (rawCandidate.providerId === "amazon") {
      demotionReasons.push("not_multi_bonus_specialist");
      rank += 8;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
    if (rawCandidate.providerId === "melonbooks" && !isBookOrComicContext(input)) {
      demotionReasons.push("mainstream_media_not_bookstore_driven");
      rank += 12;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
  }

  if (input.goodsClass === "media" && mediaUnknownHeavy) {
    if (rawCandidate.providerId === "melonbooks" && !isBookOrComicContext(input)) {
      demotionReasons.push("mainstream_media_not_bookstore_driven");
      rank += 18;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten" || rawCandidate.providerId === "mercari" || rawCandidate.providerId === "surugaya") {
      demotionReasons.push("edition_logic_not_established");
      rank += 12;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.itemKind === "goods" && venueUnknownHeavy) {
    if (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten" || rawCandidate.providerId === "yahooShopping") {
      demotionReasons.push("recovery_path_not_established");
      rank += 16;
      maxTier = tightenMaxTier(maxTier, "lowProbability");
    }
    if (rawCandidate.providerId === "mercari" || rawCandidate.providerId === "surugaya") {
      demotionReasons.push("used_fallback_not_established");
      rank += 10;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.itemKind === "used") {
    if (config.usedMarketCheck) rank -= 10;
    if (config.officialInfoCheck) {
      demotionReasons.push("secondary_market_alive");
      rank += input.goodsClass === "media" ? 24 : 10;
      maxTier = tightenMaxTier(maxTier, "okay");
    }
  }

  if (input.itemKind === "preorder" && bonusSensitive && config.officialInfoCheck) {
    rank -= 4;
  }

  if (input.itemKind === "preorder" && bonusSensitive && (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten")) {
    demotionReasons.push("bonus_specialty_mismatch");
    rank += 8;
    maxTier = tightenMaxTier(maxTier, "okay");
  }
  if (
    bonusSensitive &&
    (rawCandidate.providerId === "amazon" || rawCandidate.providerId === "rakuten") &&
    (isBookOrComicContext(input) || input.goodsClass === "media")
  ) {
    demotionReasons.push("specialty_provider_preferred");
    rank += 10;
    maxTier = tightenMaxTier(maxTier, "lowProbability");
  }

  const truthLayerEligible = hardBlockReasons.length === 0;
  const deliveryEnabled = config.deliveryEnabled && config.state === "live" && config.publicFacing && rawCandidate.visibility === "public";
  const displayable = truthLayerEligible && deliveryEnabled && rawCandidate.destinationReady;
  const referenceRenderable =
    truthLayerEligible &&
    !displayable &&
    config.referenceEnabled === true &&
    rawCandidate.destinationReady &&
    rawCandidate.renderMode === "reference";

  let deliverySuppressedReason: string | undefined;
  if (truthLayerEligible && !displayable) {
    if (!config.deliveryEnabled) {
      deliverySuppressedReason = "not_delivery_enabled";
    } else if (config.state !== "live") {
      deliverySuppressedReason = "not_live";
    } else if (!config.publicFacing || rawCandidate.visibility !== "public") {
      deliverySuppressedReason = "not_public";
    } else if (!rawCandidate.destinationReady) {
      deliverySuppressedReason = rawCandidate.suppressReason ?? "destination_missing_or_not_relevant";
    }
  }

  const finalSuppressReason = truthLayerEligible ? deliverySuppressedReason ?? rawCandidate.suppressReason : dedupeReasons(hardBlockReasons)[0];

  return {
    ...rawCandidate,
    rank,
    universeStatus: config.universeStatus,
    truthLayerEligible,
    deliveryEnabled,
    displayable,
    builderEligibility,
    hardBlocked: hardBlockReasons.length > 0,
    hardBlockReasons: dedupeReasons(hardBlockReasons),
    demotionReasons: dedupeReasons(demotionReasons),
    maxTier,
    truthOnly: truthLayerEligible && !displayable,
    referenceRenderable,
    referenceReason: rawCandidate.renderMode === "reference" ? "reference_only_specialty_check" : undefined,
    deliverySuppressedReason,
    finalSuppressReason,
  };
}

function clampTier(baseTier: ProviderTier, evaluation: ProviderEvaluation): ProviderTier | null {
  if (!evaluation.maxTier) return baseTier;
  const baseIndex = getTierIndex(baseTier);
  const maxIndex = getTierIndex(evaluation.maxTier);
  if (baseIndex === -1 || maxIndex === -1) return baseTier;
  return toTier(Math.max(baseIndex, maxIndex));
}

function applyLowConfidenceCardClamp(
  cards: Array<ProviderCandidate & { tier: ProviderTier }>,
  evaluationsById: Map<ProviderId, ProviderEvaluation>,
  input: PlannerInput,
): { cards: Array<ProviderCandidate & { tier: ProviderTier }>; suppressed: Map<ProviderId, string> } {
  const suppressed = new Map<ProviderId, string>();
  if (!isLowConfidenceScenario(input)) return { cards, suppressed };

  let constrained = applyRecommendedCap(cards, 1);
  constrained = constrained.filter((card) => {
    const config = getProviderConfig(card.providerId);
    if (config.fallbackOnly && card.tier === "lowProbability") {
      suppressed.set(card.providerId, "low_confidence_clamp");
      return false;
    }
    return true;
  });

  constrained = sortTieredCards(constrained).slice(0, 4);
  const visible = new Set(constrained.map((card) => card.providerId));
  for (const card of cards) {
    if (!visible.has(card.providerId) && !suppressed.has(card.providerId)) {
      const evaluation = evaluationsById.get(card.providerId);
      if (evaluation?.demotionReasons.includes("low_confidence_clamp") || getProviderConfig(card.providerId).fallbackOnly) {
        suppressed.set(card.providerId, "low_confidence_clamp");
      }
    }
  }

  return { cards: constrained, suppressed };
}

function buildDiagnostics(
  allCandidates: ProviderEvaluation[],
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
  const truthCandidates = allCandidates
    .filter((candidate) => candidate.truthLayerEligible)
    .sort((a, b) => a.rank - b.rank || a.providerId.localeCompare(b.providerId));
  const deliveryCandidates = truthCandidates.filter((candidate) => candidate.displayable);
  const eligibleRenderCandidates = truthCandidates.filter((candidate) => candidate.displayable || candidate.referenceRenderable);

  return {
    eligibleProviders: eligibleRenderCandidates.map((candidate) => candidate.providerId),
    truthCandidates: truthCandidates.map((candidate) => candidate.providerId),
    truthRankedProviders: truthCandidates.map((candidate) => ({ providerId: candidate.providerId, rank: candidate.rank })),
    deliveryCandidates: deliveryCandidates.map((candidate) => candidate.providerId),
    deliveryFilteredProviders: truthCandidates
      .filter((candidate) => !candidate.displayable)
      .map((candidate) => ({
        providerId: candidate.providerId,
        reason: candidate.deliverySuppressedReason ?? candidate.finalSuppressReason ?? "not_delivery_enabled",
      })),
    suppressedProviders: allCandidates
      .filter((candidate) => !finalCards.some((entry) => entry.providerId === candidate.providerId))
      .map((candidate) => ({
        providerId: candidate.providerId,
        reason: candidate.finalSuppressReason ?? (candidate.displayable ? "tier_filtered" : "not_delivery_enabled"),
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
      universeStatus: candidate.universeStatus,
      truthLayerEligible: candidate.truthLayerEligible,
      deliveryEnabled: candidate.deliveryEnabled,
      displayable: candidate.displayable,
      builderEligibility: candidate.builderEligibility,
      scenarioEligible: candidate.scenarioEligible,
      rank: candidate.rank,
      destinationReady: candidate.destinationReady,
      visibility: candidate.visibility,
      renderMode: candidate.renderMode,
      hardBlocked: candidate.hardBlocked,
      hardBlockReasons: candidate.hardBlockReasons,
      demotionReasons: candidate.demotionReasons,
      suppressReason: candidate.finalSuppressReason,
      referenceReason: candidate.referenceReason,
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

function buildRawCandidate(providerId: ProviderId, input: PlannerInput): RawProviderCandidate {
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
      renderMode: "primary",
      destinationReady,
      scenarioEligible,
      suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
    };
  }

  if (providerId === "surugaya") {
    const scenarioEligible = isSurugayaRelevantScenario(input.itemKind, input.goodsClass);
    const destinationReady = Boolean(scenarioEligible && input.surugayaDestination);
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
      renderMode: "primary",
      destinationReady,
      scenarioEligible,
      suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
    };
  }

  if (providerId === "amiami") {
    const scenarioEligible = isAmiamiRelevantScenario({ itemKind: input.itemKind, goodsClass: input.goodsClass });
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
      renderMode: "primary",
      destinationReady,
      scenarioEligible,
      suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
    };
  }

  if (providerId === "gamers") {
    const scenarioEligible = isGamersRelevantScenario({ itemKind: input.itemKind, goodsClass: input.goodsClass });
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
      renderMode: "primary",
      destinationReady,
      scenarioEligible,
      suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
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
      renderMode: "primary",
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
      renderMode: "fallback",
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
      renderMode: "fallback",
      destinationReady,
      scenarioEligible,
      suppressReason: destinationReady ? undefined : scenarioEligible ? "destination_missing_or_not_relevant" : "scenario_not_eligible",
    };
  }

  if (providerId === "towerRecords") {
    const scenarioEligible = isTowerRecordsRelevantScenario({ itemKind: input.itemKind, goodsClass: input.goodsClass });
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
      renderMode: "primary",
      destinationReady,
      scenarioEligible,
      suppressReason: destinationReady ? "pending_provider_not_public" : scenarioEligible ? "awaiting_vc_affiliate_url" : "scenario_not_eligible",
    };
  }

  if (providerId === "animate") {
    const scenarioEligible = isAnimateRelevantScenario({ itemKind: input.itemKind, goodsClass: input.goodsClass });
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
      renderMode: "primary",
      destinationReady,
      scenarioEligible,
      suppressReason: destinationReady ? "pending_provider_not_public" : scenarioEligible ? "destination_unresolved" : "scenario_not_eligible",
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
      renderMode: "primary",
      destinationReady,
      scenarioEligible,
      suppressReason: destinationReady ? "pending_provider_not_public" : scenarioEligible ? "awaiting_vc_affiliate_url" : "scenario_not_eligible",
    };
  }

  if (providerId === "melonbooks") {
    const scenarioEligible = isMelonbooksRelevantScenario(input);
    const destinationReady = scenarioEligible && Boolean(resolveMelonbooksReferenceUrl());
    return {
      providerId,
      rank: scenarioEligible ? baseRank - 10 : baseRank + 16,
      roleReason: config.roleLabel,
      shortReason: buildShortReason(providerId, input),
      ctaLabel: buildCompactCta(providerId),
      outHref: destinationReady
        ? buildOutHref({
            provider: providerId,
            dest: "melonbooks-reference",
            runId: input.runId,
            source: "result_page",
            itemKind: input.itemKind,
            gc: input.goodsClass,
            verdict: input.verdict,
          })
        : "",
      badge: config.badge,
      visibility: "public",
      renderMode: "reference",
      destinationReady,
      scenarioEligible,
      suppressReason: scenarioEligible ? "reference_only_specialty_check" : "scenario_not_eligible",
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
    renderMode: "primary",
    destinationReady: false,
    scenarioEligible: false,
    suppressReason: `pending_provider_slot:${config.role}`,
  };
}

export async function planProviderCards(input: PlannerInput): Promise<{
  cards: ProviderCandidate[];
  diagnostics: ProviderDiagnostics;
}> {
  const evaluatedCandidates = PLANNED_PROVIDER_IDS.map((providerId) => evaluateCandidate(buildRawCandidate(providerId, input), input));

  const truthRanked = evaluatedCandidates
    .filter((candidate) => candidate.truthLayerEligible)
    .sort((a, b) => a.rank - b.rank || a.providerId.localeCompare(b.providerId))
    .map((candidate, index) => ({ ...candidate, truthRank: index + 1 }));

  const truthRankByProvider = new Map(truthRanked.map((candidate) => [candidate.providerId, candidate.truthRank] as const));
  const truthEvaluations = evaluatedCandidates.map((candidate) => ({
    ...candidate,
    truthRank: truthRankByProvider.get(candidate.providerId),
  }));

  const deliveryCandidates = truthRanked
    .filter((candidate) => candidate.displayable || candidate.referenceRenderable)
    .sort((a, b) => a.rank - b.rank || a.providerId.localeCompare(b.providerId));

  const bestRank = deliveryCandidates[0]?.rank ?? 0;
  const mappedTieredCards = deliveryCandidates.map((candidate) => {
    const mappedTier = mapTier(candidate.rank, bestRank, getProviderConfig(candidate.providerId).role);
    if (!mappedTier) return null;
    const tier = clampTier(mappedTier, candidate);
    if (!tier) return null;
    return { ...candidate, tier };
  });
  const tieredCards = mappedTieredCards.filter((candidate): candidate is NonNullable<(typeof mappedTieredCards)[number]> => candidate != null);

  const evaluationsById = new Map(truthEvaluations.map((candidate) => [candidate.providerId, candidate] as const));
  const lowConfidenceClamp = applyLowConfidenceCardClamp(sortTieredCards(tieredCards), evaluationsById, input);
  for (const [providerId, reason] of lowConfidenceClamp.suppressed.entries()) {
    const existing = evaluationsById.get(providerId);
    if (existing) {
      existing.finalSuppressReason = reason;
    }
  }

  const deterministicCards = sortTieredCards(lowConfidenceClamp.cards);
  const eligibility = getAiEligibility(input, deterministicCards);
  const aiEnabled = isAiRerankEnabled();
  const aiModel = getAiModel();

  if (!eligibility.eligible) {
    return {
      cards: deterministicCards,
      diagnostics: buildDiagnostics(truthEvaluations, deterministicCards, {
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
    return {
      cards: deterministicCards,
      diagnostics: buildDiagnostics(truthEvaluations, deterministicCards, {
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
    return {
      cards: deterministicCards,
      diagnostics: buildDiagnostics(truthEvaluations, deterministicCards, {
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
    return {
      cards: deterministicCards,
      diagnostics: buildDiagnostics(truthEvaluations, deterministicCards, {
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
    diagnostics: buildDiagnostics(truthEvaluations, finalCards, {
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
