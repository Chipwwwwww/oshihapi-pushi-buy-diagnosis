import type { GoodsSubtype, ItemKind } from "@/src/oshihapi/model";

const SKIP_STORAGE_KINDS = new Set<ItemKind>(["ticket", "game_billing"]);
const SKIP_STORAGE_SUBTYPES = new Set<GoodsSubtype>(["itaBag_badge", "digital_goods", "e_ticket"]);

export function shouldAskStorage(kindId?: ItemKind, goodsSubtype?: GoodsSubtype): boolean {
  if (goodsSubtype && SKIP_STORAGE_SUBTYPES.has(goodsSubtype)) return false;
  if (!kindId) return true;
  return !SKIP_STORAGE_KINDS.has(kindId);
}

export const STORAGE_FIT_LABEL: Record<string, string> = {
  CONFIRMED: "確保済み",
  PROBABLE: "片付ければOK",
  NONE: "今はない",
  UNKNOWN: "未確認",
};
