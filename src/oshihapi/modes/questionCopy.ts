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
    q_impulse_axis_short: {
      title: "今の気持ち、どれに近い？",
      options: {
        plan: { label: "見返す/保管までイメージできてる（計画型）" },
        mood: { label: "今のテンションで欲しい（計画はまだ）" },
        both: { label: "両方ある（計画もあるし、今も高まってる）" },
        unknown: { label: "まだわからない" },
      },
    },
    q_regret_impulse: { title: "いまの気分、どれが近い？" },
    q_long_note: { title: "AIに相談したいことをメモしよう" },

    q_storage_fit: { title: "おうちに置くとこ、ある？", options: { CONFIRMED: { label: "あるよ！（もう決めた）" }, PROBABLE: { label: "たぶんある…！（片付ければ）" }, NONE: { label: "いまはない…" }, UNKNOWN: { label: "わかんない（先に見てくる）" } } },
    q_price_feel: { title: "お値段の納得感はどう？", options: { good: { label: "いい感じ" }, normal: { label: "ふつう" }, high: { label: "ちょっと高め" }, unknown: { label: "まだ比べてない" } } },
    q_storage_space: { title: "置き場所だいじょうぶ？", options: { enough: { label: "問題ない" }, adjust: { label: "少し工夫する" }, tight: { label: "かなりきびしい" } } },
    q_alternative_plan: { title: "見送るなら別プランある？", options: { clear: { label: "あるよ" }, maybe: { label: "たぶんある" }, none: { label: "ないかも" } } },
    q_addon_common_info: { title: "必要な情報、そろってる？" },
    q_addon_common_priority: { title: "今月の優先度は高い？" },
    q_addon_goods_compare: { title: "似てるグッズと比べられた？" },
    q_addon_goods_portability: { title: "使う場面、イメージできる？" },

    q_addon_goods_collection_goal: { title: "集める目的、どれが近い？" },
    q_addon_goods_duplicate_tolerance: { title: "同じのが出ても平気？" },
    q_addon_goods_paper_care: { title: "紙もの、どうしまっておく？" },
    q_addon_goods_paper_view_freq: { title: "あとで見返すことある？" },
    q_addon_goods_wear_freq: { title: "どのくらい使いそう？" },
    q_addon_goods_wear_fit: { title: "サイズや雰囲気、合いそう？" },
    q_addon_goods_display_space_plan: { title: "置き場所プランある？" },
    q_addon_goods_display_move_risk: { title: "運ぶときの心配は？" },
    q_addon_goods_tech_compat: { title: "対応チェックできてる？" },
    q_addon_goods_tech_after_use: { title: "現場のあとも使う？" },
    q_addon_goods_itabag_target: { title: "完成イメージはどのくらい決まってる？" },
    q_addon_blind_draw_cap: { title: "回す回数の上限きめた？" },
    q_addon_blind_draw_exit: { title: "やめどきライン、ある？" },
    q_addon_ticket_schedule: { title: "日程や移動、だいじょうぶ？" },
    q_addon_ticket_resale_rule: { title: "キャンセル・譲渡ルール見た？" },
    q_addon_preorder_timeline: { title: "到着まで待てそう？" },
    q_addon_preorder_restock: { title: "再販の可能性しらべた？" },
    q_addon_used_condition: { title: "中古の状態、受け入れられる？" },
    q_addon_used_price_gap: { title: "新品との差額、納得できる？" },
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
    q_impulse_axis_short: {
      title: "今の気持ち、どれに近い？",
      options: {
        plan: { label: "見返す/保管までイメージできてる（計画型）" },
        mood: { label: "今のテンションで欲しい（計画はまだ）" },
        both: { label: "両方ある（計画もあるし、今も高まってる）" },
        unknown: { label: "まだわからない" },
      },
    },
    q_regret_impulse: { title: "現在のメンタル状態、どれに近い？" },
    q_long_note: { title: "AI相談用メモを残す" },

    q_storage_fit: { title: "置き場ある？（棚/ケース確保済み？）", options: { CONFIRMED: { label: "確保済み（勝ち）" }, PROBABLE: { label: "片付ければいける" }, NONE: { label: "今はムリ（圧迫）" }, UNKNOWN: { label: "未確認（先に確認）" } } },
    q_price_feel: { title: "価格感、相場的にどう？", options: { good: { label: "納得" }, normal: { label: "標準" }, high: { label: "やや高" }, unknown: { label: "未比較" } } },
    q_storage_space: { title: "保管キャパは確保できる？", options: { enough: { label: "問題なし" }, adjust: { label: "調整が必要" }, tight: { label: "厳しい" } } },
    q_alternative_plan: { title: "見送り時の代替案は？", options: { clear: { label: "明確にある" }, maybe: { label: "候補あり" }, none: { label: "特にない" } } },
    q_addon_common_info: { title: "判断材料は十分に揃ってる？" },
    q_addon_common_priority: { title: "今月案件の中で優先度は？" },
    q_addon_goods_compare: { title: "類似案件との比較は済んだ？" },
    q_addon_goods_portability: { title: "運用シーンを想定できてる？" },

    q_addon_goods_collection_goal: { title: "回収目的はどれに近い？" },
    q_addon_goods_duplicate_tolerance: { title: "被り耐性は？" },
    q_addon_goods_paper_care: { title: "紙もの保管プランある？" },
    q_addon_goods_paper_view_freq: { title: "見返し頻度は？" },
    q_addon_goods_wear_freq: { title: "運用頻度の見込みは？" },
    q_addon_goods_wear_fit: { title: "サイズ・雰囲気の適合度は？" },
    q_addon_goods_display_space_plan: { title: "展示スペース計画は？" },
    q_addon_goods_display_move_risk: { title: "搬送・破損リスクは？" },
    q_addon_goods_tech_compat: { title: "互換確認の進捗は？" },
    q_addon_goods_tech_after_use: { title: "現場後の運用予定は？" },
    q_addon_goods_itabag_target: { title: "完成イメージの具体度は？" },
    q_addon_blind_draw_cap: { title: "回数上限（天井管理）は決めた？" },
    q_addon_blind_draw_exit: { title: "撤退ラインは設定済み？" },
    q_addon_ticket_schedule: { title: "日程・移動の実行性は？" },
    q_addon_ticket_resale_rule: { title: "キャンセル・譲渡規約は確認済み？" },
    q_addon_preorder_timeline: { title: "到着待機を許容できる？" },
    q_addon_preorder_restock: { title: "再販導線の確認状況は？" },
    q_addon_used_condition: { title: "中古状態リスクは許容範囲？" },
    q_addon_used_price_gap: { title: "新品差額の妥当性は？" },
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
