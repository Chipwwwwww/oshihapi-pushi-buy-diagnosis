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

const PAPER_HINTS = ["ブロマイド", "クリアカード", "紙類"];
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
  if (cleaned) return cleaned;

  if (input.goodsClass === "paper") return PAPER_HINTS[0];
  if (input.goodsClass === "itabag_badge") return ITABAG_HINT;
  if (input.goodsClass === "small_collection") return "グッズ";
  return "";
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
