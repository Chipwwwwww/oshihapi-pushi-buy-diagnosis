/**
 * style_copy_dictionary.ts
 *
 * PURPOSE:
 * - Provide per-StyleMode copy for:
 *   - Home UI labels
 *   - Flow questions: prompt + option labels
 *   - Result explanations / advice / share templates
 *
 * IMPORTANT INVARIANT:
 * - Question IDs and option "value" are LOGIC-level (immutable).
 * - Only labels/help text vary by StyleMode.
 */

export type StyleModeId = "standard" | "kawaii" | "oshi";

export type QuestionId =
  | "q_urgency_deadline"
  | "q_budget_impact"
  | "q_market_price"
  | "q_regret_if_skip"
  | "q_regret_if_buy"
  | "q_use_frequency"
  | "q_space_storage"
  | "q_duplicate_inventory"
  | "q_alt_satisfaction"
  | "q_impulse_state"
  | "q_payment_timing"
  | "q_support_goal"
  // type addons
  | "q_ticket_total_cost"
  | "q_gacha_stop_line"
  | "q_preorder_cancel"
  | "q_shipping_risk";

export interface OptionCopy {
  value: string; // LOGIC value (do not change)
  label: string; // UI label (mode-specific)
}

export interface QuestionCopy {
  title: string;
  help?: string;
  options: OptionCopy[];
}

export interface ResultCopy {
  headline: {
    BUY: string;
    WAIT: string;
    SKIP: string;
  };
  explain: {
    BUY: string;
    WAIT: string;
    SKIP: string;
  };
  advicePrefix: string;
  shareTemplateX: string; // {verdict} {reasons} {actions} {sticker}
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

// ------------------------------------------------------------
// Questions (copy only)
// ------------------------------------------------------------

export const QUESTIONS: Record<StyleModeId, Record<QuestionId, QuestionCopy>> = {
  standard: {
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
    q_payment_timing: {
      title: "支払い：支払いタイミングは耐えられる？",
      options: [
        { value: "now_ok", label: "今月でもOK" },
        { value: "later_ok", label: "来月ならOK" },
        { value: "bad", label: "どちらも厳しい" },
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
    q_ticket_total_cost: {
      title: "（チケット）遠征/宿/グッズ込み総額は許容？",
      options: [
        { value: "ok", label: "余裕" },
        { value: "tight", label: "ギリギリ" },
        { value: "bad", label: "無理" },
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
    q_preorder_cancel: {
      title: "（予約）キャンセル可否と支払い条件は？",
      options: [
        { value: "easy", label: "いつでもキャンセル可" },
        { value: "cond", label: "条件あり" },
        { value: "no", label: "不可/即支払い" },
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
  },

  kawaii: {
    q_urgency_deadline: {
      title: "いつまでに決めなきゃ？どきどき…",
      help: "期限が近いと「今の価値」が上がるよ🫧",
      options: [
        { value: "soon_48h", label: "いま〜48時間！" },
        { value: "week", label: "1週間くらい" },
        { value: "anytime", label: "いつでも/よくわかんない" },
      ],
    },
    q_budget_impact: {
      title: "おさいふ大丈夫？生活がしんどくならない？",
      options: [
        { value: "ok", label: "ぜんぜん平気！" },
        { value: "tight", label: "ちょいキツい…" },
        { value: "bad", label: "これは危険かも…" },
      ],
    },
    q_market_price: {
      title: "相場くらべ：今の値段、どう感じる？",
      help: "上限を決めると安心だよ💸",
      options: [
        { value: "good", label: "お得/定価くらい✨" },
        { value: "meh", label: "高いけど…許容" },
        { value: "bad", label: "高すぎ！いったん深呼吸" },
      ],
    },
    q_regret_if_skip: {
      title: "見送ったら泣いちゃう？後悔しそう？",
      options: [
        { value: "high", label: "たぶん泣く🫶" },
        { value: "mid", label: "わかんない…" },
        { value: "low", label: "意外と大丈夫" },
      ],
    },
    q_regret_if_buy: {
      title: "買ったあと、後悔しちゃいそう？",
      options: [
        { value: "low", label: "しないと思う✨" },
        { value: "mid", label: "半々かな…" },
        { value: "high", label: "後悔しそう…" },
      ],
    },
    q_use_frequency: {
      title: "どれくらい使う/飾る？ちゃんと活躍する？",
      options: [
        { value: "often", label: "めっちゃ使う！" },
        { value: "sometimes", label: "たまに" },
        { value: "rare", label: "ほぼ保存かも" },
      ],
    },
    q_space_storage: {
      title: "おうちに置ける？置き場所ある？📦",
      options: [
        { value: "ok", label: "置けるよ！" },
        { value: "maybe", label: "片付けたらOK" },
        { value: "bad", label: "むずかしい…" },
      ],
    },
    q_duplicate_inventory: {
      title: "ダブりそう？似たの持ってない？",
      options: [
        { value: "none", label: "持ってない！" },
        { value: "similar", label: "似たのある" },
        { value: "same", label: "同じのある…" },
      ],
    },
    q_alt_satisfaction: {
      title: "代わりで満足できる？（写真/配信/借りる）",
      options: [
        { value: "no", label: "代わりはムリ！" },
        { value: "half", label: "半分いける" },
        { value: "yes", label: "代わりでOK" },
      ],
    },
    q_impulse_state: {
      title: "いま冷静？それとも勢い？🫧",
      options: [
        { value: "calm", label: "冷静！" },
        { value: "push", label: "ちょい勢い" },
        { value: "wild", label: "勢いMAX！" },
      ],
    },
    q_payment_timing: {
      title: "支払い、耐えられる？今月/来月どう？",
      options: [
        { value: "now_ok", label: "今月でもOK✨" },
        { value: "later_ok", label: "来月ならOK" },
        { value: "bad", label: "どっちも厳しい…" },
      ],
    },
    q_support_goal: {
      title: "これは応援の気持ち？それとも自分の満足？",
      options: [
        { value: "support", label: "応援したい！" },
        { value: "both", label: "半々かな" },
        { value: "self", label: "自分の満足寄り" },
      ],
    },
    q_ticket_total_cost: {
      title: "（チケ）遠征込みの総額、だいじょうぶ？",
      options: [
        { value: "ok", label: "余裕〜✨" },
        { value: "tight", label: "ギリギリ…" },
        { value: "bad", label: "無理かも…" },
      ],
    },
    q_gacha_stop_line: {
      title: "（ガチャ）撤退ライン決めて守れる？💸",
      options: [
        { value: "can", label: "守れる！" },
        { value: "maybe", label: "守れる…たぶん" },
        { value: "no", label: "決められない" },
      ],
    },
    q_preorder_cancel: {
      title: "（予約）キャンセルできる？支払い条件は？",
      options: [
        { value: "easy", label: "いつでもOK✨" },
        { value: "cond", label: "条件あり" },
        { value: "no", label: "不可/すぐ支払い" },
      ],
    },
    q_shipping_risk: {
      title: "（配送）壊れたりしない？返品できる？",
      options: [
        { value: "low", label: "安心！" },
        { value: "mid", label: "普通" },
        { value: "high", label: "不安…" },
      ],
    },
  },

  oshi: {
    q_urgency_deadline: {
      title: "締切いつ？現場は待ってくれない",
      help: "期限が短い＝判断コストを下げる価値が上がる。",
      options: [
        { value: "soon_48h", label: "〜48h（急げ）" },
        { value: "week", label: "〜1週間" },
        { value: "anytime", label: "不明/いつでも" },
      ],
    },
    q_budget_impact: {
      title: "予算：この課金、生活を崩さない？",
      options: [
        { value: "ok", label: "問題なし" },
        { value: "tight", label: "圧はある" },
        { value: "bad", label: "危険域" },
      ],
    },
    q_market_price: {
      title: "相場：今の値段、熱い？冷えてる？",
      help: "上限（cap）を置くと勝ちやすい。",
      options: [
        { value: "good", label: "良い（定価/お得）" },
        { value: "meh", label: "高いが許容" },
        { value: "bad", label: "高すぎ" },
      ],
    },
    q_regret_if_skip: {
      title: "見送り後悔：あとで引きずる？",
      options: [
        { value: "high", label: "引きずる" },
        { value: "mid", label: "半々" },
        { value: "low", label: "引きずらない" },
      ],
    },
    q_regret_if_buy: {
      title: "購入後悔：買って冷める可能性は？",
      options: [
        { value: "low", label: "低い" },
        { value: "mid", label: "中" },
        { value: "high", label: "高い" },
      ],
    },
    q_use_frequency: {
      title: "活躍頻度：ちゃんと現場に出る？",
      options: [
        { value: "often", label: "出る（頻繁）" },
        { value: "sometimes", label: "たまに" },
        { value: "rare", label: "保存寄り" },
      ],
    },
    q_space_storage: {
      title: "収納が現場：置き場所は確保済み？",
      options: [
        { value: "ok", label: "確保済み" },
        { value: "maybe", label: "片付ければ可" },
        { value: "bad", label: "厳しい" },
      ],
    },
    q_duplicate_inventory: {
      title: "所持チェック：ダブりの可能性は？",
      options: [
        { value: "none", label: "なし" },
        { value: "similar", label: "似たのあり" },
        { value: "same", label: "同一あり" },
      ],
    },
    q_alt_satisfaction: {
      title: "代替：別手段で回避できる？",
      options: [
        { value: "no", label: "回避不可" },
        { value: "half", label: "半分可" },
        { value: "yes", label: "回避可" },
      ],
    },
    q_impulse_state: {
      title: "衝動：今は情緒か理性か",
      options: [
        { value: "calm", label: "理性" },
        { value: "push", label: "情緒寄り" },
        { value: "wild", label: "情緒MAX" },
      ],
    },
    q_payment_timing: {
      title: "支払い：今月/来月の耐久は？",
      options: [
        { value: "now_ok", label: "今月OK" },
        { value: "later_ok", label: "来月OK" },
        { value: "bad", label: "厳しい" },
      ],
    },
    q_support_goal: {
      title: "目的：応援（支援）か自己満か",
      options: [
        { value: "support", label: "支援寄り" },
        { value: "both", label: "半々" },
        { value: "self", label: "自己満寄り" },
      ],
    },
    q_ticket_total_cost: {
      title: "（チケ）遠征込み総額：耐久できる？",
      options: [
        { value: "ok", label: "余裕" },
        { value: "tight", label: "ギリ" },
        { value: "bad", label: "無理" },
      ],
    },
    q_gacha_stop_line: {
      title: "（ガチャ）撤退ライン（cap）を守れる？",
      options: [
        { value: "can", label: "守れる" },
        { value: "maybe", label: "怪しい" },
        { value: "no", label: "無理" },
      ],
    },
    q_preorder_cancel: {
      title: "（予約）キャンセル/支払い条件：逃げ道ある？",
      options: [
        { value: "easy", label: "逃げ道あり" },
        { value: "cond", label: "条件あり" },
        { value: "no", label: "逃げ道なし" },
      ],
    },
    q_shipping_risk: {
      title: "（配送）破損/返品リスク：許容できる？",
      options: [
        { value: "low", label: "低い" },
        { value: "mid", label: "普通" },
        { value: "high", label: "高い" },
      ],
    },
  },
};

// ------------------------------------------------------------
// Per-mode copy pack
// ------------------------------------------------------------

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
    flow: { sectionTitle: "質問", questions: QUESTIONS.standard },
    result: {
      headline: { BUY: "買いでOK", WAIT: "一旦待ち", SKIP: "今回は見送り" },
      explain: {
        BUY: "条件が概ね揃っています。無理のない範囲で実行に移しましょう。",
        WAIT: "判断材料はあるが、待つ価値が残っています。次の一手を決めてから再判断。",
        SKIP: "現時点ではリスク/負担が勝っています。守る判断も正解です。",
      },
      advicePrefix: "次の一手：",
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
    flow: { sectionTitle: "しつもん", questions: QUESTIONS.kawaii },
    result: {
      headline: { BUY: "買ってOK✨", WAIT: "いったん待ち🫧", SKIP: "今回は見送り🫶" },
      explain: {
        BUY: "条件そろってるよ！無理しない範囲でGOしよっ✨",
        WAIT: "いまは待つのが強いかも。次の一手を決めてからね🫧",
        SKIP: "守れたのが勝ち！また良いタイミングがくるよ🫶",
      },
      advicePrefix: "次は：",
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
    flow: { sectionTitle: "質問（推し活）", questions: QUESTIONS.oshi },
    result: {
      headline: { BUY: "買い", WAIT: "待ち", SKIP: "見送り" },
      explain: {
        BUY: "条件が揃ってる。正しく課金して勝ち。",
        WAIT: "待つ価値あり。cap/準備を整えて再戦。",
        SKIP: "現状は回避が強い。温存も推し活。",
      },
      advicePrefix: "次：",
      shareTemplateX: "判定：{verdict}｜{reasons}｜次：{actions}",
    },
  },
};
