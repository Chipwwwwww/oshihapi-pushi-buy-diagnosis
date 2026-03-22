import { normalizeSearchClues } from "@/src/oshihapi/input/normalizeSearchClues";
import type { InputMeta } from "@/src/oshihapi/model";

const DRAMA_CD_KEYWORDS = ["ドラマcd", "ドラマ cd", "ミニドラマ", "特典ドラマ", "特典cd", "特典 cd", "店舗特典ドラマ", "店舗特典付きドラマcd"];
const STORE_BONUS_KEYWORDS = ["法人特典", "店舗特典", "先着特典", "特典は無くなり次第終了", "特典付き", "特典", "店舗別特典"];
const EDITION_KEYWORDS = ["初回限定盤", "初回限定", "限定盤", "通常盤"];
const CAST_KEYWORDS = ["キャスト", "出演", "cv"];
const CONTENT_KEYWORDS = ["収録内容", "収録", "トラック"];
const ADULT_SENSITIVE_KEYWORDS = ["r18", "18禁", "成人向け"];

export type VoiceMediaSignals = {
  eligible: boolean;
  hasDramaCdSignal: boolean;
  hasStoreBonusSignal: boolean;
  hasFirstComeBonusSignal: boolean;
  hasEditionSignal: boolean;
  hasCastSignal: boolean;
  hasContentSignal: boolean;
  isAdultSensitive: boolean;
};

function joinVoiceMediaSource(meta: Pick<InputMeta, "parsedSearchClues" | "searchClueRaw" | "itemName">) {
  return [
    meta.parsedSearchClues?.raw ?? "",
    meta.parsedSearchClues?.normalized ?? "",
    meta.searchClueRaw ?? "",
    meta.itemName ?? "",
  ]
    .map((part) => normalizeSearchClues(part).normalized)
    .join(" ")
    .trim();
}

function hasAnyKeyword(source: string, keywords: readonly string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

export function getVoiceMediaSignals(meta: Pick<InputMeta, "goodsClass" | "parsedSearchClues" | "searchClueRaw" | "itemName">): VoiceMediaSignals {
  const source = joinVoiceMediaSource(meta);
  const isAdultSensitive = hasAnyKeyword(source, ADULT_SENSITIVE_KEYWORDS);
  const hasDramaCdSignal = hasAnyKeyword(source, DRAMA_CD_KEYWORDS);
  const hasStoreBonusSignal = hasAnyKeyword(source, STORE_BONUS_KEYWORDS);
  const hasFirstComeBonusSignal = source.includes("先着特典") || source.includes("特典は無くなり次第終了");
  const hasEditionSignal = hasAnyKeyword(source, EDITION_KEYWORDS);
  const hasCastSignal = hasAnyKeyword(source, CAST_KEYWORDS);
  const hasContentSignal = hasAnyKeyword(source, CONTENT_KEYWORDS);

  return {
    eligible: meta.goodsClass === "media" && hasDramaCdSignal && !isAdultSensitive,
    hasDramaCdSignal,
    hasStoreBonusSignal,
    hasFirstComeBonusSignal,
    hasEditionSignal,
    hasCastSignal,
    hasContentSignal,
    isAdultSensitive,
  };
}

export function isEligibleVoiceMediaAddonRoute(meta: Pick<InputMeta, "goodsClass" | "parsedSearchClues" | "searchClueRaw" | "itemName">) {
  return getVoiceMediaSignals(meta).eligible;
}
