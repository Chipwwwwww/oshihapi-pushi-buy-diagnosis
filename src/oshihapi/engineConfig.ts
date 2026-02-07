import type { EngineConfig } from './model';

export const engineConfig: EngineConfig = {
  // Positive means pushes toward BUY; negative pushes toward SKIP/THINK
  decisionWeights: {
    desire: +0.35,
    affordability: +0.20,
    urgency: +0.10,
    rarity: +0.10,
    restockChance: -0.08,
    regretRisk: -0.15,
    impulse: -0.10,
    opportunityCost: -0.12,
  },
  thresholds: {
    buy: +0.20,
    skip: -0.20,
  },
  // Each important "unknown" increases THINK tendency
  unknownPenaltyPerTag: 6,
  blindDrawCap: { min: 1, max: 10 },
};

// Utility helpers
export function clamp(min: number, max: number, v: number) {
  return Math.max(min, Math.min(max, v));
}

// Map 0..100 => -1..+1
export function normalize01ToSigned(score0to100: number): number {
  return (score0to100 - 50) / 50;
}
