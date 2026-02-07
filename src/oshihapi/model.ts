export type Locale = 'ja';
export type Mode = 'urgent' | 'normal';
export type Category = 'merch';

export type ItemKind = 'goods' | 'blind_draw' | 'used' | 'preorder' | 'ticket';

export type QuestionType = 'single' | 'multi' | 'scale' | 'number' | 'text';

export type Decision = 'BUY' | 'THINK' | 'SKIP';
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

  options?: Option[];

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
  thresholds: { buy: number; skip: number };
  unknownPenaltyPerTag: number; // penalty per "unknown" tag found
  blindDrawCap: { min: number; max: number };
};

export type InputMeta = {
  itemName?: string;
  priceYen?: number;
  deadline?: 'today' | 'tomorrow' | 'in3days' | 'in1week' | 'unknown';
  itemKind?: ItemKind;
};

export type DecisionRun = {
  runId: string;
  createdAt: number;
  locale: Locale;
  category: Category;
  mode: Mode;
  meta: InputMeta;
  answers: Record<string, any>;
  output: DecisionOutput;
};

export type ReasonItem = { id: string; text: string; severity?: 'info'|'warn'|'strong' };
export type ActionItem = { id: string; text: string; linkOut?: { label: string; url: string } };

export type DecisionOutput = {
  decision: Decision;
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
};
