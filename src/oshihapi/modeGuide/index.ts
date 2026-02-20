import type { InputMeta, Mode } from "../model";

export type SituationChip = {
  id: string;
  label: string;
  mode: Mode;
};

export type ScenarioCard = {
  id: string;
  title: string;
  description: string;
  mode: Mode;
  preset?: {
    itemName?: string;
    priceYen?: number;
    deadline?: InputMeta["deadline"];
    itemKind?: InputMeta["itemKind"];
  };
};

export type ModeRecommendation = {
  mode: Mode;
  reasonChips: string[];
  confidence: number;
  followUp?: string;
};

export const SITUATION_CHIPS_JA: SituationChip[] = [
  { id: "deadline-close", label: "締切が今日/明日", mode: "short" },
  { id: "event-soon", label: "イベント直前", mode: "short" },
  { id: "compare-prices", label: "相場を比較したい", mode: "medium" },
  { id: "used-market", label: "中古/くじが気になる", mode: "medium" },
  { id: "big-purchase", label: "高額で慎重に", mode: "long" },
  { id: "travel-cost", label: "遠征費も含めたい", mode: "long" },
];

export const SCENARIO_CARDS_JA: ScenarioCard[] = [
  {
    id: "lottery-today",
    title: "店頭くじが今日まで",
    description: "とりあえず引く？見送る？を急いで決めたい。",
    mode: "short",
    preset: {
      itemName: "推しの店頭くじ",
      priceYen: 1200,
      deadline: "today",
      itemKind: "blind_draw",
    },
  },
  {
    id: "used-stand",
    title: "中古アクスタの相場チェック",
    description: "価格と状態を比べながら判断したい。",
    mode: "medium",
    preset: {
      itemName: "推しアクスタ",
      priceYen: 6000,
      deadline: "unknown",
      itemKind: "used",
    },
  },
  {
    id: "preorder-figure",
    title: "予約フィギュアを迷い中",
    description: "高額なので後悔しない判断をしたい。",
    mode: "long",
    preset: {
      itemName: "予約フィギュア",
      priceYen: 18000,
      deadline: "in1week",
      itemKind: "preorder",
    },
  },
  {
    id: "ticket-expedition",
    title: "ライブ遠征＋チケット",
    description: "遠征費込みで判断したい。",
    mode: "long",
    preset: {
      itemName: "推しライブチケット",
      priceYen: 22000,
      deadline: "in3days",
      itemKind: "ticket",
    },
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const scoreSort = (scores: Record<Mode, number>) => {
  return (Object.entries(scores) as [Mode, number][]).sort(
    ([modeA, scoreA], [modeB, scoreB]) => {
      if (scoreA !== scoreB) return scoreB - scoreA;
      if (modeA === "medium") return -1;
      if (modeB === "medium") return 1;
      if (modeA === "short") return -1;
      if (modeB === "short") return 1;
      return 0;
    },
  );
};

export function recommendMode(meta: InputMeta): ModeRecommendation {
  const scores: Record<Mode, number> = { short: 0, medium: 0, long: 0 };
  const reasons: string[] = [];

  if (meta.deadline === "today" || meta.deadline === "tomorrow") {
    scores.short += 3;
    reasons.push("締切がかなり近い");
  } else if (meta.deadline === "in3days") {
    scores.short += 2;
    reasons.push("締切が近い");
  } else if (meta.deadline === "in1week") {
    scores.medium += 1;
    reasons.push("比較する時間がある");
  } else {
    scores.medium += 1;
    reasons.push("締切が未定");
  }

  if (meta.priceYen !== undefined) {
    if (meta.priceYen >= 20000) {
      scores.long += 3;
      reasons.push("高額で慎重に決めたい");
    } else if (meta.priceYen >= 8000) {
      scores.medium += 2;
      reasons.push("価格が中〜高");
    } else if (meta.priceYen < 2000) {
      scores.short += 1;
      reasons.push("少額でサクッと判断");
    }
  } else {
    scores.medium += 1;
    reasons.push("予算が未入力");
  }

  if (meta.itemKind) {
    if (meta.itemKind === "ticket" || meta.itemKind === "used") {
      scores.medium += 2;
      reasons.push("相場や比較が大事");
    }
    if (meta.itemKind === "preorder") {
      scores.long += 1;
      reasons.push("予約は長めに検討");
    }
    if (meta.itemKind === "blind_draw") {
      scores.medium += 1;
      reasons.push("くじは期待値チェック");
    }
  }

  if (meta.itemName) {
    scores.medium += 1;
    reasons.push("比較キーワードがある");
  }

  const sorted = scoreSort(scores);
  const [topMode, topScore] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0;
  const confidence = clamp(55 + (topScore - secondScore) * 8 + reasons.length * 2, 55, 92);

  const followUp =
    (meta.deadline === "today" || meta.deadline === "tomorrow") &&
    meta.priceYen !== undefined &&
    meta.priceYen >= 12000
      ? "急ぎ×高額なら、一旦保留して後で「長診断」もおすすめ。"
      : undefined;

  return {
    mode: topMode,
    reasonChips: reasons.slice(0, 3),
    confidence,
    followUp,
  };
}

export const MODE_LABELS: Record<Mode, string> = {
  short: "即決",
  medium: "標準",
  long: "深掘り（長診断）",
};
