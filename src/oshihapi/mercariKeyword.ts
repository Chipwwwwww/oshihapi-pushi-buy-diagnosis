import type { DecisionRun, GoodsClass, ItemKind } from "@/src/oshihapi/model";

type MercariKeywordInput = {
  rawSearchWord?: string;
  itemName?: string;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  answers?: DecisionRun["answers"];
  meta?: DecisionRun["meta"];
};

type MercariKeywordSource = "raw" | "normalized" | "derived" | "none";

export type MercariKeywordResult = {
  keyword: string | null;
  label?: string;
  source: MercariKeywordSource;
};

const DROP_TOKENS = new Set(["goods", "used", "blind_draw", "preorder", "ticket", "game_billing"]);
const GENERIC_TOKENS = new Set(["グッズ", "goods", "中古", "used", "小物", "コレクション"]);
const PAPER_HINTS = ["紙もの", "ブロマイド", "クリアカード", "色紙"];
const SMALL_COLLECTION_HINTS = ["アクリルスタンド", "キーホルダー", "ラバーストラップ"];
const ITABAG_HINT = "缶バッジ";

function normalizeKeyword(text: string): string {
  return text
    .replace(/[\u3000\t\n\r]+/g, " ")
    .replace(/[|｜/／,，、]+/g, " ")
    .replace(/[()（）「」『』【】]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeTokens(text: string): string {
  const tokens = normalizeKeyword(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => !DROP_TOKENS.has(token.toLowerCase()));

  const deduped = Array.from(new Set(tokens));
  return deduped.join(" ").trim();
}

function pickAnswerValue(answers: DecisionRun["answers"] | undefined, key: string): string {
  const value = answers?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function hasConcreteObjectHint(input: MercariKeywordInput): boolean {
  const tokens = [
    pickAnswerValue(input.answers, "type"),
    pickAnswerValue(input.answers, "series"),
    pickAnswerValue(input.answers, "character"),
    input.meta?.itemName,
    input.itemName,
  ]
    .map((value) => sanitizeTokens(typeof value === "string" ? value : ""))
    .filter(Boolean);

  return tokens.some((token) => !GENERIC_TOKENS.has(token.toLowerCase()));
}

function toClassAwareFallback(input: MercariKeywordInput): string {
  if (input.goodsClass === "paper") {
    const base = sanitizeTokens(input.meta?.itemName ?? input.itemName ?? "");
    return base ? `${base} ${PAPER_HINTS[0]}` : PAPER_HINTS[1];
  }
  if (input.goodsClass === "itabag_badge") return ITABAG_HINT;
  if (input.goodsClass === "small_collection") {
    if (input.itemKind === "used") return SMALL_COLLECTION_HINTS[0];
    return SMALL_COLLECTION_HINTS[1];
  }
  if (input.itemKind === "used") return "推し活 中古";
  return "";
}

function deriveFromContext(input: MercariKeywordInput): string {
  const fromItem = input.answers?.item;
  const itemName =
    typeof fromItem === "object" && fromItem && "name" in fromItem && typeof fromItem.name === "string"
      ? fromItem.name
      : "";

  const base = [
    itemName,
    pickAnswerValue(input.answers, "series"),
    pickAnswerValue(input.answers, "character"),
    pickAnswerValue(input.answers, "type"),
    input.meta?.itemName,
  ]
    .map((value) => (typeof value === "string" ? value : ""))
    .join(" ");

  const cleaned = sanitizeTokens(base);
  if (cleaned && cleaned !== "グッズ") {
    if (input.goodsClass === "paper" && !cleaned.includes("紙") && !cleaned.includes("ブロマイド") && !cleaned.includes("カード")) {
      return `${cleaned} ${PAPER_HINTS[0]}`;
    }
    if (input.goodsClass === "itabag_badge" && !cleaned.includes("缶バッジ")) {
      return `${cleaned} ${ITABAG_HINT}`;
    }
    return cleaned;
  }

  if (cleaned === "グッズ" && hasConcreteObjectHint(input)) {
    return toClassAwareFallback(input);
  }

  return toClassAwareFallback(input);
}

export function buildMercariKeyword(input: MercariKeywordInput): MercariKeywordResult {
  const raw = sanitizeTokens(input.rawSearchWord ?? "");
  if (raw) {
    return {
      keyword: raw,
      source: "raw",
      label: "入力された検索ワード",
    };
  }

  const normalizedItemName = sanitizeTokens(input.itemName ?? "");
  if (normalizedItemName) {
    return {
      keyword: normalizedItemName,
      source: "normalized",
      label: "商品名",
    };
  }

  const derived = deriveFromContext(input);
  if (derived) {
    return {
      keyword: derived,
      source: "derived",
      label: "診断コンテキスト",
    };
  }

  return {
    keyword: null,
    source: "none",
  };
}

export function isMercariRelevantScenario(itemKind?: ItemKind, goodsClass?: GoodsClass): boolean {
  if (itemKind === "used" || itemKind === "blind_draw") return true;
  if (itemKind !== "goods") return false;
  return goodsClass === "paper" || goodsClass === "itabag_badge" || goodsClass === "small_collection";
}
