import { MODE_GUIDE_CONFIG } from "./config";
import type { Mode, ModeRecommendInput, ModeRecommendOutput } from "./types";

/**
 * Recommend mode based on a few simple signals.
 * Design goals:
 * - explainable (return short chips)
 * - safe defaults (falls back to medium)
 * - can be tuned via config
 */
export function recommendMode(input: ModeRecommendInput): ModeRecommendOutput {
  const {
    kind,
    priceYen,
    deadlineAt,
    deadlineHours,
    isInStore,
    optionsCount,
    travelCostYen,
    isLimited,
    hasResaleOption,
    reReleaseLikelihood,
    excitement0to5,
    pastRegret0to5,
  } = input;

  const hoursLeft = normalizeHoursLeft(deadlineHours, deadlineAt);
  const opts = Math.max(1, optionsCount ?? 1);
  const price = priceYen ?? 0;
  const travel = travelCostYen ?? 0;

  // ---- scores (0..10-ish) ----
  let urgency = 0;
  if (isInStore) urgency += 4;
  if (hoursLeft !== null) {
    if (hoursLeft <= MODE_GUIDE_CONFIG.urgentHoursVery) urgency += 6;
    else if (hoursLeft <= MODE_GUIDE_CONFIG.urgentHours) urgency += 4;
    else if (hoursLeft <= 12) urgency += 2;
  }

  let impact = 0;
  if (price >= MODE_GUIDE_CONFIG.veryHighPriceYen) impact += 7;
  else if (price >= MODE_GUIDE_CONFIG.highPriceYen) impact += 5;
  else if (price >= 5000) impact += 2;

  if (travel >= MODE_GUIDE_CONFIG.travelVeryHighYen) impact += 5;
  else if (travel >= MODE_GUIDE_CONFIG.travelHighYen) impact += 3;

  let complexity = 0;
  if (opts >= MODE_GUIDE_CONFIG.manyOptions) complexity += 4;
  if (kind === "ticket" && (travel > 0 || opts >= 2)) complexity += 2;
  if (isLimited && !hasResaleOption) complexity += 1; // limited adds pressure/uncertainty

  let emotionRisk = 0;
  const ex = clamp01to5(excitement0to5);
  const rg = clamp01to5(pastRegret0to5);
  // High excitement + high past regret => "danger zone"
  if (ex !== null && rg !== null) {
    emotionRisk += (ex - 2) * 0.8 + (rg - 2) * 0.8; // range roughly -3..+5
  } else if (ex !== null && ex >= 4) {
    emotionRisk += 1.5;
  } else if (rg !== null && rg >= 4) {
    emotionRisk += 1.5;
  }

  const weighted =
    urgency * MODE_GUIDE_CONFIG.weights.urgency +
    impact * MODE_GUIDE_CONFIG.weights.impact +
    complexity * MODE_GUIDE_CONFIG.weights.complexity +
    emotionRisk * MODE_GUIDE_CONFIG.weights.emotionRisk;

  // ---- decision ----
  // Conflicts: urgent + high impact => medium now, suggest long follow-up.
  const isUrgent = urgency >= 6 || (hoursLeft !== null && hoursLeft <= MODE_GUIDE_CONFIG.urgentHours);
  const isHighImpact = impact >= 7 || (price >= MODE_GUIDE_CONFIG.veryHighPriceYen) || (travel >= MODE_GUIDE_CONFIG.travelVeryHighYen);

  const reasons: string[] = [];
  let mode: Mode = "medium";
  let followUp: ModeRecommendOutput["followUp"] = undefined;

  if (isUrgent && !isHighImpact) {
    mode = "short";
    pushIf(isInStore, reasons, "店頭/会場で目の前");
    pushIf(hoursLeft !== null && hoursLeft <= MODE_GUIDE_CONFIG.urgentHours, reasons, "締切が近い");
    pushIf(isLimited, reasons, "焦りが入りやすい");
    reasons.push("まず仮判定");
  } else if (!isUrgent && (isHighImpact || complexity >= 6)) {
    mode = "long";
    pushIf(price >= MODE_GUIDE_CONFIG.highPriceYen, reasons, "高額");
    pushIf(travel >= MODE_GUIDE_CONFIG.travelHighYen, reasons, "遠征コスト");
    pushIf(opts >= MODE_GUIDE_CONFIG.manyOptions, reasons, "候補が多い");
    pushIf(emotionRisk >= 2.5, reasons, "後悔しやすい状態");
    if (reasons.length < 2) reasons.push("整理して納得したい");
  } else if (isUrgent && isHighImpact) {
    mode = "medium";
    reasons.push("急ぎだけど影響が大きい");
    reasons.push("重要ポイントだけ押さえる");
    reasons.push("仮判定→後で再診断");
    followUp = {
      suggestedMode: "long",
      triggerLabel: "保留になったら後で長診断（整理）がおすすめ",
    };
  } else {
    mode = "medium";
    pushIf(hoursLeft !== null && hoursLeft <= 72, reasons, "締切が近め");
    pushIf(price >= 5000, reasons, "出費がそこそこ");
    pushIf(isLimited, reasons, "限定で焦りやすい");
    pushIf(hasResaleOption, reasons, "リセール/中古で逃げ道あり");
    if (reReleaseLikelihood && reReleaseLikelihood !== "unknown") {
      reasons.push(reReleaseLikelihood === "high" ? "再販期待あり" : reReleaseLikelihood === "mid" ? "再販は半々" : "再販は低そう");
    }
    if (reasons.length < 3) reasons.push("保留条件を作れる");
  }

  // cap reason chips length
  const reasonChips = dedupe(reasons).slice(0, 4);

  // confidence: more signals & stronger scores => higher
  const signalCount =
    countNonNull(hoursLeft) +
    countNonZero(priceYen) +
    countNonNull(isInStore) +
    countNonZero(optionsCount) +
    countNonZero(travelCostYen) +
    countNonNull(isLimited) +
    countNonNull(hasResaleOption) +
    countNonNull(reReleaseLikelihood) +
    countNonNull(excitement0to5) +
    countNonNull(pastRegret0to5);

  const rawConfidence = 55 + Math.min(25, signalCount * 3) + Math.min(10, Math.max(0, weighted / 5));
  const confidencePct = clamp(
    Math.round(rawConfidence),
    MODE_GUIDE_CONFIG.confidence.min,
    MODE_GUIDE_CONFIG.confidence.max
  );

  const detail = buildDetailJa({ mode, hoursLeft, price, travel, opts, kind });

  return {
    mode,
    confidencePct,
    reasonChips,
    detail,
    followUp,
  };
}

function normalizeHoursLeft(deadlineHours?: number, deadlineAt?: string): number | null {
  if (typeof deadlineHours === "number" && Number.isFinite(deadlineHours)) {
    return Math.max(0, deadlineHours);
  }
  if (deadlineAt) {
    const t = Date.parse(deadlineAt);
    if (!Number.isFinite(t)) return null;
    const diffMs = t - Date.now();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }
  return null;
}

function buildDetailJa(args: {
  mode: Mode;
  hoursLeft: number | null;
  price: number;
  travel: number;
  opts: number;
  kind?: "goods" | "ticket";
}): string | undefined {
  const parts: string[] = [];
  if (args.hoursLeft !== null) parts.push(`締切まで約${Math.ceil(args.hoursLeft)}時間`);
  if (args.price > 0) parts.push(`価格目安：¥${formatYen(args.price)}`);
  if (args.travel > 0) parts.push(`遠征等：¥${formatYen(args.travel)}`);
  if (args.opts >= 2) parts.push(`候補：${args.opts}件`);
  if (parts.length === 0) return undefined;

  const modeLabel =
    args.mode === "short" ? "短で仮判定" : args.mode === "medium" ? "中で整理" : "長で深掘り";
  return `${modeLabel}（${parts.join(" / ")}）`;
}

function formatYen(n: number): string {
  return n.toLocaleString("ja-JP");
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function clamp01to5(n?: number): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return clamp(Math.round(n), 0, 5);
}

function pushIf(cond: any, arr: string[], v: string) {
  if (cond) arr.push(v);
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

function countNonNull(v: any): number {
  return v === undefined || v === null ? 0 : 1;
}

function countNonZero(v: any): number {
  return typeof v === "number" && Number.isFinite(v) && v !== 0 ? 1 : 0;
}
