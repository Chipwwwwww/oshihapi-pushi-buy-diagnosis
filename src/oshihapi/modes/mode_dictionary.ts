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
    verdictLabel: Record<Verdict, string>;
    waitTypeLabel: Record<string, string>;
    reasonTagLabel: Record<string, string>;
    actionLabel: Record<string, string>;
  };
  explanation: {
    buy: string;
    wait: Record<string, string>;
    skip: string;
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
      verdictLabel: {
        BUY: "買う",
        THINK: "保留",
        SKIP: "やめる",
      },
      waitTypeLabel: {
        none: "待機なし",
        short: "短め",
        long: "長め",
      },
      reasonTagLabel: {
        budget: "予算負担",
        budget_ok: "予算余力",
        desire_high: "推し度高め",
        desire_low: "推し度低め",
        fomo_pressure: "焦り注意",
        rare: "希少性",
        restock: "再販見込み",
        regret_high: "後悔リスク",
        impulse_high: "勢い強め",
        impulse_rush: "高揚感優先",
        neutral_1: "条件整理",
        neutral_2: "買い方重視",
      },
      actionLabel: {
        cooldown: "24時間待つ",
        market: "相場確認",
        budget_cap: "予算上限",
        blind_cap: "回数上限",
        cooldown_10min: "10分クールダウン",
        future_use_alt: "用途再確認",
        trend_market: "相場チェック",
      },
    },
    explanation: {
      buy: "条件がそろっているので前向きに進めてOK。上限を先に決めると安心です。",
      wait: {
        none: "迷いが残るときは、情報を1つ足してから再判断すると納得しやすくなります。",
        short: "短めの待機で熱量を落ち着かせると、判断の精度が上がります。",
        long: "長めに待っても欲しさが続くか確認すると、後悔リスクを抑えられます。",
      },
      skip: "今回は見送りでOK。次の機会に使える予算と気持ちを残しましょう。",
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
      verdictLabel: {
        BUY: "かう",
        THINK: "ほりゅう",
        SKIP: "おやすみ",
      },
      waitTypeLabel: {
        none: "いったん様子見",
        short: "ちょこっと待つ",
        long: "ゆっくり待つ",
      },
      reasonTagLabel: {
        budget: "お財布しんぱい",
        budget_ok: "お財布だいじょうぶ",
        desire_high: "ときめき高め",
        desire_low: "ときめき控えめ",
        fomo_pressure: "あせり注意",
        rare: "レア度高め",
        restock: "また会えそう",
        regret_high: "あとで後悔しそう",
        impulse_high: "勢いモード",
        impulse_rush: "ドキドキ優先",
        neutral_1: "条件整理",
        neutral_2: "買い方だいじ",
      },
      actionLabel: {
        cooldown: "24時間ねかせる",
        market: "相場をみる",
        budget_cap: "上限をきめる",
        blind_cap: "回数をきめる",
        cooldown_10min: "10分ひと休み",
        future_use_alt: "使い道チェック",
        trend_market: "みんなの相場を見る",
      },
    },
    explanation: {
      buy: "いまの条件なら進んでよさそう。予算ラインだけ決めて、気持ちよくお迎えしよう。",
      wait: {
        none: "まだ迷いがあるから、情報をひとつ足してから決めると安心だよ。",
        short: "ちょこっと待つと、気持ちが整って答えが見えやすくなるよ。",
        long: "ゆっくり待っても欲しいなら、本当に大事な買い物ってわかるよ。",
      },
      skip: "今回はおやすみでOK。次のときめきのために、余力を残しておこうね。",
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
      verdictLabel: {
        BUY: "回収",
        THINK: "保留",
        SKIP: "見送り",
      },
      waitTypeLabel: {
        none: "待機なし",
        short: "小休止",
        long: "作戦待機",
      },
      reasonTagLabel: {
        budget: "資金圧",
        budget_ok: "資金余力",
        desire_high: "推し熱高",
        desire_low: "推し熱控えめ",
        fomo_pressure: "取り逃し圧",
        rare: "希少枠",
        restock: "再販期待",
        regret_high: "後悔警戒",
        impulse_high: "勢い強",
        impulse_rush: "高揚優先",
        neutral_1: "条件整理",
        neutral_2: "買い方戦略",
      },
      actionLabel: {
        cooldown: "24h作戦待機",
        market: "相場巡回",
        budget_cap: "上限固定",
        blind_cap: "天井管理",
        cooldown_10min: "10分クールダウン",
        future_use_alt: "用途再点検",
        trend_market: "界隈相場チェック",
      },
    },
    explanation: {
      buy: "回収条件はそろってる。上限だけ先に固定して、気持ちよくお迎えしよう。",
      wait: {
        none: "判断材料を1つ足してから再判定すると、納得度が上がる。",
        short: "小休止で熱量を整えると、取り逃し不安に流されにくい。",
        long: "作戦待機しても欲しいなら、優先度の高い案件と判断しやすい。",
      },
      skip: "今回は見送りで正解。次の現場・次弾に向けて資金と気力をキープしよう。",
    },
  },
};
