import type { DecisionRun, GoodsClass, ItemKind } from "@/src/oshihapi/model";

export type MercariKeywordInput = {
  rawSearchWord?: string;
  itemName?: string;
  series?: string;
  character?: string;
  type?: string;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  answers?: DecisionRun["answers"];
  meta?: DecisionRun["meta"];
};

export type MercariKeywordPlan = {
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  source: "raw" | "normalized" | "derived" | "none";
  entityToken?: string;
  objectToken?: string;
  classHintToken?: string;
};

type GoodsHint = {
  primary: string;
  secondary: string[];
};

const GOODS_CLASS_HINTS: Partial<Record<GoodsClass, GoodsHint>> = {
  paper: {
    primary: "紙もの",
    secondary: ["ブロマイド", "クリアカード", "色紙", "ポストカード"],
  },
  itabag_badge: {
    primary: "缶バッジ",
    secondary: ["缶バ", "アクキー", "ラバスト"],
  },
  small_collection: {
    primary: "グッズ",
    secondary: ["アクスタ", "アクキー", "キーホルダー"],
  },
  wearable: {
    primary: "アパレル",
    secondary: ["Tシャツ", "パーカー", "バッグ"],
  },
  display_large: {
    primary: "フィギュア",
    secondary: ["ぬいぐるみ", "タペストリー"],
  },
  tech: {
    primary: "周辺機器",
    secondary: ["イヤホン", "スマホケース", "充電器"],
  },
};

const DROP_TOKENS = new Set([
  "goods",
  "used",
  "blind_draw",
  "preorder",
  "ticket",
  "game_billing",
]);

const OBJECT_TOKEN_HINTS = new Set(
  Object.values(GOODS_CLASS_HINTS)
    .flatMap((hint) => [hint.primary, ...hint.secondary])
    .concat(["グッズ", "ぬいぐるみ", "フィギュア", "アクスタ", "アクキー", "キーホルダー", "紙もの", "缶バッジ"]),
);

function normalizeText(text: string): string {
  return text
    .replace(/[\u3000\t\n\r]+/g, " ")
    .replace(/[|｜/／,，、]+/g, " ")
    .replace(/[()（）「」『』【】\[\]{}]+/g, " ")
    .replace(/[!?！？]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !DROP_TOKENS.has(token.toLowerCase()));
}

function uniqueList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function pickString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractEntityToken(input: MercariKeywordInput): string {
  const answerItem = input.answers?.item;
  const answerItemName =
    typeof answerItem === "object" && answerItem && "name" in answerItem
      ? pickString(answerItem.name)
      : "";

  const candidates = uniqueList([
    input.itemName ?? "",
    input.meta?.itemName ?? "",
    input.series ?? "",
    pickString(input.answers?.series),
    input.character ?? "",
    pickString(input.answers?.character),
    answerItemName,
  ]);

  return candidates[0] ?? "";
}

function extractObjectToken(rawSearchWord: string, input: MercariKeywordInput): string {
  const rawTokens = tokenize(rawSearchWord);
  const directToken = rawTokens.find((token) => OBJECT_TOKEN_HINTS.has(token));
  if (directToken) return directToken;

  const typeTokens = tokenize(`${input.type ?? ""} ${pickString(input.answers?.type)}`);
  if (typeTokens.length > 0) return typeTokens[0];

  return "";
}

function buildKeyword(entityToken: string, objectOrHintToken: string): string | null {
  const joined = uniqueList([entityToken, objectOrHintToken]).join(" ").trim();
  return joined.length > 0 ? joined : null;
}

function isTooBroad(rawSearchWord: string, entityToken: string): boolean {
  const normalizedRaw = normalizeText(rawSearchWord);
  const normalizedEntity = normalizeText(entityToken);
  if (!normalizedRaw) return true;
  if (!normalizedEntity) return false;
  if (normalizedRaw === normalizedEntity) return true;
  const rawTokens = tokenize(normalizedRaw);
  const entityTokens = tokenize(normalizedEntity);
  return rawTokens.length > 0 && rawTokens.every((token) => entityTokens.includes(token));
}

export function buildMercariKeywordPlan(input: MercariKeywordInput): MercariKeywordPlan {
  const rawSearchWord = normalizeText(input.rawSearchWord ?? "");
  const entityToken = extractEntityToken(input);
  const objectToken = extractObjectToken(rawSearchWord, input);
  const classHint = input.goodsClass ? GOODS_CLASS_HINTS[input.goodsClass] : undefined;
  const classHintToken = classHint?.primary;

  const secondaryCandidates: string[] = [];

  if (rawSearchWord && !isTooBroad(rawSearchWord, entityToken)) {
    const fallbackObject = objectToken || classHintToken || "";
    if (entityToken && fallbackObject) {
      secondaryCandidates.push(buildKeyword(entityToken, fallbackObject) ?? "");
    }
    if (entityToken && classHint) {
      for (const token of classHint.secondary.slice(0, 3)) {
        secondaryCandidates.push(buildKeyword(entityToken, token) ?? "");
      }
    }
    return {
      primaryKeyword: rawSearchWord,
      secondaryKeywords: uniqueList(secondaryCandidates).filter((value) => value !== rawSearchWord).slice(0, 4),
      source: "raw",
      entityToken: entityToken || undefined,
      objectToken: objectToken || undefined,
      classHintToken,
    };
  }

  const explicitObjectOrHint = objectToken || classHintToken || "";
  const normalizedPrimary =
    buildKeyword(entityToken, explicitObjectOrHint) ??
    (entityToken ? normalizeText(entityToken) : null) ??
    (rawSearchWord || null);

  if (entityToken && classHint) {
    for (const token of [classHint.primary, ...classHint.secondary]) {
      secondaryCandidates.push(buildKeyword(entityToken, token) ?? "");
    }
  }

  if (entityToken && objectToken && classHintToken && objectToken !== classHintToken) {
    secondaryCandidates.push(buildKeyword(entityToken, classHintToken) ?? "");
  }

  const source: MercariKeywordPlan["source"] = rawSearchWord
    ? "normalized"
    : normalizedPrimary
      ? "derived"
      : "none";

  return {
    primaryKeyword: normalizedPrimary,
    secondaryKeywords: uniqueList(secondaryCandidates)
      .filter((value) => value !== normalizedPrimary)
      .slice(0, 4),
    source,
    entityToken: entityToken || undefined,
    objectToken: objectToken || undefined,
    classHintToken,
  };
}

export type MercariKeywordResult = {
  keyword: string | null;
  source: MercariKeywordPlan["source"];
};

export function buildMercariKeyword(input: MercariKeywordInput): MercariKeywordResult {
  const plan = buildMercariKeywordPlan(input);
  return {
    keyword: plan.primaryKeyword,
    source: plan.source,
  };
}

export function isMercariRelevantScenario(itemKind?: ItemKind, goodsClass?: GoodsClass): boolean {
  if (itemKind === "used" || itemKind === "blind_draw") return true;
  if (itemKind !== "goods") return false;
  return goodsClass === "paper" || goodsClass === "itabag_badge" || goodsClass === "small_collection";
}
