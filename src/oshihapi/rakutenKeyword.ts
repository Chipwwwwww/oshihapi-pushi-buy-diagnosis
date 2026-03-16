import type { GoodsClass, ItemKind, UseCase } from "@/src/oshihapi/model";

type RakutenKeywordInput = {
  rawSearchWord?: string;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  useCase?: UseCase;
};

const RAKUTEN_KEYWORD_BY_CLASS: Partial<Record<GoodsClass, string>> = {
  paper: "ブロマイド 収納 スリーブ",
  itabag_badge: "缶バッジ アクリル 収納",
  small_collection: "アクスタ 収納 ケース",
  wearable: "推し活 ポーチ ケース",
  tech: "ケーブル 収納 ポーチ",
  media: "CD 収納 ケース",
};

function normalizeKeyword(text: string): string {
  return text
    .replace(/[\u3000\t\n\r]+/g, " ")
    .replace(/[|｜/／,，、]+/g, " ")
    .replace(/[()（）「」『』【】]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildRakutenKeyword(input: RakutenKeywordInput): string | null {
  if (input.useCase === "game_billing") return null;
  if (input.itemKind === "ticket" || input.itemKind === "game_billing") return null;

  const raw = normalizeKeyword(input.rawSearchWord ?? "");
  if (raw) {
    const classHint = input.goodsClass ? RAKUTEN_KEYWORD_BY_CLASS[input.goodsClass] : null;
    if (classHint && !raw.includes("収納") && !raw.includes("ケース") && !raw.includes("スリーブ")) {
      return `${raw} ${classHint}`.trim();
    }
    return raw;
  }

  if (input.goodsClass) {
    return RAKUTEN_KEYWORD_BY_CLASS[input.goodsClass] ?? null;
  }

  if (input.itemKind === "used" || input.itemKind === "blind_draw") {
    return "推し活 収納 ケース";
  }

  return "推し活 収納";
}
