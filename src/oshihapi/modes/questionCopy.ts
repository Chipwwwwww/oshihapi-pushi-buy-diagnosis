import type { PresentationMode as ModeId } from "@/src/oshihapi/modes/presentationMode";

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
    q_rarity_restock: { title: "また会えそう？" },
    q_goal: { title: "今回いちばん叶えたいことは？", options: { single: { label: "推し1点狙い" }, set: { label: "セットでそろえたい" }, fun: { label: "引く体験も楽しみたい" } } },
    q_motives_multi: { title: "買いたい気持ち、どれに近い？" },
    q_hot_cold: { title: "推し枠って人気どのくらい？" },
    q_impulse_axis_short: { title: "今の欲しさ、どっちより？" },
    q_regret_impulse: { title: "いまの気分、どれが近い？" },
    q_long_note: { title: "AIに相談したいことをメモしよう" },
    gb_q1_need: { title: "今回の課金目的、はっきりしてる？" },
    gb_q2_type: { title: "どのタイプに課金する？", options: { gacha: { label: "ガチャ" }, pass: { label: "月パス系" }, skin: { label: "スキン" }, pack: { label: "お得パック" }, other: { label: "その他" } } },
    gb_q3_budget: { title: "お財布への負担はどう？", options: { easy: { label: "らくらく払える" }, ok: { label: "調整すればOK" }, hard: { label: "ちょっと重い" } } },
    gb_q4_use: { title: "使う見込みはどれくらい？" },
    gb_q5_now: { title: "いまのテンションは？", options: { calm: { label: "落ち着いてる" }, up: { label: "ちょい上がり" }, rush: { label: "今すぐ決めたい" } } },
    gb_q6_repeat: { title: "過去の課金、満足できた？" },
    gb_q7_alt: { title: "他の手段はある？" },
    gb_q8_wait: { title: "少し待つと気持ち変わりそう？" },
    gb_q9_info: { title: "必要な情報、確認できた？" },
    gb_q10_pity: { title: "天井までの距離は？" },
    gb_q10_value: { title: "内容の納得感は？" },
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
    q_rarity_restock: { title: "再販導線、ありそう？" },
    q_goal: { title: "今回の回収目的は？", options: { single: { label: "単推し回収" }, set: { label: "セット回収" }, fun: { label: "体験重視" } } },
    q_motives_multi: { title: "回収動機、どれが強い？" },
    q_hot_cold: { title: "推し枠レート、どの温度感？" },
    q_impulse_axis_short: { title: "いまの推し熱、どっち寄り？" },
    q_regret_impulse: { title: "現在のメンタル状態、どれに近い？" },
    q_long_note: { title: "AI相談用メモを残す" },
    gb_q1_need: { title: "今回の課金目的、明確？" },
    gb_q2_type: { title: "どの施策を回す？", options: { gacha: { label: "ガチャ案件" }, pass: { label: "月パス系" }, skin: { label: "スキン系" }, pack: { label: "パック案件" }, other: { label: "その他" } } },
    gb_q3_budget: { title: "資金圧はどの程度？", options: { easy: { label: "余裕あり" }, ok: { label: "調整で対応" }, hard: { label: "圧が高い" } } },
    gb_q4_use: { title: "活用見込みはある？" },
    gb_q5_now: { title: "いまの熱量は？", options: { calm: { label: "平常" }, up: { label: "高まり中" }, rush: { label: "即断モード" } } },
    gb_q6_repeat: { title: "過去課金の満足度は？" },
    gb_q7_alt: { title: "代替手段はある？" },
    gb_q8_wait: { title: "待機すると温度は変わる？" },
    gb_q9_info: { title: "必要情報の確認状況は？" },
    gb_q10_pity: { title: "天井距離はどの位置？" },
    gb_q10_value: { title: "施策内容の納得感は？" },
  },
};
