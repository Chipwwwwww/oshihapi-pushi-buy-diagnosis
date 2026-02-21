import type { AnswerValue, Decision, Question } from "./model";
import {
  GAME_BILLING_FULL_BASE_QUESTION_IDS,
  GAME_BILLING_Q10_SPLIT_RULE,
  GAME_BILLING_SHORT_QUESTION_IDS,
  resolveGameBillingQ10QuestionId,
} from "./question_sets";

export type GameBillingType = "gacha" | "pass" | "skin" | "pack" | "other";
export type GameBillingAnswers = Record<string, AnswerValue>;

export type GameBillingEvaluation = {
  decision: Decision;
  reasons: string[];
  nextActions: string[];
  searchSuggestions: string[];
  score: number;
};

const q1: Question = {
  id: "gb_q1_need",
  type: "single",
  title: "今回の課金、目的ははっきりしてる？",
  required: true,
  urgentCore: true,
  standard: true,
  options: [
    { id: "clear", label: "はっきりしている" },
    { id: "some", label: "なんとなくある" },
    { id: "unclear", label: "まだぼんやり" },
  ],
};

const q2: Question = {
  id: "gb_q2_type",
  type: "single",
  title: "課金タイプはどれ？",
  required: true,
  urgentCore: true,
  standard: true,
  options: [
    { id: "gacha", label: "ガチャ" },
    { id: "pass", label: "月パス/継続系" },
    { id: "skin", label: "スキン/見た目" },
    { id: "pack", label: "お得パック" },
    { id: "other", label: "その他" },
  ],
};

const q3: Question = {
  id: "gb_q3_budget",
  type: "single",
  title: "この金額、今月の範囲で無理なく払える？",
  required: true,
  urgentCore: true,
  standard: true,
  options: [
    { id: "easy", label: "無理なく払える" },
    { id: "ok", label: "調整すれば払える" },
    { id: "hard", label: "ちょっと重い" },
  ],
};

const q4: Question = {
  id: "gb_q4_use",
  type: "single",
  title: "買ったあと、使うイメージはある？",
  required: true,
  urgentCore: true,
  standard: true,
  options: [
    { id: "high", label: "かなりある" },
    { id: "some", label: "少しある" },
    { id: "low", label: "あまりない" },
  ],
};

const q5: Question = {
  id: "gb_q5_now",
  type: "single",
  title: "今の気分はどれに近い？",
  required: true,
  urgentCore: true,
  standard: true,
  options: [
    { id: "calm", label: "落ち着いている" },
    { id: "up", label: "少し高まっている" },
    { id: "rush", label: "急いで決めたい" },
  ],
};

const q6: Question = {
  id: "gb_q6_repeat",
  type: "single",
  title: "似た課金をして、満足したことが多い？",
  required: true,
  standard: true,
  options: [
    { id: "often", label: "満足したことが多い" },
    { id: "half", label: "半々" },
    { id: "rare", label: "満足しないことも多い" },
  ],
};

const q7: Question = {
  id: "gb_q7_alt",
  type: "single",
  title: "同じ予算で他に優先したいものはある？",
  required: true,
  standard: true,
  options: [
    { id: "none", label: "特にない" },
    { id: "some", label: "少しある" },
    { id: "yes", label: "ある" },
  ],
};

const q8: Question = {
  id: "gb_q8_wait",
  type: "single",
  title: "24時間待っても気持ちは変わらなさそう？",
  required: true,
  standard: true,
  options: [
    { id: "same", label: "変わらなさそう" },
    { id: "maybe", label: "少し変わるかも" },
    { id: "drop", label: "下がりそう" },
  ],
};

const q9: Question = {
  id: "gb_q9_info",
  type: "single",
  title: "必要な情報（確率/内容/期限）は確認できた？",
  required: true,
  standard: true,
  options: [
    { id: "done", label: "確認できた" },
    { id: "part", label: "一部だけ" },
    { id: "none", label: "まだ" },
  ],
};

const q10Gacha: Question = {
  id: "gb_q10_pity",
  type: "single",
  title: "天井（交換）までの距離は？",
  required: true,
  standard: true,
  options: [
    { id: "near", label: "近い" },
    { id: "mid", label: "中間くらい" },
    { id: "far", label: "遠い/不明" },
  ],
};

const q10Generic: Question = {
  id: "gb_q10_value",
  type: "single",
  title: "内容と価格のバランスはどう感じる？",
  required: true,
  standard: true,
  options: [
    { id: "good", label: "納得感がある" },
    { id: "normal", label: "普通" },
    { id: "low", label: "やや低い" },
  ],
};

const GAME_BILLING_QUESTION_MAP: Record<string, Question> = {
  gb_q1_need: q1,
  gb_q2_type: q2,
  gb_q3_budget: q3,
  gb_q4_use: q4,
  gb_q5_now: q5,
  gb_q6_repeat: q6,
  gb_q7_alt: q7,
  gb_q8_wait: q8,
  gb_q9_info: q9,
  gb_q10_pity: q10Gacha,
  gb_q10_value: q10Generic,
};

export function getGameBillingQuestions(mode: "short" | "medium" | "long", answers: GameBillingAnswers): Question[] {
  if (mode === "short") {
    return GAME_BILLING_SHORT_QUESTION_IDS.map((id) => GAME_BILLING_QUESTION_MAP[id]);
  }
  const q10QuestionId = resolveGameBillingQ10QuestionId(answers[GAME_BILLING_Q10_SPLIT_RULE.conditionQuestionId]);
  return [...GAME_BILLING_FULL_BASE_QUESTION_IDS, q10QuestionId].map((id) => GAME_BILLING_QUESTION_MAP[id]);
}

function sumMap(value: AnswerValue, map: Record<string, number>): number {
  if (typeof value !== "string") return 0;
  return map[value] ?? 0;
}

export function evaluateGameBillingV1(answers: GameBillingAnswers): GameBillingEvaluation {
  let buyScore = 0;
  let stopScore = 0;

  buyScore += sumMap(answers.gb_q1_need, { clear: 2, some: 1, unclear: 0 });
  stopScore += sumMap(answers.gb_q1_need, { clear: 0, some: 1, unclear: 2 });

  buyScore += sumMap(answers.gb_q3_budget, { easy: 3, ok: 1, hard: 0 });
  stopScore += sumMap(answers.gb_q3_budget, { easy: 0, ok: 1, hard: 3 });

  buyScore += sumMap(answers.gb_q4_use, { high: 2, some: 1, low: 0 });
  stopScore += sumMap(answers.gb_q4_use, { high: 0, some: 1, low: 2 });

  buyScore += sumMap(answers.gb_q5_now, { calm: 2, up: 1, rush: 0 });
  stopScore += sumMap(answers.gb_q5_now, { calm: 0, up: 1, rush: 2 });

  buyScore += sumMap(answers.gb_q6_repeat, { often: 2, half: 1, rare: 0 });
  stopScore += sumMap(answers.gb_q6_repeat, { often: 0, half: 1, rare: 2 });

  buyScore += sumMap(answers.gb_q7_alt, { none: 2, some: 1, yes: 0 });
  stopScore += sumMap(answers.gb_q7_alt, { none: 0, some: 1, yes: 2 });

  buyScore += sumMap(answers.gb_q8_wait, { same: 2, maybe: 1, drop: 0 });
  stopScore += sumMap(answers.gb_q8_wait, { same: 0, maybe: 1, drop: 2 });

  buyScore += sumMap(answers.gb_q9_info, { done: 2, part: 1, none: 0 });
  stopScore += sumMap(answers.gb_q9_info, { done: 0, part: 1, none: 2 });

  if (answers.gb_q2_type === "gacha") {
    buyScore += sumMap(answers.gb_q10_pity, { near: 2, mid: 1, far: 0 });
    stopScore += sumMap(answers.gb_q10_pity, { near: 0, mid: 1, far: 2 });
  } else {
    buyScore += sumMap(answers.gb_q10_value, { good: 2, normal: 1, low: 0 });
    stopScore += sumMap(answers.gb_q10_value, { good: 0, normal: 1, low: 2 });
  }

  const score = buyScore - stopScore;
  const decision: Decision = score >= 5 ? "BUY" : score <= -4 ? "SKIP" : "THINK";

  const motivationLine =
    answers.gb_q1_need === "clear"
      ? "目的がはっきりしていて、判断軸が作れている。"
      : answers.gb_q1_need === "some"
        ? "目的はあるので、条件をそろえると判断しやすい。"
        : "目的がぼんやりしているので、いったん整理が安心。";

  const strongestStateLine =
    decision === "BUY"
      ? "予算と使い道の見通しが立っている。"
      : decision === "SKIP"
        ? "今は情報か条件が不足していて、見送りが安全。"
        : "今は様子見にすると、納得感を保ちやすい。";

  const closingLine =
    decision === "BUY"
      ? "上限だけ決めて、計画的に進めよう。"
      : decision === "SKIP"
        ? "今回は見送りでOK。次の機会に回そう。"
        : "情報をひとつ足してから、もう一度判断しよう。";

  const nextActions =
    decision === "BUY"
      ? ["課金上限を先に決める", "必要情報を1分だけ再確認"]
      : decision === "SKIP"
        ? ["今回は見送ってメモだけ残す", "次回条件（予算/用途）を先に決める"]
        : ["24時間待って再確認", "評価・天井・内容の情報を確認"];

  const searchSuggestions = ["ゲーム名 評価", "ゲーム名 天井", "アイテム名 性能"].filter(Boolean);

  return {
    decision,
    reasons: [motivationLine, strongestStateLine, closingLine],
    nextActions,
    searchSuggestions,
    score,
  };
}
