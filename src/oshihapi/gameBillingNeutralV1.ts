import type { AnswerValue, Question } from "./model";
import {
  GAME_BILLING_FULL_BASE_QUESTION_IDS,
  GAME_BILLING_Q10_SPLIT_RULE,
  GAME_BILLING_SHORT_QUESTION_IDS,
  resolveGameBillingQ10QuestionId,
} from "./question_sets";

export type GameBillingAnswers = Record<string, AnswerValue>;

type BuyStopDelta = { buyDelta: number; stopDelta: number };

export const GAME_BILLING_OPTION_DELTAS: Record<string, Record<string, BuyStopDelta>> = {
  gb_q1_need: { clear: { buyDelta: 2, stopDelta: 0 }, some: { buyDelta: 1, stopDelta: 1 }, unclear: { buyDelta: 0, stopDelta: 2 } },
  gb_q3_budget: { easy: { buyDelta: 3, stopDelta: 0 }, ok: { buyDelta: 1, stopDelta: 1 }, hard: { buyDelta: 0, stopDelta: 3 } },
  gb_q4_use: { high: { buyDelta: 2, stopDelta: 0 }, some: { buyDelta: 1, stopDelta: 1 }, low: { buyDelta: 0, stopDelta: 2 } },
  gb_q5_now: { calm: { buyDelta: 2, stopDelta: 0 }, up: { buyDelta: 1, stopDelta: 1 }, rush: { buyDelta: 0, stopDelta: 2 } },
  gb_q6_repeat: { often: { buyDelta: 2, stopDelta: 0 }, half: { buyDelta: 1, stopDelta: 1 }, rare: { buyDelta: 0, stopDelta: 2 } },
  gb_q7_alt: { none: { buyDelta: 2, stopDelta: 0 }, some: { buyDelta: 1, stopDelta: 1 }, yes: { buyDelta: 0, stopDelta: 2 } },
  gb_q8_wait: { same: { buyDelta: 2, stopDelta: 0 }, maybe: { buyDelta: 1, stopDelta: 1 }, drop: { buyDelta: 0, stopDelta: 2 } },
  gb_q9_info: { done: { buyDelta: 2, stopDelta: 0 }, part: { buyDelta: 1, stopDelta: 1 }, none: { buyDelta: 0, stopDelta: 2 } },
  gb_q10_pity: { near: { buyDelta: 2, stopDelta: 0 }, mid: { buyDelta: 1, stopDelta: 1 }, far: { buyDelta: 0, stopDelta: 2 } },
  gb_q10_value: { good: { buyDelta: 2, stopDelta: 0 }, normal: { buyDelta: 1, stopDelta: 1 }, low: { buyDelta: 0, stopDelta: 2 } },
};

const q1: Question = {
  id: "gb_q1_need",
  type: "single",
  title: "今回の課金、目的ははっきりしてる？",
  required: true,
  urgentCore: true,
  standard: true,
  options: [
    { id: "clear", label: "はっきりしている", delta: { desire: 75, regretRisk: 35 } },
    { id: "some", label: "なんとなくある", delta: { desire: 55, regretRisk: 50 } },
    { id: "unclear", label: "まだぼんやり", tags: ["unknown_goal"], delta: { desire: 45, regretRisk: 70, impulse: 65 } },
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
    { id: "gacha", label: "ガチャ", delta: { rarity: 70, impulse: 65, restockChance: 40 } },
    { id: "pass", label: "月パス/継続系", delta: { desire: 65, affordability: 65, regretRisk: 40 } },
    { id: "skin", label: "スキン/見た目", delta: { desire: 60, opportunityCost: 55 } },
    { id: "pack", label: "お得パック", delta: { affordability: 60, opportunityCost: 50 } },
    { id: "other", label: "その他", tags: ["unknown_type"], delta: { regretRisk: 55 } },
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
    { id: "easy", label: "無理なく払える", delta: { affordability: 85, regretRisk: 30 } },
    { id: "ok", label: "調整すれば払える", delta: { affordability: 60, regretRisk: 45 } },
    { id: "hard", label: "ちょっと重い", delta: { affordability: 30, regretRisk: 75, opportunityCost: 70 } },
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
    { id: "high", label: "かなりある", delta: { desire: 75, regretRisk: 35 } },
    { id: "some", label: "少しある", delta: { desire: 55, regretRisk: 50 } },
    { id: "low", label: "あまりない", delta: { desire: 40, regretRisk: 70, opportunityCost: 65 } },
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
    { id: "calm", label: "落ち着いている", delta: { impulse: 30, regretRisk: 35 } },
    { id: "up", label: "少し高まっている", delta: { impulse: 55, regretRisk: 50 } },
    { id: "rush", label: "急いで決めたい", delta: { impulse: 80, regretRisk: 70, urgency: 65 } },
  ],
};

const q6: Question = {
  id: "gb_q6_repeat",
  type: "single",
  title: "似た課金をして、満足したことが多い？",
  required: true,
  standard: true,
  options: [
    { id: "often", label: "満足したことが多い", delta: { regretRisk: 30, desire: 65 } },
    { id: "half", label: "半々", delta: { regretRisk: 50 } },
    { id: "rare", label: "満足しないことも多い", delta: { regretRisk: 75, opportunityCost: 70 } },
  ],
};

const q7: Question = {
  id: "gb_q7_alt",
  type: "single",
  title: "同じ予算で他に優先したいものはある？",
  required: true,
  standard: true,
  options: [
    { id: "none", label: "特にない", delta: { opportunityCost: 30 } },
    { id: "some", label: "少しある", delta: { opportunityCost: 55 } },
    { id: "yes", label: "ある", delta: { opportunityCost: 80, regretRisk: 65 } },
  ],
};

const q8: Question = {
  id: "gb_q8_wait",
  type: "single",
  title: "24時間待っても気持ちは変わらなさそう？",
  required: true,
  standard: true,
  options: [
    { id: "same", label: "変わらなさそう", delta: { desire: 70, impulse: 40 } },
    { id: "maybe", label: "少し変わるかも", delta: { desire: 55, impulse: 55 } },
    { id: "drop", label: "下がりそう", delta: { desire: 35, impulse: 75, regretRisk: 70 } },
  ],
};

const q9: Question = {
  id: "gb_q9_info",
  type: "single",
  title: "必要な情報（確率/内容/期限）は確認できた？",
  required: true,
  standard: true,
  options: [
    { id: "done", label: "確認できた", delta: { regretRisk: 35, opportunityCost: 40 } },
    { id: "part", label: "一部だけ", tags: ["unknown_info"], delta: { regretRisk: 55, opportunityCost: 55 } },
    { id: "none", label: "まだ", tags: ["unknown_info", "unknown_compare"], delta: { regretRisk: 75, opportunityCost: 75 } },
  ],
};

const q10Gacha: Question = {
  id: "gb_q10_pity",
  type: "single",
  title: "天井（交換）までの距離は？",
  required: true,
  standard: true,
  options: [
    { id: "near", label: "近い", delta: { rarity: 75, urgency: 65, regretRisk: 40 } },
    { id: "mid", label: "中間くらい", delta: { rarity: 55, urgency: 50, regretRisk: 50 } },
    { id: "far", label: "遠い/不明", tags: ["unknown_progress"], delta: { rarity: 40, urgency: 40, regretRisk: 65 } },
  ],
};

const q10Generic: Question = {
  id: "gb_q10_value",
  type: "single",
  title: "内容と価格のバランスはどう感じる？",
  required: true,
  standard: true,
  options: [
    { id: "good", label: "納得感がある", delta: { affordability: 75, regretRisk: 35 } },
    { id: "normal", label: "普通", delta: { affordability: 55, regretRisk: 50 } },
    { id: "low", label: "やや低い", delta: { affordability: 35, regretRisk: 70, opportunityCost: 70 } },
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
