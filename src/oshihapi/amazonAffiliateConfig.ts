import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

export type AmazonAffiliateDestination = {
  id: string;
  label: string;
  href: string;
  note?: string;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
};

const AMAZON_DESTINATIONS: AmazonAffiliateDestination[] = [
  {
    id: "goods-paper",
    label: "Amazonで紙もの収納を比較する",
    href: "https://www.amazon.co.jp/s?k=%E3%83%96%E3%83%AD%E3%83%9E%E3%82%A4%E3%83%89+%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB&tag=oshihapi-22",
    itemKind: "goods",
    goodsClass: "paper",
  },
  {
    id: "goods-itabag-badge",
    label: "Amazonで缶バッジ収納を比較する",
    href: "https://www.amazon.co.jp/s?k=%E7%BC%B6%E3%83%90%E3%83%83%E3%82%B8+%E5%8F%8E%E7%B4%8D&tag=oshihapi-22",
    itemKind: "goods",
    goodsClass: "itabag_badge",
  },
  {
    id: "goods-small-collection",
    label: "Amazonで関連グッズを比較する",
    href: "https://www.amazon.co.jp/s?k=%E3%82%A2%E3%82%AF%E3%82%B9%E3%82%BF+%E5%8F%8E%E7%B4%8D&tag=oshihapi-22",
    itemKind: "goods",
    goodsClass: "small_collection",
  },
  {
    id: "fallback",
    label: "Amazonで新品・関連商品を比較する",
    href: "https://www.amazon.co.jp/?tag=oshihapi-22",
    note: "※一部リンクにはアフィリエイトを含みます",
  },
];

export function resolveAmazonAffiliateDestination(input: {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
}): AmazonAffiliateDestination | null {
  if (input.itemKind === "ticket") return null;
  const matched = AMAZON_DESTINATIONS.find((entry) => {
    if (entry.itemKind && entry.itemKind !== input.itemKind) return false;
    if (entry.goodsClass && entry.goodsClass !== input.goodsClass) return false;
    return true;
  });
  return matched ?? AMAZON_DESTINATIONS[AMAZON_DESTINATIONS.length - 1];
}


export function findAmazonAffiliateDestinationById(id: string): AmazonAffiliateDestination | null {
  return AMAZON_DESTINATIONS.find((entry) => entry.id === id) ?? null;
}
