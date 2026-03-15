import type {
  AnswerValue,
  ActionItem,
  Decision,
  DecisionOutput,
  Decisiveness,
  EngineConfig,
  HoldSubtype,
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

type FactorBuckets = {
  desireAttachment: number;
  urgencyOpportunity: number;
  budgetPressure: number;
  readinessLogistics: number;
  uncertaintyUnknowns: number;
  impulseVolatility: number;
  itemKindRisk: number;
};

const decisivenessMultiplierMap: Record<Decisiveness, number> = {
  careful: 1.1,
  standard: 1,
  quick: 0.9,
};

const modeMultiplierMap: Record<Mode, number> = {
  short: 0.95,
  medium: 1,
  long: 1.05,
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
    support: { impulse: 35, regretRisk: 45, desire: 70 },
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

function stdDev(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getTopFactors(scores: Record<ScoreDimension, number>, kind: 'positive' | 'negative', count = 3): string[] {
  const labels: Record<ScoreDimension, string> = {
    desire: '欲しい気持ち',
    affordability: '予算の余裕',
    urgency: '今必要か',
    rarity: '希少性',
    restockChance: '再販の見込み',
    regretRisk: '後悔リスク',
    impulse: '衝動性',
    opportunityCost: '機会コスト',
  };
  const entries = Object.entries(scores) as [ScoreDimension, number][];
  const sorted = entries
    .map(([dim, score]) => ({ dim, score, signed: normalize01ToSigned(score) }))
    .filter((entry) => (kind === 'positive' ? entry.signed > 0 : entry.signed < 0))
    .sort((a, b) => Math.abs(b.signed) - Math.abs(a.signed))
    .slice(0, count);
  return sorted.map((entry) => `${labels[entry.dim]} (${Math.round(entry.score)})`);
}

function getSingleAnswer(answers: Record<string, AnswerValue>, id: string): string | undefined {
  const value = answers[id];
  return typeof value === 'string' ? value : undefined;
}

function computeItemKindRisk(itemKind: ItemKind, answers: Record<string, AnswerValue>, tags: string[]): number {
  const unknownInfoCount = tags.filter((tag) => tag === 'unknown_info' || tag === 'unknown_compare').length;
  if (itemKind === 'used') {
    let risk = 45;
    const condition = getSingleAnswer(answers, 'q_addon_used_condition');
    const defect = getSingleAnswer(answers, 'q_addon_used_defect_return');
    const auth = getSingleAnswer(answers, 'q_addon_used_authenticity');
    const priceGap = getSingleAnswer(answers, 'q_addon_used_price_gap');
    const sellerTrust = getSingleAnswer(answers, 'q_addon_used_seller_trust');
    if (condition === 'hard') risk += 28;
    if (defect === 'not_ok' || defect === 'unknown') risk += 25;
    if (auth === 'must') risk += 10;
    if (auth === 'unknown') risk += 22;
    if (priceGap === 'small' || priceGap === 'unknown') risk += 12;
    if (sellerTrust === 'low') risk += 22;
    if (sellerTrust === 'medium') risk += 8;
    if (sellerTrust === 'unknown') risk += 14;
    return clamp(0, 100, risk + unknownInfoCount * 5);
  }

  if (itemKind === 'blind_draw') {
    let risk = 42;
    const cap = getSingleAnswer(answers, 'q_addon_blind_draw_cap');
    const exit = getSingleAnswer(answers, 'q_addon_blind_draw_exit');
    const trade = getSingleAnswer(answers, 'q_addon_blind_draw_trade_intent');
    const missPain = getSingleAnswer(answers, 'q_addon_blind_draw_miss_pain');
    if (cap === 'not_good') risk += 24;
    if (exit === 'complete') risk += 16;
    if (trade === 'no') risk += 14;
    if (missPain === 'high') risk += 22;
    if (missPain === 'mid') risk += 10;
    if (cap === 'unknown' || exit === 'unknown' || trade === 'unknown' || missPain === 'unknown') risk += 10;
    return clamp(0, 100, risk + unknownInfoCount * 4);
  }

  if (itemKind === 'preorder') {
    let risk = 40;
    const timeline = getSingleAnswer(answers, 'q_addon_preorder_timeline');
    const decay = getSingleAnswer(answers, 'q_addon_preorder_decay');
    const compareLoss = getSingleAnswer(answers, 'q_addon_preorder_compare_loss');
    if (timeline === 'no' || timeline === 'unknown') risk += 20;
    if (decay === 'drop') risk += 24;
    if (decay === 'uncertain') risk += 10;
    if (compareLoss === 'large') risk += 18;
    if (compareLoss === 'mid') risk += 8;
    return clamp(0, 100, risk + unknownInfoCount * 6);
  }

  if (itemKind === 'ticket') {
    let risk = 38;
    const schedule = getSingleAnswer(answers, 'q_addon_ticket_schedule');
    const resale = getSingleAnswer(answers, 'q_addon_ticket_resale_rule');
    const tripLoad = getSingleAnswer(answers, 'q_addon_ticket_trip_load');
    const nextChance = getSingleAnswer(answers, 'q_addon_ticket_next_chance');
    if (schedule === 'risk') risk += 24;
    if (schedule === 'some_risk') risk += 12;
    if (resale === 'not_yet') risk += 18;
    if (resale === 'partly') risk += 9;
    if (tripLoad === 'heavy') risk += 20;
    if (tripLoad === 'medium') risk += 8;
    if (nextChance === 'unknown') risk += 10;
    return clamp(0, 100, risk + unknownInfoCount * 5);
  }

  if (itemKind === 'game_billing') {
    let risk = 40;
    const type = getSingleAnswer(answers, 'gb_q2_type');
    const wait = getSingleAnswer(answers, 'gb_q8_wait');
    const pity = getSingleAnswer(answers, 'gb_q10_pity');
    const info = getSingleAnswer(answers, 'gb_q9_info');
    if (type === 'gacha') risk += 8;
    if (wait === 'drop') risk += 22;
    if (pity === 'far') risk += 18;
    if (info === 'none') risk += 16;
    return clamp(0, 100, risk + unknownInfoCount * 6);
  }

  return clamp(0, 100, 35 + unknownInfoCount * 4);
}

function computeFactorBuckets(scores: Record<ScoreDimension, number>, unknownCount: number, itemKindRisk: number): FactorBuckets {
  const desireAttachment = clamp(0, 100, Math.round(scores.desire));
  const urgencyOpportunity = clamp(0, 100, Math.round((scores.urgency + scores.rarity + (100 - scores.restockChance)) / 3));
  const budgetPressure = clamp(0, 100, Math.round(((100 - scores.affordability) + scores.opportunityCost) / 2));
  const readinessLogistics = clamp(0, 100, Math.round((scores.opportunityCost * 0.6) + (scores.regretRisk * 0.4)));
  const uncertaintyUnknowns = clamp(0, 100, Math.round((unknownCount * 18) + (scores.regretRisk * 0.35)));
  const impulseVolatility = clamp(0, 100, Math.round((scores.impulse * 0.7) + (scores.regretRisk * 0.3)));
  return {
    desireAttachment,
    urgencyOpportunity,
    budgetPressure,
    readinessLogistics,
    uncertaintyUnknowns,
    impulseVolatility,
    itemKindRisk: clamp(0, 100, itemKindRisk),
  };
}

function determineHoldSubtype(buckets: FactorBuckets, unknownCount: number): { subtype: HoldSubtype; reason: string } {
  if (unknownCount >= 2 || buckets.uncertaintyUnknowns >= 66) {
    return { subtype: 'info_missing', reason: '情報不足が多く、判断に必要な確度が足りない。' };
  }
  if (buckets.budgetPressure >= 70) {
    return { subtype: 'budget_pain', reason: '予算負担が重く、現時点では支出優先度が合っていない。' };
  }
  if (buckets.impulseVolatility >= 68) {
    return { subtype: 'impulse_cooldown', reason: '気分の勢いが強く、冷却後の再評価が必要。' };
  }
  if (buckets.readinessLogistics >= 67) {
    return { subtype: 'condition_not_ready', reason: '利用・保管・運用条件が整っていない。' };
  }
  return { subtype: 'risk_uncertain', reason: '種別固有のリスクに対して、確信が不足している。' };
}

function buildExplanations(params: {
  decision: Decision;
  holdSubtype?: HoldSubtype;
  buckets: FactorBuckets;
  unknownCount: number;
  itemKind: ItemKind;
}): {
  blockingFactors: string[];
  recommendationReasons: string[];
  whyNotBuyYet: string;
  whyNotSkipYet: string;
} {
  const { decision, holdSubtype, buckets, unknownCount, itemKind } = params;
  const blockingFactors: string[] = [];
  if (buckets.budgetPressure >= 65) blockingFactors.push('予算圧が高い');
  if (buckets.uncertaintyUnknowns >= 60 || unknownCount > 0) blockingFactors.push('不明点が残っている');
  if (buckets.impulseVolatility >= 65) blockingFactors.push('勢い要素が強い');
  if (buckets.readinessLogistics >= 65) blockingFactors.push('利用・保管準備が不足');
  if (buckets.itemKindRisk >= 62) blockingFactors.push(`${itemKind}特有のリスクが高い`);

  const recommendationReasons: string[] = [];
  if (decision === 'BUY') {
    recommendationReasons.push('満足寄与（欲しさ・必要性）が阻害要因を上回っている');
    recommendationReasons.push('現時点の不確実性が許容範囲にある');
  } else if (decision === 'SKIP') {
    recommendationReasons.push('負担・不確実性が継続利用価値を上回っている');
    recommendationReasons.push('見送りによる機会損失より保全メリットが大きい');
  } else {
    recommendationReasons.push('賛成要因と反対要因が拮抗している');
    recommendationReasons.push('追加確認1〜2件で結論精度を改善できる');
  }

  const whyNotBuyYet =
    decision === 'BUY'
      ? 'BUY判定に必要な条件を満たしている。'
      : holdSubtype === 'budget_pain'
        ? '予算負担が高く、買う根拠より痛みが勝っているため。'
        : holdSubtype === 'info_missing'
          ? '相場・状態・条件の未確認が残り、買う確信を作れないため。'
          : holdSubtype === 'impulse_cooldown'
            ? '勢いによる判断誤差を除く前段階のため。'
            : holdSubtype === 'condition_not_ready'
              ? '使い道/保管/運用条件が整っていないため。'
              : 'リスクに対して見返り確信が不足しているため。';

  const whyNotSkipYet =
    decision === 'SKIP'
      ? 'SKIP判定に必要な阻害要因が十分に揃っている。'
      : '満足可能性や機会価値がまだ残っており、即時見送りまでは至らないため。';

  return { blockingFactors: blockingFactors.slice(0, 3), recommendationReasons, whyNotBuyYet, whyNotSkipYet };
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

  const unknownCount = tags.filter(t => t.startsWith('unknown_')).length;
  const impulseFlag = scores.impulse >= 70;
  const futureUseFlag = motives.includes('support') || motives.includes('use');
  const itemKind = input.meta.itemKind ?? 'goods';

  const weights = selectWeights(config, itemKind);
  let scoreSigned = 0;
  for (const [dim, w] of Object.entries(weights)) {
    const d = dim as ScoreDimension;
    scoreSigned += normalize01ToSigned(scores[d]) * (w as number);
  }

  const itemKindRisk = computeItemKindRisk(itemKind, input.answers, tags);
  const factorBuckets = computeFactorBuckets(scores, unknownCount, itemKindRisk);

  const positivePush =
    factorBuckets.desireAttachment * 0.34 +
    factorBuckets.urgencyOpportunity * 0.22 +
    scores.affordability * 0.16;
  const negativePush =
    factorBuckets.budgetPressure * 0.26 +
    factorBuckets.uncertaintyUnknowns * 0.24 +
    factorBuckets.impulseVolatility * 0.16 +
    factorBuckets.itemKindRisk * 0.20 +
    factorBuckets.readinessLogistics * 0.14;
  const calibratedSigned = clamp(-1, 1, (positivePush - negativePush) / 100);
  scoreSigned = clamp(-1, 1, scoreSigned * 0.35 + calibratedSigned * 0.85);

  const unknownPenalty = unknownCount * config.unknownPenaltyPerTag;
  scoreSigned = scoreSigned * (1 - Math.min(0.45, unknownPenalty / 130));

  if (impulseFlag && scoreSigned < 0.55) {
    let impulseNudge = Math.max(0, ((scores.impulse - 50) / 100) * 0.18);
    if (futureUseFlag) impulseNudge *= 0.6;
    scoreSigned -= impulseNudge;
  }

  const decisiveness = input.decisiveness ?? 'standard';
  const mode = input.mode ?? 'medium';
  const holdBand =
    Math.max(Math.abs(config.thresholds.buy), Math.abs(config.thresholds.skip)) *
    (decisivenessMultiplierMap[decisiveness] ?? 1) *
    (modeMultiplierMap[mode] ?? 1);

  let decision: Decision = 'THINK';
  if (scoreSigned >= holdBand) decision = 'BUY';
  else if (scoreSigned <= -holdBand) decision = 'SKIP';

  if (unknownCount >= 5 && decision === 'BUY') {
    decision = 'THINK';
  }

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

  let holdSubtype: HoldSubtype | undefined;
  let subtypeReason: string | undefined;
  if (decision === 'THINK') {
    const resolved = determineHoldSubtype(factorBuckets, unknownCount);
    holdSubtype = resolved.subtype;
    subtypeReason = resolved.reason;
  }

  const reasonsBase = pickReasons({ meta: input.meta, tags, scores, decision, blindDrawCap, holdSubtype, factorBuckets });
  const actionsBase = pickActions({ meta: input.meta, tags, scores, decision, blindDrawCap, holdSubtype, factorBuckets });
  const extraReasons: ReasonItem[] = [];
  const extraActions: ActionItem[] = [];

  if (impulseFlag) {
    extraReasons.push({ id: 'impulse_rush', severity: 'info', text: '「買えた快感」が主役の時、満足がすぐ落ち着くこともあるかも。' });
    extraActions.push({ id: 'cooldown_10min', text: '10分だけクールダウン（カート保持）→ その後もう一回だけ判断しよ。' });
  }

  const reasons = [...extraReasons, ...reasonsBase].slice(0, 6);
  const actions = [...extraActions, ...actionsBase].slice(0, 3);

  const scoreSpread = stdDev(Object.values(scores));
  const ambiguity = Math.max(0, 1 - Math.abs(scoreSigned));
  let confidence = Math.round(72 + Math.abs(scoreSigned) * 32 - ambiguity * 22 - unknownCount * 6 - (scoreSpread >= 15 ? 4 : 0));
  if (decision === 'THINK') confidence -= 5;
  confidence = clamp(0, 100, confidence);

  if (shouldAskStorage(input.meta.itemKind, input.meta.goodsSubtype)) {
    const storageFit = input.answers.q_storage_fit;
    if (storageFit === 'NONE' || storageFit === 'UNKNOWN') {
      if (decision === 'BUY') decision = 'THINK';
      scores.opportunityCost = clamp(0, 100, scores.opportunityCost + 20);
      confidence = clamp(0, 100, confidence - 10);
      const storageGuidance = getStorageGuidance(input.meta.goodsSubtype);
      reasons.push({ id: 'storage_unconfirmed', severity: 'warn', text: storageGuidance.reason });
      actions.push({ id: 'storage_plan_first', text: storageGuidance.action });
      if (decision === 'THINK') {
        holdSubtype = 'condition_not_ready';
        subtypeReason = '保管・運用条件の未確定が主な保留理由。';
      }
    }
  }

  const downgradeFlags: string[] = [];
  if (unknownCount >= 3) downgradeFlags.push('unknown_count_ge_3');
  if (unknownCount >= 5) downgradeFlags.push('force_hold_unknown_count_ge_5');
  if (impulseFlag) downgradeFlags.push('impulse_nudge_applied');
  if (holdSubtype) downgradeFlags.push(`hold_subtype_${holdSubtype}`);

  const decisionJa = decision === 'BUY' ? '買う' : decision === 'SKIP' ? 'やめる' : '保留';
  const positiveFactors = getTopFactors(scores, 'positive');
  const negativeFactors = getTopFactors(scores, 'negative');
  const explain = buildExplanations({ decision, holdSubtype, buckets: factorBuckets, unknownCount, itemKind });
  const shareText = buildShareText(decisionJa, reasons);
  const presentation = buildPresentation({ decision, actions, reasons });

  return {
    decision,
    holdSubtype,
    confidence,
    score: clamp(-1, 1, scoreSigned),
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
    blockingFactors: explain.blockingFactors,
    recommendationReasons: explain.recommendationReasons,
    subtypeReason,
    whyNotBuyYet: explain.whyNotBuyYet,
    whyNotSkipYet: explain.whyNotSkipYet,
    factorBuckets,
    presentation,
    diagnosticTrace: {
      resultInputsSummary: {
        tags: [...tags],
        unknownCount,
        impulseFlag,
        futureUseFlag,
        downgradeFlags,
      },
    },
  };
}
