import type { ItemKind, Mode } from "@/src/oshihapi/model";

export function isGoodsClassApplicable(itemKind: ItemKind): boolean {
  return itemKind === "goods" || itemKind === "used" || itemKind === "preorder";
}

export function getModeTradeoff(mode: Mode): string {
  if (mode === "short") return "短: すぐ答えを出したい時向け（最短）";
  if (mode === "medium") return "中: 理由と不安をバランスよく整理";
  return "長: 比較・優先度・後悔ポイントまで深掘り";
}

export function getOptionalMetaHint(itemKind: ItemKind): string {
  if (itemKind === "ticket") return "チケット判断は現状 not now 扱いです。使う場合も、規約・日程・遠征負担は別で確認してください。";
  if (itemKind === "blind_draw") return "価格・アイテム名を入れると被り/上限管理の提案が具体化します。";
  if (itemKind === "used") return "価格・アイテム名を入れると相場差・中古リスク比較が正確になります。";
  if (itemKind === "preorder") return "期限・価格を入れると待機コストと再比較の判断が正確になります。";
  return "アイテム名・価格・期限を入れると診断理由が具体的になります（未入力でも診断可）。";
}
