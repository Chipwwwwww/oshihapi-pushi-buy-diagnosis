import type { SituationChip } from "./types";

/**
 * Fast "状況から選ぶ" chips.
 * Use these even if user hasn't filled any item fields.
 */
export const SITUATION_CHIPS_JA: SituationChip[] = [
  {
    id: "urgent_deadline",
    label: "急いでる（締切が近い）",
    modeHint: "short",
    chips: ["締切が近い", "今は速度が優先", "まず仮判定"],
  },
  {
    id: "in_store_now",
    label: "店頭/会場で目の前",
    modeHint: "short",
    chips: ["目の前の誘惑", "勢い買いになりやすい", "最短でブレーキ"],
  },
  {
    id: "expensive",
    label: "高い（1.5万円以上）",
    modeHint: "long",
    chips: ["高額", "後悔コストが大きい", "整理して納得したい"],
  },
  {
    id: "many_options",
    label: "候補が多い（3つ以上）",
    modeHint: "long",
    chips: ["比較が必要", "選び疲れしやすい", "優先順位を言語化"],
  },
  {
    id: "travel",
    label: "遠征/宿泊がある",
    modeHint: "long",
    chips: ["お金+時間の影響", "予定調整が絡む", "全体で判断"],
  },
  {
    id: "cooldown",
    label: "いったん冷やしたい",
    modeHint: "medium",
    chips: ["勢いを落とす", "保留条件を作る", "納得度を上げる"],
  },
  {
    id: "always_available",
    label: "いつでも買えそう",
    modeHint: "medium",
    chips: ["緊急じゃない", "焦りを外す", "保留でOK"],
  },
  {
    id: "limited_anxiety",
    label: "限定で焦ってる（FOMO）",
    modeHint: "medium",
    chips: ["FOMOが強い", "後悔しやすい場面", "確認してから決める"],
  },
  {
    id: "resale_check",
    label: "中古/相場を確認したい",
    modeHint: "medium",
    chips: ["相場で冷静になる", "代替案がある", "保留の根拠になる"],
  },
];
