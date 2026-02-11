export type ResultMode = "standard" | "kawaii" | "oshi";
export type Verdict = "BUY" | "THINK" | "SKIP";

export type ScenarioKey =
  | "buy_default"
  | "buy_pricecheck"
  | "buy_deadline"
  | "think_default"
  | "think_wait"
  | "skip_default"
  | "skip_budget";

type ModeTextTemplate = {
  x_280: string;
  dm_short: string;
};

type ModeDefinition = {
  labels: {
    name: string;
    disclaimer: string;
  };
  stickers: Record<ScenarioKey, string[]>;
  text: {
    templates: ModeTextTemplate;
    emoji: string[];
    kaomoji: string[];
    maxEmoji: number;
    maxKaomoji: number;
    forbiddenSubstrings: string[];
  };
};

export const MODE_PRIORITY_TAGS: Record<Verdict, string[]> = {
  BUY: ["DEADLINE", "LIMITED", "SCARCITY", "PRICECHECK"],
  THINK: ["WAIT", "BUDGET", "PRICECHECK", "FOMO"],
  SKIP: ["BUDGET", "OVERPRICE", "LOW_VALUE", "REGRET_RISK"],
};

export const SCENARIO_RESOLUTION = {
  resolve(verdict: Verdict, waitType?: string, primaryTag?: string): ScenarioKey {
    if (verdict === "BUY") {
      if (primaryTag === "PRICECHECK") return "buy_pricecheck";
      if (primaryTag === "DEADLINE" || primaryTag === "LIMITED") return "buy_deadline";
      return "buy_default";
    }

    if (verdict === "THINK") {
      if (waitType && waitType !== "none") return "think_wait";
      return "think_default";
    }

    if (primaryTag === "BUDGET" || primaryTag === "OVERPRICE") return "skip_budget";
    return "skip_default";
  },
};

const BASE_STICKERS: Record<ScenarioKey, string[]> = {
  buy_default: ["✅", "🎉", "💚"],
  buy_pricecheck: ["🔍", "🧾", "💡"],
  buy_deadline: ["⏰", "🚀", "✨"],
  think_default: ["🤔", "📝", "🌱"],
  think_wait: ["⏳", "🫖", "🧘"],
  skip_default: ["🛑", "🧊", "📦"],
  skip_budget: ["💸", "🧠", "🙅"],
};

export const MODE_DICTIONARY: Record<ResultMode, ModeDefinition> = {
  standard: {
    labels: {
      name: "標準",
      disclaimer: "表示モードは見た目・文言のみ変更します（判定は変わりません）。",
    },
    stickers: BASE_STICKERS,
    text: {
      templates: {
        x_280: "{sticker} 判定:{verdict} / 待機:{waitType}\n理由: {reasons}\n次の行動: {actions}",
        dm_short: "{sticker} {verdict}（{waitType}） 理由:{reasons} 行動:{actions}",
      },
      emoji: ["✅", "📝", "🔍", "⏳", "💸"],
      kaomoji: ["(・ω・)ノ", "(｀・ω・´)", "( ˘ω˘ )"],
      maxEmoji: 1,
      maxKaomoji: 0,
      forbiddenSubstrings: ["尊すぎ", "しんどい"],
    },
  },
  kawaii: {
    labels: {
      name: "かわいい",
      disclaimer: "かわいい表現モードです。判定ロジックやおすすめ行動は変わりません。",
    },
    stickers: {
      ...BASE_STICKERS,
      buy_default: ["🫶", "🌸", "💖"],
      think_default: ["🫧", "🧸", "🌼"],
      skip_default: ["🍵", "🕊️", "🪴"],
    },
    text: {
      templates: {
        x_280: "{sticker}{emoji} けっか→{verdict}\nまってもOK:{waitType}\nりゆう: {reasons}\nつぎ: {actions} {kaomoji}",
        dm_short: "{sticker}{emoji} {verdict} / {waitType} りゆう:{reasons} つぎ:{actions} {kaomoji}",
      },
      emoji: ["✨", "💗", "🫶", "🎀", "🌷"],
      kaomoji: ["(ू•ᴗ•ू❁)", "(๑˃ᴗ˂)ﻭ", "(｡•ㅅ•｡)♡"],
      maxEmoji: 2,
      maxKaomoji: 1,
      forbiddenSubstrings: ["爆買い", "課金圧"],
    },
  },
  oshi: {
    labels: {
      name: "推し活用語",
      disclaimer: "推し活向け表現に切り替えます。判定・理由タグ・行動提案は不変です。",
    },
    stickers: {
      ...BASE_STICKERS,
      buy_default: ["尊", "🪄", "🎫"],
      think_wait: ["作戦会議", "🗓️", "🧾"],
      skip_default: ["見送り", "🛟", "📉"],
    },
    text: {
      templates: {
        x_280: "{sticker}{emoji} 今日の判定:{verdict}\n待機タイプ:{waitType}\n根拠:{reasons}\n次アクション:{actions} {kaomoji}",
        dm_short: "{sticker}{emoji} {verdict}/{waitType} 根拠:{reasons} 次:{actions} {kaomoji}",
      },
      emoji: ["🪄", "🎫", "📣", "🛟", "🫰"],
      kaomoji: ["(ง •̀_•́)ง", "٩(ˊᗜˋ*)و", "(๑•̀ㅂ•́)و✧"],
      maxEmoji: 2,
      maxKaomoji: 1,
      forbiddenSubstrings: ["他界", "炎上"],
    },
  },
};
