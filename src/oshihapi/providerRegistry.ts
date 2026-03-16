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
  | "a8Generic";

export type ProviderState = "live" | "pending" | "off";
export type ProviderDestinationType = "keyword_search" | "static" | "item_link";
export type ProviderRole = "used_market" | "used_shop" | "specialty_hobby" | "specialty_anime" | "all_anime" | "media" | "general_new" | "promo_slot";

export type ProviderRegistryEntry = {
  id: ProviderId;
  displayName: string;
  role: ProviderRole;
  roleLabel: string;
  badge?: string;
  defaultCtaLabel: string;
  destinationType: ProviderDestinationType;
  state: ProviderState;
  publicFacing: boolean;
  requiresAffiliateApproval: boolean;
  disclosureRequired: boolean;
  disclosureNote?: string;
  externalSiteNote?: string;
  allowlistedDomains: string[];
  defaultRank: number;
  supportedItemKinds?: ItemKind[];
  supportedGoodsClasses?: GoodsClass[];
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
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含む場合があります",
    externalSiteNote: "※外部サイト（メルカリ）に移動します",
    allowlistedDomains: ["jp.mercari.com"],
    defaultRank: 20,
    supportedItemKinds: ["goods", "used", "blind_draw"],
    supportedGoodsClasses: ["paper", "itabag_badge", "small_collection"],
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
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※外部サイトで最新在庫・価格をご確認ください",
    externalSiteNote: "※外部サイト（駿河屋）に移動します",
    allowlistedDomains: ["affiliate.suruga-ya.jp", "www.suruga-ya.jp", "suruga-ya.jp"],
    defaultRank: 30,
    supportedItemKinds: ["goods", "used", "blind_draw"],
    supportedGoodsClasses: ["paper", "itabag_badge", "small_collection"],
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
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※外部サイト（あみあみ）に移動します",
    allowlistedDomains: ["px.a8.net"],
    defaultRank: 35,
    supportedItemKinds: ["goods", "blind_draw", "preorder"],
    supportedGoodsClasses: ["display_large", "small_collection", "itabag_badge"],
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
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※外部サイト（ゲーマーズ）に移動します",
    allowlistedDomains: ["px.a8.net"],
    defaultRank: 37,
    supportedItemKinds: ["goods", "blind_draw"],
    supportedGoodsClasses: ["paper", "small_collection", "itabag_badge", "wearable"],
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
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※Amazonへ移動します",
    allowlistedDomains: ["www.amazon.co.jp", "amazon.co.jp"],
    defaultRank: 40,
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
    publicFacing: true,
    requiresAffiliateApproval: false,
    disclosureRequired: true,
    disclosureNote: "※一部リンクにはアフィリエイトを含みます",
    externalSiteNote: "※楽天市場へ移動します",
    allowlistedDomains: ["rakuten.co.jp", "rakuten.ne.jp"],
    defaultRank: 50,
  },
  animate: {
    id: "animate",
    displayName: "アニメイト",
    role: "all_anime",
    roleLabel: "オールアニメ総合（準備中）",
    badge: "公式・予約",
    defaultCtaLabel: "アニメイトで見る",
    destinationType: "static",
    state: "pending",
    publicFacing: true,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: ["www.animate-onlineshop.jp"],
    defaultRank: 60,
  },

  hmv: {
    id: "hmv",
    displayName: "HMV",
    role: "media",
    roleLabel: "Media（CD/DVD/書籍・準備中）",
    badge: "Media",
    defaultCtaLabel: "HMVで見る",
    destinationType: "static",
    state: "pending",
    publicFacing: false,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: ["www.hmv.co.jp"],
    defaultRank: 62,
  },
  towerRecords: {
    id: "towerRecords",
    displayName: "タワーレコード",
    role: "media",
    roleLabel: "Media（CD/DVD/書籍・準備中）",
    badge: "Media",
    defaultCtaLabel: "タワレコで見る",
    destinationType: "static",
    state: "pending",
    publicFacing: false,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: ["tower.jp"],
    defaultRank: 63,
  },
  yahooShopping: {
    id: "yahooShopping",
    displayName: "Yahoo!ショッピング",
    role: "general_new",
    roleLabel: "新品比較（準備中）",
    badge: "新品比較",
    defaultCtaLabel: "Yahoo!ショッピングで見る",
    destinationType: "static",
    state: "pending",
    publicFacing: true,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: ["shopping.yahoo.co.jp"],
    defaultRank: 70,
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
    publicFacing: true,
    requiresAffiliateApproval: true,
    disclosureRequired: true,
    allowlistedDomains: [],
    defaultRank: 80,
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
