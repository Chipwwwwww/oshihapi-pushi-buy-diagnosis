export type AliasStrength = "strong" | "weak";

export type AliasEntry = {
  canonical: string;
  aliases: string[];
  strength?: AliasStrength;
};

export const WORK_ALIASES: AliasEntry[] = [
  { canonical: "うたの☆プリンスさまっ♪", aliases: ["うたプリ", "うたの☆プリンスさまっ", "utapri"] },
  { canonical: "学園アイドルマスター", aliases: ["学マス", "学園アイドルマスター", "gakumas"] },
  { canonical: "アイドルマスター", aliases: ["アイマス", "アイドルマスター", "idolmaster"] },
];

export const CHARACTER_ALIASES: AliasEntry[] = [
  { canonical: "倉本千奈", aliases: ["倉本千奈", "倉本ちな"] },
  { canonical: "倉本千奈", aliases: ["ちな"], strength: "weak" },
];

export const ITEM_TYPE_ALIASES: AliasEntry[] = [
  { canonical: "缶バッジ", aliases: ["缶バッジ", "缶バ"] },
  { canonical: "紙類", aliases: ["紙類", "紙もの", "ブロマイド", "ポストカード", "カード"] },
  { canonical: "CD", aliases: ["cd", "アルバム", "シングル"] },
  { canonical: "Blu-ray", aliases: ["blu-ray", "bd", "bluray", "blu ray", "dvd", "円盤", "藍光"] },
  { canonical: "アクリルスタンド", aliases: ["アクスタ", "アクリルスタンド"] },
];

export const EDITION_KEYWORDS: AliasEntry[] = [
  { canonical: "初回限定", aliases: ["初回限定", "初回", "限定版", "limited"] },
  { canonical: "予約", aliases: ["予約", "preorder", "予約品"] },
];

export const BONUS_KEYWORDS: AliasEntry[] = [
  { canonical: "特典", aliases: ["特典", "特典付き", "bonus", "店舗特典", "予約特典"] },
  { canonical: "限定", aliases: ["限定", "limited"] },
];
