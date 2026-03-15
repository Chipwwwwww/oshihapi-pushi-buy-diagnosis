import type { EngineConfig } from './model';

export const engineConfig: EngineConfig = {
  // Positive means pushes toward BUY; negative pushes toward SKIP/THINK
  decisionWeights: {
    desire: +0.54,
    affordability: +0.22,
    urgency: +0.20,
    rarity: +0.18,
    restockChance: -0.10,
    regretRisk: -0.26,
    impulse: -0.14,
    opportunityCost: -0.18,
  },
  decisionWeightProfiles: {
    used: {
      regretRisk: -0.34,
      opportunityCost: -0.22,
      rarity: +0.08,
    },
    blind_draw: {
      impulse: -0.22,
      regretRisk: -0.30,
      rarity: +0.10,
    },
    preorder: {
      urgency: +0.16,
      regretRisk: -0.28,
      restockChance: -0.12,
    },
    ticket: {
      urgency: +0.30,
      regretRisk: -0.24,
      opportunityCost: -0.22,
    },
    game_billing: {
      desire: +0.48,
      affordability: +0.20,
      impulse: -0.24,
      regretRisk: -0.32,
      opportunityCost: -0.24,
    },
  },
  thresholds: {
    buy: +0.18,
    skip: -0.18,
  },
  // Each important "unknown" increases THINK tendency
  unknownPenaltyPerTag: 8,
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
