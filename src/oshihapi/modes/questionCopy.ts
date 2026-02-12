import type { ModeId } from "@/src/oshihapi/modes/modeState";

type OptionCopy = {
  label?: string;
};

type QuestionCopy = {
  title?: string;
  helper?: string;
  options?: Record<string, OptionCopy>;
};

export const QUESTION_COPY: Record<ModeId, Record<string, QuestionCopy>> = {
  standard: {},
  kawaii: {
    q_desire: {
      title: "これ、どれくらいトキメク？",
      helper: "0=ちょっと気になる / 5=最推し級だよ",
    },
    q_budget_pain: {
      title: "このお買い物、あとでしんどくならない？",
      options: {
        ok: { label: "ぜんぜん平気" },
        some: { label: "ちょっとだけ痛い" },
        hard: { label: "生活にひびきそう" },
        force: { label: "ムリして払うかも" },
      },
    },
    q_urgency: {
      title: "今買わないとどうなるかな？",
      options: {
        not_urgent: { label: "あとでも買えそう" },
        low_stock: { label: "在庫へってる/締切近い" },
        last: { label: "ほぼラスト/今日まで" },
        unknown: { label: "まだわからない" },
      },
    },
  },
  oshi: {
    q_desire: {
      title: "この案件、推し熱どのくらい？",
      helper: "0=様子見 / 5=最優先で回収したい",
    },
    q_budget_pain: {
      title: "この出費、オタ活資金にダメージある？",
      options: {
        ok: { label: "ノーダメ" },
        some: { label: "ちょいダメージ" },
        hard: { label: "今月しんどい" },
        force: { label: "無理課金コース" },
      },
    },
    q_urgency: {
      title: "今回収しないと取り逃しそう？",
      options: {
        not_urgent: { label: "まだ追える" },
        low_stock: { label: "残数少なめ/締切近い" },
        last: { label: "実質ラストチャンス" },
        unknown: { label: "情報不足" },
      },
    },
  },
};
