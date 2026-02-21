import type { StyleMode } from "@/src/oshihapi/modes/useStyleMode";

export type BasketShopContext = "melonbooks" | "animate" | "event_venue" | "online" | "other";
export type BasketPurpose = "itabag" | "reading" | "display" | "collection" | "gift" | "mixed";
export type BasketHardCap = "strict" | "flex" | "undecided";
export type BasketTimePressure = "today" | "few_days" | "not_urgent" | "unknown";
export type BasketDecisiveness = "careful" | "standard" | "quick";
export type BasketCategory =
  | "book"
  | "doujin"
  | "standee"
  | "badge"
  | "random_blind"
  | "figure"
  | "media_cd_bd"
  | "apparel"
  | "other"
  | "unknown";
export type BasketRarity = "low" | "mid" | "high" | "unknown";

export type BasketItem = {
  id: string;
  name: string;
  priceJPY: number;
  category: BasketCategory;
  rarity: BasketRarity;
  mustBuy: boolean;
};

export type BasketInput = {
  shopContext: BasketShopContext;
  purpose: BasketPurpose;
  totalBudgetJPY: number;
  hardCap: BasketHardCap;
  timePressure: BasketTimePressure;
  decisiveness: BasketDecisiveness;
  styleMode?: StyleMode;
  items: BasketItem[];
};

export type BasketScoredItem = BasketItem & {
  priorityScore: number;
  rankKey: string;
  reasons: string[];
};

export type BasketResult = {
  buyNow: BasketScoredItem[];
  hold: BasketScoredItem[];
  skip: BasketScoredItem[];
  cutList: BasketScoredItem[];
  totals: {
    budgetJPY: number;
    totalJPY: number;
    buyNowTotalJPY: number;
    remainingJPY: number;
    overJPY: number;
    mustBuyOnlyOverBudget: boolean;
  };
  debug: {
    perItem: Array<{
      itemId: string;
      priorityScore: number;
      reasonTokens: string[];
      rankKey: string;
    }>;
  };
};

type InternalScoredItem = BasketScoredItem & { _reasonTokens: string[] };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const rarityBoost: Record<BasketRarity, number> = {
  low: 15,
  mid: 8,
  high: 0,
  unknown: 4,
};

const purposeMatchBoost = (purpose: BasketPurpose, category: BasketCategory): number => {
  if (purpose === "itabag" && category === "badge") return 12;
  if (purpose === "reading" && (category === "book" || category === "doujin")) return 12;
  if (purpose === "display" && (category === "standee" || category === "figure")) return 12;
  if (purpose === "mixed") return 6;
  return 0;
};

const scoreItem = (item: BasketItem, input: BasketInput): { priorityScore: number; reasonTokens: string[]; reasons: string[] } => {
  const reasonTokens: string[] = [];
  let score = 50;

  if (item.mustBuy) {
    score += 30;
    reasonTokens.push("mustBuy");
  }

  const rarity = rarityBoost[item.rarity];
  score += rarity;
  if (item.rarity !== "high") {
    reasonTokens.push(item.rarity === "low" ? "lowRestock" : item.rarity === "mid" ? "midRestock" : "unknownRestock");
  }

  const purposeBoost = purposeMatchBoost(input.purpose, item.category);
  score += purposeBoost;
  if (purposeBoost > 0) reasonTokens.push("purposeMatch");

  const pressure = clamp((item.priceJPY / Math.max(1, input.totalBudgetJPY)) * 35, 0, 35);
  score -= pressure;
  if (pressure >= 20) reasonTokens.push("priceHeavy");

  if (item.category === "unknown") {
    score -= 5;
    reasonTokens.push("unknownCategory");
  }

  const priorityScore = clamp(Math.round(score), 0, 100);

  const reasons: string[] = [];
  if (item.mustBuy) reasons.push("必須条件（特典・依頼・期限）を満たすため優先");
  if (purposeBoost > 0) reasons.push("今回の目的に合うカテゴリ");
  if (item.rarity === "low") reasons.push("再販期待が低めで先送りリスクあり");
  if (pressure >= 20) reasons.push("予算比で価格が重め");
  if (item.category === "unknown") reasons.push("カテゴリ情報が不足");
  if (reasons.length === 0) reasons.push("総合スコアは中間帯");

  return { priorityScore, reasonTokens, reasons: reasons.slice(0, 3) };
};

const sortByRank = (a: BasketScoredItem, b: BasketScoredItem): number => {
  if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
  if (a.priceJPY !== b.priceJPY) return a.priceJPY - b.priceJPY;
  return a.name.localeCompare(b.name, "ja");
};

const toRankKey = (item: BasketItem, priorityScore: number) =>
  `${String(100 - priorityScore).padStart(3, "0")}:${String(item.priceJPY).padStart(8, "0")}:${item.name}`;

export function evaluateBasketC0(input: BasketInput): BasketResult {
  const normalizedBudget = Math.max(0, Math.floor(input.totalBudgetJPY));
  const scored: InternalScoredItem[] = input.items.map((item) => {
    const computed = scoreItem(item, input);
    return {
      ...item,
      priorityScore: computed.priorityScore,
      rankKey: toRankKey(item, computed.priorityScore),
      reasons: computed.reasons,
      _reasonTokens: computed.reasonTokens,
    };
  });

  const mustBuy = scored.filter((item) => item.mustBuy).sort(sortByRank);
  const nonMust = scored.filter((item) => !item.mustBuy).sort(sortByRank);

  const buyNow: BasketScoredItem[] = [...mustBuy];
  const hold: BasketScoredItem[] = [];
  const skip: BasketScoredItem[] = [];

  const thresholdDelta = input.decisiveness === "careful" ? 4 : input.decisiveness === "quick" ? -4 : 0;
  const skipThreshold = 35 + thresholdDelta;

  let usedBudget = mustBuy.reduce((sum, item) => sum + item.priceJPY, 0);
  let remainingBudget = normalizedBudget - usedBudget;

  for (const item of nonMust) {
    if (remainingBudget >= item.priceJPY) {
      buyNow.push(item);
      remainingBudget -= item.priceJPY;
      usedBudget += item.priceJPY;
      continue;
    }

    if (item.priorityScore < skipThreshold) skip.push(item);
    else hold.push(item);
  }

  const buyNowSorted = [...buyNow].sort(sortByRank);
  const holdSorted = [...hold].sort(sortByRank);
  const skipSorted = [...skip].sort(sortByRank);

  const totalJPY = scored.reduce((sum, item) => sum + item.priceJPY, 0);
  const buyNowTotalJPY = buyNowSorted.reduce((sum, item) => sum + item.priceJPY, 0);
  const overJPY = Math.max(0, buyNowTotalJPY - normalizedBudget);

  const cutList: BasketScoredItem[] = [];
  if (overJPY > 0 && input.hardCap === "strict") {
    const removable = [...buyNowSorted]
      .filter((item) => !item.mustBuy)
      .sort((a, b) => {
        if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
        if (a.priceJPY !== b.priceJPY) return b.priceJPY - a.priceJPY;
        return a.name.localeCompare(b.name, "ja");
      });

    let projected = buyNowTotalJPY;
    for (const item of removable) {
      if (projected <= normalizedBudget) break;
      cutList.push(item);
      projected -= item.priceJPY;
    }
  }

  const mustBuyTotal = mustBuy.reduce((sum, item) => sum + item.priceJPY, 0);

  return {
    buyNow: buyNowSorted,
    hold: holdSorted,
    skip: skipSorted,
    cutList,
    totals: {
      budgetJPY: normalizedBudget,
      totalJPY,
      buyNowTotalJPY,
      remainingJPY: normalizedBudget - buyNowTotalJPY,
      overJPY,
      mustBuyOnlyOverBudget: mustBuyTotal > normalizedBudget,
    },
    debug: {
      perItem: scored
        .map((item) => ({
          itemId: item.id,
          priorityScore: item.priorityScore,
          reasonTokens: item._reasonTokens,
          rankKey: item.rankKey,
        }))
        .sort((a, b) => a.itemId.localeCompare(b.itemId, "ja")),
    },
  };
}
