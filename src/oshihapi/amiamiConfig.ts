import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

export const AMIAMI_CANONICAL_AFFILIATE_URL =
  "https://px.a8.net/svt/ejp?a8mat=4AZH4C+ADAT2Q+NA2+60OXE";

const AMIAMI_GOODS_CLASS_ALLOWLIST: GoodsClass[] = ["display_large", "small_collection", "itabag_badge"];
const AMIAMI_ITEM_KIND_ALLOWLIST: ItemKind[] = ["preorder", "blind_draw"];

export function isAmiamiRelevantScenario(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): boolean {
  if (!input.itemKind) return false;
  if (AMIAMI_ITEM_KIND_ALLOWLIST.includes(input.itemKind)) return true;
  if (input.itemKind === "goods" && input.goodsClass) {
    return AMIAMI_GOODS_CLASS_ALLOWLIST.includes(input.goodsClass);
  }
  return false;
}

export function resolveAmiamiAffiliateDestination(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): string | null {
  return isAmiamiRelevantScenario(input) ? AMIAMI_CANONICAL_AFFILIATE_URL : null;
}
