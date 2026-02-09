import type { DecisionRun, QuestionSet, ScoreDimension } from './model';

const dimensionMeta: Record<ScoreDimension, { label: string; greek: string }> = {
  desire: { label: "欲しさ", greek: "α" },
  affordability: { label: "余裕度", greek: "β" },
  urgency: { label: "急ぎ度", greek: "γ" },
  rarity: { label: "希少性", greek: "δ" },
  restockChance: { label: "再販確率", greek: "ε" },
  regretRisk: { label: "後悔リスク", greek: "ζ" },
  impulse: { label: "衝動性", greek: "η" },
  opportunityCost: { label: "機会費用", greek: "θ" },
};

const itemKindLabel: Record<string, string> = {
  goods: "グッズ",
  blind_draw: "くじ",
  used: "中古",
  preorder: "予約",
  ticket: "チケット",
};

function formatAnswerValue(questionId: string, run: DecisionRun, questionSet: QuestionSet) {
  const question = questionSet.questions.find((q) => q.id === questionId);
  if (!question) return undefined;
  const value = run.answers[questionId];
  if (value == null || value === "") return undefined;
  if (question.type === 'single' && question.options) {
    const option = question.options.find((opt) => opt.id === value);
    return option ? option.label : String(value);
  }
  if (question.type === 'multi' && question.options && Array.isArray(value)) {
    const labels = value
      .map((entry) => question.options?.find((opt) => opt.id === entry)?.label ?? entry)
      .filter(Boolean);
    return labels.length ? labels.join(' / ') : undefined;
  }
  if (question.type === 'scale' || question.type === 'number') {
    return `${value}`;
  }
  if (question.type === 'text') {
    return String(value).trim();
  }
  return String(value);
}

function buildAnswerSummary(run: DecisionRun, questionSet: QuestionSet) {
  return questionSet.questions
    .map((q) => {
      const formatted = formatAnswerValue(q.id, run, questionSet);
      if (!formatted) return null;
      return `- ${q.title}: ${formatted}`;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function buildScoreSummary(run: DecisionRun) {
  return Object.entries(run.output.scoreSummary)
    .map(([dim, value]) => {
      const meta = dimensionMeta[dim as ScoreDimension];
      return `${meta.greek}(${meta.label})=${Math.round(value)}`;
    })
    .join(", ");
}

function buildInteractions(run: DecisionRun) {
  const s = run.output.scoreSummary;
  const items: string[] = [];
  if (s.desire >= 70 && s.affordability <= 45) {
    items.push("αβ: 欲しさ高 × 余裕低 → 衝動買いリスク");
  }
  if (s.urgency >= 70 && s.restockChance >= 60) {
    items.push("γε: 急ぎ高 × 再販高 → 慌て買い注意");
  }
  if (s.regretRisk >= 65 && s.impulse >= 60) {
    items.push("ζη: 後悔高 × 衝動高 → 後悔リスク増幅");
  }
  if (s.opportunityCost >= 60 && s.affordability <= 50) {
    items.push("θβ: 代替支出の圧 × 余裕低 → 優先度の再確認");
  }
  if (s.urgency >= 70) {
    const term = Math.round(Math.pow(Math.max(0, s.urgency - 70), 2));
    items.push(`max(0, γ-70)^2 = ${term}（締切プレッシャーの非線形増幅）`);
  }
  return items.length ? items.join('\n') : '該当なし';
}

function buildChecklist(run: DecisionRun) {
  const s = run.output.scoreSummary;
  const items: string[] = [];
  if (s.affordability <= 50) items.push("今回の上限金額はいくら？");
  if (s.urgency >= 70) items.push("締切や在庫の確度は？");
  if (s.restockChance >= 60) items.push("再販/再入荷の情報は出ている？");
  if (s.regretRisk >= 60) items.push("一晩置いたときの気持ちは？");
  if (s.impulse >= 60) items.push("疲れ/焦りが判断を強めていない？");
  if (s.opportunityCost >= 60) items.push("同時期の他支出との優先度は？");
  if (s.desire <= 45) items.push("欲しさは一時的？推し度の再確認");
  return items.length
    ? items.map((item) => `- ${item}`).join('\n')
    : '- 予算上限\n- 購入目的\n- 置き場所の確保';
}

export function buildLongPrompt({
  run,
  questionSet,
}: {
  run: DecisionRun;
  questionSet: QuestionSet;
}) {
  const meta = run.meta;
  const answerSummary = buildAnswerSummary(run, questionSet);
  const scoreSummary = buildScoreSummary(run);
  const interactions = buildInteractions(run);
  const checklist = buildChecklist(run);
  const note = formatAnswerValue('q_long_note', run, questionSet);
  const motives = formatAnswerValue('q_motives_multi', run, questionSet);
  const impulseAxis = formatAnswerValue('q_impulse_axis_short', run, questionSet);
  const item = meta.itemName ? `「${meta.itemName}」` : "この購入";
  const kind = meta.itemKind ? itemKindLabel[meta.itemKind] ?? meta.itemKind : '不明';
  const price = meta.priceYen ? `${meta.priceYen}円` : '不明';
  const deadline = meta.deadline ?? '未定';
  const motiveLine = `- 購入動機（複数選択）: ${motives || "（未回答）"}`;
  const impulseLine = impulseAxis
    ? `- 欲しさ軸（0-5）: ${impulseAxis}（0=未来寄り, 5=快感寄り）`
    : "";

  return `あなたは推し活の購買判断を整理するアシスタントです。
以下の情報を読み、迷っている点を整理して、次に取るべき行動を具体的に提案してください。

## コンテキスト
- 対象: ${item}
- 種別: ${kind}
- 価格: ${price}
- 締切: ${deadline}
- 診断結果: ${run.output.decision} / 信頼度 ${run.output.confidence}%

## 回答サマリー
${answerSummary || "（回答サマリーなし）"}
${motiveLine}
${impulseLine ? `\n${impulseLine}` : ""}

## 指標サマリー（α..θ）
${scoreSummary}

## 発火した交差項 / 非線形
${interactions}

## 次に確認すべきチェックリスト
${checklist}

## 相談したいポイント
${note || "（特になし）"}

出力は以下の順でお願いします：
1. 迷いの核心（1〜2文）
2. 今すぐやること（3つ）
3. もし買うならの条件（上限/期限/代替案）
4. 見送る場合のフォロー（気持ちを守る選択肢）`;
}
