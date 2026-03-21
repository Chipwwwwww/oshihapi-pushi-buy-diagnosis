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
export type RandomGoodsPlannerPath =
  | 'continue_a_little_more'
  | 'stop_now'
  | 'switch_to_exchange_path'
  | 'stop_drawing_buy_singles'
  | 'stop_drawing_check_used_market'
  | 'step_back_from_completion_pressure';
export type HoldSubtype =
  | 'info_missing'
  | 'budget_pain'
  | 'impulse_cooldown'
  | 'condition_not_ready'
  | 'risk_uncertain';
export type MerchMethod = 'USED_SINGLE' | 'BOX' | 'BLIND_DRAW' | 'PASS';

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

export type ResultInputsSummaryTrace = {
  tags: string[];
  unknownCount: number;
  impulseFlag: boolean;
  futureUseFlag: boolean;
  downgradeFlags: string[];
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
    randomGoodsPlan?: RandomGoodsPlan;
  };
  decision: Decision;
  holdSubtype?: HoldSubtype;
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
  randomGoodsPlan?: RandomGoodsPlan;
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
