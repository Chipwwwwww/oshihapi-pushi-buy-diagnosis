/*
 * mode_dictionary.ts
 *
 * This file defines the presentation modes for result output in the Oshi Katsu decision tool.
 * It separates the immutable decision logic from the mutable presentation layer. Each mode
 * specifies how verdicts, wait types, reasons, and actions should be presented, including
 * labels, templates, allowed emojis/kaomojis, and sticker pools keyed by scenario. It also
 * includes helper dictionaries for resolving the primary reason tag and selecting a scenario
 * key based on the verdict and wait type.
 */

export type ModeId = "standard" | "kawaii" | "oshi";
export type Verdict = "BUY" | "WAIT" | "SKIP";
export type WaitType =
  | "cooldown_24h"
  | "wait_market"
  | "wait_restock"
  | "wait_prepare";
export type ReasonTag =
  | "budget"
  | "urgency"
  | "market"
  | "space"
  | "impulse"
  | "duplicate"
  | "use"
  | "regret"
  | "risk";
export type NextAction =
  | "buy_now"
  | "set_price_cap"
  | "market_check"
  | "cooldown_24h"
  | "declutter_first"
  | "check_inventory"
  | "set_spending_cap"
  | "rerun_later";
export type OutputKind = "x_280" | "dm_short";
export type CardKind = "square_1to1" | "story_9to16";

/**
 * scenarioKey drives sticker/one-liner selection without changing logic:
 * - WAIT uses waitType strongly
 * - BUY/SKIP uses the primary reason tag for nuance
 */
export type ScenarioKey =
  | "buy_default"
  | "buy_urgency"
  | "buy_regret"
  | "wait_cooldown_24h"
  | "wait_market"
  | "wait_restock"
  | "wait_prepare_space"
  | "wait_prepare_duplicate"
  | "wait_prepare_budget"
  | "skip_budget"
  | "skip_risk"
  | "generic";

export interface ModeRules {
  labels: {
    modeName: string;
    disclaimer: string;
    copyCta: string;
    exportCardCta: string;
    rerollStickerCta: string;
  };
  style: {
    maxEmojisInShareText: number;
    allowedEmojis: string[];
    maxKaomojiInShareText: number;
    allowedKaomoji: string[];
    forbiddenSubstrings: string[];
  };
  text: {
    verdictLabel: Record<Verdict, string>;
    waitTypeLabel: Record<WaitType, string>;
    templates: Record<OutputKind, string>;
    connectors: {
      reasonsPrefix: string;
      actionsPrefix: string;
      sep: string;
    };
  };
  stickers: Record<ScenarioKey, string[]>;
}

/*
 * MODE_PRIORITY_TAGS
 * Helps to determine which reason tag should be considered primary when multiple tags are present.
 * This does not affect the decision logic; it only influences which sticker/phrase is selected.
 */
export const MODE_PRIORITY_TAGS: {
  buy: ReasonTag[];
  wait: ReasonTag[];
  skip: ReasonTag[];
} = {
  buy: [
    "urgency",
    "regret",
    "use",
    "market",
    "risk",
    "budget",
    "space",
    "duplicate",
    "impulse",
  ],
  wait: [
    "impulse",
    "market",
    "space",
    "duplicate",
    "budget",
    "risk",
    "urgency",
    "use",
    "regret",
  ],
  skip: [
    "budget",
    "risk",
    "space",
    "duplicate",
    "impulse",
    "market",
    "urgency",
    "use",
    "regret",
  ],
};

/*
 * SCENARIO_RESOLUTION
 * Given a verdict, optional waitType, and optional primary tag, resolves a scenario key for sticker selection.
 */
export const SCENARIO_RESOLUTION = {
  resolve: (
    v: Verdict,
    wt?: WaitType,
    primary?: ReasonTag,
  ): ScenarioKey => {
    if (v === "WAIT") {
      if (wt === "cooldown_24h") return "wait_cooldown_24h";
      if (wt === "wait_market") return "wait_market";
      if (wt === "wait_restock") return "wait_restock";
      // wait_prepare nuance based on primary tag
      if (primary === "space") return "wait_prepare_space";
      if (primary === "duplicate") return "wait_prepare_duplicate";
      if (primary === "budget") return "wait_prepare_budget";
      return "wait_prepare_space";
    }
    if (v === "BUY") {
      if (primary === "urgency") return "buy_urgency";
      if (primary === "regret") return "buy_regret";
      return "buy_default";
    }
    // SKIP
    if (primary === "risk") return "skip_risk";
    return "skip_budget";
  },
};

/*
 * MODE_DICTIONARY
 * This dictionary contains the presentation rules for each mode. Each mode defines how text
 * and stickers should be constructed. These rules are used at runtime by a formatter to
 * generate user-visible output without altering the underlying decision logic.
 */
export const MODE_DICTIONARY: Record<ModeId, ModeRules> = {
  standard: {
    labels: {
      modeName: "標準",
      disclaimer: "判定ロジックは変わりません（表示だけ変わります）",
      copyCta: "文をコピー",
      exportCardCta: "画像で保存",
      rerollStickerCta: "コメントを変える",
    },
    style: {
      maxEmojisInShareText: 0,
      allowedEmojis: [],
      maxKaomojiInShareText: 0,
      allowedKaomoji: [],
      forbiddenSubstrings: [
        // keep standard neutral and professional
        "ｗ",
        "草",
        "沼",
        "尊い",
        "供給",
        "語彙力",
        "情緒",
      ],
    },
    text: {
      verdictLabel: { BUY: "買い", WAIT: "待ち", SKIP: "見送り" },
      waitTypeLabel: {
        cooldown_24h: "24h冷却",
        wait_market: "相場待ち",
        wait_restock: "再販待ち",
        wait_prepare: "準備優先",
      },
      templates: {
        x_280: "判定：{verdict}{waitType}｜理由：{reasons}｜次：{actions}",
        dm_short: "判定：{verdict}{waitType} / 理由：{reasons} / 次：{actions}",
      },
      connectors: {
        reasonsPrefix: "理由：",
        actionsPrefix: "次：",
        sep: "｜",
      },
    },
    stickers: {
      buy_default: ["判断材料は揃っています", "無理のない範囲でOK"],
      buy_urgency: ["期限優先", "締切が近いので今決める"],
      buy_regret: ["見送る後悔が大きい", "後悔リスクを優先"],
      wait_cooldown_24h: ["24h待ち", "冷却して再判断"],
      wait_market: ["相場注意", "上限価格を決める"],
      wait_restock: ["再販待ち", "情報を待って再検討"],
      wait_prepare_space: ["収納先に", "置き場所を確保する"],
      wait_prepare_duplicate: ["所持確認", "重複を避ける"],
      wait_prepare_budget: ["予算設計", "枠を作ってから検討"],
      skip_budget: ["予算優先", "生活費を圧迫しない"],
      skip_risk: ["リスク優先", "条件が揃うまで見送り"],
      generic: ["整理して再判断", "次の一手を決める"],
    },
  },
  kawaii: {
    labels: {
      modeName: "かわいい",
      disclaimer: "判定ロジックは同じだよ（口調だけ変わるよ）",
      copyCta: "コピーする",
      exportCardCta: "かわいい画像にする",
      rerollStickerCta: "もう一言！",
    },
    style: {
      maxEmojisInShareText: 2,
      allowedEmojis: ["✨", "🫶", "💸", "📦", "🫧"],
      maxKaomojiInShareText: 1,
      allowedKaomoji: ["(*´꒳`*)", "( ˘͈ ᵕ ˘͈ )", "(ง •̀_•́)ง"],
      forbiddenSubstrings: [
        // avoid anything edgy; keep it cute-safe
        "死",
        "殺",
        "下ネタ",
        "差別",
      ],
    },
    text: {
      verdictLabel: {
        BUY: "買ってOK",
        WAIT: "いったん待ち",
        SKIP: "今回は見送り",
      },
      waitTypeLabel: {
        cooldown_24h: "（24h）",
        wait_market: "（相場）",
        wait_restock: "（再販）",
        wait_prepare: "（準備）",
      },
      templates: {
        x_280:
          "{verdict}{waitType}だよ〜{emoji} {reasons} / 次は {actions} しよっ{kaomoji}",
        dm_short: "{verdict}{waitType}：{reasons} → {actions}",
      },
      connectors: {
        reasonsPrefix: "",
        actionsPrefix: "次は",
        sep: " ",
      },
    },
    stickers: {
      buy_default: ["いける！✨", "だいじょうぶ🫶", "わくわく優勝✨"],
      buy_urgency: ["今がチャンス✨", "締切まえにGO！", "急いで〜💨"],
      buy_regret: ["あとで泣かないやつ🫶", "後悔しない選択✨"],
      wait_cooldown_24h: ["今日は寝よっ…( ˘͈ ᵕ ˘͈ )", "いったん深呼吸〜🫧"],
      wait_market: ["相場は深呼吸〜💸", "上限きめよっ💸"],
      wait_restock: ["再販待ちでもOK✨", "情報まってから〜🫶"],
      wait_prepare_space: ["おうちの味方📦", "置き場所つくろっ📦"],
      wait_prepare_duplicate: ["ダブり回避！", "先に確認しよっ✨"],
      wait_prepare_budget: ["おさいふ会議💸", "推し活枠つくろ〜💸"],
      skip_budget: ["守れたのが勝ち🫶", "無理しないでえらい✨"],
      skip_risk: ["安全第一だよ🫶", "条件そろってからね✨"],
      generic: ["えらい！", "今日の自分に拍手✨"],
    },
  },
  oshi: {
    labels: {
      modeName: "推し活用語",
      disclaimer: "判定ロジックは同じ（語り口だけ変わる）",
      copyCta: "文をコピー",
      exportCardCta: "カード化",
      rerollStickerCta: "一言チェンジ",
    },
    style: {
      maxEmojisInShareText: 1,
      allowedEmojis: ["✨", "💸", "📦"],
      maxKaomojiInShareText: 0,
      allowedKaomoji: [],
      forbiddenSubstrings: [
        // MVP guardrail: avoid anything that can cause moderation issues or misunderstandings
        "下ネタ",
        "差別",
        "暴力",
        "犯罪",
        "過激",
      ],
    },
    text: {
      verdictLabel: { BUY: "買い", WAIT: "待ち", SKIP: "見送り" },
      waitTypeLabel: {
        cooldown_24h: "（24h冷却）",
        wait_market: "（相場）",
        wait_restock: "（再販）",
        wait_prepare: "（準備）",
      },
      templates: {
        x_280:
          "判定：{verdict}{waitType}。{sticker}｜理由：{reasons}｜次：{actions}",
        dm_short:
          "{verdict}{waitType}。{sticker} 理由:{reasons} 次:{actions}",
      },
      connectors: {
        reasonsPrefix: "理由：",
        actionsPrefix: "次：",
        sep: "｜",
      },
    },
    stickers: {
      buy_default: ["正しく課金、えらい", "解釈一致なら勝ち"],
      buy_urgency: ["供給ありがとう案件", "期限短い＝今決める"],
      buy_regret: ["後悔の沼回避で買い", "見送る後悔が強め"],
      wait_cooldown_24h: ["待てるオタク、強い", "情緒落ち着いてから再戦"],
      wait_market: ["相場あつい。上限決めて勝つ", "相場チェックしてからでも遅くない"],
      wait_restock: ["再販待ち、全然アリ", "情報待って最適化"],
      wait_prepare_space: ["収納が現場", "置き場所確保してから優勝"],
      wait_prepare_duplicate: ["所持チェック、えらい", "ダブり回避で勝ち"],
      wait_prepare_budget: ["財布守るのも推し活", "枠作ってから再戦"],
      skip_budget: ["財布守るのも推し活", "見送れるの、強い"],
      skip_risk: ["リスク高め、今回は回避", "条件揃うまで温存"],
      generic: ["冷静えらい", "今日の判断、助かる"],
    },
  },
};
