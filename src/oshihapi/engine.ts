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
  RandomGoodsPlan,
  RandomGoodsPlannerPath,
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
import { resolveScenarioKey } from './scenarioCoverage';

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
    bonus: { urgency: 72, impulse: 68, regretRisk: 64 },
    complete: { desire: 68, impulse: 66, regretRisk: 62, opportunityCost: 64 },
    seiyuu_cast: { desire: 64, impulse: 70, regretRisk: 72 },
  };

  for (const motive of motives) {
    if (motive === 'trend' || motive === 'vague') tags.push('trend_flag');
    if (motive === 'seiyuu_cast') tags.push('actor_fan_primary');
    if (motive === 'bonus') tags.push('bonus_pressure_high');
    if (motive === 'complete') tags.push('collection_pressure');
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

function hasCompleteMotive(motives: string[]) {
  return motives.includes('complete');
}

function resolveRandomGoodsTargetStyle(answers: Record<string, AnswerValue>): RandomGoodsPlan['targetStyle'] {
  const goal = getSingleAnswer(answers, 'q_goal');
  if (goal === 'fun') return 'fun_casual';
  if (goal === 'set') return 'full_set';
  if (goal === 'single') return 'one_or_few';

  const exit = getSingleAnswer(answers, 'q_addon_blind_draw_exit');
  if (exit === 'complete') return 'full_set';
  if (exit === 'oshi_only') return 'one_or_few';
  if (exit === 'fun') return 'fun_casual';
  if (exit === 'mixed') return 'mixed';
  return 'unknown';
}

function resolveRandomGoodsDuplicateTolerance(answers: Record<string, AnswerValue>): RandomGoodsPlan['duplicateTolerance'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_duplicate_tolerance');
  if (answer === 'high' || answer === 'medium' || answer === 'low') return answer;
  return 'unknown';
}

function resolveRandomGoodsExchangeWillingness(answers: Record<string, AnswerValue>): RandomGoodsPlan['exchangeWillingness'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_trade_intent');
  if (answer === 'yes') return 'high';
  if (answer === 'maybe') return 'medium';
  if (answer === 'no') return 'low';
  return 'unknown';
}

function resolveRandomGoodsExchangeFriction(answers: Record<string, AnswerValue>): RandomGoodsPlan['exchangeFriction'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_exchange_friction');
  if (answer === 'low' || answer === 'medium' || answer === 'high') return answer;
  return 'unknown';
}

function resolveRandomGoodsSinglesFallback(answers: Record<string, AnswerValue>): RandomGoodsPlan['singlesFallback'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_single_fallback');
  if (answer === 'now') return 'now';
  if (answer === 'after_stop') return 'after_stop';
  if (answer === 'avoid') return 'avoid';
  return 'unknown';
}

function resolveRandomGoodsStopBudget(answers: Record<string, AnswerValue>): RandomGoodsPlan['stopBudget'] {
  const answer = getSingleAnswer(answers, 'q_addon_blind_draw_stop_budget');
  if (answer === 'strict' || answer === 'soft' || answer === 'over_limit') return answer;
  return 'unknown';
}

function buildRandomGoodsPlan(params: {
  meta: InputMeta;
  answers: Record<string, AnswerValue>;
  motives: string[];
  scores: Record<ScoreDimension, number>;
  factorBuckets: FactorBuckets;
}): RandomGoodsPlan | undefined {
  if (params.meta.itemKind !== 'blind_draw') return undefined;

  const targetStyle = resolveRandomGoodsTargetStyle(params.answers);
  const duplicateTolerance = resolveRandomGoodsDuplicateTolerance(params.answers);
  const exchangeWillingness = resolveRandomGoodsExchangeWillingness(params.answers);
  const exchangeFriction = resolveRandomGoodsExchangeFriction(params.answers);
  const singlesFallback = resolveRandomGoodsSinglesFallback(params.answers);
  const stopBudget = resolveRandomGoodsStopBudget(params.answers);
  const missPain = getSingleAnswer(params.answers, 'q_addon_blind_draw_miss_pain');
  const budgetPain = getSingleAnswer(params.answers, 'q_budget_pain');
  const impulseState = getSingleAnswer(params.answers, 'q_regret_impulse');
  const goodsClass = params.meta.goodsClass;
  const usedMarketPreferredClass = goodsClass === 'small_collection' || goodsClass === 'paper' || goodsClass === 'itabag_badge';
  const fullSetAmbition = targetStyle === 'full_set' || hasCompleteMotive(params.motives);
  const funDraw = targetStyle === 'fun_casual' || getSingleAnswer(params.answers, 'q_goal') === 'fun';
  const oneOrFewTarget = targetStyle === 'one_or_few' || getSingleAnswer(params.answers, 'q_goal') === 'single';
  const lowDuplicateTolerance = duplicateTolerance === 'low';
  const highDuplicateTolerance = duplicateTolerance === 'high';
  const exchangeHelpful = exchangeWillingness === 'high' || (exchangeWillingness === 'medium' && exchangeFriction !== 'high');
  const exchangeBlocked = exchangeWillingness === 'low' || exchangeFriction === 'high';
  const singlesReady = singlesFallback === 'now';
  const singlesAvailableAfterStop = singlesFallback === 'after_stop';
  const overBudget = stopBudget === 'over_limit';
  const budgetTight = overBudget || budgetPain === 'hard' || budgetPain === 'force' || params.factorBuckets.budgetPressure >= 68;
  const impulseHigh =
    impulseState === 'excited' ||
    impulseState === 'fomo' ||
    impulseState === 'tired' ||
    params.factorBuckets.impulseVolatility >= 68;
  const poorMarginalProgress =
    (oneOrFewTarget && lowDuplicateTolerance && exchangeBlocked) ||
    (fullSetAmbition && (budgetTight || lowDuplicateTolerance || exchangeBlocked));
  const completionPressureHigh =
    fullSetAmbition ||
    missPain === 'high' ||
    (params.scores.regretRisk >= 72 && params.scores.impulse >= 64);

  let chosenPath: RandomGoodsPlannerPath = 'stop_now';
  let clampReason: string | undefined;
  const reasonFlags: string[] = [];

  if (overBudget) {
    chosenPath = completionPressureHigh ? 'step_back_from_completion_pressure' : 'stop_now';
    clampReason = 'stop_budget_over_limit';
    reasonFlags.push('stop_budget_over_limit');
  } else if (impulseHigh && poorMarginalProgress) {
    chosenPath = completionPressureHigh ? 'step_back_from_completion_pressure' : 'stop_now';
    clampReason = 'impulse_high_low_progress';
    reasonFlags.push('impulse_high_low_progress');
  } else if (fullSetAmbition && (budgetTight || poorMarginalProgress)) {
    chosenPath = singlesReady
      ? 'stop_drawing_buy_singles'
      : usedMarketPreferredClass
        ? 'stop_drawing_check_used_market'
        : 'stop_now';
    clampReason = budgetTight ? 'full_set_budget_unfavorable' : 'full_set_randomness_unfavorable';
    reasonFlags.push(clampReason);
  } else if (oneOrFewTarget && lowDuplicateTolerance && exchangeBlocked) {
    chosenPath = singlesReady ? 'stop_drawing_buy_singles' : 'stop_drawing_check_used_market';
    clampReason = 'single_target_duplicate_risk';
    reasonFlags.push('single_target_duplicate_risk');
  } else if (exchangeHelpful && exchangeFriction !== 'high' && !budgetTight && !overBudget) {
    chosenPath = 'switch_to_exchange_path';
    reasonFlags.push('exchange_path_viable');
  } else if (funDraw && highDuplicateTolerance && !budgetTight && !impulseHigh) {
    chosenPath = 'continue_a_little_more';
    reasonFlags.push('fun_draw_continue_ok');
  } else if ((singlesReady || singlesAvailableAfterStop) && usedMarketPreferredClass) {
    chosenPath = singlesReady ? 'stop_drawing_buy_singles' : 'stop_drawing_check_used_market';
    reasonFlags.push(singlesReady ? 'single_fallback_now' : 'single_fallback_after_stop');
  } else {
    chosenPath = 'stop_now';
    if (exchangeBlocked) reasonFlags.push('exchange_not_viable');
  }

  const stopLineOptimizingFor =
    chosenPath === 'continue_a_little_more'
      ? '楽しさを残しつつ、被りと予算崩れを抑えること'
      : chosenPath === 'switch_to_exchange_path'
        ? '追加で引かずに、交換前提の負担と回収効率を両立すること'
        : chosenPath === 'stop_drawing_buy_singles'
          ? '被りを増やさず、本命回収を単品で確定に寄せること'
          : chosenPath === 'stop_drawing_check_used_market'
            ? '続きの盲抽より中古相場確認へ切り替えて損失を増やさないこと'
            : chosenPath === 'step_back_from_completion_pressure'
              ? 'コンプ圧が楽しさを上回る前にいったん止まること'
              : '被り・衝動・予算超過を増やさずに止まること';

  const reasons: string[] = [];
  const assumptions: string[] = [];

  reasons.push(
    targetStyle === 'full_set'
      ? 'コンプ寄りの回収だと、ランダム継続のコストが急に重くなりやすい。'
      : targetStyle === 'one_or_few'
        ? '本命少数狙いでは、被りが増えるほど盲抽の効率が落ちやすい。'
        : targetStyle === 'fun_casual'
          ? '楽しみ目的なら、撤退線さえ守れば少量継続の納得感を残しやすい。'
          : 'ランダム商品は目的が曖昧なまま続けると撤退線を越えやすい。'
  );
  if (duplicateTolerance === 'low') reasons.push('被り許容が低いので、追加で引くほど後悔リスクが上がりやすい。');
  if (exchangeWillingness === 'high' || exchangeWillingness === 'medium') {
    reasons.push(
      exchangeFriction === 'high'
        ? '交換意欲はあっても、連絡・梱包・待機の負担が高いなら万能ではない。'
        : '交換前提は有効だが、「すぐ成立する」とはみなさず負担込みで見る。'
    );
  }
  if (singlesFallback === 'now' || singlesFallback === 'after_stop') {
    reasons.push('単品/中古に逃げられるなら、盲抽を延ばすより損失を固定しやすい。');
  }
  if (clampReason === 'impulse_high_low_progress') reasons.push('勢いが強い一方で、追加1回の進捗期待が低く、ここで止めた方が後悔しにくい。');
  if (clampReason === 'stop_budget_over_limit') reasons.push('予定ラインを超えた時点で、くじの楽しさより予算崩れが主役になりやすい。');

  assumptions.push(
    exchangeWillingness === 'high' || exchangeWillingness === 'medium'
      ? '交換前提なら、追加購入ではなく「今ある重複で動く」前提にしています。'
      : '交換を前提にしない場合、被りはそのままコストとして扱います。'
  );
  assumptions.push(
    usedMarketPreferredClass
      ? '小物・紙もの・缶バ系は中古単品移行の相性が比較的高い前提です。'
      : '中古単品移行の相性は高めに仮定していません。'
  );

  return {
    detected: true,
    scenarioKey: resolveScenarioKey({
      itemKind: params.meta.itemKind,
      goodsClass: params.meta.goodsClass,
      parsedSearchClues: params.meta.parsedSearchClues,
      searchClueRaw: params.meta.searchClueRaw,
      answers: params.answers,
    }),
    targetStyle,
    duplicateTolerance,
    exchangeWillingness,
    exchangeFriction,
    singlesFallback,
    stopBudget,
    chosenPath,
    stopLineOptimizingFor,
    continuingJustified: chosenPath === 'continue_a_little_more',
    exchangeAssumptionChangedRecommendation: exchangeHelpful && !exchangeBlocked && chosenPath === 'switch_to_exchange_path',
    usedMarketRecommended: chosenPath === 'stop_drawing_check_used_market' || chosenPath === 'stop_drawing_buy_singles',
    clampReason,
    reasonFlags,
    reasons: [...new Set(reasons)].slice(0, 5),
    assumptions: [...new Set(assumptions)].slice(0, 3),
  };
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
  const randomGoodsPlan = buildRandomGoodsPlan({
    meta: input.meta,
    answers: input.answers,
    motives,
    scores,
    factorBuckets,
  });

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

  if (randomGoodsPlan) {
    tags.push(
      `random_goods_path_${randomGoodsPlan.chosenPath}`,
      `random_goods_target_${randomGoodsPlan.targetStyle}`,
      `random_goods_duplicate_${randomGoodsPlan.duplicateTolerance}`,
      `random_goods_exchange_${randomGoodsPlan.exchangeWillingness}`,
      `random_goods_exchange_friction_${randomGoodsPlan.exchangeFriction}`,
      `random_goods_singles_${randomGoodsPlan.singlesFallback}`,
      `random_goods_stop_budget_${randomGoodsPlan.stopBudget}`,
    );
    tags.push(randomGoodsPlan.exchangeAssumptionChangedRecommendation ? 'random_goods_exchange_path_active' : 'random_goods_exchange_path_inactive');
    if (randomGoodsPlan.usedMarketRecommended) tags.push('random_goods_used_market_fallback');
    if (randomGoodsPlan.clampReason) tags.push(`random_goods_clamp_${randomGoodsPlan.clampReason}`);

    if (randomGoodsPlan.chosenPath === 'continue_a_little_more') {
      if (decision === 'SKIP' && factorBuckets.budgetPressure < 72) decision = 'THINK';
    } else if (
      randomGoodsPlan.chosenPath === 'stop_drawing_buy_singles' ||
      randomGoodsPlan.chosenPath === 'stop_drawing_check_used_market' ||
      randomGoodsPlan.chosenPath === 'switch_to_exchange_path'
    ) {
      if (decision === 'BUY') decision = 'THINK';
    } else if (randomGoodsPlan.chosenPath === 'stop_now' || randomGoodsPlan.chosenPath === 'step_back_from_completion_pressure') {
      if (decision === 'BUY') decision = 'THINK';
      if (randomGoodsPlan.clampReason === 'stop_budget_over_limit' || randomGoodsPlan.clampReason === 'impulse_high_low_progress') {
        decision = 'SKIP';
      }
    }
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

  if (randomGoodsPlan) {
    const pathText: Record<RandomGoodsPlannerPath, string> = {
      continue_a_little_more: '今回は「少しだけ続ける」は許容範囲。ただし追加分は少量に固定した方が安全。',
      stop_now: 'ここは追加で引くより止まる方が後悔しにくい局面。',
      switch_to_exchange_path: '追加で引くより、いま持っている重複を交換前提で動かす方が合理的。',
      stop_drawing_buy_singles: 'これ以上の盲抽より、必要分を単品で回収する方が損失を抑えやすい。',
      stop_drawing_check_used_market: '追加で引くより、まず中古単品の相場と在庫を見た方が合理的。',
      step_back_from_completion_pressure: 'いまは「揃えたい圧」が楽しさを上回っているので、一度引く手を止めるのが安全。',
    };
    extraReasons.unshift({
      id: `random_goods_${randomGoodsPlan.chosenPath}`,
      severity: randomGoodsPlan.chosenPath === 'continue_a_little_more' ? 'info' : 'strong',
      text: pathText[randomGoodsPlan.chosenPath],
    });

    if (randomGoodsPlan.exchangeAssumptionChangedRecommendation) {
      extraReasons.push({
        id: 'random_goods_exchange_assumption',
        severity: 'info',
        text: 'この結論は「交換を回せる」前提で少し前向きに寄せています。交換負担が重いなら早め停止寄りです。',
      });
    }
    if (randomGoodsPlan.clampReason === 'impulse_high_low_progress') {
      extraReasons.push({
        id: 'random_goods_impulse_clamp',
        severity: 'warn',
        text: '勢いは強いのに進捗期待が低いので、ここで止める方が regret を抑えやすい。',
      });
    }

    const actionText: Record<RandomGoodsPlannerPath, ActionItem> = {
      continue_a_little_more: { id: 'random_goods_continue_soft_cap', text: '追加は少量だけに固定し、その回数を超えたら終了する' },
      stop_now: { id: 'random_goods_stop_now', text: 'ここで打ち止めにして、今日は追加購入しない' },
      switch_to_exchange_path: { id: 'random_goods_exchange_path', text: '追加で引かず、交換前提で整理する（連絡・梱包負担も込みで判断）' },
      stop_drawing_buy_singles: { id: 'random_goods_buy_singles', text: '盲抽は止めて、必要分は単品購入に切り替える' },
      stop_drawing_check_used_market: { id: 'random_goods_check_used_market', text: '盲抽は止めて、まず中古単品の相場と在庫を確認する' },
      step_back_from_completion_pressure: { id: 'random_goods_step_back', text: 'コンプ圧が下がるまで一度離れて、明日また見直す' },
    };
    extraActions.unshift(actionText[randomGoodsPlan.chosenPath]);
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
  if (randomGoodsPlan) {
    downgradeFlags.push(`random_goods_path_${randomGoodsPlan.chosenPath}`);
    if (randomGoodsPlan.clampReason) downgradeFlags.push(`random_goods_clamp_${randomGoodsPlan.clampReason}`);
  }

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
    randomGoodsPlan,
    diagnosticTrace: {
      resultInputsSummary: {
        tags: [...tags],
        unknownCount,
        impulseFlag,
        futureUseFlag,
        downgradeFlags,
      },
      randomGoodsPlan,
    },
  };
}
