import type { SituationChip } from "./types";

/**
 * 推し活向け「状況から選ぶ」チップ
 * 文字数は短め、ちょいラフに。
 */
export const SITUATION_CHIPS_JA_OSHIKATSU: SituationChip[] = [
  {
    id: "urgent_deadline",
    label: "締切ギリ（急いでる）",
    modeHint: "short",
    chips: ["時間がない", "今は速度が優先", "まず仮判定"],
  },
  {
    id: "in_store_now",
    label: "目の前にある（店頭/会場）",
    modeHint: "short",
    chips: ["勢いが入りやすい", "一回深呼吸", "最短で確認"],
  },
  {
    id: "expensive",
    label: "お値段つよい（1.5万円〜）",
    modeHint: "long",
    chips: ["後悔コスト大", "整理して納得したい", "未来の自分のため"],
  },
  {
    id: "many_options",
    label: "候補が渋滞（3つ以上）",
    modeHint: "long",
    chips: ["比較が必要", "選び疲れ注意", "優先順位を決める"],
  },
  {
    id: "travel",
    label: "遠征あり（交通/宿）",
    modeHint: "long",
    chips: ["お金+時間が動く", "体力も含めて", "全体で判断"],
  },
  {
    id: "cooldown",
    label: "いったん冷ます（24h）",
    modeHint: "medium",
    chips: ["テンションを整える", "保留条件を作る", "後悔を減らす"],
  },
  {
    id: "always_available",
    label: "いつでも買えそう",
    modeHint: "medium",
    chips: ["焦らなくてOK", "今じゃなくてもいい", "保留が強い"],
  },
  {
    id: "limited_anxiety",
    label: "限定で焦ってる（FOMO）",
    modeHint: "medium",
    chips: ["焦りは自然", "確認してからでも遅くない", "冷静ルートへ"],
  },
  {
    id: "resale_check",
    label: "中古/相場で冷静になりたい",
    modeHint: "medium",
    chips: ["相場は目が覚める", "逃げ道が増える", "保留の根拠に"],
  },
  {
    id: "already_overbudget",
    label: "今月もう使いすぎた",
    modeHint: "medium",
    chips: ["予算圧が強い", "上限の再確認", "保留orやめる寄り"],
  },
  {
    id: "need_to_discuss",
    label: "誰かに相談してから",
    modeHint: "long",
    chips: ["条件が多い", "外部要因あり", "整理して相談"],
  },
];
