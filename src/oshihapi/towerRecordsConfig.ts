import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

export function isTowerRecordsRelevantScenario(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): boolean {
  if (input.goodsClass === "media") return true;
  return input.itemKind === "preorder";
}

export function resolveTowerRecordsAffiliateDestination(): string | null {
  return null;
}
