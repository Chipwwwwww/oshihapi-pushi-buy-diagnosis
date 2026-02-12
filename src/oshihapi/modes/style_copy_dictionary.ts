/**
 * style_copy_dictionary.ts (Latest)
 * - StyleMode: standard/kawaii/oshi
 * - Copy ONLY (question prompt/options/result explain/advice/share)
 * - Invariant: logic-level IDs and option values must not change.
 */

export type StyleModeId = "standard" | "kawaii" | "oshi";

export type QuestionId =
  // context
  | "q_item_type"
  | "q_urgency_deadline"
  | "q_budget_impact"
  | "q_payment_timing"
  // core
  | "q_market_price"
  | "q_regret_if_skip"
  | "q_regret_if_buy"
  | "q_use_frequency"
  | "q_space_storage"
  | "q_duplicate_inventory"
  | "q_alt_satisfaction"
  | "q_impulse_state"
  | "q_support_goal"
  // risk/reality
  | "q_authenticity_risk"
  | "q_return_policy"
  | "q_future_conflicts"
  | "q_storage_cost"
  // addons
  | "q_ticket_total_cost"
  | "q_ticket_schedule_burden"
  | "q_ticket_purpose_clarity"
  | "q_gacha_stop_line"
  | "q_gacha_duplicate_tolerance"
  | "q_gacha_trade_options"
  | "q_preorder_cancel"
  | "q_preorder_release_window"
  | "q_preorder_budget_future"
  | "q_shipping_risk"
  | "q_figure_display_plan"
  | "q_digital_expiry"
  | "q_digital_replay_value"
  | "q_digital_ownership";

export interface OptionCopy {
  value: string; // LOGIC value (immutable)
  label: string; // UI label (mode-specific)
}
export interface QuestionCopy {
  title: string;
  help?: string;
  options: OptionCopy[];
}

export type Verdict = "BUY" | "WAIT" | "SKIP";
export type NextAction =
  | "buy_now"
  | "set_price_cap"
  | "market_check"
  | "cooldown_24h"
  | "declutter_first"
  | "check_inventory"
  | "set_spending_cap"
  | "rerun_later";

export interface ResultCopy {
  headline: Record<Verdict, string>;
  explain: Record<Verdict, string>;
  advicePrefix: string;
  actionLabel: Record<NextAction, string>;
  shareTemplateX: string; // placeholders: {verdict} {reasons} {actions} {sticker}
}

export interface StyleCopyPack {
  home: {
    sectionTitle: string;
    modes: Record<StyleModeId, { label: string; sub: string }>;
  };
  flow: {
    sectionTitle: string;
    questions: Record<QuestionId, QuestionCopy>;
  };
  result: ResultCopy;
}

const ACTIONS = {
  standard: {
    buy_now: "購入する",
    set_price_cap: "上限価格を決める",
    market_check: "相場を確認する",
    cooldown_24h: "24時間置く",
    declutter_first: "先に片付ける",
    check_inventory: "所持を確認する",
    set_spending_cap: "推し活予算枠を作る",
    rerun_later: "後で再診断する",
  },
  kawaii: {
    buy_now: "買っちゃお✨",
    set_price_cap: "上限きめよ💸",
    market_check: "相場みよ💸",
    cooldown_24h: "いったん24h🫧",
    declutter_first: "お部屋整えよ📦",
    check_inventory: "持ってるか確認！",
    set_spending_cap: "推し活枠つくろ💸",
    rerun_later: "あとでもう一回！",
  },
  oshi: {
    buy_now: "購入",
    set_price_cap: "cap設定",
    market_check: "相場チェック",
    cooldown_24h: "24h冷却",
    declutter_first: "収納確保",
    check_inventory: "所持チェック",
    set_spending_cap: "予算枠確保",
    rerun_later: "後で再戦",
  },
} as const;

const Q_STANDARD: Record<QuestionId, QuestionCopy> = {
  q_item_type: {
    title: "対象はどれ？",
    help: "種類によって追加質問が変わります。",
    options: [
      { value: "goods", label: "グッズ（一般）" },
      { value: "gacha", label: "ガチャ/くじ" },
      { value: "ticket", label: "チケット/現場" },
      { value: "figure", label: "フィギュア" },
      { value: "digital", label: "デジタル（配信/DL）" },
      { value: "preorder", label: "予約（受注/受取待ち）" },
    ],
  },

  q_urgency_deadline: {
    title: "締切・在庫：いつまでに決める必要がある？",
    help: "期限が近いほど「今決める」価値が上がります。",
    options: [
      { value: "soon_48h", label: "今日〜48時間以内" },
      { value: "week", label: "1週間以内" },
      { value: "anytime", label: "いつでも／不明" },
    ],
  },
  q_budget_impact: {
    title: "予算：この出費は生活費や固定費を圧迫しない？",
    options: [
      { value: "ok", label: "問題ない" },
      { value: "tight", label: "少しきつい" },
      { value: "bad", label: "かなり危ない" },
    ],
  },
  q_payment_timing: {
    title: "支払い：支払いタイミングは耐えられる？",
    options: [
      { value: "now_ok", label: "今月でもOK" },
      { value: "later_ok", label: "来月ならOK" },
      { value: "bad", label: "どちらも厳しい" },
    ],
  },

  q_market_price: {
    title: "相場：定価/中古相場と比べてどう？",
    help: "高い場合は上限を決めると後悔が減ります。",
    options: [
      { value: "good", label: "安い／定価付近" },
      { value: "meh", label: "高いが許容" },
      { value: "bad", label: "高すぎる" },
    ],
  },
  q_regret_if_skip: {
    title: "後悔（見送り）：買わなかったら後悔しそう？",
    options: [
      { value: "high", label: "かなり後悔しそう" },
      { value: "mid", label: "どちらとも言えない" },
      { value: "low", label: "後悔は少ない" },
    ],
  },
  q_regret_if_buy: {
    title: "後悔（購入）：買った後に後悔するリスクは？",
    options: [
      { value: "low", label: "低い" },
      { value: "mid", label: "中" },
      { value: "high", label: "高い" },
    ],
  },
  q_use_frequency: {
    title: "使用/飾る頻度：実際にどれくらい活躍する？",
    options: [
      { value: "often", label: "毎日〜毎週" },
      { value: "sometimes", label: "月1くらい" },
      { value: "rare", label: "ほぼ保存" },
    ],
  },
  q_space_storage: {
    title: "収納：置き場所は確保できている？",
    options: [
      { value: "ok", label: "確保済み" },
      { value: "maybe", label: "片付ければOK" },
      { value: "bad", label: "厳しい" },
    ],
  },
  q_duplicate_inventory: {
    title: "所持：同じ/似たものをすでに持っていない？",
    options: [
      { value: "none", label: "持っていない" },
      { value: "similar", label: "似たものはある" },
      { value: "same", label: "同じものがある" },
    ],
  },
  q_alt_satisfaction: {
    title: "代替：別の手段で満足できる？（写真/配信/借りる等）",
    options: [
      { value: "no", label: "代替は難しい" },
      { value: "half", label: "半分はいける" },
      { value: "yes", label: "代替で十分" },
    ],
  },
  q_impulse_state: {
    title: "衝動：今は冷静？（疲れ/眠い/テンション）",
    options: [
      { value: "calm", label: "冷静" },
      { value: "push", label: "少し勢い" },
      { value: "wild", label: "完全に勢い" },
    ],
  },
  q_support_goal: {
    title: "目的：これは応援（支援）目的？それとも自己満足？",
    options: [
      { value: "support", label: "応援したい" },
      { value: "both", label: "半々" },
      { value: "self", label: "自己満足寄り" },
    ],
  },

  q_authenticity_risk: {
    title: "公式/真贋：公式・正規である確度は？",
    help: "不安が強い場合は購入経路の見直しが有効です。",
    options: [
      { value: "high", label: "高い（公式/正規）" },
      { value: "mid", label: "普通（信頼できるが断定不可）" },
      { value: "low", label: "不安（偽物/非公式が心配）" },
    ],
  },
  q_return_policy: {
    title: "返品/返金：トラブル時の救済はある？",
    options: [
      { value: "good", label: "返品/返金可（条件明確）" },
      { value: "meh", label: "条件あり/やや不明" },
      { value: "bad", label: "不可/ほぼ無理" },
    ],
  },
  q_future_conflicts: {
    title: "来月以降：固定イベント/遠征/支払いと衝突しない？",
    options: [
      { value: "ok", label: "衝突しない" },
      { value: "tight", label: "やや不安" },
      { value: "bad", label: "衝突しそう" },
    ],
  },
  q_storage_cost: {
    title: "収納コスト：片付け/管理の手間を受け入れられる？",
    options: [
      { value: "ok", label: "問題ない" },
      { value: "meh", label: "少し気になる" },
      { value: "bad", label: "負担が大きい" },
    ],
  },

  #region addons
  q_ticket_total_cost: {
    title: "（チケット）遠征/宿/グッズ込み総額は許容？",
    options: [
      { value: "ok", label: "余裕" },
      { value: "tight", label: "ギリギリ" },
      { value: "bad", label: "無理" },
    ],
  },
  q_ticket_schedule_burden: {
    title: "（チケット）体力/移動/休みの負荷は？",
    options: [
      { value: "ok", label: "問題なし" },
      { value: "meh", label: "少し重い" },
      { value: "bad", label: "かなり重い" },
    ],
  },
  q_ticket_purpose_clarity: {
    title: "（チケット）今回の目的は明確？（推しを見る/友人/初現場など）",
    options: [
      { value: "clear", label: "明確" },
      { value: "some", label: "だいたい" },
      { value: "vague", label: "曖昧" },
    ],
  },

  q_gacha_stop_line: {
    title: "（ガチャ）撤退ライン（上限）を決めて守れる？",
    options: [
      { value: "can", label: "決めて守れる" },
      { value: "maybe", label: "決められるが不安" },
      { value: "no", label: "決められない" },
    ],
  },
  q_gacha_duplicate_tolerance: {
    title: "（ガチャ）被り耐性：被った時に納得できる？",
    options: [
      { value: "ok", label: "問題ない" },
      { value: "meh", label: "少しつらい" },
      { value: "bad", label: "かなりつらい" },
    ],
  },
  q_gacha_trade_options: {
    title: "（ガチャ）交換/譲渡などの逃げ道はある？",
    options: [
      { value: "good", label: "ある（相手/場所あり）" },
      { value: "meh", label: "探せばある" },
      { value: "bad", label: "ない/難しい" },
    ],
  },

  q_preorder_cancel: {
    title: "（予約）キャンセル可否と支払い条件は？",
    options: [
      { value: "easy", label: "いつでもキャンセル可" },
      { value: "cond", label: "条件あり" },
      { value: "no", label: "不可/即支払い" },
    ],
  },
  q_preorder_release_window: {
    title: "（予約）発売/到着までの期間はストレスにならない？",
    options: [
      { value: "ok", label: "問題ない" },
      { value: "meh", label: "少し不安" },
      { value: "bad", label: "長すぎて不安" },
    ],
  },
  q_preorder_budget_future: {
    title: "（予約）将来の支払いが他の出費と重ならない？",
    options: [
      { value: "ok", label: "重ならない" },
      { value: "tight", label: "少し重なりそう" },
      { value: "bad", label: "重なりそう" },
    ],
  },

  q_shipping_risk: {
    title: "（配送）破損/返品リスクはどれくらい？",
    options: [
      { value: "low", label: "低い（返品可など）" },
      { value: "mid", label: "普通" },
      { value: "high", label: "高い/不安" },
    ],
  },
  q_figure_display_plan: {
    title: "（フィギュア）飾る/保管の具体案はある？",
    options: [
      { value: "clear", label: "ある（場所/ケースなど）" },
      { value: "some", label: "だいたいある" },
      { value: "none", label: "ない" },
    ],
  },

  q_digital_expiry: {
    title: "（デジタル）期限/視聴期限は気にならない？",
    options: [
      { value: "ok", label: "気にならない" },
      { value: "meh", label: "少し気になる" },
      { value: "bad", label: "期限が嫌" },
    ],
  },
  q_digital_replay_value: {
    title: "（デジタル）見返す価値（リピート）は高い？",
    options: [
      { value: "high", label: "高い" },
      { value: "mid", label: "中" },
      { value: "low", label: "低い" },
    ],
  },
  q_digital_ownership: {
    title: "（デジタル）所有感/保存性（DRM等）は納得できる？",
    options: [
      { value: "ok", label: "納得できる" },
      { value: "meh", label: "条件次第" },
      { value: "bad", label: "納得できない" },
    ],
  },
  #endregion addons
};

const Q_KAWAII: Record<QuestionId, QuestionCopy> = Object.fromEntries(
  Object.entries(Q_STANDARD).map(([k, v]) => {
    // lightweight cute transformation for MVP: later we can hand-tune further
    const title = v.title
      .replace("（", "（")
      .replace("：", "：")
      .replace("？", "？");
    return [k, { ...v, title }];
  })
) as any;

Q_KAWAII.q_item_type = {
  title: "どれのこと？えらんでね🫧",
  help: "種類で質問がちょっと変わるよ",
  options: [
    { value: "goods", label: "グッズ" },
    { value: "gacha", label: "ガチャ/くじ💸" },
    { value: "ticket", label: "チケット/現場" },
    { value: "figure", label: "フィギュア📦" },
    { value: "digital", label: "デジタル" },
    { value: "preorder", label: "予約" },
  ],
};

Q_KAWAII.q_budget_impact = {
  title: "おさいふ大丈夫？生活がしんどくならない？",
  options: [
    { value: "ok", label: "ぜんぜん平気！" },
    { value: "tight", label: "ちょいキツい…" },
    { value: "bad", label: "これは危険かも…" },
  ],
};

Q_KAWAII.q_impulse_state = {
  title: "いま冷静？それとも勢い？🫧",
  options: [
    { value: "calm", label: "冷静！" },
    { value: "push", label: "ちょい勢い" },
    { value: "wild", label: "勢いMAX！" },
  ],
};

const Q_OSHI: Record<QuestionId, QuestionCopy> = Object.fromEntries(
  Object.entries(Q_STANDARD).map(([k, v]) => [k, v])
) as any;

Q_OSHI.q_item_type = {
  title: "対象カテゴリは？（追加質問が分岐）",
  options: [
    { value: "goods", label: "グッズ" },
    { value: "gacha", label: "ガチャ/くじ" },
    { value: "ticket", label: "チケット/現場" },
    { value: "figure", label: "フィギュア" },
    { value: "digital", label: "デジタル" },
    { value: "preorder", label: "予約" },
  ],
};

Q_OSHI.q_space_storage.title = "収納が現場：置き場所は確保済み？";
Q_OSHI.q_market_price.title = "相場：今の値段、熱い？冷えてる？";
Q_OSHI.q_gacha_stop_line.title = "（ガチャ）撤退ライン（cap）を守れる？";

export const STYLE_COPY: Record<StyleModeId, StyleCopyPack> = {
  standard: {
    home: {
      sectionTitle: "表示スタイル",
      modes: {
        standard: { label: "標準", sub: "中立・工具感" },
        kawaii: { label: "かわいい", sub: "やさしく背中を押す" },
        oshi: { label: "推し活用語", sub: "共鳴しつつ安全" },
      },
    },
    flow: { sectionTitle: "質問", questions: Q_STANDARD },
    result: {
      headline: { BUY: "買いでOK", WAIT: "一旦待ち", SKIP: "今回は見送り" },
      explain: {
        BUY: "条件が概ね揃っています。無理のない範囲で実行に移しましょう。",
        WAIT: "判断材料はあるが、待つ価値が残っています。次の一手を決めてから再判断。",
        SKIP: "現時点ではリスク/負担が勝っています。守る判断も正解です。",
      },
      advicePrefix: "次の一手：",
      actionLabel: ACTIONS.standard as any,
      shareTemplateX: "判定：{verdict}｜理由：{reasons}｜次：{actions}",
    },
  },

  kawaii: {
    home: {
      sectionTitle: "かわいくする？",
      modes: {
        standard: { label: "標準", sub: "まじめに判断" },
        kawaii: { label: "かわいい", sub: "やさしく応援" },
        oshi: { label: "推し活用語", sub: "共鳴ワード" },
      },
    },
    flow: { sectionTitle: "しつもん", questions: Q_KAWAII },
    result: {
      headline: { BUY: "買ってOK✨", WAIT: "いったん待ち🫧", SKIP: "今回は見送り🫶" },
      explain: {
        BUY: "条件そろってるよ！無理しない範囲でGOしよっ✨",
        WAIT: "いまは待つのが強いかも。次の一手を決めてからね🫧",
        SKIP: "守れたのが勝ち！また良いタイミングがくるよ🫶",
      },
      advicePrefix: "次は：",
      actionLabel: ACTIONS.kawaii as any,
      shareTemplateX: "{verdict} {reasons} / 次は {actions} だよ✨",
    },
  },

  oshi: {
    home: {
      sectionTitle: "口調（推し活）",
      modes: {
        standard: { label: "標準", sub: "中立" },
        kawaii: { label: "かわいい", sub: "情緒ケア" },
        oshi: { label: "推し活用語", sub: "共鳴（安全）" },
      },
    },
    flow: { sectionTitle: "質問（推し活）", questions: Q_OSHI },
    result: {
      headline: { BUY: "買い", WAIT: "待ち", SKIP: "見送り" },
      explain: {
        BUY: "条件が揃ってる。正しく課金して勝ち。",
        WAIT: "待つ価値あり。cap/準備を整えて再戦。",
        SKIP: "現状は回避が強い。温存も推し活。",
      },
      advicePrefix: "次：",
      actionLabel: ACTIONS.oshi as any,
      shareTemplateX: "判定：{verdict}｜{reasons}｜次：{actions}",
    },
  },
};
