import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

export const GAMERS_CANONICAL_AFFILIATE_URL =
  "https://px.a8.net/svt/ejp?a8mat=4AZH4C+CVSP0Y+4AHY+5YJRM";

const GAMERS_ITEM_KIND_ALLOWLIST: ItemKind[] = ["goods", "blind_draw"];
const GAMERS_GOODS_CLASS_ALLOWLIST: GoodsClass[] = ["paper", "small_collection", "itabag_badge", "wearable"];

export function isGamersRelevantScenario(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): boolean {
  if (!input.itemKind) return false;
  if (!GAMERS_ITEM_KIND_ALLOWLIST.includes(input.itemKind)) return false;
  if (!input.goodsClass) return input.itemKind === "blind_draw";
  return GAMERS_GOODS_CLASS_ALLOWLIST.includes(input.goodsClass);
}

export function resolveGamersAffiliateDestination(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): string | null {
  return isGamersRelevantScenario(input) ? GAMERS_CANONICAL_AFFILIATE_URL : null;
}
