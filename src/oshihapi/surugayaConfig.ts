import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

const SURUGAYA_CLASS_HINT: Partial<Record<GoodsClass, string>> = {
  paper: "ブロマイド",
  itabag_badge: "缶バッジ",
  small_collection: "アクリルスタンド",
};

function normalizeKeyword(text: string): string {
  return text
    .replace(/[\u3000\t\n\r]+/g, " ")
    .replace(/[|｜/／,，、]+/g, " ")
    .replace(/[()（）「」『』【】]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSurugayaRelevantScenario(itemKind?: ItemKind, goodsClass?: GoodsClass): boolean {
  if (itemKind === "used" || itemKind === "blind_draw") return true;
  if (itemKind !== "goods") return false;
  return goodsClass === "paper" || goodsClass === "itabag_badge" || goodsClass === "small_collection";
}

export function buildSurugayaKeyword(input: {
  rawSearchWord?: string;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): string | null {
  if (!isSurugayaRelevantScenario(input.itemKind, input.goodsClass)) return null;

  const raw = normalizeKeyword(input.rawSearchWord ?? "");
  if (raw) {
    const classHint = input.goodsClass ? SURUGAYA_CLASS_HINT[input.goodsClass] : null;
    if (classHint && !raw.includes(classHint)) return `${raw} ${classHint}`.trim();
    return raw;
  }

  if (input.goodsClass) return SURUGAYA_CLASS_HINT[input.goodsClass] ?? "推し活 グッズ";
  if (input.itemKind === "used") return "推し活 中古";
  return "推し活 グッズ";
}

export function buildSurugayaSearchUrl(keyword: string): string {
  const params = new URLSearchParams({ search_word: keyword.trim() });
  return `https://www.suruga-ya.jp/search?${params.toString()}`;
}
