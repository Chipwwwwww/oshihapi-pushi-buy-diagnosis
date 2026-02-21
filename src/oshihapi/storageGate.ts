import type { GoodsSubtype, ItemKind } from "@/src/oshihapi/model";

const SKIP_STORAGE_KINDS = new Set<ItemKind>(["ticket", "game_billing"]);

export function shouldAskStorage(kindId?: ItemKind, goodsSubtype?: GoodsSubtype): boolean {
  if (!kindId) return true;
  if (kindId === "goods" && goodsSubtype === "itaBag_badge") return false;
  return !SKIP_STORAGE_KINDS.has(kindId);
}

export const STORAGE_FIT_LABEL: Record<string, string> = {
  CONFIRMED: "確保済み",
  PROBABLE: "片付ければOK",
  NONE: "今はない",
  UNKNOWN: "未確認",
};
