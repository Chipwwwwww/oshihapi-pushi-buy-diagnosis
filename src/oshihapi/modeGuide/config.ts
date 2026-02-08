import type { Mode } from "./types";

/**
 * Tweakable thresholds for A/B and iteration.
 * Keep here so you can adjust without touching UI code.
 */
export const MODE_GUIDE_CONFIG = {
  // short triggers
  urgentHoursVery: 1,
  urgentHours: 2,

  // long triggers
  highPriceYen: 15000,
  veryHighPriceYen: 30000,
  manyOptions: 3,
  travelHighYen: 10000,
  travelVeryHighYen: 25000,

  // scoring weights (MVP: small and interpretable)
  weights: {
    urgency: 1.2,
    impact: 1.1,
    complexity: 1.0,
    emotionRisk: 0.7,
  },

  // output confidence bounds
  confidence: {
    min: 55,
    max: 88,
  },
} as const;

export const MODE_LABEL_JA: Record<Mode, string> = {
  short: "短診断（30秒）",
  medium: "中診断（1〜2分）",
  long: "長診断（2分〜）",
};
