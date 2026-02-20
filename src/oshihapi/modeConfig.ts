import type { Mode } from "./model";

export type ModeMeta = {
  key: Mode;
  title: string;
  estimatedTime: string;
  homeDescription: string;
  flowTitle: string;
};

export const MODE_META: Record<Mode, ModeMeta> = {
  short: {
    key: "short",
    title: "即決",
    estimatedTime: "30秒",
    homeDescription: "いま買う？やめる？迷いを最短で整理",
    flowTitle: "即決診断",
  },
  medium: {
    key: "medium",
    title: "標準",
    estimatedTime: "60秒〜2分",
    homeDescription: "理由と不安をバランスよく整理",
    flowTitle: "標準診断",
  },
  long: {
    key: "long",
    title: "深掘り（長診断）",
    estimatedTime: "長診断",
    homeDescription: "比較・優先度・後悔ポイントまでじっくり",
    flowTitle: "深掘り診断（長診断）",
  },
};

const LEGACY_MODE_MAP: Record<string, Mode> = {
  ai: "long",
  deep_ai: "long",
  deep: "long",
  long_ai: "long",
};

export const normalizeMode = (value: string | null | undefined): Mode => {
  if (value === "short" || value === "medium" || value === "long") {
    return value;
  }

  if (!value) return "medium";
  return LEGACY_MODE_MAP[value] ?? "medium";
};
