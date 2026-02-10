export type MarketLevel = "high" | "normal" | "calm";

export type MarketMemo = {
  runId: string;
  searchWord: string;
  level: MarketLevel;
  note?: string;
  updatedAt: number;
};

export const MEMO_KEY = "oshihapi_market_memos_v1";
export const ENGINE_KEY = "oshihapi_search_engine_v1";

type SearchEngine = "google" | "ddg";

export function loadMarketMemos(): Record<string, MarketMemo> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(MEMO_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, MarketMemo>;
    }
    return {};
  } catch {
    return {};
  }
}

export function getMarketMemo(runId: string): MarketMemo | undefined {
  return loadMarketMemos()[runId];
}

export function upsertMarketMemo(memo: MarketMemo): void {
  if (typeof window === "undefined") return;
  const memos = loadMarketMemos();
  memos[memo.runId] = memo;
  window.localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
}

export function getSearchEngine(): SearchEngine {
  if (typeof window === "undefined") return "google";
  const value = window.localStorage.getItem(ENGINE_KEY);
  if (value === "ddg") return "ddg";
  return "google";
}

export function setSearchEngine(value: SearchEngine): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENGINE_KEY, value);
}
