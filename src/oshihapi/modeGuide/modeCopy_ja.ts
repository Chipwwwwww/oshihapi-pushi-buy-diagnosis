import type { Mode } from "./types";

export const MODE_COPY_JA: Record<
  Mode,
  { title: string; sub: string; tagline: string; when: string[] }
> = {
  short: {
    title: "短診断（30秒）",
    sub: "急いで決めたい／店頭で迷ってる",
    tagline: "今の勢いを“事故らせない”ための最短ブレーキ。",
    when: [
      "店頭・会場で目の前にある",
      "締切まで数分〜2時間",
      "迷いはあるけど今すぐ動く必要がある",
    ],
  },
  medium: {
    title: "中診断（1〜2分）",
    sub: "ふつうに悩んでる／締切が今日〜数日",
    tagline: "迷いポイントだけ押さえて、納得して決める。",
    when: [
      "締切が今日〜数日",
      "価格は中くらい、でも後悔が怖い",
      "買う/保留の条件を作りたい",
    ],
  },
  long: {
    title: "長診断（2分〜）",
    sub: "高額／遠征／候補が多い／後悔したくない",
    tagline: "“推し活の大きい買い物”を後悔しないための整理。",
    when: [
      "高額（目安：15,000円以上）",
      "席種/セットが多く比較が必要",
      "遠征・宿泊など影響が大きい",
    ],
  },
};

// Conflict microcopy (e.g., urgent + expensive)
export const MODE_CONFLICT_TIP_JA =
  "時間がないのでまず短/中で仮判定 → 保留になったら後で長で再診断がおすすめ。";
