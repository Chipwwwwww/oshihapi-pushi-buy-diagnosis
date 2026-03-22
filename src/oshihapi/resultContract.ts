import type { Decision, ScoreDimension } from "./model";
import { clamp, normalize01ToSigned } from "./engineConfig";

export type SignedFactorContribution = {
  dimension: ScoreDimension;
  score: number;
  weight: number;
  signedContribution: number;
  direction: "buy" | "stop";
  label: string;
};

const FACTOR_LABELS: Record<ScoreDimension, { buy: string; stop: string }> = {
  desire: {
    buy: "欲しい気持ちが強い",
    stop: "欲しい気持ちはまだ決め手ではない",
  },
  affordability: {
    buy: "予算にまだ余裕がある",
    stop: "今月の負担が重い",
  },
  urgency: {
    buy: "今動く理由が強い",
    stop: "今すぐでなくてもよい",
  },
  rarity: {
    buy: "今回を逃すと拾いにくい",
    stop: "あとから拾える余地がある",
  },
  restockChance: {
    buy: "再販・再入荷の見込みが低い",
    stop: "再販・再入荷の余地がある",
  },
  regretRisk: {
    buy: "買った後の後悔リスクは低め",
    stop: "買った後の後悔リスクが高め",
  },
  impulse: {
    buy: "勢い買いの温度は落ち着いている",
    stop: "勢いで押し切りやすい状態",
  },
  opportunityCost: {
    buy: "他に回したい使い道は少ない",
    stop: "他に優先したい使い道がある",
  },
};

const DISPLAY_FACTOR_MIN_ABS = 0.03;

export function buildSignedFactorContributions(
  scores: Record<ScoreDimension, number>,
  weights: Record<ScoreDimension, number>,
): SignedFactorContribution[] {
  return (Object.entries(scores) as [ScoreDimension, number][])
    .map(([dimension, score]) => {
      const weight = weights[dimension] ?? 0;
      const signedContribution = normalize01ToSigned(score) * weight;
      const direction: SignedFactorContribution["direction"] = signedContribution >= 0 ? "buy" : "stop";
      return {
        dimension,
        score,
        weight,
        signedContribution,
        direction,
        label: FACTOR_LABELS[dimension][direction],
      };
    })
    .sort((a, b) => Math.abs(b.signedContribution) - Math.abs(a.signedContribution));
}

export function getSignedFactorLabels(
  contributions: SignedFactorContribution[],
  direction: "buy" | "stop",
  count = 3,
): string[] {
  return contributions
    .filter((entry) => entry.direction === direction && Math.abs(entry.signedContribution) >= DISPLAY_FACTOR_MIN_ABS)
    .sort((a, b) => Math.abs(b.signedContribution) - Math.abs(a.signedContribution))
    .slice(0, count)
    .map((entry) => entry.label);
}

export function getLeanDisplay(decision: Decision, score: number): {
  heading: string;
  valueText: string;
} {
  const clampedScore = clamp(-1, 1, Number.isFinite(score) ? score : 0);
  const percent = `${Math.round(clampedScore * 100)}%`;

  if (decision !== "THINK") {
    return {
      heading: "判定の傾き",
      valueText: percent,
    };
  }

  const absScore = Math.abs(clampedScore);
  if (absScore < 0.08) {
    return {
      heading: "保留内の傾き",
      valueText: "保留帯の中央",
    };
  }

  if (absScore < 0.3) {
    return {
      heading: "保留内の傾き",
      valueText: clampedScore > 0 ? "保留帯内（やや買い寄り）" : "保留帯内（やや見送り寄り）",
    };
  }

  return {
    heading: "保留時の補足",
    valueText: clampedScore > 0 ? "要確認保留（買い寄りの材料あり）" : "要確認保留（見送り寄りの材料あり）",
  };
}
