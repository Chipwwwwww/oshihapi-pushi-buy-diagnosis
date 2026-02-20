import type { ReadonlyURLSearchParams } from "next/navigation";
import type { InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";

type SearchParamsLike = URLSearchParams | ReadonlyURLSearchParams;

export type DeadlineValue = NonNullable<InputMeta["deadline"]>;

export const deadlineOptions = [
  { value: "today", label: "今日" },
  { value: "tomorrow", label: "明日" },
  { value: "in3days", label: "3日以内" },
  { value: "in1week", label: "1週間以内" },
  { value: "unknown", label: "未定" },
] as const;

export const itemKindOptions: { value: ItemKind; label: string }[] = [
  { value: "goods", label: "グッズ" },
  { value: "blind_draw", label: "くじ" },
  { value: "used", label: "中古" },
  { value: "preorder", label: "予約" },
  { value: "ticket", label: "チケット" },
  { value: "game_billing", label: "ゲーム課金" },
];

export const modeLabelMap: Record<Mode, string> = {
  short: "即決（30秒）",
  medium: "標準（60秒〜2分）",
  long: "深掘り（長診断）",
};

const DEADLINE_VALUES = deadlineOptions.map((option) => option.value);
const ITEM_KIND_VALUES = itemKindOptions.map((option) => option.value);

const isDeadlineValue = (value: string): value is DeadlineValue => DEADLINE_VALUES.includes(value as DeadlineValue);
const isItemKindValue = (value: string): value is ItemKind => ITEM_KIND_VALUES.includes(value as ItemKind);

export const parseDeadlineValue = (value: string): DeadlineValue => (isDeadlineValue(value) ? value : "unknown");
export const parseItemKindValue = (value: string): ItemKind => (isItemKindValue(value) ? value : "goods");

export function buildUrl(
  pathname: string,
  baseSearchParams: SearchParamsLike,
  updates?: Record<string, string | null | undefined>,
): string {
  const params = new URLSearchParams(baseSearchParams.toString());
  if (updates) {
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
        return;
      }
      params.set(key, value);
    });
  }
  return `${pathname}?${params.toString()}`;
}

export const buildConfirmUrl = (baseSearchParams: SearchParamsLike, updates?: Record<string, string | null | undefined>) =>
  buildUrl("/confirm", baseSearchParams, updates);

export const buildConfirmSettingsUrl = (
  baseSearchParams: SearchParamsLike,
  updates?: Record<string, string | null | undefined>,
) => buildUrl("/confirm/settings", baseSearchParams, updates);

export const buildFlowUrl = (baseSearchParams: SearchParamsLike, updates?: Record<string, string | null | undefined>) =>
  buildUrl("/flow", baseSearchParams, updates);

