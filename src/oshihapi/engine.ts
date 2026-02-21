import type {
  AnswerValue,
  ActionItem,
  Decision,
  DecisionOutput,
  Decisiveness,
  EngineConfig,
  InputMeta,
  Mode,
  QuestionSet,
  ReasonItem,
  ScoreDimension,
} from './model';
import { engineConfig as defaultConfig, normalize01ToSigned, clamp } from './engineConfig';
import { pickReasons, pickActions, buildShareText } from './reasonRules';
import { decideMerchMethod } from './merchMethod';
import { buildPresentation } from './decisionPresentation';
import { shouldAskStorage } from './storageGate';

type EvaluateInput = {
  config?: EngineConfig;
  questionSet: QuestionSet;
  meta: InputMeta;
  // answers: questionId -> (optionId | number for scale)
  answers: Record<string, AnswerValue>;
  mode?: Mode;
  decisiveness?: Decisiveness;
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
  // Weighted blend: push toward add
  // Here: simple average-like; can be tuned later
  return clamp(0, 100, Math.round((base + add) / 2));
}

export function evaluate(input: EvaluateInput): DecisionOutput {
  const config = input.config ?? defaultConfig;

  const scores = initScores();
  const tags: string[] = [];
  const motivesAnswer = input.answers.q_motives_multi;
  const motives = Array.isArray(motivesAnswer)
    ? motivesAnswer.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const impulseShortRaw = input.answers.q_impulse_axis_short;
  const impulseShort =
    typeof impulseShortRaw === 'number' && Number.isFinite(impulseShortRaw)
      ? impulseShortRaw
      : null;
  const impulseFlag = motives.includes('rush') || (impulseShort !== null && impulseShort >= 4);
  const futureUseFlag = motives.includes('use');
  const trendOrVagueFlag = motives.includes('trend') || motives.includes('vague');

  // Walk questions and apply deltas
  for (const q of input.questionSet.questions) {
    const ans = input.answers[q.id];
    if (ans == null) continue;

    if (q.type === 'scale' || q.type === 'number') {
      if (Array.isArray(ans)) continue;
      const v = Number(ans);
      if (Number.isFinite(v) && q.mapTo) {
        // scale 0..5 => 0..100
        const pct = clamp(0, 100, Math.round((v / (q.max ?? 5)) * 100));
        scores[q.mapTo] = mergeScore(scores[q.mapTo], pct);
      }
      continue;
    }

    if (q.type === 'single' && q.options) {
      const opt = q.options.find(o => o.id === ans);
      if (!opt) continue;
      if (opt.tags) tags.push(...opt.tags);
      if (opt.delta) {
        for (const [dim, val] of Object.entries(opt.delta)) {
          const d = dim as ScoreDimension;
          scores[d] = mergeScore(scores[d], val as number);
        }
      }
    }
  }

  // Unknown penalty
  const unknownCount = tags.filter(t => t.startsWith('unknown_')).length;
  const unknownPenalty = unknownCount * config.unknownPenaltyPerTag;

  // Compute decision score
  let scoreSigned = 0;
  for (const [dim, w] of Object.entries(config.decisionWeights)) {
    const d = dim as ScoreDimension;
    const norm = normalize01ToSigned(scores[d]);
    scoreSigned += norm * (w as number);
  }

  // Unknowns push toward THINK (reduce magnitude)
  scoreSigned = scoreSigned * (1 - Math.min(0.35, unknownPenalty / 100));
  if (impulseFlag) {
    const impulseNudge = 0.08;
    if (scoreSigned < config.thresholds.buy + 0.2) {
      scoreSigned -= impulseNudge;
    }
  }

  const decisiveness = input.decisiveness ?? 'standard';
  const mode = input.mode ?? 'medium';
  const holdBandBase = Math.max(Math.abs(config.thresholds.buy), Math.abs(config.thresholds.skip));
  const holdBand =
    holdBandBase *
    (decisivenessMultiplierMap[decisiveness] ?? decisivenessMultiplierMap.standard) *
    (modeMultiplierMap[mode] ?? modeMultiplierMap.medium);

  let decision: Decision = 'THINK';
  if (scoreSigned >= holdBand) decision = 'BUY';
  else if (scoreSigned <= -holdBand) decision = 'SKIP';

  // Determine goal/popularity from tags
  const goal =
    tags.includes('goal_set') ? 'set' :
    tags.includes('goal_fun') ? 'fun' : 'single';
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
    extraReasons.push({
      id: 'impulse_rush',
      severity: 'info' as const,
      text: '「買えた快感」が主役の時、満足がすぐ落ち着くこともあるかも。',
    });
    extraActions.push({
      id: 'cooldown_10min',
      text: '10分だけクールダウン（カート保持）→ その後もう一回だけ判断しよ。',
    });
  }
  if (impulseFlag && !futureUseFlag) {
    extraActions.push({
      id: 'future_use_alt',
      text: 'まず「置き場所」を1分で決めよ。無理なら写真で満足／小物だけもアリ。',
    });
  }
  if (trendOrVagueFlag) {
    extraActions.push({
      id: 'trend_market',
      text: 'まず相場を5分だけ見る（新品で焦らなくてOK）。',
    });
  }
  let reasons = [...extraReasons, ...reasonsBase].slice(0, 6);
  let actions = [...extraActions, ...actionsBase].slice(0, 3);

  // Confidence
  let confidence = clamp(
    50,
    95,
    Math.round(50 + Math.abs(scoreSigned) * 70 - unknownPenalty)
  );

  if (shouldAskStorage(input.meta.itemKind, input.meta.goodsSubtype)) {
    const storageFit = input.answers.q_storage_fit;
    if (storageFit === 'NONE' || storageFit === 'UNKNOWN') {
      if (decision === 'BUY') {
        decision = 'THINK';
      }
      confidence = clamp(50, 95, confidence - 15);
      reasons = [
        ...reasons,
        {
          id: 'storage_unconfirmed',
          severity: 'warn' as const,
          text: '置き場所が未確定（買った後の置き場が決まってない）',
        },
      ].slice(0, 6);
      actions = [
        ...actions,
        {
          id: 'storage_plan_first',
          text: '先に置き場所を決める（棚/ケース/引き出し）',
        },
      ].slice(0, 3);
    } else if (storageFit === 'PROBABLE') {
      reasons = [
        ...reasons,
        {
          id: 'storage_cleanup_needed',
          severity: 'info' as const,
          text: '片付けが必要（置き場所を作れたら後悔しにくい）',
        },
      ].slice(0, 6);
      actions = [
        ...actions,
        {
          id: 'storage_cleanup_10min',
          text: '買う前に10分だけ片付けてスペース確保',
        },
      ].slice(0, 3);
    }
  }

  const decisionJa = decision === 'BUY' ? '買う' : decision === 'SKIP' ? 'やめる' : '保留';
  const shareText = buildShareText(decisionJa, reasons);
  const presentation = buildPresentation({
    decision,
    actions,
    reasons,
  });

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
      note: method.note,
    },
    shareText,
    presentation,
  };
}
