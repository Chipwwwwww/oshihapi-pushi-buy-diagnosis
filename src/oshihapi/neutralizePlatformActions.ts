import type { ActionItem } from "@/src/oshihapi/model";

type LinkLike = {
  label?: unknown;
  title?: unknown;
  text?: unknown;
  url?: unknown;
  href?: unknown;
  kind?: unknown;
  type?: unknown;
};

type LegacyActionLike = ActionItem & {
  label?: unknown;
  title?: unknown;
  href?: unknown;
  url?: unknown;
  kind?: unknown;
  type?: unknown;
  linkOut?: LinkLike;
};

const platformKeywords = [
  "メルカリ",
  "ヤフオク",
  "楽天",
  "駿河屋",
  "mercari",
  "auctions.yahoo",
  "shopping.yahoo",
  "rakuten",
  "suruga-ya",
];

function collectActionText(action: LegacyActionLike): string {
  const link = action.linkOut;
  return [
    action.text,
    action.label,
    action.title,
    action.href,
    action.url,
    link?.label,
    link?.title,
    link?.text,
    link?.href,
    link?.url,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function isPlatformMarketAction(action: ActionItem): boolean {
  const haystack = collectActionText(action as LegacyActionLike);
  return platformKeywords.some((keyword) => haystack.includes(keyword));
}

export function neutralizeMarketAction(action: ActionItem): ActionItem {
  const legacyAction = action as LegacyActionLike;
  const currentLink = legacyAction.linkOut ?? {};

  return {
    ...legacyAction,
    label: "相場チェックへ",
    title: "相場チェックへ",
    text: legacyAction.text,
    href: "#market-check",
    url: "#market-check",
    kind: "link",
    type: "link",
    linkOut: {
      ...currentLink,
      label: "相場チェックへ",
      title: "相場チェックへ",
      text: "相場チェックへ",
      href: "#market-check",
      url: "#market-check",
      kind: "link",
      type: "link",
    },
  } as ActionItem;
}
