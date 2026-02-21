import type { Question } from "@/src/oshihapi/model";

export type BasketQuestionStyle = "standard" | "kawaii" | "oshi";

export type BasketQuestionDefinition = {
  question: Question;
  textByStyle: Record<BasketQuestionStyle, string>;
  optionTextByStyle?: Record<string, Record<BasketQuestionStyle, string>>;
};

const style = (
  standard: string,
  kawaii: string,
  oshi: string,
): Record<BasketQuestionStyle, string> => ({ standard, kawaii, oshi });

export const basket_questions_ja: BasketQuestionDefinition[] = [
  {
    question: {
      id: "bq_shop_context",
      type: "single",
      title: "どこで買う予定？",
      required: true,
      options: [
        { id: "melonbooks", label: "メロンブックス" },
        { id: "animate", label: "アニメイト" },
        { id: "event_venue", label: "イベント会場" },
        { id: "online", label: "通販" },
        { id: "other", label: "その他" },
      ],
    },
    textByStyle: style("どこで買う予定？", "どこでお買いものする予定？", "どこでお迎え予定？"),
  },
  {
    question: {
      id: "bq_purpose",
      type: "single",
      title: "今回の目的は？",
      required: true,
      options: [
        { id: "itabag", label: "痛バ" },
        { id: "reading", label: "読む" },
        { id: "display", label: "飾る" },
        { id: "collection", label: "コレクション" },
        { id: "gift", label: "プレゼント" },
        { id: "mixed", label: "混在" },
      ],
    },
    textByStyle: style("今回の目的は？", "今回のメイン目的は？", "今回いちばん大事にしたい目的は？"),
  },
  {
    question: {
      id: "bq_total_budget_jpy",
      type: "number",
      title: "今回の合計予算（円）は？",
      required: true,
      min: 0,
      max: 999999,
      step: 100,
    },
    textByStyle: style("今回の合計予算（円）は？", "今回の予算はいくらまで？", "今回のお迎え予算（円）は？"),
  },
  {
    question: {
      id: "bq_hard_cap",
      type: "single",
      title: "予算の上限は？",
      required: true,
      options: [
        { id: "strict", label: "絶対超えない" },
        { id: "flex", label: "多少ならOK" },
        { id: "undecided", label: "未定" },
      ],
    },
    textByStyle: style("予算の上限は？", "予算ラインはどのくらい厳しめ？", "上限ラインはどうする？"),
  },
  {
    question: {
      id: "bq_time_pressure",
      type: "single",
      title: "いつまでに決めたい？",
      required: true,
      options: [
        { id: "today", label: "今日中" },
        { id: "few_days", label: "数日以内" },
        { id: "not_urgent", label: "急がない" },
        { id: "unknown", label: "わからない" },
      ],
    },
    textByStyle: style("いつまでに決めたい？", "どのくらい急ぎで決める？", "判断の期限はどれくらい？"),
  },
  {
    question: {
      id: "bq_decisiveness",
      type: "single",
      title: "判断スタイルは？",
      required: true,
      options: [
        { id: "careful", label: "慎重" },
        { id: "standard", label: "標準" },
        { id: "quick", label: "即決" },
      ],
    },
    textByStyle: style("判断スタイルは？", "決め方のテンポは？", "今回の判断テンポは？"),
  },
  {
    question: {
      id: "bq_item_name",
      type: "text",
      title: "商品名",
      required: true,
    },
    textByStyle: style("商品名", "アイテム名", "お迎えしたいものの名前"),
  },
  {
    question: {
      id: "bq_item_price_jpy",
      type: "number",
      title: "価格（円）",
      required: true,
      min: 0,
      max: 999999,
      step: 1,
    },
    textByStyle: style("価格（円）", "値段（円）", "お値段（円）"),
  },
  {
    question: {
      id: "bq_item_category",
      type: "single",
      title: "カテゴリ",
      required: true,
      options: [
        { id: "book", label: "商業本" },
        { id: "doujin", label: "同人誌" },
        { id: "standee", label: "アクスタ" },
        { id: "badge", label: "缶バッジ" },
        { id: "random_blind", label: "ランダム/ブラインド" },
        { id: "figure", label: "フィギュア" },
        { id: "media_cd_bd", label: "CD/BD" },
        { id: "apparel", label: "アパレル" },
        { id: "other", label: "その他" },
        { id: "unknown", label: "不明" },
      ],
    },
    textByStyle: style("カテゴリ", "アイテムの種類", "カテゴリを選んでね"),
  },
  {
    question: {
      id: "bq_item_rarity",
      type: "single",
      title: "再販の期待",
      required: true,
      options: [
        { id: "low", label: "低い" },
        { id: "mid", label: "中くらい" },
        { id: "high", label: "高い" },
        { id: "unknown", label: "不明" },
      ],
    },
    textByStyle: style("再販の期待", "再販されそう？", "再販チャンスの見込み"),
  },
  {
    question: {
      id: "bq_item_must_buy",
      type: "single",
      title: "必須購入？",
      required: true,
      options: [
        { id: "yes", label: "はい" },
        { id: "no", label: "いいえ" },
      ],
    },
    textByStyle: style("必須購入？", "これは優先で買う必要ある？", "これは絶対確保したい？"),
  },
];
