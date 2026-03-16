import type { ItemKind } from "@/src/oshihapi/model";

const YAHOO_SHOPPING_ITEM_KIND_ALLOWLIST: ItemKind[] = ["goods", "blind_draw", "used", "preorder"];

export function isYahooShoppingRelevantScenario(input: { itemKind?: ItemKind }): boolean {
  if (!input.itemKind) return false;
  return YAHOO_SHOPPING_ITEM_KIND_ALLOWLIST.includes(input.itemKind);
}

export function resolveYahooShoppingAffiliateDestination(): string | null {
  return null;
}
