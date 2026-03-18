import type { ParsedSearchClues, SearchClueClarification } from "@/src/oshihapi/input/types";

export type SearchClueClarificationPrompt = {
  title: string;
  options: SearchClueClarification[];
};

export function getSearchClueClarification(parsed: ParsedSearchClues): SearchClueClarificationPrompt | null {
  if (parsed.mode === "empty" || parsed.mode === "exact" || parsed.confidence === "high") return null;
  if (parsed.itemTypeCandidates.length === 0) {
    return {
      title: "どの種類を先に絞りますか？",
      options: [
        { kind: "itemType", value: "缶バッジ", label: "缶バッジ" },
        { kind: "itemType", value: "紙類", label: "紙類" },
        { kind: "itemType", value: "Blu-ray", label: "CD・Blu-ray" },
        { kind: "bonusFocus", value: "特典", label: "特典付き商品" },
      ],
    };
  }

  if (parsed.bonusClues.length === 0 && parsed.itemTypeCandidates.includes("Blu-ray")) {
    return {
      title: "重視したいポイントを1つだけ選ぶと精度が少し上がります",
      options: [
        { kind: "bonusFocus", value: "特典", label: "特典あり" },
        { kind: "bonusFocus", value: "限定", label: "限定版" },
        { kind: "itemType", value: "CD", label: "CD寄り" },
      ],
    };
  }

  return null;
}
