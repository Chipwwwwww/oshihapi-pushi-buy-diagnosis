import type {
  AnswerValue,
  BlindDrawPlannerPath,
  BlindDrawSignalLevel,
  BlindDrawStopSignal,
  BlindDrawStoplineTrace,
  DecisionOutput,
} from "@/src/oshihapi/model";

type AnalyzeBlindDrawStoplineInput = {
  answers: Record<string, AnswerValue>;
  output: DecisionOutput;
};

function getSingleAnswer(answers: Record<string, AnswerValue>, id: string): string | undefined {
  const value = answers[id];
  return typeof value === "string" ? value : undefined;
}

function hasMotive(answers: Record<string, AnswerValue>, motive: string) {
  const motives = answers.q_motives_multi;
  return Array.isArray(motives) && motives.includes(motive);
}

function toStopSignal(score: number): BlindDrawStopSignal {
  if (score >= 3) return "hard";
  if (score >= 2) return "visible";
  return "soft";
}

function toLevel(score: number): BlindDrawSignalLevel {
  if (score >= 3) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function buildCardCopy(trace: Omit<BlindDrawStoplineTrace, "card">): BlindDrawStoplineTrace["card"] {
  const titleMap: Record<BlindDrawPlannerPath, string> = {
    continue_a_little_more: "少しだけ続けてもOK",
    stop_now: "ここで止まる線が優先",
    switch_to_exchange_path: "引き足しより交換ルートへ",
    stop_drawing_buy_singles: "追加開封より単品回収へ",
    stop_drawing_check_used_market: "追加開封より中古・単品確認へ",
    step_back_from_completion_pressure: "コンプ圧から一歩引く",
  };

  const summaryMap: Record<BlindDrawPlannerPath, string> = {
    continue_a_little_more: "楽しさは残しつつ、上限を崩さない範囲でだけ続行します。",
    stop_now: "追加で引くほど被り・予算超過の痛みが勝ちやすい状態です。",
    switch_to_exchange_path: "交換意欲はあるものの、成立前提では見積もらず条件付きで扱います。",
    stop_drawing_buy_singles: "一点狙いなら新規開封より単品回収の方がブレを抑えやすいです。",
    stop_drawing_check_used_market: "コンプ寄りでも、次の一手は新規開封より中古・単品確認が安全です。",
    step_back_from_completion_pressure: "『揃えたい』気持ちが判断を押しているので、まず停止線を守る前提に戻します。",
  };

  return {
    title: titleMap[trace.plannerPath],
    summary: summaryMap[trace.plannerPath],
    optimizationNote: `最適化対象: ${trace.optimizationTarget}`,
    assumptionChange: `前提が変わる点: ${trace.changedAssumption}`,
    exchangeGuardrail: trace.exchangeCondition,
  };
}

export function analyzeBlindDrawStopline(input: AnalyzeBlindDrawStoplineInput): BlindDrawStoplineTrace {
  const goal = getSingleAnswer(input.answers, "q_goal") ?? "single";
  const cap = getSingleAnswer(input.answers, "q_addon_blind_draw_cap") ?? "unknown";
  const exit = getSingleAnswer(input.answers, "q_addon_blind_draw_exit") ?? "unknown";
  const trade = getSingleAnswer(input.answers, "q_addon_blind_draw_trade_intent") ?? "unknown";
  const missPain = getSingleAnswer(input.answers, "q_addon_blind_draw_miss_pain") ?? "unknown";
  const budgetPain = getSingleAnswer(input.answers, "q_budget_pain") ?? "some";
  const collectionPressure = hasMotive(input.answers, "complete");

  const duplicateToleranceScore =
    (goal === "fun" ? 2 : 0) +
    (goal === "set" ? 1 : 0) +
    (exit === "complete" ? 2 : exit === "mixed" ? 1 : 0) +
    (missPain === "low" ? 1 : missPain === "mid" ? 0 : -1);
  const exchangeWillingnessScore = trade === "yes" ? 3 : trade === "maybe" ? 2 : 1;
  const exchangeFrictionScore =
    (trade === "yes" ? 1 : 2) +
    (goal === "single" ? 1 : 0) +
    (exit === "complete" ? 1 : 0) +
    (missPain === "high" ? 1 : missPain === "mid" ? 0 : -1);
  const singlesFallbackScore =
    (goal === "single" ? 2 : 0) +
    (trade === "no" ? 1 : 0) +
    (missPain === "high" ? 1 : 0) +
    (budgetPain === "hard" ? 1 : 0);
  const stopLineScore =
    (cap === "not_good" || cap === "unknown" ? 1 : 0) +
    (missPain === "high" ? 1 : 0) +
    (trade === "no" ? 1 : 0) +
    (goal === "single" ? 1 : 0);
  const stopBudgetScore =
    (budgetPain === "hard" ? 2 : budgetPain === "some" ? 1 : 0) +
    (cap === "not_good" ? 1 : 0) +
    (input.output.merchMethod.blindDrawCap != null && input.output.merchMethod.blindDrawCap <= 3 ? 1 : 0);

  const duplicateTolerance = toLevel(Math.max(1, Math.min(3, duplicateToleranceScore)));
  const exchangeWillingness = toLevel(exchangeWillingnessScore);
  const exchangeFriction = toLevel(Math.max(1, Math.min(3, exchangeFrictionScore)));
  const singlesFallbackPreference = toLevel(Math.max(1, Math.min(3, singlesFallbackScore)));
  const stopLineSignal = toStopSignal(stopLineScore);
  const stopBudgetSignal = toStopSignal(stopBudgetScore);

  let plannerPath: BlindDrawPlannerPath;
  if (
    goal === "fun" &&
    duplicateTolerance === "high" &&
    budgetPain !== "hard" &&
    (cap === "used_to_it" || cap === "neutral") &&
    missPain === "low"
  ) {
    plannerPath = "continue_a_little_more";
  } else if (
    goal === "single" &&
    exchangeWillingness === "high" &&
    exchangeFriction === "high"
  ) {
    plannerPath = "switch_to_exchange_path";
  } else if (
    goal === "single" &&
    duplicateTolerance === "low" &&
    exchangeWillingness === "low"
  ) {
    plannerPath = "stop_drawing_buy_singles";
  } else if (
    goal === "set" &&
    (budgetPain === "hard" || cap === "not_good") &&
    (collectionPressure || exit === "complete")
  ) {
    plannerPath = "step_back_from_completion_pressure";
  } else if (
    goal === "set" ||
    collectionPressure ||
    (singlesFallbackPreference === "high" && goal === "single")
  ) {
    plannerPath = "stop_drawing_check_used_market";
  } else if (stopLineSignal === "hard" || stopBudgetSignal === "hard") {
    plannerPath = "stop_now";
  } else {
    plannerPath = "continue_a_little_more";
  }

  const detectedScenario =
    plannerPath === "continue_a_little_more"
      ? "casual_fun_draw_with_visible_stopline"
      : plannerPath === "switch_to_exchange_path"
        ? "single_oshi_exchange_conditional"
        : plannerPath === "stop_drawing_buy_singles"
          ? "single_oshi_low_duplicate_low_exchange"
          : plannerPath === "step_back_from_completion_pressure"
            ? "completion_pressure_over_budget"
            : plannerPath === "stop_drawing_check_used_market"
              ? "completion_fallback_to_secondary_market"
              : "hard_stop_due_to_duplicate_risk";

  const optimizationTarget =
    plannerPath === "continue_a_little_more"
      ? "楽しさを残しつつ停止線を守ること"
      : plannerPath === "switch_to_exchange_path"
        ? "追加開封を増やさず本命到達率を上げること"
        : plannerPath === "stop_drawing_buy_singles"
          ? "被りコストを止めて一点回収へ切り替えること"
          : plannerPath === "stop_drawing_check_used_market"
            ? "追加開封より補完コストの低い経路へ寄せること"
            : plannerPath === "step_back_from_completion_pressure"
              ? "コンプ圧に引っ張られた追加開封を止めること"
              : "これ以上の上振れ期待より損失拡大を防ぐこと";

  const changedAssumption =
    plannerPath === "continue_a_little_more"
      ? "『本命を引き切る』ではなく『上限内で楽しむ』前提に切り替えています。"
      : plannerPath === "switch_to_exchange_path"
        ? "交換は成立したら得だが、未成立のまま抱える可能性も織り込みます。"
        : plannerPath === "stop_drawing_buy_singles"
          ? "次の1回が本命に化ける期待より、被り追加の確率を重く見ています。"
          : plannerPath === "stop_drawing_check_used_market"
            ? "次の開封で埋まる期待より、中古・単品で補完する確率を重く見ています。"
            : plannerPath === "step_back_from_completion_pressure"
              ? "『ここまで来たから続けたい』より、予算と被りの摩耗を優先して見ます。"
              : "期待値より停止線を守ることを優先します。";

  const exchangeCondition =
    plannerPath === "switch_to_exchange_path"
      ? "交換ルートは条件付きです。相手・レート・発送負担が揃う時だけ成立前提で見てください。"
      : exchangeWillingness === "low"
        ? "交換前提ではありません。成立しなくても困らない経路を優先しています。"
        : "交換は補助線です。成立保証のない上振れとして扱い、未成立でも止まれる線を残します。";

  const clampReason =
    plannerPath === "continue_a_little_more"
      ? `soft_stopline_${stopLineSignal}`
      : plannerPath === "switch_to_exchange_path"
        ? "exchange_conditional_not_guaranteed"
        : plannerPath === "stop_drawing_buy_singles"
          ? "single_target_duplicate_risk"
          : plannerPath === "stop_drawing_check_used_market"
            ? "secondary_market_completion_is_safer"
            : plannerPath === "step_back_from_completion_pressure"
              ? "completion_pressure_budget_clamp"
              : "stopline_hard_clamp";

  const providerRoutingHint =
    plannerPath === "switch_to_exchange_path"
      ? "conditional_exchange"
      : plannerPath === "continue_a_little_more"
        ? "deprioritize_new_draws"
        : "favor_secondary_market";

  const acceptanceTags = [
    `blind_draw_planner_path_${plannerPath}`,
    `blind_draw_detected_${detectedScenario}`,
    `blind_draw_duplicate_tolerance_${duplicateTolerance}`,
    `blind_draw_exchange_willingness_${exchangeWillingness}`,
    `blind_draw_exchange_friction_${exchangeFriction}`,
    `blind_draw_singles_fallback_${singlesFallbackPreference}`,
    `blind_draw_stop_line_${stopLineSignal}`,
    `blind_draw_stop_budget_${stopBudgetSignal}`,
    `blind_draw_clamp_${clampReason}`,
  ];

  const trace = {
    detectedScenario,
    duplicateTolerance,
    exchangeWillingness,
    exchangeFriction,
    singlesFallbackPreference,
    stopLineSignal,
    stopBudgetSignal,
    plannerPath,
    clampReason,
    optimizationTarget,
    changedAssumption,
    exchangeCondition,
    providerRoutingHint,
    acceptanceTags,
  } satisfies Omit<BlindDrawStoplineTrace, "card">;

  return {
    ...trace,
    card: buildCardCopy(trace),
  };
}
