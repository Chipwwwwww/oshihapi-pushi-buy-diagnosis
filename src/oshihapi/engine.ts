import type {
  AnswerValue,
  ActionItem,
  Decision,
  DecisionOutput,
  Decisiveness,
  EngineConfig,
  InputMeta,
  ItemKind,
  Mode,
  QuestionSet,
  ReasonItem,
  ScoreDimension,
  UseCase,
} from './model';
import { engineConfig as defaultConfig, normalize01ToSigned, clamp } from './engineConfig';
import { pickReasons, pickActions, buildShareText, getStorageGuidance } from './reasonRules';
import { decideMerchMethod } from './merchMethod';
import { buildPresentation } from './decisionPresentation';
import { shouldAskStorage } from './storageGate';

type EvaluateInput = {
  config?: EngineConfig;
  questionSet: QuestionSet;
  meta: InputMeta;
  answers: Record<string, AnswerValue>;
  mode?: Mode;
  decisiveness?: Decisiveness;
  useCase?: UseCase;
};

const decisivenessMultiplierMap: Record<Decisiveness, number> = {
  careful: 1.25,
  standard: 1,
  quick: 0.75,
};

const modeMultiplierMap: Record<Mode, number> = {
  short: 0.85,
  medium: 1,
  long: 1.1,
};

function initScores(): Record<ScoreDimension, number> {
  return {
    desire: 50,
    affordability: 50,
    urgency: 50,
    rarity: 50,
    restockChance: 50,
    regretRisk: 50,
    impulse: 50,
    opportunityCost: 50,
  };
}

function mergeScore(base: number, add?: number): number {
  if (add == null || Number.isNaN(add)) return base;
  return clamp(0, 100, Math.round((base + add) / 2));
}

function applyMotives(scores: Record<ScoreDimension, number>, motives: string[], tags: string[]) {
  const motiveAdjustments: Partial<Record<string, Partial<Record<ScoreDimension, number>>>> = {
    support: { impulse: 35, regretRisk: 45 },
    use: { desire: 70, regretRisk: 40 },
    trend: { restockChance: 35, impulse: 70 },
    vague: { restockChance: 40, impulse: 75, regretRisk: 65 },
    rush: { impulse: 80, regretRisk: 70 },
    fomo: { urgency: 75, impulse: 70, regretRisk: 60 },
  };

  for (const motive of motives) {
    if (motive === 'trend' || motive === 'vague') tags.push('trend_flag');
    const delta = motiveAdjustments[motive];
    if (!delta) continue;
    for (const [dim, value] of Object.entries(delta)) {
      const key = dim as ScoreDimension;
      scores[key] = mergeScore(scores[key], value);
    }
  }
}

function selectWeights(config: EngineConfig, itemKind?: ItemKind) {
  const base = { ...config.decisionWeights };
  if (!itemKind || !config.decisionWeightProfiles?.[itemKind]) return base;
  return { ...base, ...config.decisionWeightProfiles[itemKind] };
}


const holdBandByItemKind: Partial<Record<ItemKind, number>> = {
  goods: 1,
  blind_draw: 0.9,
  used: 0.95,
  preorder: 1,
  ticket: 0.9,
  game_billing: 0.85,
};

function getTopFactors(scores: Record<ScoreDimension, number>, kind: "positive" | "negative", count = 3): string[] {
  const labels: Record<ScoreDimension, string> = {
    desire: "欲しい気持ち",
    affordability: "予算の余裕",
    urgency: "今必要か",
    rarity: "希少性",
    restockChance: "再販の見込み",
    regretRisk: "後悔リスク",
    impulse: "衝動性",
    opportunityCost: "機会コスト",
  };
  const entries = Object.entries(scores) as [ScoreDimension, number][];
  const sorted = entries
    .map(([dim, score]) => ({ dim, score, signed: normalize01ToSigned(score) }))
    .filter((entry) => (kind === "positive" ? entry.signed > 0 : entry.signed < 0))
    .sort((a, b) => Math.abs(b.signed) - Math.abs(a.signed))
    .slice(0, count);
  return sorted.map((entry) => `${labels[entry.dim]} (${Math.round(entry.score)})`);
}

function stdDev(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function evaluate(input: EvaluateInput): DecisionOutput {
  const config = input.config ?? defaultConfig;
  const scores = initScores();
  const tags: string[] = [];

  const motivesAnswer = input.answers.q_motives_multi;
  const motives = Array.isArray(motivesAnswer)
    ? motivesAnswer.filter((entry): entry is string => typeof entry === 'string')
    : [];

  for (const q of input.questionSet.questions) {
    const ans = input.answers[q.id];
    if (ans == null) continue;

    if (q.type === 'scale' || q.type === 'number') {
      if (Array.isArray(ans)) continue;
      const v = Number(ans);
      if (Number.isFinite(v) && q.mapTo) {
        const pct = clamp(0, 100, Math.round((v / (q.max ?? 5)) * 100));
        scores[q.mapTo] = mergeScore(scores[q.mapTo], pct);
      }
      continue;
    }

    if (q.type === 'single' && q.options) {
      const opt = q.options.find(o => o.id === ans);
      if (!opt) {
        if (q.id === 'q_goal') tags.push('goal_unknown');
        continue;
      }
      if (opt.tags) tags.push(...opt.tags);
      if (opt.delta) {
        for (const [dim, val] of Object.entries(opt.delta)) {
          const d = dim as ScoreDimension;
          scores[d] = mergeScore(scores[d], val as number);
        }
      }
    }
  }

  applyMotives(scores, motives, tags);

  const impulseFlag = scores.impulse >= 70;
  const futureUseFlag = motives.includes('support') || motives.includes('use');

  const unknownCount = tags.filter(t => t.startsWith('unknown_')).length;
  const unknownPenalty = unknownCount * config.unknownPenaltyPerTag;

  const weights = selectWeights(config, input.meta.itemKind);
  let scoreSigned = 0;
  for (const [dim, w] of Object.entries(weights)) {
    const d = dim as ScoreDimension;
    scoreSigned += normalize01ToSigned(scores[d]) * (w as number);
  }

  scoreSigned = scoreSigned * (1 - Math.min(0.5, unknownPenalty / 100));
  if (unknownCount >= 3) {
    scoreSigned *= 0.9;
  }

  if (impulseFlag) {
    let impulseNudge = Math.max(0, ((scores.impulse - 50) / 100) * 0.2);
    if (futureUseFlag) impulseNudge *= 0.5;
    if (scoreSigned < config.thresholds.buy + 0.2) scoreSigned -= impulseNudge;
  }

  const decisiveness = input.decisiveness ?? 'standard';
  const mode = input.mode ?? 'medium';
  const holdBandBase = Math.max(Math.abs(config.thresholds.buy), Math.abs(config.thresholds.skip));
  const unknownBandBoost = unknownCount >= 2 ? 1.1 : 1;
  const itemKindBand = holdBandByItemKind[input.meta.itemKind ?? "goods"] ?? 1;
  const holdBand =
    holdBandBase *
    (decisivenessMultiplierMap[decisiveness] ?? decisivenessMultiplierMap.standard) *
    (modeMultiplierMap[mode] ?? modeMultiplierMap.medium) *
    unknownBandBoost *
    itemKindBand;

  let decision: Decision = 'THINK';
  if (scoreSigned >= holdBand) decision = 'BUY';
  else if (scoreSigned <= -holdBand) decision = 'SKIP';
  if (unknownCount >= 4) decision = 'THINK';

  const goal =
    tags.includes('goal_set') ? 'set' :
    tags.includes('goal_fun') ? 'fun' :
    tags.includes('goal_unknown') ? 'unknown' : 'single';
  const popularity =
    tags.includes('hot') ? 'hot' :
    tags.includes('cold') ? 'cold' :
    tags.includes('normal_popularity') ? 'normal' : 'unknown';

  const method = decideMerchMethod({ tags, scores, goal, popularity });
  const blindDrawCap = method.method === 'BLIND_DRAW' ? method.cap : undefined;

  const reasonsBase = pickReasons({ meta: input.meta, tags, scores, decision, blindDrawCap });
  const actionsBase = pickActions({ meta: input.meta, tags, scores, decision, blindDrawCap });
  const extraReasons: ReasonItem[] = [];
  const extraActions: ActionItem[] = [];

  if (impulseFlag) {
    extraReasons.push({ id: 'impulse_rush', severity: 'info', text: '「買えた快感」が主役の時、満足がすぐ落ち着くこともあるかも。' });
    extraActions.push({ id: 'cooldown_10min', text: '10分だけクールダウン（カート保持）→ その後もう一回だけ判断しよ。' });
  }

  let reasons = [...extraReasons, ...reasonsBase].slice(0, 6);
  let actions = [...extraActions, ...actionsBase].slice(0, 3);

  const scoreSpread = stdDev(Object.values(scores));
  let confidence = Math.round(50 + Math.abs(scoreSigned) * 60 - unknownPenalty - (impulseFlag ? 5 : 0));
  if (scoreSpread >= 15) confidence -= 5;
  confidence = clamp(30, 95, confidence);

  if (shouldAskStorage(input.meta.itemKind, input.meta.goodsSubtype)) {
    const storageFit = input.answers.q_storage_fit;
    if (storageFit === 'NONE' || storageFit === 'UNKNOWN') {
      if (decision === 'BUY') decision = 'THINK';
      scores.opportunityCost = clamp(0, 100, scores.opportunityCost + 20);
      confidence = clamp(30, 95, confidence - 10);
      const storageGuidance = getStorageGuidance(input.meta.goodsSubtype);
      reasons = [...reasons, { id: 'storage_unconfirmed', severity: 'warn' as const, text: storageGuidance.reason }].slice(0, 6);
      actions = [...actions, { id: 'storage_plan_first', text: storageGuidance.action }].slice(0, 3);
    }
  }

  const decisionJa = decision === 'BUY' ? '買う' : decision === 'SKIP' ? 'やめる' : '保留';
  const positiveFactors = getTopFactors(scores, "positive");
  const negativeFactors = getTopFactors(scores, "negative");
  const shareText = buildShareText(decisionJa, reasons);
  const presentation = buildPresentation({ decision, actions, reasons });

  return {
    decision,
    confidence,
    score: scoreSigned,
    scoreSummary: scores,
    reasons,
    actions,
    merchMethod: {
      method: method.method,
      blindDrawCap,
      note: input.useCase === 'game_billing' ? 'ゲーム課金（共通ロジック）' : method.note,
    },
    shareText,
    positiveFactors,
    negativeFactors,
    presentation,
  };
}
