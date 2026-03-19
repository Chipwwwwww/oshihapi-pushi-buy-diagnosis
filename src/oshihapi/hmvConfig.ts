import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

export const HMV_CANONICAL_AFFILIATE_URL =
  "https://click.linksynergy.com/fs-bin/click?id=PMIaD4IAiLU&offerid=314039.10007876&type=3&subid=0";

export function isHmvRelevantScenario(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): boolean {
  if (input.goodsClass === "media") {
    return input.itemKind === "goods" || input.itemKind === "used" || input.itemKind === "preorder";
  }
  if (input.goodsClass === "paper") {
    return input.itemKind === "goods" || input.itemKind === "preorder";
  }
  return false;
}

export function resolveHmvAffiliateDestination(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): string | null {
  return isHmvRelevantScenario(input) ? HMV_CANONICAL_AFFILIATE_URL : null;
}
