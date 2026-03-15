import type { EngineConfig } from './model';

export const engineConfig: EngineConfig = {
  // Positive means pushes toward BUY; negative pushes toward SKIP/THINK
  decisionWeights: {
    desire: +0.45,
    affordability: +0.18,
    urgency: +0.20,
    rarity: +0.12,
    restockChance: -0.08,
    regretRisk: -0.12,
    impulse: -0.06,
    opportunityCost: -0.10,
  },
  decisionWeightProfiles: {
    used: {
      regretRisk: -0.20,
    },
    blind_draw: {
      rarity: +0.20,
    },
  },
  thresholds: {
    buy: +0.2,
    skip: -0.2,
  },
  // Each important "unknown" increases THINK tendency
  unknownPenaltyPerTag: 10,
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
