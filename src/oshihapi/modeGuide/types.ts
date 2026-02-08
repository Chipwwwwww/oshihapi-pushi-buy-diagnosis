export type Mode = "short" | "medium" | "long";

export type ReReleaseLikelihood = "low" | "mid" | "high" | "unknown";

export type PurchaseKind = "goods" | "ticket";

/**
 * MVP-friendly inputs: all optional; the recommender should degrade gracefully.
 * Prefer collecting only a few fields on Home, then expand later.
 */
export type ModeRecommendInput = {
  kind?: PurchaseKind;            // goods / ticket
  priceYen?: number;              // item price (ticket face value if known)
  deadlineAt?: string;            // ISO string (optional)
  deadlineHours?: number;         // remaining hours (if already computed)
  isInStore?: boolean;            // 店頭 / 会場 / 目の前
  optionsCount?: number;          // seat types / bundles / variants
  travelCostYen?: number;         // 遠征交通＋宿泊など
  isLimited?: boolean;            // 限定/数量限定
  hasResaleOption?: boolean;      // 公式リセール/二次流通が現実的
  reReleaseLikelihood?: ReReleaseLikelihood; // 再販の見込み（ユーザー主観でもOK）
  excitement0to5?: number;        // 今のテンション
  pastRegret0to5?: number;        // 過去の後悔の多さ
};

export type ModeRecommendOutput = {
  mode: Mode;
  confidencePct: number;     // 50-90くらいのざっくり目安（説明用）
  reasonChips: string[];     // 2-4個、短い理由
  detail?: string;           // 1行の補足（任意）
  followUp?: {
    suggestedMode: Mode;
    triggerLabel: string;    // 例：「保留になったら後で…」
  };
};

export type SituationChip = {
  id: string;
  label: string;             // UIにそのまま出す
  modeHint: Mode;
  chips: string[];           // タップ時に出す理由の短文（2-3）
};

export type ScenarioCard = {
  id: string;
  title: string;             // 例：「中古屋があと10分で閉店」
  example?: string;          // もう少し具体例
  kind?: PurchaseKind;
  mode: Mode;
  chips: string[];           // 2-3
  oneLine: string;           // 1行アドバイス
  tags?: string[];           // 検索/フィルタ用（将来）
};
