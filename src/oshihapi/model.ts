import type { ParsedSearchClues, SearchClueDiagnostics } from "@/src/oshihapi/input/types";
import type { ScenarioKey, ScenarioSupportLevel } from "@/src/oshihapi/scenarioCoverage";

export type Locale = 'ja';
export type Mode = 'short' | 'medium' | 'long';
export type Decisiveness = 'careful' | 'standard' | 'quick';
export type Category = 'merch';
export type UseCase = 'merch' | 'game_billing';

export type ItemKind = 'goods' | 'blind_draw' | 'used' | 'preorder' | 'ticket' | 'game_billing';
export type GoodsSubtype = 'general' | 'itaBag_badge' | 'digital_goods' | 'e_ticket';
export type GoodsClass =
  | 'small_collection'
  | 'paper'
  | 'wearable'
  | 'display_large'
  | 'tech'
  | 'media'
  | 'itabag_badge';

export type QuestionType = 'single' | 'multi' | 'scale' | 'number' | 'text';

export type Decision = 'BUY' | 'THINK' | 'SKIP';
export type VerdictFamily = 'buy' | 'hold' | 'stop';
export type DisplayVerdictKey = 'buy' | 'stop' | 'hold_needs_check' | 'hold_conflicting' | 'hold_timing_wait';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RandomGoodsPlannerPath =
  | 'continue_a_little_more'
  | 'stop_now'
  | 'switch_to_exchange_path'
  | 'stop_drawing_buy_singles'
  | 'stop_drawing_check_used_market'
  | 'step_back_from_completion_pressure';
export type MediaEditionPlannerPath =
  | 'buy_standard_only'
  | 'buy_limited_only'
  | 'buy_one_best_fit_edition'
  | 'buy_one_only_and_stop'
  | 'buy_selective_subset'
  | 'avoid_full_set_chase'
  | 'full_set_is_not_worth_it'
  | 'full_set_is_justified'
  | 'wait_and_patch_holes_later'
  | 'use_secondary_market_for_missing_items'
  | 'do_not_force_completion'
  | 'step_back_from_completion_pressure'
  | 'step_back_from_bonus_or_completion_pressure'
  | 'choose_one_best_store'
  | 'buy_product_but_do_not_chase_all_bonuses'
  | 'split_orders_are_not_worth_it'
  | 'split_orders_are_justified'
  | 'step_back_from_bonus_pressure';
export type VenueLimitedPlannerPath =
  | 'buy_now_if_it_is_truly_hard_to_recover'
  | 'wait_for_post_event_mailorder'
  | 'skip_onsite_chase_and_check_later'
  | 'fallback_to_used_market_if_missed'
  | 'step_back_from_fomo_pressure'
  | 'wait_for_post_event_followup'
  | 'buy_live_goods_now_if_it_matches_core_motive'
  | 'skip_atmosphere_driven_goods_chase';
export type HoldSubtype =
  | 'needs_check'
  | 'conflicting'
  | 'timing_wait';
export type MerchMethod = 'USED_SINGLE' | 'BOX' | 'BLIND_DRAW' | 'PASS';
export type UsedExitPlanMode =
  | 'secondary_compare'
  | 'check_first'
  | 'timing_wait_route'
  | 'delayed_recheck'
  | 'reference_only';
export type UsedExitProviderKey = 'mercari' | 'surugaya';
export type UsedExitProviderRole = 'price_reference' | 'used_fallback' | 'stock_check';
export type UsedExitProviderVisibility = 'primary' | 'secondary' | 'collapsed';

export type ScoreDimension =
  | 'desire'
  | 'affordability'
  | 'urgency'
  | 'rarity'
  | 'restockChance'
  | 'regretRisk'
  | 'impulse'
  | 'opportunityCost';

export type Option = {
  id: string;
  label: string;
  tags?: string[];
  // Optional per-dimension delta (0-100 range, will be normalized in engine)
  delta?: Partial<Record<ScoreDimension, number>>;
};

export type Question = {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  urgentCore?: boolean;
  standard?: boolean;
  longOnly?: boolean;
  shortOnly?: boolean;

  options?: Option[];
  maxSelect?: number;

  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;

  // For scale/number: which dimension it maps to by default
  mapTo?: ScoreDimension;
  // For scale: optional label endpoints
  leftLabel?: string;
  rightLabel?: string;
};

export type QuestionSet = {
  id: string;
  locale: Locale;
  category: Category;
  version: number;
  questions: Question[];
};

export type EngineConfig = {
  decisionWeights: Record<ScoreDimension, number>;
  decisionWeightProfiles?: Partial<Record<ItemKind | GoodsSubtype, Partial<Record<ScoreDimension, number>>>>;
  thresholds: { buy: number; skip: number };
  unknownPenaltyPerTag: number; // penalty per "unknown" tag found
  blindDrawCap: { min: number; max: number };
};

export type InputMeta = {
  itemName?: string;
  searchClueRaw?: string;
  parsedSearchClues?: ParsedSearchClues;
  priceYen?: number;
  deadline?: 'today' | 'tomorrow' | 'in3days' | 'in1week' | 'unknown';
  itemKind?: ItemKind;
  goodsSubtype?: GoodsSubtype;
  goodsClass?: GoodsClass;
  basketId?: string;
  basketItemId?: string;
};

export type AnswerValue = string | number | boolean | null | string[];

export type BranchTrace = {
  id: string;
  matched: boolean;
  detail?: string;
};

export type SkippedQuestionTrace = {
  questionId: string;
  reason: string;
  source: "search_clue" | "answer" | "flow";
  detail?: string;
};

export type RunContextTrace = {
  mode: Mode;
  itemKind: ItemKind;
  goodsClass?: GoodsClass;
  styleMode?: string;
  deadline?: InputMeta["deadline"];
  hasPrice: boolean;
  hasItemName: boolean;
};

export type ResultBandTrace = {
  isHighSignalForBandNarrowing: boolean;
  bandNarrowingApplied: boolean;
  bandNarrowingReason: 'high_signal_aligned' | 'insufficient_signal' | 'conflicting_signals' | 'low_confidence' | 'fallback_state' | 'ambiguous_path';
  bandNarrowingSignals: string[];
  bandNarrowingBlockedBy: string[];
  effectiveBandHalfWidth: number;
  answeredCriticalCount: number;
  totalCriticalQuestions: number;
};

export type ResultInputsSummaryTrace = {
  tags: string[];
  unknownCount: number;
  impulseFlag: boolean;
  futureUseFlag: boolean;
  downgradeFlags: string[];
  bandTrace?: ResultBandTrace;
  verdictFamily?: VerdictFamily;
  holdSubtype?: HoldSubtype | null;
  displayVerdictKey?: DisplayVerdictKey;
  confidenceLevel?: ConfidenceLevel;
  verdictStrength?: 'strong' | 'clear' | 'lean';
  rawDecision?: Decision;
  buySignals?: string[];
  stopSignals?: string[];
  blockers?: string[];
  holdTriggers?: string[];
  factorContributions?: Array<{
    dimension: ScoreDimension;
    score: number;
    weight: number;
    signedContribution: number;
    direction: 'buy' | 'stop';
    label: string;
  }>;
  usedExit?: {
    shown: boolean;
    mode: UsedExitPlanMode | null;
    providers: UsedExitProviderKey[];
    why: string[];
    checklistFirstSuppressed: boolean;
    suppressPurchaseTone: boolean;
  };
};

export type UsedExitPlan = {
  mode: UsedExitPlanMode;
  why: string[];
  whatToCheck?: string[];
  providers: Array<{
    key: UsedExitProviderKey;
    role: UsedExitProviderRole;
    visibility: UsedExitProviderVisibility;
  }>;
  whenToRecheck?: string | null;
  afterChecklist?: string[];
  suppressPurchaseTone?: boolean;
};

export type RandomGoodsPlan = {
  detected: boolean;
  scenarioKey: ScenarioKey;
  targetStyle: 'one_or_few' | 'full_set' | 'fun_casual' | 'mixed' | 'unknown';
  duplicateTolerance: 'low' | 'medium' | 'high' | 'unknown';
  exchangeWillingness: 'high' | 'medium' | 'low' | 'unknown';
  exchangeFriction: 'low' | 'medium' | 'high' | 'unknown';
  singlesFallback: 'now' | 'after_stop' | 'avoid' | 'unknown';
  stopBudget: 'strict' | 'soft' | 'over_limit' | 'unknown';
  chosenPath: RandomGoodsPlannerPath;
  stopLineOptimizingFor: string;
  continuingJustified: boolean;
  exchangeAssumptionChangedRecommendation: boolean;
  usedMarketRecommended: boolean;
  clampReason?: string;
  reasonFlags: string[];
  reasons: string[];
  assumptions: string[];
};

export type MediaEditionPlan = {
  detected: boolean;
  scenarioKey: ScenarioKey;
  characterVsCast: 'character_ip' | 'balanced' | 'cast_performer' | 'unknown';
  oneOshiVsBox: 'one_oshi' | 'box_group' | 'balanced' | 'unknown';
  singleVsSetIntent: 'one_symbolic_item' | 'one_best_fit_version' | 'selective_subset' | 'full_set_bundle' | 'unknown';
  satisfactionWithoutFullCompletion: 'high' | 'medium' | 'low' | 'unknown';
  collectionCompleteness: 'efficient' | 'balanced' | 'complete' | 'unknown';
  budgetAlignment: 'strong' | 'medium' | 'weak';
  editionAmbition: 'standard_only' | 'limited_preferred' | 'all_editions' | 'one_best_fit' | 'unknown';
  bonusPressure: 'low' | 'medium' | 'high' | 'unknown';
  bonusImportance: 'low' | 'medium' | 'high' | 'unknown';
  storeSplitPreference: 'one_store_ok' | 'compare_then_one' | 'multi_store_considered' | 'all_bonuses_or_bust' | 'unknown';
  splitOrderBurden: 'low' | 'medium' | 'high' | 'unknown';
  productVsBonusMotive: 'product_core' | 'balanced' | 'bonus_driven' | 'unknown';
  overpayVsMissPreference: 'overpay_more' | 'miss_more' | 'balanced' | 'unknown';
  recoveryPreference: 'buy_now_primary' | 'wait_and_patch' | 'reference_only' | 'avoid_used_market' | 'unknown';
  usedMarketComfort: 'high' | 'medium' | 'low' | 'reference_only' | 'unknown';
  completionPressureType: 'personal_standard' | 'box_group_desire' | 'bonus_store_pressure' | 'complete_collection_image' | 'mixed' | 'unknown';
  motiveRefinementAxis: 'character_one_oshi' | 'character_box_group' | 'cast_one_oshi' | 'cast_box_group' | 'balanced' | 'unknown';
  setRewardStrength: 'strong' | 'medium' | 'weak' | 'unknown';
  storeBonusScenarioDetected: boolean;
  bonusPressureChangedRecommendation: boolean;
  splitOrderBurdenChangedRecommendation: boolean;
  usedMarketCompletionScenarioDetected: boolean;
  secondaryMarketFallbackChangedRecommendation: boolean;
  bonusInflationRisk: 'low' | 'medium' | 'high' | 'unknown';
  memberVersionPreference: 'none' | 'specific_version' | 'multiple_versions' | 'unknown';
  randomGoodsAddonIntent: 'none' | 'present';
  chosenPath: MediaEditionPlannerPath;
  optimizingFor: string;
  randomGoodsStopLineAddonInvoked: boolean;
  clampReason?: string;
  reasonFlags: string[];
  reasons: string[];
  assumptions: string[];
};

export type VenueLimitedGoodsPlan = {
  detected: boolean;
  scenarioKey: ScenarioKey;
  venueContext: 'venue_limited' | 'event_limited' | 'missed_onsite' | 'other' | 'unknown';
  recoveryPlausibility: 'high' | 'medium' | 'low' | 'unknown';
  waitTolerance: 'high' | 'medium' | 'low' | 'unknown';
  firstChanceTolerance: 'high' | 'medium' | 'low' | 'unknown';
  usedFallbackWillingness: 'high' | 'medium' | 'low' | 'unknown';
  scarcityPressure: 'high' | 'medium' | 'low' | 'unknown';
  primaryMotive: 'collection_completeness' | 'event_memory' | 'practical_collecting' | 'mixed' | 'unknown';
  liveGoodsMotive: 'core_attachment' | 'symbolic_value' | 'event_atmosphere' | 'mixed' | 'unknown';
  regretAxis: 'overpay_more' | 'miss_more' | 'balanced' | 'unknown';
  postEventFollowupPlausibility: 'high' | 'medium' | 'low' | 'unknown';
  atmospherePressureChangedRecommendation: boolean;
  scarcityAssessment: 'true_scarcity' | 'followup_plausible' | 'atmosphere_pressure' | 'mixed' | 'unknown';
  chosenPath: VenueLimitedPlannerPath;
  optimizingFor: string;
  recoveryChangedRecommendation: boolean;
  usedMarketPartOfSaferPath: boolean;
  trueScarcityLikely: boolean;
  mixedMediaLiveScenarioDetected: boolean;
  clampReason?: string;
  reasonFlags: string[];
  reasons: string[];
  assumptions: string[];
};

export type DiagnosticTrace = {
  runContext: RunContextTrace;
  scenario?: {
    key: ScenarioKey;
    supportLevel: ScenarioSupportLevel;
    diagnosticsTag?: string;
  };
  shownQuestionIds: string[];
  skippedQuestionIds: string[];
  skippedQuestionTraces?: SkippedQuestionTrace[];
  branchHits: BranchTrace[];
  branchMisses: BranchTrace[];
  resultInputsSummary?: ResultInputsSummaryTrace;
  randomGoods?: RandomGoodsPlan;
  mediaEdition?: MediaEditionPlan;
  venueLimitedGoods?: VenueLimitedGoodsPlan;
  searchClue?: SearchClueDiagnostics;
  persistence?: {
    state: "fresh" | "restored" | "invalidated" | "replaySeeded";
    restoreSourceDraftId?: string;
    invalidationReason?: string;
    replaySeedRunId?: string;
    pathRestoreMode?: "restored" | "recomputed";
    lifecycle: string[];
  };
};

export type DecisionRun = {
  runId: string;
  createdAt: number;
  locale: Locale;
  category: Category;
  useCase?: UseCase;
  mode: Mode;
  decisiveness?: Decisiveness;
  meta: InputMeta;
  answers: Record<string, AnswerValue>;
  gameBillingAnswers?: Record<string, AnswerValue>;
  output: DecisionOutput;
  feedback_immediate?: FeedbackImmediate;
  behavior?: BehaviorLog;
  diagnosticTrace?: DiagnosticTrace;
};

export type ReasonItem = { id: string; text: string; severity?: 'info'|'warn'|'strong' };
export type ActionItem = { id: string; text: string; linkOut?: { label: string; url: string } };

export type DecisionOutput = {
  diagnosticTrace?: {
    resultInputsSummary: ResultInputsSummaryTrace;
    mediaEditionPlan?: MediaEditionPlan;
    randomGoodsPlan?: RandomGoodsPlan;
    venueLimitedGoodsPlan?: VenueLimitedGoodsPlan;
    usedExitPlan?: UsedExitPlan;
  };
  bandTrace?: ResultBandTrace;
  decision: Decision;
  holdSubtype?: HoldSubtype;
  verdictFamily?: VerdictFamily;
  displayVerdictKey?: DisplayVerdictKey;
  confidenceLevel?: ConfidenceLevel;
  verdictStrength?: 'strong' | 'clear' | 'lean';
  confidence: number; // 0-100
  score: number; // -1..+1
  scoreSummary: Record<ScoreDimension, number>; // 0-100
  reasons: ReasonItem[];
  actions: ActionItem[];
  merchMethod: {
    method: MerchMethod;
    blindDrawCap?: number;
    note: string;
  };
  shareText: string;
  positiveFactors?: string[];
  negativeFactors?: string[];
  blockingFactors?: string[];
  recommendationReasons?: string[];
  subtypeReason?: string;
  whyNotBuyYet?: string;
  whyNotSkipYet?: string;
  factorBuckets?: {
    desireAttachment: number;
    urgencyOpportunity: number;
    budgetPressure: number;
    readinessLogistics: number;
    uncertaintyUnknowns: number;
    impulseVolatility: number;
    itemKindRisk: number;
  };
  presentation?: DecisionPresentation;
  mediaEditionPlan?: MediaEditionPlan;
  randomGoodsPlan?: RandomGoodsPlan;
  venueLimitedGoodsPlan?: VenueLimitedGoodsPlan;
  usedExitPlan?: UsedExitPlan;
};


export type DecisionPresentation = {
  decisionLabel: '買う' | '保留' | 'やめる';
  headline: string;
  badge: string;
  note?: string;
  alternatives?: string[];
  tags?: string[];
};

export type FeedbackImmediate = "bought" | "waited" | "not_bought" | "unknown";

export type BehaviorLog = {
  time_total_ms: number;
  time_per_q_ms: number[];
  num_changes: number;
  num_backtracks: number;
  actions_clicked: string[];
};
