import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

export type ProviderId =
  | "mercari"
  | "surugaya"
  | "amiami"
  | "gamers"
  | "amazon"
  | "rakuten"
  | "animate"
  | "hmv"
  | "towerRecords"
  | "yahooShopping"
  | "melonbooks"
  | "a8Generic";

export type ProviderState = "live" | "pending" | "off";
export type ProviderUniverseStatus = "active" | "pending" | "candidate";
export type ProviderDestinationType = "keyword_search" | "static" | "item_link";
export type ProviderRole = "used_market" | "used_shop" | "specialty_hobby" | "specialty_anime" | "all_anime" | "media" | "general_new" | "promo_slot";
export type ProviderBuilderMode = "precision" | "limited" | "canonical_only" | "fallback_only" | "none";

export type ProviderRegistryEntry = {
  id: ProviderId;
  displayName: string;
  role: ProviderRole;
  roleLabel: string;
  badge?: string;
  defaultCtaLabel: string;
  destinationType: ProviderDestinationType;
  state: ProviderState;
  universeStatus: ProviderUniverseStatus;
  truthLayerEligible: boolean;
  deliveryEnabled: boolean;
  publicFacing: boolean;
  requiresAffiliateApproval: boolean;
  disclosureRequired: boolean;
  disclosureNote?: string;
  externalSiteNote?: string;
  allowlistedDomains: string[];
  defaultRank: number;
  supportedItemKinds?: ItemKind[];
  supportedGoodsClasses?: GoodsClass[];
  supportsBuilder?: boolean;
  builderMode?: ProviderBuilderMode;
  builderItemKinds?: ItemKind[];
  builderGoodsClasses?: GoodsClass[];
  canonicalOnly?: boolean;
  fallbackOnly?: boolean;
  officialInfoCheck?: boolean;
  bonusSpecialty?: boolean;
  usedMarketCheck?: boolean;
  mediaSpecialty?: boolean;
  specialtyRetail?: boolean;
  highNoiseRisk?: boolean;
};

const PROVIDER_REGISTRY: Record<ProviderId, ProviderRegistryEntry> = {
  mercari: {
    id: "mercari",
    displayName: "メルカリ",
    role: "used_market",
    roleLabel: "C2C中古相場の確認",
    badge: "中古相場",
    defaultCtaLabel: "メルカリで探す",
    destinationType: "keyword_search",
    state: "live",
    universeStatus: "active",
    truthLayerEligible: true,
    deliveryEnabled: true,
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含む場合があります",
    externalSiteNote: "※外部サイト（メルカリ）に移動します",
    allowlistedDomains: ["jp.mercari.com"],
    defaultRank: 20,
    supportedItemKinds: ["goods", "used", "blind_draw"],
    supportedGoodsClasses: ["paper", "itabag_badge", "small_collection"],
    supportsBuilder: true,
    builderMode: "precision",
    builderItemKinds: ["goods", "used", "blind_draw"],
    builderGoodsClasses: ["paper", "itabag_badge", "small_collection"],
    usedMarketCheck: true,
  },
  surugaya: {
    id: "surugaya",
    displayName: "駿河屋",
    role: "used_shop",
    roleLabel: "中古ショップ在庫",
    badge: "中古ショップ",
    defaultCtaLabel: "駿河屋で中古ショップ在庫を確認",
    destinationType: "static",
    state: "live",
    universeStatus: "active",
    truthLayerEligible: true,
    deliveryEnabled: true,
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※外部サイトで最新在庫・価格をご確認ください",
    externalSiteNote: "※外部サイト（駿河屋）に移動します",
    allowlistedDomains: ["affiliate.suruga-ya.jp", "www.suruga-ya.jp", "suruga-ya.jp"],
    defaultRank: 30,
    supportedItemKinds: ["goods", "used", "blind_draw"],
    supportedGoodsClasses: ["paper", "itabag_badge", "small_collection", "media"],
    supportsBuilder: true,
    builderMode: "precision",
    builderItemKinds: ["goods", "used", "blind_draw"],
    builderGoodsClasses: ["paper", "itabag_badge", "small_collection", "media"],
    usedMarketCheck: true,
  },
  amiami: {
    id: "amiami",
    displayName: "あみあみ",
    role: "specialty_hobby",
    roleLabel: "新品・予約・ホビー",
    badge: "新品・予約",
    defaultCtaLabel: "あみあみで新品・予約を確認",
    destinationType: "static",
    state: "live",
    universeStatus: "active",
    truthLayerEligible: true,
    deliveryEnabled: true,
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※外部サイト（あみあみ）に移動します",
    allowlistedDomains: ["px.a8.net"],
    defaultRank: 35,
    supportedItemKinds: ["goods", "blind_draw", "preorder"],
    supportedGoodsClasses: ["display_large", "small_collection", "itabag_badge"],
    supportsBuilder: true,
    builderMode: "limited",
    builderItemKinds: ["preorder", "blind_draw", "goods"],
    builderGoodsClasses: ["display_large"],
    specialtyRetail: true,
  },
  gamers: {
    id: "gamers",
    displayName: "ゲーマーズ",
    role: "specialty_anime",
    roleLabel: "専門店・特典・新品",
    badge: "専門店",
    defaultCtaLabel: "ゲーマーズでアニメ・グッズ専門店を確認",
    destinationType: "static",
    state: "live",
    universeStatus: "active",
    truthLayerEligible: true,
    deliveryEnabled: true,
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※外部サイト（ゲーマーズ）に移動します",
    allowlistedDomains: ["px.a8.net"],
    defaultRank: 37,
    supportedItemKinds: ["goods", "blind_draw", "preorder"],
    supportedGoodsClasses: ["paper", "small_collection", "itabag_badge", "wearable", "media"],
    supportsBuilder: true,
    builderMode: "limited",
    builderItemKinds: ["goods", "blind_draw", "preorder"],
    builderGoodsClasses: ["paper", "small_collection", "itabag_badge", "wearable", "media"],
    bonusSpecialty: true,
    specialtyRetail: true,
  },
  amazon: {
    id: "amazon",
    displayName: "Amazon",
    role: "general_new",
    roleLabel: "新品・関連商品の比較",
    badge: "新品・関連",
    defaultCtaLabel: "Amazonで比較する",
    destinationType: "static",
    state: "live",
    universeStatus: "active",
    truthLayerEligible: true,
    deliveryEnabled: true,
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※Amazonへ移動します",
    allowlistedDomains: ["www.amazon.co.jp", "amazon.co.jp"],
    defaultRank: 40,
    fallbackOnly: true,
    highNoiseRisk: true,
  },
  rakuten: {
    id: "rakuten",
    displayName: "楽天市場",
    role: "general_new",
    roleLabel: "新品・収納/関連アクセの比較",
    badge: "新品・付随品",
    defaultCtaLabel: "楽天で見る",
    destinationType: "item_link",
    state: "live",
    universeStatus: "active",
    truthLayerEligible: true,
    deliveryEnabled: true,
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※楽天市場へ移動します",
    allowlistedDomains: ["rakuten.co.jp", "rakuten.ne.jp"],
    defaultRank: 50,
    fallbackOnly: true,
    highNoiseRisk: true,
  },
  animate: {
    id: "animate",
    displayName: "アニメイト",
    role: "all_anime",
    roleLabel: "アニメ・コミック・グッズ",
    badge: "公式・予約",
    defaultCtaLabel: "アニメイトで作品関連商品を確認",
    destinationType: "static",
    state: "pending",
    universeStatus: "pending",
    truthLayerEligible: true,
    deliveryEnabled: false,
    publicFacing: false,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: [],
    defaultRank: 60,
    supportsBuilder: true,
    builderMode: "canonical_only",
    builderItemKinds: ["goods", "blind_draw", "preorder"],
    builderGoodsClasses: ["paper", "small_collection", "itabag_badge", "wearable", "media"],
    canonicalOnly: true,
    officialInfoCheck: true,
    bonusSpecialty: true,
    specialtyRetail: true,
  },
  hmv: {
    id: "hmv",
    displayName: "HMV",
    role: "media",
    roleLabel: "CD・映像・書籍",
    badge: "Media",
    defaultCtaLabel: "HMVでCD・映像・書籍を確認",
    destinationType: "static",
    state: "live",
    universeStatus: "active",
    truthLayerEligible: true,
    deliveryEnabled: true,
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※外部サイト（HMV）に移動します",
    allowlistedDomains: ["click.linksynergy.com", "www.hmv.co.jp"],
    defaultRank: 62,
    supportedItemKinds: ["goods", "used", "preorder"],
    supportedGoodsClasses: ["media"],
    supportsBuilder: true,
    builderMode: "precision",
    builderItemKinds: ["goods", "used", "preorder"],
    builderGoodsClasses: ["media"],
    officialInfoCheck: true,
    mediaSpecialty: true,
  },
  towerRecords: {
    id: "towerRecords",
    displayName: "タワーレコード",
    role: "media",
    roleLabel: "CD・映像・書籍",
    badge: "Media",
    defaultCtaLabel: "タワレコでCD・映像を確認",
    destinationType: "static",
    state: "pending",
    universeStatus: "pending",
    truthLayerEligible: true,
    deliveryEnabled: false,
    publicFacing: false,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: [],
    defaultRank: 63,
    supportsBuilder: true,
    builderMode: "canonical_only",
    builderItemKinds: ["goods", "used", "preorder"],
    builderGoodsClasses: ["media"],
    canonicalOnly: true,
    officialInfoCheck: true,
    mediaSpecialty: true,
  },
  yahooShopping: {
    id: "yahooShopping",
    displayName: "Yahoo!ショッピング",
    role: "general_new",
    roleLabel: "新品・ショップ横断",
    badge: "新品比較",
    defaultCtaLabel: "Yahoo!ショッピングで新品を確認",
    destinationType: "static",
    state: "pending",
    universeStatus: "pending",
    truthLayerEligible: true,
    deliveryEnabled: false,
    publicFacing: false,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: [],
    defaultRank: 70,
    fallbackOnly: true,
    highNoiseRisk: true,
  },
  melonbooks: {
    id: "melonbooks",
    displayName: "メロンブックス",
    role: "specialty_anime",
    roleLabel: "特典・紙もの・媒体候補",
    badge: "候補・専門",
    defaultCtaLabel: "メロンブックスで確認",
    destinationType: "static",
    state: "pending",
    universeStatus: "candidate",
    truthLayerEligible: true,
    deliveryEnabled: false,
    publicFacing: false,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: [],
    defaultRank: 36,
    supportedItemKinds: ["goods", "preorder", "blind_draw"],
    supportedGoodsClasses: ["paper", "small_collection", "itabag_badge", "media"],
    supportsBuilder: true,
    builderMode: "canonical_only",
    builderItemKinds: ["goods", "preorder", "blind_draw"],
    builderGoodsClasses: ["paper", "small_collection", "itabag_badge", "media"],
    canonicalOnly: true,
    officialInfoCheck: true,
    bonusSpecialty: true,
    mediaSpecialty: true,
    specialtyRetail: true,
  },
  a8Generic: {
    id: "a8Generic",
    displayName: "提携ショップ",
    role: "promo_slot",
    roleLabel: "A8連携枠（準備中）",
    badge: "PR枠",
    defaultCtaLabel: "提携先で確認する",
    destinationType: "static",
    state: "pending",
    universeStatus: "pending",
    truthLayerEligible: false,
    deliveryEnabled: false,
    publicFacing: true,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: [],
    defaultRank: 80,
    fallbackOnly: true,
    highNoiseRisk: true,
  },
};

export function getProviderRegistry(): Record<ProviderId, ProviderRegistryEntry> {
  return PROVIDER_REGISTRY;
}

export function getProviderConfig(providerId: ProviderId): ProviderRegistryEntry {
  return PROVIDER_REGISTRY[providerId];
}

export function getProviderRankBase(providerId: ProviderId): number {
  return PROVIDER_REGISTRY[providerId].defaultRank;
}
