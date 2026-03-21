import type { AnswerValue, DecisionOutput, QuestionSet, ResultBandTrace } from './model';

const NARROW_BAND_HALF_WIDTH = 10;
const DEFAULT_BAND_HALF_WIDTH = 18;
const MIN_CRITICAL_ANSWER_COUNT = 5;
const MIN_COVERAGE_RATIO = 0.8;

const EXTRA_CRITICAL_QUESTION_IDS = new Set([
  'q_goal',
  'q_motives_multi',
  'q_hot_cold',
  'q_price_feel',
  'q_alternative_plan',
]);

function hasAnswered(value: AnswerValue | undefined): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function getSingleAnswer(answers: Record<string, AnswerValue>, id: string): string | undefined {
  const value = answers[id];
  return typeof value === 'string' ? value : undefined;
}

function getMultiAnswer(answers: Record<string, AnswerValue>, id: string): string[] {
  const value = answers[id];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function getNumericAnswer(answers: Record<string, AnswerValue>, id: string): number | undefined {
  const value = answers[id];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function hasDowngradeFlag(output: DecisionOutput, matcher: (value: string) => boolean): boolean {
  return output.diagnosticTrace?.resultInputsSummary?.downgradeFlags?.some(matcher) ?? false;
}

export function computeResultBandTrace(input: {
  questionSet: QuestionSet;
  answers: Record<string, AnswerValue>;
  output: DecisionOutput;
}): ResultBandTrace {
  const { questionSet, answers, output } = input;
  const criticalQuestions = questionSet.questions.filter(
    (question) => question.urgentCore || EXTRA_CRITICAL_QUESTION_IDS.has(question.id),
  );
  const answeredCriticalCount = criticalQuestions.filter((question) => hasAnswered(answers[question.id])).length;
  const totalCriticalQuestions = criticalQuestions.length;
  const criticalCoverageRatio = totalCriticalQuestions > 0 ? answeredCriticalCount / totalCriticalQuestions : 0;
  const hasSufficientCriticalCoverage =
    answeredCriticalCount >= Math.min(totalCriticalQuestions, MIN_CRITICAL_ANSWER_COUNT) &&
    criticalCoverageRatio >= MIN_COVERAGE_RATIO;

  const unknownCount = output.diagnosticTrace?.resultInputsSummary?.unknownCount ?? 0;
  const lowUnknownCount = unknownCount <= 1;
  const noTrustGate = !hasDowngradeFlag(output, (value) => value.endsWith('_trust_gate_active'));
  const notFallbackDegraded = !hasDowngradeFlag(output, (value) => value.startsWith('force_hold_unknown_count_'));
  const confidenceFloor = output.decision === 'THINK' ? 47 : 64;
  const notLowConfidence = output.confidence >= confidenceFloor && output.holdSubtype !== 'info_missing';

  const decisionAligned =
    output.decision === 'THINK'
      ? output.confidence >= confidenceFloor && output.holdSubtype != null && output.holdSubtype !== 'info_missing'
      : Math.abs(output.score) >= 0.22 && output.confidence >= confidenceFloor;

  const scoreSummary = output.scoreSummary;
  const balancedScores =
    Math.abs((scoreSummary.desire ?? 50) - (scoreSummary.affordability ?? 50)) <= 18 &&
    Math.abs((scoreSummary.urgency ?? 50) - (scoreSummary.restockChance ?? 50)) <= 35;

  const budgetPain = getSingleAnswer(answers, 'q_budget_pain');
  const priceFeel = getSingleAnswer(answers, 'q_price_feel');
  const urgency = getSingleAnswer(answers, 'q_urgency');
  const restock = getSingleAnswer(answers, 'q_rarity_restock');
  const regretImpulse = getSingleAnswer(answers, 'q_regret_impulse');
  const alternativePlan = getSingleAnswer(answers, 'q_alternative_plan');
  const goal = getSingleAnswer(answers, 'q_goal');
  const motives = getMultiAnswer(answers, 'q_motives_multi');
  const desire = getNumericAnswer(answers, 'q_desire') ?? 0;
  const pressureMotives = motives.filter((motive) => ['bonus', 'complete', 'fomo', 'rush', 'trend', 'habit', 'price_up'].includes(motive));
  const stableMotives = motives.filter((motive) => ['use', 'content', 'support', 'memory', 'archive', 'display', 'reward', 'seiyuu_cast'].includes(motive));

  const budgetPressureHigh = budgetPain === 'hard' || budgetPain === 'force' || priceFeel === 'high';
  const budgetPressureMedium = budgetPain === 'some';
  const urgencyHigh = urgency === 'last' || urgency === 'low_stock';
  const restockEasy = restock === 'likely';
  const impulseHigh = regretImpulse === 'excited' || regretImpulse === 'tired' || regretImpulse === 'fomo';
  const bonusClampActive = hasDowngradeFlag(output, (value) => value.includes('clamp_bonus_pressure_exceeds_stated_need'));

  const blockers: string[] = [];
  if (!hasSufficientCriticalCoverage) blockers.push('insufficient_critical_answers');
  if (!lowUnknownCount) blockers.push('incomplete_high_impact_inputs');
  if (!notLowConfidence) blockers.push('low_confidence_trace');
  if (!noTrustGate || !notFallbackDegraded) blockers.push('fallback_or_trust_gate_active');
  if (!decisionAligned) blockers.push('ambiguous_decision_signal');

  if ((budgetPressureHigh || budgetPressureMedium) && (desire >= 4 || urgencyHigh || pressureMotives.length > 0)) {
    blockers.push('budget_urgency_tension');
  }
  if (pressureMotives.length > 0 && stableMotives.length > 0 && budgetPressureMedium) {
    blockers.push('mixed_motive_tension');
  }
  if ((urgency === 'last' || urgency === 'low_stock') && restockEasy && alternativePlan === 'clear') {
    blockers.push('wait_vs_buy_tension');
  }
  if (impulseHigh && (desire >= 4 || goal === 'set')) {
    blockers.push('impulse_conflict');
  }
  if (bonusClampActive) {
    blockers.push('bonus_pressure_tension');
  }
  if (!balancedScores && output.decision !== 'THINK') {
    blockers.push('score_axis_imbalance');
  }

  const uniqueBlockers = Array.from(new Set(blockers));

  const signals: string[] = [];
  if (hasSufficientCriticalCoverage) signals.push('critical_questions_answered');
  if (lowUnknownCount) signals.push('high_impact_inputs_stable');
  if (notLowConfidence) signals.push('confidence_above_floor');
  if (noTrustGate && notFallbackDegraded) signals.push('no_fallback_state');
  if (decisionAligned) signals.push(output.decision === 'THINK' ? 'clear_hold_path' : 'score_direction_concentrated');
  if (pressureMotives.length === 0 || stableMotives.length > 0) signals.push('motive_signal_explained');
  if (uniqueBlockers.length === 0) signals.push('no_major_conflicts');

  const isHighSignalForBandNarrowing = uniqueBlockers.length === 0;
  const bandNarrowingApplied = isHighSignalForBandNarrowing;
  const bandNarrowingReason = bandNarrowingApplied
    ? 'high_signal_aligned'
    : uniqueBlockers.some((value) => value.includes('tension') || value.includes('conflict'))
      ? 'conflicting_signals'
      : uniqueBlockers.includes('fallback_or_trust_gate_active')
        ? 'fallback_state'
        : uniqueBlockers.includes('low_confidence_trace')
          ? 'low_confidence'
          : uniqueBlockers.includes('ambiguous_decision_signal') || uniqueBlockers.includes('score_axis_imbalance')
            ? 'ambiguous_path'
            : 'insufficient_signal';

  return {
    isHighSignalForBandNarrowing,
    bandNarrowingApplied,
    bandNarrowingReason,
    bandNarrowingSignals: signals,
    bandNarrowingBlockedBy: uniqueBlockers,
    effectiveBandHalfWidth: bandNarrowingApplied ? NARROW_BAND_HALF_WIDTH : DEFAULT_BAND_HALF_WIDTH,
    answeredCriticalCount,
    totalCriticalQuestions,
  };
}
