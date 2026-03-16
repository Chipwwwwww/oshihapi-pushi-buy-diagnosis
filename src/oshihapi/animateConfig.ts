import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

const ANIMATE_ITEM_KIND_ALLOWLIST: ItemKind[] = ["goods", "blind_draw", "preorder"];
const ANIMATE_GOODS_CLASS_BLOCKLIST: GoodsClass[] = ["tech", "media"];

export function isAnimateRelevantScenario(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): boolean {
  if (!input.itemKind || !ANIMATE_ITEM_KIND_ALLOWLIST.includes(input.itemKind)) return false;
  if (!input.goodsClass) return true;
  return !ANIMATE_GOODS_CLASS_BLOCKLIST.includes(input.goodsClass);
}

export function resolveAnimateAffiliateDestination(): string | null {
  return null;
}
