# ChatGPT Context Pack (R-20260213-01)

## Git Snapshot

### git rev-parse --show-toplevel
```text
/workspace/oshihapi-pushi-buy-diagnosis
```

### git rev-parse --abbrev-ref HEAD
```text
work
```

### git rev-parse HEAD
```text
eb2740a6eff0efbd44ed048901dda18b07267707
```

### git branch -a
```text
* work
```

### git branch -vv
```text
* work eb2740a Merge pull request #76 from Chipwwwwww/codex/export-repo-files-to-chatgpt-context-pack
```

### git remote -v
```text
```

### git status --porcelain
```text
?? ops/chatgpt_export/chatgpt_context_pack_R-20260213-01.md
```

### git log -n 30 --oneline --decorate
```text
eb2740a (HEAD -> work) Merge pull request #76 from Chipwwwwww/codex/export-repo-files-to-chatgpt-context-pack
baab217 Add ChatGPT context pack export file
992a0aa Merge pull request #74 from Chipwwwwww/codex/create-chatgpt-context-pack-file
9810f9b Add ChatGPT context pack export snapshot
b44daf7 Merge pull request #73 from Chipwwwwww/codex/add-storage-fit-question-for-physical-items
3bebecd Add storage-fit gate for physical purchase kinds
f5db190 Merge pull request #72 from Chipwwwwww/codex/expand-question-bank-and-stylemode-support
dc6ad0d Add style mode wiring and expanded flow question bank
13be691 Merge pull request #71 from Chipwwwwww/codex/implement-presentation-style-end-to-end
c448d51 Implement end-to-end presentation style mode selection and copy
502a730 Merge pull request #70 from Chipwwwwww/codex/add-global-style-mode-selection
5210029 Add presentation mode copy switching across start flow and result
9e8087e Merge pull request #69 from Chipwwwwww/codex/add-result-presentation-modes
7361e64 Fix mode formatting determinism for result presentation
ab1f03c Merge pull request #68 from Chipwwwwww/codex/enhance-post_merge_routine.ps1-for-reliability
e1bf5fe Improve local-ready probe and npm failure diagnostics in post-merge routine
9b12f40 Merge pull request #67 from Chipwwwwww/codex/fix-local-ready-banner-for-powershell-5.1
7a90f3e Fix PS5.1-safe dev ready banner flow
5a56bb1 Merge pull request #66 from Chipwwwwww/codex/fix-local-ready-banner-output
72361ff fix: detect local ready banner from dev output
6f1ac7c Merge pull request #65 from Chipwwwwww/codex/fix-local-ready-banner-console-output
09b95db Fix local ready notifier console output for PS5.1
5ef8068 Merge pull request #64 from Chipwwwwww/codex/add-local-ready-banner-notifier
3117138 Add local ready notifier before dev startup
a9e7140 Merge pull request #63 from Chipwwwwww/codex/update-post_merge_routine.ps1-functionality
7c3e5d1 Harden post-merge routine parity flow
a75024c Merge pull request #62 from Chipwwwwww/codex/fix-parity-gate-for-branch-awareness
a7f6f0e Make Vercel parity gate branch-aware
b8bd348 Merge pull request #61 from Chipwwwwww/codex/fix-vercel-parity-gate-for-404-errors
a745897 docs: save codex prompt for vercel parity 404 fix
```

## Files

### src/oshihapi/modes/questionCopy.ts
```text
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

    q_storage_fit: { title: "おうちに置くとこ、ある？", options: { CONFIRMED: { label: "あるよ！（もう決めた）" }, PROBABLE: { label: "たぶんある…！（片付ければ）" }, NONE: { label: "いまはない…" }, UNKNOWN: { label: "わかんない（先に見てくる）" } } },
    q_price_feel: { title: "お値段の納得感はどう？", options: { good: { label: "いい感じ" }, normal: { label: "ふつう" }, high: { label: "ちょっと高め" }, unknown: { label: "まだ比べてない" } } },
    q_storage_space: { title: "置き場所だいじょうぶ？", options: { enough: { label: "問題ない" }, adjust: { label: "少し工夫する" }, tight: { label: "かなりきびしい" } } },
    q_alternative_plan: { title: "見送るなら別プランある？", options: { clear: { label: "あるよ" }, maybe: { label: "たぶんある" }, none: { label: "ないかも" } } },
    q_addon_common_info: { title: "必要な情報、そろってる？" },
    q_addon_common_priority: { title: "今月の優先度は高い？" },
    q_addon_goods_compare: { title: "似てるグッズと比べられた？" },
    q_addon_goods_portability: { title: "使う場面、イメージできる？" },
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
    q_impulse_axis_short: { title: "いまの推し熱、どっち寄り？" },
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

```

### src/oshihapi/modes/copy_dictionary.ts
```text
import { MODE_DICTIONARY } from "@/src/oshihapi/modes/mode_dictionary";
import { RESULT_COPY } from "@/src/oshihapi/modes/mode_copy_ja";
import { QUESTION_COPY } from "@/src/oshihapi/modes/questionCopy";
import type { StyleMode } from "@/src/oshihapi/modes/useStyleMode";

export const COPY_BY_MODE: Record<
  StyleMode,
  {
    ui: {
      styleSectionTitle: string;
      styleSectionHelp: string;
      styleOptionLabel: Record<StyleMode, string>;
      resultSummaryTitle: string;
      adviceTitle: string;
      actionsTitle: string;
      reasonsTitle: string;
    };
    questions: Record<
      string,
      {
        title?: string;
        helper?: string;
        options?: Record<string, string>;
      }
    >;
    result: {
      verdictTitle: Record<"BUY" | "THINK" | "SKIP", string>;
      verdictLead: Record<"BUY" | "THINK" | "SKIP", string>;
      waitTypeLabel: Record<string, string>;
      reasonTagLabel: Record<string, string>;
      actionLabel: Record<string, string>;
      actionHelp: Record<string, string>;
    };
  }
> = {
  standard: {
    ui: RESULT_COPY.standard.ui,
    questions: {},
    result: {
      verdictTitle: MODE_DICTIONARY.standard.text.verdictLabel,
      verdictLead: RESULT_COPY.standard.verdictSubcopy,
      waitTypeLabel: MODE_DICTIONARY.standard.text.waitTypeLabel,
      reasonTagLabel: MODE_DICTIONARY.standard.text.reasonTagLabel,
      actionLabel: MODE_DICTIONARY.standard.text.actionLabel,
      actionHelp: RESULT_COPY.standard.actionExplain,
    },
  },
  kawaii: {
    ui: RESULT_COPY.kawaii.ui,
    questions: Object.fromEntries(
      Object.entries(QUESTION_COPY.kawaii).map(([questionId, question]) => [
        questionId,
        {
          title: question.title,
          helper: question.helper,
          options: Object.fromEntries(
            Object.entries(question.options ?? {}).map(([optionId, option]) => [
              optionId,
              option.label ?? "",
            ]),
          ),
        },
      ]),
    ),
    result: {
      verdictTitle: MODE_DICTIONARY.kawaii.text.verdictLabel,
      verdictLead: RESULT_COPY.kawaii.verdictSubcopy,
      waitTypeLabel: MODE_DICTIONARY.kawaii.text.waitTypeLabel,
      reasonTagLabel: MODE_DICTIONARY.kawaii.text.reasonTagLabel,
      actionLabel: MODE_DICTIONARY.kawaii.text.actionLabel,
      actionHelp: RESULT_COPY.kawaii.actionExplain,
    },
  },
  oshi: {
    ui: RESULT_COPY.oshi.ui,
    questions: Object.fromEntries(
      Object.entries(QUESTION_COPY.oshi).map(([questionId, question]) => [
        questionId,
        {
          title: question.title,
          helper: question.helper,
          options: Object.fromEntries(
            Object.entries(question.options ?? {}).map(([optionId, option]) => [
              optionId,
              option.label ?? "",
            ]),
          ),
        },
      ]),
    ),
    result: {
      verdictTitle: MODE_DICTIONARY.oshi.text.verdictLabel,
      verdictLead: RESULT_COPY.oshi.verdictSubcopy,
      waitTypeLabel: MODE_DICTIONARY.oshi.text.waitTypeLabel,
      reasonTagLabel: MODE_DICTIONARY.oshi.text.reasonTagLabel,
      actionLabel: MODE_DICTIONARY.oshi.text.actionLabel,
      actionHelp: RESULT_COPY.oshi.actionExplain,
    },
  },
};

```

### src/oshihapi/modes/mode_dictionary.ts
```text
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

```

### src/oshihapi/modes/presentationMode.ts
```text
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ResultMode } from "@/src/oshihapi/modes/mode_dictionary";

export const PRESENTATION_MODE_STORAGE_KEY = "oshihapi:presentationMode";
export type PresentationMode = ResultMode;

const isPresentationMode = (value: string | null | undefined): value is PresentationMode =>
  value === "standard" || value === "kawaii" || value === "oshi";

export function getModeFromUrl(
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null,
): PresentationMode | undefined {
  const fromPm = searchParams?.get("pm");
  if (isPresentationMode(fromPm)) return fromPm;

  const fromLegacy = searchParams?.get("pmode");
  if (isPresentationMode(fromLegacy)) return fromLegacy;

  return undefined;
}

export function getModeFromLocalStorage(): PresentationMode | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(PRESENTATION_MODE_STORAGE_KEY);
  return isPresentationMode(value) ? value : undefined;
}

export function setModeToLocalStorage(mode: PresentationMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRESENTATION_MODE_STORAGE_KEY, mode);
}

export function resolveMode(input?: {
  url?: URLSearchParams | ReadonlyURLSearchParams | null;
  ls?: string | null;
}): PresentationMode {
  const fromUrl = getModeFromUrl(input?.url);
  if (fromUrl) return fromUrl;

  if (isPresentationMode(input?.ls)) return input.ls;

  const fromStorage = getModeFromLocalStorage();
  if (fromStorage) return fromStorage;

  return "standard";
}

```

### src/oshihapi/modes/useStyleMode.ts
```text
"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";

export type StyleMode = "standard" | "kawaii" | "oshi";

export const STYLE_MODE_STORAGE_KEY = "oshihapi:styleMode";

export function resolveStyleMode(input?: string | null): StyleMode {
  return input === "kawaii" || input === "oshi" || input === "standard"
    ? input
    : "standard";
}

export function getStyleModeFromSearchParams(
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null,
): StyleMode | undefined {
  const value = searchParams?.get("styleMode") ?? searchParams?.get("pm") ?? undefined;
  return value ? resolveStyleMode(value) : undefined;
}

export function getStyleModeFromLocalStorage(): StyleMode {
  if (typeof window === "undefined") return "standard";
  return resolveStyleMode(window.localStorage.getItem(STYLE_MODE_STORAGE_KEY));
}

export function setStyleModeToLocalStorage(mode: StyleMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STYLE_MODE_STORAGE_KEY, mode);
}

export function useStyleMode(initial?: {
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null;
  value?: string | null;
}) {
  const initialMode = useMemo(
    () =>
      getStyleModeFromSearchParams(initial?.searchParams) ??
      (initial?.value ? resolveStyleMode(initial.value) : getStyleModeFromLocalStorage()),
    [initial?.searchParams, initial?.value],
  );

  const [styleMode, setStyleMode] = useState<StyleMode>(initialMode);

  const updateStyleMode = useCallback((nextMode: StyleMode) => {
    setStyleMode(nextMode);
    setStyleModeToLocalStorage(nextMode);
  }, []);

  return { styleMode, setStyleMode: updateStyleMode };
}

```

### src/oshihapi/modes/mode_copy_ja.ts
```text
import type { PresentationMode } from "@/src/oshihapi/modes/presentationMode";

export const RESULT_COPY: Record<
  PresentationMode,
  {
    ui: {
      styleSectionTitle: string;
      styleSectionHelp: string;
      styleOptionLabel: Record<PresentationMode, string>;
      resultSummaryTitle: string;
      adviceTitle: string;
      actionsTitle: string;
      reasonsTitle: string;
    };
    verdictSubcopy: Record<"BUY" | "THINK" | "SKIP", string>;
    waitTypeHint: Record<string, string>;
    reasonExplain: Record<string, string>;
    actionExplain: Record<string, string>;
    itemTypeHint: Record<string, string>;
  }
> = {
  standard: {
    ui: {
      styleSectionTitle: "表示スタイル",
      styleSectionHelp: "文言・トーンのみ切り替わります（判定ロジックは共通です）。",
      styleOptionLabel: {
        standard: "標準",
        kawaii: "かわいい",
        oshi: "推し活用語",
      },
      resultSummaryTitle: "診断サマリー",
      adviceTitle: "アドバイス",
      actionsTitle: "今すぐやる",
      reasonsTitle: "理由タグ",
    },
    verdictSubcopy: {
      BUY: "今の条件ならOK。上限だけ決めて進もう。",
      THINK: "今は保留でOK。条件が整ったらまた検討しよう。",
      SKIP: "今回は見送りでOK。次の推し活に回そう。",
    },
    waitTypeHint: {
      none: "待機なし。いまの材料で判断しやすい状態です。",
      short: "短め待機。熱量をいったん整えて再確認。",
      long: "長め待機。時間を置いても欲しいかを確認。",
    },
    reasonExplain: {
      budget: "予算の負担が重め。無理を避ける視点が重要です。",
      budget_ok: "予算に余力あり。上限を決めるとさらに安心です。",
      desire_high: "満足につながりやすい高い欲しさです。",
      desire_low: "勢い買いになりやすい温度感です。",
    },
    actionExplain: {
      cooldown: "時間を空けると、衝動買いリスクを下げられます。",
      market: "相場確認で割高購入を避けやすくなります。",
      budget_cap: "先に上限を決めると後悔を防ぎやすいです。",
    },
    itemTypeHint: {
      blind_draw: "くじ系は回数上限を先に固定するのが安全です。",
      used: "中古は相場差が大きいので比較が有効です。",
      preorder: "予約は到着時期と再販可能性も確認しましょう。",
      ticket: "チケットは期限・条件を優先して確認しましょう。",
      game_billing: "課金は天井・評価・使用頻度の3点確認が有効です。",
    },
  },
  kawaii: {
    ui: {
      styleSectionTitle: "ことばのふんいき",
      styleSectionHelp: "けっかは同じで、見た目と話し方だけかわるよ。",
      styleOptionLabel: {
        standard: "標準",
        kawaii: "かわいい",
        oshi: "推し活用語",
      },
      resultSummaryTitle: "けっかサマリー",
      adviceTitle: "ひとことアドバイス",
      actionsTitle: "つぎにやること",
      reasonsTitle: "りゆうメモ",
    },
    verdictSubcopy: {
      BUY: "いまの条件ならだいじょうぶ。予算ラインだけ決めて進もう。",
      THINK: "いったん保留でOK。条件がそろったらもう一度みよう。",
      SKIP: "今回はおやすみでOK。次のときめきにそなえよう。",
    },
    waitTypeHint: {
      none: "いまの情報で決めやすいよ。",
      short: "ちょこっと待つと気持ちが整うよ。",
      long: "ゆっくり待っても欲しいか見てみよう。",
    },
    reasonExplain: {
      budget: "お財布がしんどくなりそう。むりしないでね。",
      budget_ok: "お財布はだいじょうぶそう。上限だけ先にきめよう。",
      desire_high: "ときめき高めで満足しやすいよ。",
      desire_low: "勢いだけで買いやすい温度かも。",
    },
    actionExplain: {
      cooldown: "少し寝かせると、気持ちがすっきりするよ。",
      market: "相場を見ておくと安心して決められるよ。",
      budget_cap: "先に上限をきめるとあとで楽だよ。",
    },
    itemTypeHint: {
      blind_draw: "くじは回数を先にきめておくと安心だよ。",
      used: "中古はお店ごとの差が出やすいよ。",
      preorder: "予約は再販の可能性も見ておこう。",
      ticket: "チケットは期限チェックが最優先だよ。",
      game_billing: "課金は天井と評価を先に見ておこう。",
    },
  },
  oshi: {
    ui: {
      styleSectionTitle: "表示スタイル",
      styleSectionHelp: "判定は固定。文面だけ推し活トーンに切り替えます。",
      styleOptionLabel: {
        standard: "標準",
        kawaii: "かわいい",
        oshi: "推し活用語",
      },
      resultSummaryTitle: "判定サマリー",
      adviceTitle: "作戦メモ",
      actionsTitle: "次アクション",
      reasonsTitle: "根拠タグ",
    },
    verdictSubcopy: {
      BUY: "回収条件は良好。上限固定して安全運転でいこう。",
      THINK: "いったん保留でOK。条件が揃ってから再判定。",
      SKIP: "今回は見送り。次案件にリソースを残そう。",
    },
    waitTypeHint: {
      none: "待機なし。現時点の材料で判断可能。",
      short: "小休止して熱量を整えるフェーズ。",
      long: "作戦待機で優先度を見極めるフェーズ。",
    },
    reasonExplain: {
      budget: "資金圧が高め。無理課金は回避推奨。",
      budget_ok: "資金余力あり。上限固定で安定運用。",
      desire_high: "推し熱高。満足度に繋がりやすい案件。",
      desire_low: "勢い先行の可能性あり。再確認推奨。",
    },
    actionExplain: {
      cooldown: "作戦待機で衝動判断を抑制できます。",
      market: "界隈相場の確認で取りこぼしを防げます。",
      budget_cap: "上限固定は資金防衛の基本です。",
    },
    itemTypeHint: {
      blind_draw: "盲抽は天井管理を先に設定。",
      used: "中古は相場巡回で最適解を探しましょう。",
      preorder: "予約案件は再販見込みの確認が有効です。",
      ticket: "チケットは期限と条件を最優先で確認。",
      game_billing: "課金案件は天井距離と評価確認が必須。",
    },
  },
};

```

### src/oshihapi/modes/modeState.ts
```text
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ResultMode } from "@/src/oshihapi/modes/mode_dictionary";

export const MODE_STORAGE_KEY = "oshihapi:presentationMode";
export type ModeId = ResultMode;

const isModeId = (value: string | null | undefined): value is ModeId =>
  value === "standard" || value === "kawaii" || value === "oshi";

export function resolveMode(searchParams?: URLSearchParams | ReadonlyURLSearchParams | null): ModeId {
  const fromParam = searchParams?.get("pmode");
  if (isModeId(fromParam)) return fromParam;

  if (typeof window !== "undefined") {
    const fromStorage = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (isModeId(fromStorage)) return fromStorage;
  }

  return "standard";
}

export function setStoredMode(mode: ModeId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_STORAGE_KEY, mode);
}

```

### src/oshihapi/modes/formatResultByMode.ts
```text
import {
  MODE_DICTIONARY,
  MODE_PRIORITY_TAGS,
  ResultMode,
  SCENARIO_RESOLUTION,
  Verdict,
} from "@/src/oshihapi/modes/mode_dictionary";

type FormatResultByModeInput = {
  runId: string;
  verdict: Verdict;
  waitType?: string;
  reasons: string[];
  reasonTags: string[];
  actions: string[];
  mode: ResultMode;
};

type FormattedByMode = {
  sticker: string;
  shareTextX280: string;
  shareTextDmShort: string;
};

const TOKEN_PATTERN = /\{(verdict|waitType|reasons|actions|sticker|emoji|kaomoji)\}/g;
const X_TEXT_LIMIT = 280;

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickByHash(candidates: string[], hashSeed: number): string {
  if (candidates.length === 0) return "";
  const index = hashSeed % candidates.length;
  return candidates[index];
}

function pickTokensByHash(candidates: string[], max: number, hashSeed: number): string {
  if (max <= 0 || candidates.length === 0) return "";
  const uniqueCandidates = Array.from(new Set(candidates));
  const limit = Math.min(max, uniqueCandidates.length);
  const offset = hashSeed % uniqueCandidates.length;
  const picked: string[] = [];

  for (let i = 0; i < limit; i += 1) {
    picked.push(uniqueCandidates[(offset + i) % uniqueCandidates.length]);
  }

  return picked.join("");
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(TOKEN_PATTERN, (_, token: string) => values[token] ?? "").trim();
}

function stripForbidden(value: string, forbiddenSubstrings: string[]): string {
  return forbiddenSubstrings.reduce((acc, current) => acc.split(current).join(""), value);
}

function capJoined(values: string[], separator: string, maxLength: number): string {
  const cleaned = values.map((entry) => entry.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";

  let output = "";
  for (const entry of cleaned) {
    const candidate = output ? `${output}${separator}${entry}` : entry;
    if (candidate.length <= maxLength) {
      output = candidate;
      continue;
    }

    if (!output) {
      output = `${entry.slice(0, Math.max(0, maxLength - 1))}…`;
    } else {
      output = `${output}…`;
    }
    break;
  }
  return output;
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function formatResultByMode(input: FormatResultByModeInput): FormattedByMode {
  const dictionary = MODE_DICTIONARY[input.mode];
  const primaryTag = MODE_PRIORITY_TAGS[input.verdict].find((tag) => input.reasonTags.includes(tag));
  const normalizedWaitType = input.verdict === "THINK" ? (input.waitType ?? "none") : "";
  const scenarioKey = SCENARIO_RESOLUTION.resolve(input.verdict, normalizedWaitType, primaryTag);
  const runHash = stableHash(input.runId);
  const stickerHash = runHash;

  const sticker = pickByHash(dictionary.stickers[scenarioKey] ?? [], stickerHash);
  const emoji = pickTokensByHash(dictionary.text.emoji, dictionary.text.maxEmoji, runHash);
  const kaomoji = pickTokensByHash(dictionary.text.kaomoji, dictionary.text.maxKaomoji, runHash + 17);

  const templateValues = {
    verdict: input.verdict,
    waitType: normalizedWaitType,
    reasons: capJoined(input.reasons, " / ", 90),
    actions: capJoined(input.actions, " / ", 80),
    sticker,
    emoji,
    kaomoji,
  };

  let shareTextX280 = clampText(fillTemplate(dictionary.text.templates.x_280, templateValues), X_TEXT_LIMIT);
  let shareTextDmShort = fillTemplate(dictionary.text.templates.dm_short, templateValues);

  const hasForbidden = dictionary.text.forbiddenSubstrings.some(
    (token) =>
      token.length > 0 &&
      (shareTextX280.includes(token) || shareTextDmShort.includes(token) || sticker.includes(token)),
  );

  if (hasForbidden) {
    const fallbackSticker = pickByHash(MODE_DICTIONARY.standard.stickers[scenarioKey] ?? [], stickerHash);
    shareTextX280 = clampText(
      stripForbidden(shareTextX280, dictionary.text.forbiddenSubstrings).replace(sticker, fallbackSticker),
      X_TEXT_LIMIT,
    );
    shareTextDmShort = stripForbidden(shareTextDmShort, dictionary.text.forbiddenSubstrings).replace(
      sticker,
      fallbackSticker,
    );

    return {
      sticker: fallbackSticker,
      shareTextX280,
      shareTextDmShort,
    };
  }

  return {
    sticker,
    shareTextX280,
    shareTextDmShort,
  };
}

```

### app/page.tsx
```text
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Decisiveness, InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";
import {
  MODE_LABELS,
  SCENARIO_CARDS_JA,
  SITUATION_CHIPS_JA,
  recommendMode,
} from "@/src/oshihapi/modeGuide";
import {
  DECISIVENESS_STORAGE_KEY,
  decisivenessLabels,
  decisivenessOptions,
  parseDecisiveness,
} from "@/src/oshihapi/decisiveness";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RadioCard from "@/components/ui/RadioCard";
import {
  bodyTextClass,
  containerClass,
  helperTextClass,
  inputBaseClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui/tokens";
import { COPY_BY_MODE } from "@/src/oshihapi/modes/copy_dictionary";
import {
  getStyleModeFromLocalStorage,
  setStyleModeToLocalStorage,
  type StyleMode,
} from "@/src/oshihapi/modes/useStyleMode";

const deadlineOptions = [
  { value: "today", label: "今日" },
  { value: "tomorrow", label: "明日" },
  { value: "in3days", label: "3日以内" },
  { value: "in1week", label: "1週間以内" },
  { value: "unknown", label: "未定" },
] as const;

type DeadlineValue = NonNullable<InputMeta["deadline"]>;

const DEADLINE_VALUES = deadlineOptions.map((option) => option.value);
const ITEM_KIND_VALUES: ItemKind[] = [
  "goods",
  "blind_draw",
  "used",
  "preorder",
  "ticket",
  "game_billing",
];

const isDeadlineValue = (value: string): value is DeadlineValue =>
  DEADLINE_VALUES.includes(value as DeadlineValue);

const isItemKindValue = (value: string): value is ItemKind =>
  ITEM_KIND_VALUES.includes(value as ItemKind);

const parseDeadlineValue = (value: string): DeadlineValue =>
  isDeadlineValue(value) ? value : "unknown";

const parseItemKindValue = (value: string): ItemKind =>
  isItemKindValue(value) ? value : "goods";

const parsePriceYen = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const itemKindOptions: { value: ItemKind; label: string }[] = [
  { value: "goods", label: "グッズ" },
  { value: "blind_draw", label: "くじ" },
  { value: "used", label: "中古" },
  { value: "preorder", label: "予約" },
  { value: "ticket", label: "チケット" },
  { value: "game_billing", label: "ゲーム課金" },
];

const deadlineLabelMap = new Map(
  deadlineOptions.map((option) => [option.value, option.label] as const),
);
const itemKindLabelMap = new Map(
  itemKindOptions.map((option) => [option.value, option.label] as const),
);

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("short");
  const [itemName, setItemName] = useState("");
  const [priceYen, setPriceYen] = useState("");
  const [deadline, setDeadline] = useState<DeadlineValue>("unknown");
  const [itemKind, setItemKind] = useState<ItemKind>("goods");
  const [styleMode, setStyleMode] = useState<StyleMode>(() => getStyleModeFromLocalStorage());
  const modeCopy = COPY_BY_MODE[styleMode];
  const [decisiveness, setDecisiveness] = useState<Decisiveness>(() => {
    if (typeof window === "undefined") return "standard";
    return parseDecisiveness(window.localStorage.getItem(DECISIVENESS_STORAGE_KEY));
  });

  const parsedPriceYen = useMemo(() => parsePriceYen(priceYen), [priceYen]);
  const recommendation = useMemo(
    () =>
      recommendMode({
        itemName: itemName.trim() || undefined,
        priceYen: parsedPriceYen,
        deadline,
        itemKind,
      }),
    [itemName, parsedPriceYen, deadline, itemKind],
  );

  const getModeDescription = (targetMode: Mode) =>
    targetMode === "short"
      ? "急いで決めたい人向け（短め）"
      : targetMode === "medium"
        ? "比較しながら決めたい人向け（標準）"
        : "AIに深掘り相談したい人向け（長診断）";

  const modeDescription = useMemo(() => getModeDescription(mode), [mode]);
  const itemNamePlaceholder =
    itemKind === "game_billing"
      ? "例：限定ガチャ10連 / 月パス / コラボスキン"
      : "例：推しアクスタ 2025";

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("styleMode", styleMode);
    if (itemName.trim()) params.set("itemName", itemName.trim());
    if (parsedPriceYen !== undefined) {
      params.set("priceYen", String(parsedPriceYen));
    }
    const normalizedDeadline = parseDeadlineValue(deadline);
    if (normalizedDeadline) params.set("deadline", normalizedDeadline);
    const normalizedItemKind = parseItemKindValue(itemKind);
    if (normalizedItemKind) params.set("itemKind", normalizedItemKind);
    params.set("decisiveness", decisiveness);
    router.push(`/flow?${params.toString()}`);
  };

  const handleSelectMode = (nextMode: Mode) => {
    setMode(nextMode);
  };

  const handleStyleModeChange = (nextMode: StyleMode) => {
    setStyleMode(nextMode);
    setStyleModeToLocalStorage(nextMode);
  };

  const handleApplyScenario = (scenario: typeof SCENARIO_CARDS_JA[number]) => {
    setMode(scenario.mode);
    if (!scenario.preset) return;
    setItemName(scenario.preset.itemName ?? "");
    setPriceYen(
      scenario.preset.priceYen !== undefined
        ? String(scenario.preset.priceYen)
        : "",
    );
    setDeadline(scenario.preset.deadline ?? "unknown");
    setItemKind(scenario.preset.itemKind ?? "goods");
  };

  return (
    <div
      className={`${containerClass} safe-bottom flex min-h-screen flex-col gap-8 py-10 bg-transparent dark:bg-[#0b0f1a]`}
    >
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          オシハピ
        </p>
        <h1 className={pageTitleClass}>推し買い診断</h1>
        <p className={bodyTextClass}>
          推しグッズの「買う/保留/やめる」を60秒で。くじ・中古・予約もOK。
        </p>
      </header>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>迷ったらおすすめ</h2>
          <Badge variant="accent">信頼度 {recommendation.confidence}%</Badge>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-900 dark:border-white/10 dark:bg-white/7 dark:text-zinc-50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-zinc-300">
              おすすめモード
            </span>
            <Badge variant="primary">{MODE_LABELS[recommendation.mode]}</Badge>
            <span className="text-sm text-slate-600 dark:text-zinc-300">
              {getModeDescription(recommendation.mode)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recommendation.reasonChips.map((reason) => (
              <Badge
                key={reason}
                variant="outline"
                className="border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-zinc-200"
              >
                {reason}
              </Badge>
            ))}
          </div>
          {recommendation.followUp ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {recommendation.followUp}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>{modeCopy.ui.styleSectionTitle}</h2>
        <p className={helperTextClass}>{modeCopy.ui.styleSectionHelp}</p>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 dark:border-white/10 dark:bg-white/6">
          {(["standard", "kawaii", "oshi"] as const).map((modeOption) => (
            <button
              key={modeOption}
              type="button"
              onClick={() => handleStyleModeChange(modeOption)}
              className={[
                "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition",
                styleMode === modeOption
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-transparent text-slate-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {modeCopy.ui.styleOptionLabel[modeOption]}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>診断コース</h2>
        <div className="grid gap-4">
          <RadioCard
            title="急いで決める（30秒）"
            description="時間がなくてもサクッと判断。"
            isSelected={mode === "short"}
            onClick={() => handleSelectMode("short")}
          />
          <RadioCard
            title="じっくり決める（60秒〜2分）"
            description="比較しながら安心して決めたいとき。"
            isSelected={mode === "medium"}
            onClick={() => handleSelectMode("medium")}
          />
          <RadioCard
            title="AIに相談する（長診断）"
            description="深掘り用プロンプトも作って相談。"
            isSelected={mode === "long"}
            onClick={() => handleSelectMode("long")}
          />
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-300">
          {modeDescription}
        </p>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>決め切り度</h2>
        <div className="grid grid-cols-3 gap-2">
          {decisivenessOptions.map((option) => (
            <Button
              key={option.value}
              variant={decisiveness === option.value ? "primary" : "outline"}
              onClick={() => {
                setDecisiveness(option.value);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(DECISIVENESS_STORAGE_KEY, option.value);
                }
              }}
              className="rounded-xl px-2"
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className={helperTextClass}>
          いまは「{decisivenessLabels[decisiveness]}」。標準は従来と同じ判定です。
        </p>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <div className="flex flex-col gap-2">
          <h2 className={sectionTitleClass}>状況から選ぶ</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-300">
            チップをタップするとモードが切り替わります。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SITUATION_CHIPS_JA.map((chip) => (
            <Button
              key={chip.id}
              variant={mode === chip.mode ? "primary" : "outline"}
              onClick={() => handleSelectMode(chip.mode)}
              className={
                mode === chip.mode
                  ? "rounded-full px-4"
                  : "rounded-full border-slate-200 bg-slate-100 px-4 text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-zinc-200"
              }
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>例から選ぶ</h2>
        <div className="grid gap-4">
          {SCENARIO_CARDS_JA.map((scenario) => (
            <RadioCard
              key={scenario.id}
              title={scenario.title}
              description={scenario.description}
              isSelected={mode === scenario.mode}
              onClick={() => handleApplyScenario(scenario)}
              footer={
                scenario.preset ? (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-zinc-300">
                    {scenario.preset.priceYen ? (
                      <span>¥{scenario.preset.priceYen.toLocaleString()}</span>
                    ) : null}
                    {scenario.preset.deadline ? (
                      <span>
                        締切: {" "}
                        {deadlineLabelMap.get(scenario.preset.deadline) ??
                          scenario.preset.deadline}
                      </span>
                    ) : null}
                    {scenario.preset.itemKind ? (
                      <span>
                        種別: {" "}
                        {itemKindLabelMap.get(scenario.preset.itemKind) ??
                          scenario.preset.itemKind}
                      </span>
                    ) : null}
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>入力（任意）</h2>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            商品名
            <input
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              className={inputBaseClass}
              placeholder={itemNamePlaceholder}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            価格（円）
            <input
              type="number"
              min="0"
              value={priceYen}
              onChange={(event) => setPriceYen(event.target.value)}
              className={inputBaseClass}
              placeholder="例：8800"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            締切
            <select
              value={deadline}
              onChange={(event) => setDeadline(parseDeadlineValue(event.target.value))}
              className={inputBaseClass}
            >
              {deadlineOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            種別
            <select
              value={itemKind}
              onChange={(event) => setItemKind(parseItemKindValue(event.target.value))}
              className={inputBaseClass}
            >
              {itemKindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="space-y-4">
        <Button onClick={handleStart} className="w-full text-base">
          診断をはじめる
        </Button>
        <p className="text-sm text-slate-600 dark:text-zinc-300">
          迷ったらまずは短診断でOK。途中で戻ることもできます。
        </p>
      </div>
    </div>
  );
}

```

### app/flow/page.tsx
```text
import { Suspense } from "react";
import FlowClient from "./FlowClient";
import { containerClass, helperTextClass } from "@/components/ui/tokens";

export default function FlowPage() {
  return (
    <Suspense
      fallback={
        <div
          className={`${containerClass} flex min-h-screen flex-col items-center justify-center py-10`}
        >
          <p className={helperTextClass}>読み込み中...</p>
        </div>
      }
    >
      <FlowClient />
    </Suspense>
  );
}

```

### app/flow/FlowClient.tsx
```text
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AnswerValue,
  BehaviorLog,
  DecisionRun,
  Decisiveness,
  InputMeta,
  ItemKind,
  Mode,
  Question,
} from "@/src/oshihapi/model";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { evaluate } from "@/src/oshihapi/engine";
import { evaluateGameBillingV1, getGameBillingQuestions } from "@/src/oshihapi/gameBillingNeutralV1";
import { saveRun } from "@/src/oshihapi/runStorage";
import { COPY_BY_MODE } from "@/src/oshihapi/modes/copy_dictionary";
import {
  getStyleModeFromSearchParams,
  setStyleModeToLocalStorage,
  type StyleMode,
} from "@/src/oshihapi/modes/useStyleMode";
import { MODE_DICTIONARY } from "@/src/oshihapi/modes/mode_dictionary";
import { parseDecisiveness } from "@/src/oshihapi/decisiveness";
import { shouldAskStorage } from "@/src/oshihapi/storageGate";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";
import RadioCard from "@/components/ui/RadioCard";
import {
  containerClass,
  helperTextClass,
  inputBaseClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui/tokens";

const MODE_FALLBACK: Mode = "medium";
const DEADLINE_VALUES = [
  "today",
  "tomorrow",
  "in3days",
  "in1week",
  "unknown",
] as const;
const ITEM_KIND_VALUES: ItemKind[] = [
  "goods",
  "blind_draw",
  "used",
  "preorder",
  "ticket",
  "game_billing",
];

type DeadlineValue = NonNullable<InputMeta["deadline"]>;

const isDeadlineValue = (value: string): value is DeadlineValue =>
  DEADLINE_VALUES.includes(value as DeadlineValue);

const isItemKindValue = (value: string): value is ItemKind =>
  ITEM_KIND_VALUES.includes(value as ItemKind);

const parseMode = (value: string | null): Mode =>
  value === "short" || value === "medium" || value === "long"
    ? value
    : MODE_FALLBACK;

const parsePriceYen = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseDeadline = (value: string | null): InputMeta["deadline"] => {
  if (!value) return undefined;
  return isDeadlineValue(value) ? value : "unknown";
};

const parseItemKind = (value: string | null): InputMeta["itemKind"] => {
  if (!value) return undefined;
  return isItemKindValue(value) ? value : "goods";
};

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};

const QUICK_QUESTION_IDS = [
  "q_storage_fit",
  "q_desire",
  "q_budget_pain",
  "q_urgency",
  "q_rarity_restock",
  "q_regret_impulse",
  "q_impulse_axis_short",
] as const;

const CORE_12_QUESTION_IDS = [
  "q_storage_fit",
  "q_desire",
  "q_budget_pain",
  "q_urgency",
  "q_rarity_restock",
  "q_goal",
  "q_motives_multi",
  "q_hot_cold",
  "q_regret_impulse",
  "q_impulse_axis_short",
  "q_price_feel",
  "q_storage_space",
  "q_alternative_plan",
] as const;

const ADDON_BY_ITEM_KIND: Partial<Record<ItemKind, readonly string[]>> = {
  goods: ["q_addon_common_info", "q_addon_common_priority", "q_addon_goods_compare", "q_addon_goods_portability"],
  blind_draw: ["q_addon_common_info", "q_addon_common_priority", "q_addon_blind_draw_cap", "q_addon_blind_draw_exit"],
  ticket: ["q_addon_common_info", "q_addon_common_priority", "q_addon_ticket_schedule", "q_addon_ticket_resale_rule"],
  preorder: ["q_addon_common_info", "q_addon_common_priority", "q_addon_preorder_timeline", "q_addon_preorder_restock"],
  used: ["q_addon_common_info", "q_addon_common_priority", "q_addon_used_condition", "q_addon_used_price_gap"],
};

export default function FlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseMode(searchParams.get("mode"));
  const itemName = searchParams.get("itemName") ?? undefined;
  const priceYen = parsePriceYen(searchParams.get("priceYen"));
  const deadline = parseDeadline(searchParams.get("deadline"));
  const itemKind = parseItemKind(searchParams.get("itemKind"));
  const decisiveness: Decisiveness = parseDecisiveness(searchParams.get("decisiveness"));
  const styleMode: StyleMode = getStyleModeFromSearchParams(searchParams) ?? "standard";

  const useCase = itemKind === "game_billing" ? "game_billing" : "merch";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  const questions = useMemo(() => {
    if (useCase === "game_billing") {
      return getGameBillingQuestions(mode, answers);
    }

    const baseIds = mode === "short" ? QUICK_QUESTION_IDS : CORE_12_QUESTION_IDS;
    const addonIds = mode === "long" && itemKind ? (ADDON_BY_ITEM_KIND[itemKind] ?? []) : [];
    const ids = [...baseIds, ...addonIds].filter((id) => {
      if (id !== "q_storage_fit") return true;
      return shouldAskStorage(itemKind);
    });
    return ids
      .map((id) => merch_v2_ja.questions.find((question) => question.id === id))
      .filter((question): question is Question => Boolean(question));
  }, [answers, itemKind, mode, useCase]);

  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);
  const timePerQuestionRef = useRef<number[]>([]);
  const numChangesRef = useRef(0);
  const numBacktracksRef = useRef(0);

  const currentQuestion = questions[currentIndex];
  const currentQuestionCopy = currentQuestion
    ? COPY_BY_MODE[styleMode].questions[currentQuestion.id]
    : undefined;
  const currentTitle = currentQuestionCopy?.title ?? currentQuestion?.title ?? "";
  const currentHelper = currentQuestionCopy?.helper ?? currentQuestion?.description;

  const getOptionLabel = (questionId: string, optionId: string, fallback: string) =>
    COPY_BY_MODE[styleMode].questions[questionId]?.options?.[optionId] ?? fallback;

  const handleStyleModeChange = (nextMode: StyleMode) => {
    setStyleModeToLocalStorage(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("styleMode", nextMode);
    router.replace(`/flow?${params.toString()}`);
  };

  useEffect(() => {
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
    timePerQuestionRef.current = Array.from({ length: questions.length }, () => 0);
    numChangesRef.current = 0;
    numBacktracksRef.current = 0;
  }, [questions.length]);

  const normalizedAnswers = useMemo(() => {
    const next = { ...answers };
    for (const question of questions) {
      if (question.type !== "scale") continue;
      const value = next[question.id];
      if (typeof value === "number") continue;
      const fallback = question.defaultValue ?? question.min;
      if (fallback !== undefined) {
        next[question.id] = fallback;
      }
    }
    return next;
  }, [answers, questions]);

  const isAnswered = (question: Question | undefined) => {
    if (!question) return false;
    if (!question.required) return true;
    const value = answers[question.id];
    if (question.type === "scale" || question.type === "number") {
      if (question.type === "scale" && typeof value !== "number") {
        const fallback = question.defaultValue ?? question.min;
        return fallback !== undefined;
      }
      return value !== undefined && value !== null && value !== "";
    }
    if (question.type === "text") {
      return typeof value === "string" && value.trim().length > 0;
    }
    if (question.type === "multi") {
      return Array.isArray(value) && value.length > 0;
    }
    return value != null;
  };

  const recordQuestionTime = (index: number) => {
    const elapsed = Date.now() - questionStartRef.current;
    if (elapsed < 0) return;
    const bucket = timePerQuestionRef.current[index] ?? 0;
    timePerQuestionRef.current[index] = bucket + elapsed;
    questionStartRef.current = Date.now();
  };

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => {
      const prevValue = prev[questionId];
      const isSame =
        Array.isArray(prevValue) && Array.isArray(value)
          ? prevValue.length === value.length &&
            prevValue.every((entry, idx) => entry === value[idx])
          : prevValue === value;
      if (prevValue !== undefined && !isSame) {
        numChangesRef.current += 1;
      }
      return { ...prev, [questionId]: value };
    });
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (currentIndex < questions.length - 1) {
      recordQuestionTime(currentIndex);
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    recordQuestionTime(currentIndex);
    const runId = crypto.randomUUID();
    const output =
      useCase === "game_billing"
        ? (() => {
            const gameOutput = evaluateGameBillingV1(normalizedAnswers);
            const decisionLabel: "買う" | "保留" | "やめる" =
              gameOutput.decision === "BUY"
                ? "買う"
                : gameOutput.decision === "SKIP"
                  ? "やめる"
                  : "保留";

            return {
              decision: gameOutput.decision,
              confidence: 70,
              score: Math.max(-1, Math.min(1, gameOutput.score / 12)),
              scoreSummary: {
                desire: 50,
                affordability: 50,
                urgency: 50,
                rarity: 50,
                restockChance: 50,
                regretRisk: 50,
                impulse: 50,
                opportunityCost: 50,
              },
              reasons: gameOutput.reasons.map((text, index) => ({ id: `gb_reason_${index + 1}`, text })),
              actions: gameOutput.nextActions.map((text, index) => ({ id: `gb_action_${index + 1}`, text })),
              merchMethod: {
                method: "PASS" as const,
                note: "ゲーム課金（中立）v1",
              },
              shareText: [
                `判定: ${decisionLabels[gameOutput.decision]}`,
                ...gameOutput.reasons,
              ].join("\n"),
              presentation: {
                decisionLabel,
                headline:
                  gameOutput.decision === "BUY"
                    ? "条件がそろっているので進められそう"
                    : gameOutput.decision === "SKIP"
                      ? "今回は見送っても大丈夫"
                      : "いったん保留で様子を見るのが安心",
                badge: `判定：${decisionLabels[gameOutput.decision]}`,
                note: "※判定は変わりません",
                tags: ["GAME_BILLING"],
              },
            };
          })()
        : evaluate({
            questionSet: { ...merch_v2_ja, questions },
            meta: { itemName, priceYen, deadline, itemKind },
            answers: normalizedAnswers,
            mode,
            decisiveness,
          });

    const behavior: BehaviorLog = {
      time_total_ms: Date.now() - startTimeRef.current,
      time_per_q_ms: timePerQuestionRef.current,
      num_changes: numChangesRef.current,
      num_backtracks: numBacktracksRef.current,
      actions_clicked: [],
    };

    const run: DecisionRun = {
      runId,
      createdAt: Date.now(),
      locale: "ja",
      category: "merch",
      useCase,
      mode,
      decisiveness,
      meta: { itemName, priceYen, deadline, itemKind },
      answers: normalizedAnswers,
      gameBillingAnswers: useCase === "game_billing" ? normalizedAnswers : undefined,
      output,
      behavior,
    };

    setSubmitting(true);
    saveRun(run);
    router.push(`/result/${runId}?styleMode=${styleMode}`);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      router.push("/");
    } else {
      recordQuestionTime(currentIndex);
      numBacktracksRef.current += 1;
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!currentQuestion) {
    return (
      <div className={`${containerClass} flex min-h-screen flex-col items-center justify-center gap-4 py-10`}>
        <p className={helperTextClass}>質問が見つかりませんでした。</p>
        <Button onClick={() => router.push("/")} className="w-full">
          Homeへ戻る
        </Button>
      </div>
    );
  }

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-6 py-10 pb-24`}>
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="px-3">
            戻る
          </Button>
          <p className={helperTextClass}>
            {currentIndex + 1}/{questions.length}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-accent">質問フロー</p>
          <h1 className={pageTitleClass}>
            {mode === "short"
              ? "急いで診断"
              : mode === "medium"
                ? "じっくり診断"
                : "AIに相談する長診断"}
          </h1>
        </div>
        <Progress value={currentIndex + 1} max={questions.length} />
      </header>

      <Card className="space-y-4">
        <div className="space-y-2">
          <h2 className={sectionTitleClass}>{currentTitle}</h2>
          {currentHelper ? (
            <p className={helperTextClass}>{currentHelper}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          {currentQuestion.type === "scale" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{currentQuestion.leftLabel ?? "低い"}</span>
                <span>{currentQuestion.rightLabel ?? "高い"}</span>
              </div>
              <input
                type="range"
                min={currentQuestion.min ?? 0}
                max={currentQuestion.max ?? 5}
                step={currentQuestion.step ?? 1}
                value={
                  (typeof normalizedAnswers[currentQuestion.id] === "number"
                    ? normalizedAnswers[currentQuestion.id]
                    : currentQuestion.defaultValue ?? currentQuestion.min ?? 0) as number
                }
                onChange={(event) =>
                  updateAnswer(currentQuestion.id, Number(event.target.value))
                }
                className="w-full accent-primary"
              />
              <p className={helperTextClass}>
                選択値: {answers[currentQuestion.id]}
              </p>
            </div>
          ) : null}

          {currentQuestion.type === "single" && currentQuestion.options ? (
            <div className="grid gap-4">
              {currentQuestion.options.map((option) => (
                <RadioCard
                  key={option.id}
                  title={getOptionLabel(currentQuestion.id, option.id, option.label)}
                  isSelected={answers[currentQuestion.id] === option.id}
                  type="button"
                  onClick={() => updateAnswer(currentQuestion.id, option.id)}
                />
              ))}
            </div>
          ) : null}
          {currentQuestion.type === "multi" && currentQuestion.options ? (
            <div className="grid gap-3">
              {(() => {
                const raw = answers[currentQuestion.id];
                const selectedValues: string[] = Array.isArray(raw)
                  ? raw.filter((value): value is string => typeof value === "string")
                  : [];
                const maxSelect =
                  currentQuestion.maxSelect ?? Number.POSITIVE_INFINITY;
                const isMaxed =
                  Number.isFinite(maxSelect) && selectedValues.length >= maxSelect;
                const toggle = (value: string) => {
                  const next = selectedValues.includes(value)
                    ? selectedValues.filter((entry) => entry !== value)
                    : [...selectedValues, value];

                  if (Number.isFinite(maxSelect) && next.length > maxSelect) return;

                  updateAnswer(currentQuestion.id, next);
                };
                return (
                  <>
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedValues.includes(option.id);
                      const disabled = isMaxed && !isSelected;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggle(option.id)}
                          disabled={disabled}
                          className={[
                            "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-pink-400/50",
                            isSelected
                              ? "border-primary/70 bg-primary/10 text-foreground shadow-sm ring-2 ring-primary/30 dark:border-pink-400/60 dark:bg-white/10 dark:text-zinc-50 dark:ring-pink-400/60"
                              : "border-border bg-card text-foreground hover:border-primary/40 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50 dark:hover:border-pink-400/40",
                            disabled ? "cursor-not-allowed opacity-60" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="text-base font-semibold">
                            {getOptionLabel(currentQuestion.id, option.id, option.label)}
                          </span>
                          <span
                            className={[
                              "flex h-5 w-5 items-center justify-center rounded border-2",
                              isSelected
                                ? "border-primary bg-primary text-white dark:border-pink-400 dark:bg-pink-400"
                                : "border-muted-foreground text-transparent dark:border-white/30",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                    {typeof currentQuestion.maxSelect === "number" && isMaxed ? (
                      <p className={helperTextClass}>
                        {styleMode === "kawaii"
                          ? `いま${currentQuestion.maxSelect}こ選んでるよ。入れ替えるなら1こ外してね。`
                          : styleMode === "oshi"
                            ? `現在${currentQuestion.maxSelect}件まで選択中。差し替えるなら1件外そう。`
                            : `現在${currentQuestion.maxSelect}個まで選択中です。入れ替える場合はいずれかを外してください。`}
                      </p>
                    ) : null}
                  </>
                );
              })()}
            </div>
          ) : null}
          {currentQuestion.type === "text" ? (
            <textarea
              value={String(answers[currentQuestion.id] ?? "")}
              onChange={(event) => updateAnswer(currentQuestion.id, event.target.value)}
              placeholder="例：予算とのバランスが不安、再販情報が知りたい"
              className={`${inputBaseClass} min-h-[140px]`}
            />
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <p className={helperTextClass}>
          判断の表示例：{MODE_DICTIONARY[styleMode].text.verdictLabel.BUY} / {MODE_DICTIONARY[styleMode].text.verdictLabel.THINK} / {MODE_DICTIONARY[styleMode].text.verdictLabel.SKIP}
        </p>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 dark:border-white/10 dark:bg-white/6">
          {(["standard", "kawaii", "oshi"] as const).map((modeOption) => (
            <button
              key={modeOption}
              type="button"
              onClick={() => handleStyleModeChange(modeOption)}
              className={[
                "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition",
                styleMode === modeOption
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-transparent text-slate-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {MODE_DICTIONARY[modeOption].labels.name}
            </button>
          ))}
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 py-4 backdrop-blur">
        <div className={`${containerClass} flex items-center gap-4`}>
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 rounded-xl"
          >
            戻る
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isAnswered(currentQuestion) || submitting}
            isLoading={submitting}
            className="flex-1 rounded-xl text-base"
          >
            {currentIndex === questions.length - 1 ? "結果を見る" : "次へ"}
          </Button>
        </div>
      </div>
    </div>
  );
}

```

### app/result/[runId]/page.tsx
```text
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DecisionScale from "@/components/DecisionScale";
import ModeToggle from "@/components/ModeToggle";
import MarketCheckCard from "@/components/MarketCheckCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RadioCard from "@/components/ui/RadioCard";
import Toast from "@/components/ui/Toast";
import {
  bodyTextClass,
  containerClass,
  helperTextClass,
  sectionTitleClass,
} from "@/components/ui/tokens";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { buildLongPrompt } from "@/src/oshihapi/promptBuilder";
import type { DecisionRun, FeedbackImmediate } from "@/src/oshihapi/model";
import { decisivenessLabels } from "@/src/oshihapi/decisiveness";
import { buildPresentation } from "@/src/oshihapi/decisionPresentation";
import { clamp, engineConfig, normalize01ToSigned } from "@/src/oshihapi/engineConfig";
import {
  isPlatformMarketAction,
  neutralizeMarketAction,
} from "@/src/oshihapi/neutralizePlatformActions";
import { findRun, updateRun } from "@/src/oshihapi/runStorage";
import { sendTelemetry, TELEMETRY_OPT_IN_KEY } from "@/src/oshihapi/telemetryClient";
import { formatResultByMode } from "@/src/oshihapi/modes/formatResultByMode";
import { MODE_DICTIONARY, Verdict } from "@/src/oshihapi/modes/mode_dictionary";
import { COPY_BY_MODE } from "@/src/oshihapi/modes/copy_dictionary";
import { shouldAskStorage, STORAGE_FIT_LABEL } from "@/src/oshihapi/storageGate";
import {
  getStyleModeFromSearchParams,
  setStyleModeToLocalStorage,
  type StyleMode,
} from "@/src/oshihapi/modes/useStyleMode";

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};


function getDefaultSearchWord(run: DecisionRun): string {
  const itemName = run.meta.itemName?.trim();
  if (itemName) return itemName;

  if (run.useCase === "game_billing") {
    const billingType = typeof run.gameBillingAnswers?.gb_q2_type === "string"
      ? run.gameBillingAnswers.gb_q2_type
      : "";
    return [itemName, billingType].filter(Boolean).join(" ").trim();
  }

  const item = (run.answers.item ?? {}) as Record<string, string | undefined>;
  const candidates = [
    item.name,
    run.answers.series,
    run.answers.character,
    run.answers.type,
  ];
  const merged = candidates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ");
  return merged;
}

function getActionLink(action: DecisionRun["output"]["actions"][number]): {
  label: string;
  href: string;
} | null {
  const legacyAction = action as {
    linkOut?: { label?: string; url?: string; href?: string };
    label?: string;
    title?: string;
    url?: string;
    href?: string;
  };

  const label =
    legacyAction.linkOut?.label ??
    legacyAction.label ??
    legacyAction.title ??
    null;
  const href =
    legacyAction.linkOut?.url ??
    legacyAction.linkOut?.href ??
    legacyAction.url ??
    legacyAction.href ??
    null;

  if (!label || !href) return null;
  return { label, href };
}

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ runId: string }>();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<FeedbackImmediate | undefined>(
    undefined,
  );
  const [telemetryOptIn, setTelemetryOptIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const legacyValue =
      window.localStorage.getItem("oshihapi:telemetry_opt_in") === "true";
    const nextValue = window.localStorage.getItem(TELEMETRY_OPT_IN_KEY) === "true";
    if (legacyValue && !nextValue) {
      window.localStorage.setItem(TELEMETRY_OPT_IN_KEY, "true");
    }
    return legacyValue || nextValue;
  });
  const [telemetrySubmitting, setTelemetrySubmitting] = useState(false);
  const [telemetrySubmitted, setTelemetrySubmitted] = useState(false);
  const [skipPrice, setSkipPrice] = useState(true);
  const [skipItemName, setSkipItemName] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedHeadline, setSelectedHeadline] = useState<string | null>(null);
  const [styleMode, setStyleMode] = useState<StyleMode>(() => getStyleModeFromSearchParams(searchParams) ?? "standard");

  const runId = params?.runId;
  const run = useMemo<DecisionRun | undefined>(() => {
    if (!runId) return undefined;
    return findRun(runId);
  }, [runId]);

  const feedback = localFeedback ?? run?.feedback_immediate;

  useEffect(() => {
    setStyleMode(getStyleModeFromSearchParams(searchParams) ?? "standard");
  }, [searchParams]);

  const updateStyleMode = (nextMode: StyleMode) => {
    setStyleMode(nextMode);
    setStyleModeToLocalStorage(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("styleMode", nextMode);
    router.replace(`/result/${runId}?${params.toString()}`);
  };

  const presentation = useMemo(() => {
    if (!run) return undefined;
    return (
      run.output.presentation ??
      buildPresentation({
        decision: run.output.decision,
        runId: run.runId,
        createdAt: run.createdAt,
        actions: run.output.actions,
        reasons: run.output.reasons,
      })
    );
  }, [run]);

  const defaultSearchWord = useMemo(() => (run ? getDefaultSearchWord(run) : ""), [run]);
  const showBecausePricecheck = presentation?.tags?.includes("PRICECHECK") === true;
  const hasPlatformMarketAction = useMemo(
    () => run?.output.actions.some((action) => isPlatformMarketAction(action)) ?? false,
    [run],
  );
  const displayActions = useMemo(
    () =>
      run?.output.actions.map((action) =>
        isPlatformMarketAction(action) ? neutralizeMarketAction(action) : action,
      ) ?? [],
    [run],
  );
  useEffect(() => {
    setShowAlternatives(false);
    setSelectedHeadline(null);
  }, [runId]);

  const headline = selectedHeadline ?? presentation?.headline ?? decisionLabels[run?.output.decision ?? "THINK"];
  const alternatives = presentation?.alternatives ?? [];

  const modeFormattedResult = useMemo(() => {
    if (!run) return undefined;
    const outputExt = run.output as typeof run.output & {
      waitType?: string;
      reasonTags?: string[];
    };

    return formatResultByMode({
      runId: run.runId,
      verdict: run.output.decision as Verdict,
      waitType: outputExt.waitType,
      reasons: run.output.reasons.map((reason) => reason.text),
      reasonTags: outputExt.reasonTags ?? run.output.reasons.map((reason) => reason.id),
      actions: displayActions.map((action) => action.text),
      mode: styleMode
    });
  }, [displayActions, styleMode, run]);

  const outputExt = run?.output as
    | (DecisionRun["output"] & {
        waitType?: string;
        reasonTags?: string[];
      })
    | undefined;
  const modeCopy = COPY_BY_MODE[styleMode];
  const normalizedWaitType = outputExt?.waitType ?? (run?.output.decision === "THINK" ? "none" : "none");
  const storageFitValue =
    run && shouldAskStorage(run.meta.itemKind) && typeof run.answers.q_storage_fit === "string"
      ? STORAGE_FIT_LABEL[run.answers.q_storage_fit] ?? run.answers.q_storage_fit
      : null;

  const adviceText =
    run?.output.decision === "BUY"
      ? MODE_DICTIONARY[styleMode].explanation.buy
      : run?.output.decision === "THINK"
        ? MODE_DICTIONARY[styleMode].explanation.wait[normalizedWaitType] ??
          MODE_DICTIONARY[styleMode].explanation.wait.none
        : MODE_DICTIONARY[styleMode].explanation.skip;

  const decisionScale = useMemo(() => {
    if (!run) return "wait";
    if (run.output.decision === "BUY") return "buy";
    if (run.output.decision === "SKIP") return "no";
    return "wait";
  }, [run]);

  const decisionIndex = useMemo(() => {
    if (!run) return 0;
    const score = run.output.score;
    if (typeof score === "number" && Number.isFinite(score)) {
      return clamp(-1, 1, score);
    }
    let fallback = 0;
    for (const [dim, weight] of Object.entries(engineConfig.decisionWeights)) {
      const val = run.output.scoreSummary[dim as keyof typeof run.output.scoreSummary];
      if (typeof val === "number") {
        fallback += normalize01ToSigned(val) * weight;
      }
    }
    return clamp(-1, 1, fallback);
  }, [run]);

  const longPrompt = useMemo(() => {
    if (!run) return "";
    if (run.useCase === "game_billing") {
      return "ゲーム課金（中立）v1では、結果カードの情報チェックを使って評価・天井・内容を確認してください。";
    }
    return buildLongPrompt({ run, questionSet: merch_v2_ja });
  }, [run]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1500);
  };

  const logActionClick = (actionId: string) => {
    if (!runId) return;
    updateRun(runId, (current) => ({
      ...current,
      behavior: {
        ...(current.behavior ?? {
          time_total_ms: 0,
          time_per_q_ms: [],
          num_changes: 0,
          num_backtracks: 0,
          actions_clicked: [],
        }),
        actions_clicked: [...(current.behavior?.actions_clicked ?? []), actionId],
      },
    }));
  };

  const handleCopyShare = async () => {
    if (!run || !modeFormattedResult) return;
    try {
      await navigator.clipboard.writeText(modeFormattedResult.shareTextX280);
      logActionClick("copy_share_text");
      showToast("コピーしました");
    } catch {
      showToast("コピーに失敗しました");
    }
  };

  const handleCopyPrompt = async () => {
    if (!longPrompt) return;
    try {
      await navigator.clipboard.writeText(longPrompt);
      logActionClick("copy_long_prompt");
      showToast("コピーしました");
    } catch {
      showToast("コピーに失敗しました");
    }
  };

  const handleFeedback = (value: FeedbackImmediate) => {
    if (!runId || !run) return;
    const nextRun = updateRun(runId, (current) => ({
      ...current,
      feedback_immediate: value,
    }));
    setLocalFeedback(nextRun?.feedback_immediate ?? value);
  };

  const handleTelemetrySubmit = async () => {
    if (!run || telemetrySubmitting || telemetrySubmitted || !telemetryOptIn) return;
    setTelemetrySubmitting(true);
    try {
      const result = await sendTelemetry("run_export", run, {
        l1Label: feedback,
        includePrice: !skipPrice,
        includeItemName: !skipItemName,
      });
      if (result.ok) {
        setTelemetrySubmitted(true);
        showToast("送信しました（匿名）");
      } else {
        const hint = result.hint ? ` (${result.hint})` : "";
        const errorText = result.error ? `: ${result.error}${hint}` : "";
        showToast(`送信に失敗しました${errorText}`);
      }
    } catch {
      showToast("送信に失敗しました。時間をおいて再試行してください。");
    } finally {
      setTelemetrySubmitting(false);
    }
  };

  if (!run) {
    return (
      <div
        className={`${containerClass} flex min-h-screen flex-col items-center justify-center gap-4 py-10`}
      >
        <p className={helperTextClass}>
          結果が見つかりませんでした。ホームからもう一度お試しください。
        </p>
        <div className="flex w-full flex-col gap-4">
          <Button onClick={() => router.push("/")} className="w-full">
            Homeへ戻る
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/history")}
            className="w-full rounded-xl"
          >
            履歴を見る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-6 py-10`}>
      <header className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-accent">{modeCopy.ui.resultSummaryTitle}</p>
        <div className="space-y-2">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">{modeCopy.result.verdictTitle[run.output.decision]}</h1>
          <p className={`${bodyTextClass} text-foreground/90`}>{modeCopy.result.verdictLead[run.output.decision]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">信頼度 {run.output.confidence}%</Badge>
          {presentation?.badge && !presentation.badge.includes("判定") ? (
            <Badge variant="outline">{presentation.badge}</Badge>
          ) : null}
        </div>
        <p className={helperTextClass}>
          決め切り度: {decisivenessLabels[run.decisiveness ?? "standard"]}（変更可）
        </p>
        {storageFitValue ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">置き場所</span>
            <span className="text-muted-foreground">{storageFitValue}</span>
          </div>
        ) : null}
        {alternatives.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-border bg-card/90 p-3">
            <Button
              variant="ghost"
              onClick={() => setShowAlternatives((prev) => !prev)}
              className="h-auto w-full justify-between rounded-xl px-3 py-2 text-sm"
            >
              <span>別の言い方（{alternatives.length}）</span>
              <span>{showAlternatives ? "閉じる" : "開く"}</span>
            </Button>
            {showAlternatives ? (
              <ul className="grid gap-2">
                {alternatives.map((alt) => (
                  <li key={alt}>
                    <button
                      type="button"
                      onClick={() => setSelectedHeadline(alt)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    >
                      {alt}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className={helperTextClass}>{presentation?.note ?? "※判定は変わりません"}</p>
          </div>
        ) : null}
      </header>

      <DecisionScale decision={decisionScale} index={decisionIndex} />

      <Card className="space-y-3 border-amber-200 bg-amber-50 dark:ring-1 dark:ring-white/10">
        <h2 className="text-lg font-semibold text-amber-900">{modeCopy.ui.adviceTitle}</h2>
        <p className="text-sm text-amber-800">{adviceText}</p>
        <p className="text-xs text-amber-700">
          {modeCopy.result.waitTypeLabel[normalizedWaitType] ?? modeCopy.result.waitTypeLabel.none}
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>{modeCopy.ui.actionsTitle}</h2>
        <ul className="grid gap-4">
          {displayActions.map((action) => {
            const actionLink = getActionLink(action);
            return (
              <li key={action.id} className="rounded-2xl border border-border p-4">
              <p className={bodyTextClass}>{modeCopy.result.actionLabel[action.id] ?? action.text}
                {modeCopy.result.actionHelp[action.id] ? (
                  <span className="mt-1 block text-xs text-muted-foreground">{modeCopy.result.actionHelp[action.id]}</span>
                ) : null}</p>
                {actionLink ? (
                  <a
                    href={actionLink.href}
                    onClick={() => logActionClick(`link:${action.id}`)}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    {actionLink.label}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>{modeCopy.ui.reasonsTitle}</h2>
        <div className="grid gap-4">
          {run.output.reasons.map((reason) => (
            <div key={reason.id} className="rounded-2xl border border-border p-4">
              <p className={bodyTextClass}>{modeCopy.result.reasonTagLabel[reason.id] ?? reason.text}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border-emerald-200 bg-emerald-50 dark:ring-1 dark:ring-white/10">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-emerald-900">AIに相談する（プロンプト）</h2>
          <p className="text-sm text-emerald-800">
            {run.mode === "long"
              ? "長診断の内容をまとめたプロンプトです。"
              : "もっと深掘りしたいときに使えます。"}
          </p>
        </div>
        <textarea
          readOnly
          value={longPrompt}
          className="min-h-[180px] w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900"
        />
        <Button
          onClick={handleCopyPrompt}
          className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          プロンプトをコピー
        </Button>
      </Card>

      <Card className="space-y-4">
        <ModeToggle value={styleMode} onChange={updateStyleMode} />
        <p className={helperTextClass}>{MODE_DICTIONARY[styleMode].labels.disclaimer}</p>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>共有テキスト</h2>
        <p className="text-3xl leading-none">{modeFormattedResult?.sticker ?? ""}</p>
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {modeFormattedResult?.shareTextX280 ?? run.output.shareText}
        </p>
        <Button onClick={handleCopyShare} className="w-full rounded-xl">
          共有テキストをコピー
        </Button>
      </Card>

      <div id="market-check" style={{ scrollMarginTop: "96px" }}>
        <MarketCheckCard
          runId={run.runId}
          defaultSearchWord={defaultSearchWord}
          showBecausePricecheck={showBecausePricecheck || hasPlatformMarketAction || run.useCase === "game_billing"}
          title={run.useCase === "game_billing" ? "情報チェック（評価・天井など）" : undefined}
          description={run.useCase === "game_billing" ? "※判定は変わりません。外部で情報を確認してから決めましょう。" : undefined}
          placeholder={
            run.useCase === "game_billing"
              ? "ゲーム名 + 施策名（例：◯◯ 限定ガチャ 評価 / ◯◯ 天井）"
              : undefined
          }
        />
      </div>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>このあとどうした？</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: "bought", label: "買った" },
            { id: "waited", label: "保留した" },
            { id: "not_bought", label: "買わなかった" },
            { id: "unknown", label: "まだ" },
          ].map((option) => (
            <RadioCard
              key={option.id}
              title={option.label}
              isSelected={feedback === option.id}
              onClick={() => handleFeedback(option.id as FeedbackImmediate)}
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>学習のために匿名データを送信</h2>
        <p className={helperTextClass}>
          個人が特定される情報は送信されません。いつでも設定を変更できます。
        </p>
        <label className="flex items-center justify-between gap-4 text-sm text-foreground">
          <span>匿名データ送信に協力する</span>
          <input
            type="checkbox"
            checked={telemetryOptIn}
            onChange={(event) => {
              const nextValue = event.target.checked;
              setTelemetryOptIn(nextValue);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(TELEMETRY_OPT_IN_KEY, String(nextValue));
              }
            }}
            className="h-5 w-5 rounded border border-border text-primary"
          />
        </label>
        <div className="grid gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={skipPrice}
              onChange={(event) => setSkipPrice(event.target.checked)}
              className="h-4 w-4 rounded border border-border text-primary"
            />
            価格を送らない
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={skipItemName}
              onChange={(event) => setSkipItemName(event.target.checked)}
              className="h-4 w-4 rounded border border-border text-primary"
            />
            商品名を送らない
          </label>
        </div>
        <Button
          onClick={handleTelemetrySubmit}
          className="w-full rounded-xl"
          disabled={!telemetryOptIn || telemetrySubmitting || telemetrySubmitted}
        >
          {telemetrySubmitted ? "送信済み" : "送信する"}
        </Button>
      </Card>

      <div className="grid gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="w-full rounded-xl"
        >
          もう一度診断
        </Button>
        <Button onClick={() => router.push("/history")} className="w-full rounded-xl">
          履歴を見る
        </Button>
      </div>

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

```

### app/history/page.tsx
```text
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DecisionRun } from "@/src/oshihapi/model";
import { decisivenessLabels } from "@/src/oshihapi/decisiveness";
import { loadMarketMemos } from "@/src/oshihapi/marketMemoStorage";
import { loadRuns } from "@/src/oshihapi/runStorage";
import { formatResultByMode } from "@/src/oshihapi/modes/formatResultByMode";
import { MODE_DICTIONARY, ResultMode, Verdict } from "@/src/oshihapi/modes/mode_dictionary";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  bodyTextClass,
  containerClass,
  helperTextClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui/tokens";

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function impulseLabel(run: DecisionRun) {
  const impulse = run.output.scoreSummary.impulse ?? 0;
  if (impulse >= 70) return "高";
  if (impulse >= 45) return "中";
  return "低";
}

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};

const marketLevelLabels: Record<string, string> = {
  high: "高騰",
  normal: "ふつう",
  calm: "落ち着いてる",
};

function formatPercent(count: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [runs] = useState<DecisionRun[]>(() => loadRuns());
  const [marketMemos] = useState(() => loadMarketMemos());
  const [resultMode, setResultMode] = useState<ResultMode>(() => {
    if (typeof window === "undefined") return "standard";
    const savedMode = window.localStorage.getItem("oshihapi:mode");
    if (savedMode === "standard" || savedMode === "kawaii" || savedMode === "oshi") {
      return savedMode;
    }
    return "standard";
  });

  const updateResultMode = (nextMode: ResultMode) => {
    setResultMode(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("oshihapi:mode", nextMode);
    }
  };

  const hasRuns = useMemo(() => runs.length > 0, [runs]);
  const summary = useMemo(() => {
    const counts = { BUY: 0, THINK: 0, SKIP: 0 } as const;
    const mutable = { ...counts };
    for (const run of runs) {
      if (run.output.decision === "BUY" || run.output.decision === "THINK" || run.output.decision === "SKIP") {
        mutable[run.output.decision] += 1;
      }
    }
    return mutable;
  }, [runs]);

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-6 py-10`}>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-accent">履歴</p>
        <h1 className={pageTitleClass}>診断履歴</h1>
        <p className={helperTextClass}>直近20件まで表示されます。</p>
      </header>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>結果の表示モード</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            ["standard", "標準"],
            ["kawaii", "かわいい"],
            ["oshi", "推し活用語"],
          ] as [ResultMode, string][]).map(([mode, label]) => (
            <Button
              key={mode}
              variant={resultMode === mode ? "primary" : "outline"}
              onClick={() => updateResultMode(mode)}
              className="w-full rounded-xl"
            >
              {label}
            </Button>
          ))}
        </div>
        <p className={helperTextClass}>{MODE_DICTIONARY[resultMode].labels.disclaimer}</p>
      </Card>

      {hasRuns ? (
        <Card className="space-y-3">
          <h2 className={sectionTitleClass}>集計</h2>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-muted-foreground">買う</p>
              <p className="text-base font-semibold">{summary.BUY}件 ({formatPercent(summary.BUY, runs.length)})</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-muted-foreground">保留</p>
              <p className="text-base font-semibold">{summary.THINK}件 ({formatPercent(summary.THINK, runs.length)})</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-muted-foreground">やめる</p>
              <p className="text-base font-semibold">{summary.SKIP}件 ({formatPercent(summary.SKIP, runs.length)})</p>
            </div>
          </div>
        </Card>
      ) : null}

      {!hasRuns ? (
        <Card className="border-dashed text-center">
          <p className={bodyTextClass}>まだ履歴がありません。</p>
          <p className={helperTextClass}>診断するとここに結果が保存されます。</p>
        </Card>
      ) : (
        <section className="space-y-4">
          <h2 className={sectionTitleClass}>最近の診断</h2>
          <div className="grid gap-4">
            {runs.map((run) => {
              const outputExt = run.output as typeof run.output & {
                waitType?: string;
                reasonTags?: string[];
              };
              const formatted = formatResultByMode({
                runId: run.runId,
                verdict: run.output.decision as Verdict,
                waitType: outputExt.waitType,
                reasons: run.output.reasons.map((reason) => reason.text),
                reasonTags: outputExt.reasonTags ?? [],
                actions: run.output.actions.map((action) => action.text),
                mode: resultMode,
              });

              return (
                <Link key={run.runId} href={`/result/${run.runId}`} className="block">
                <Card className="space-y-4 transition hover:border-primary/40">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatDate(run.createdAt)}</span>
                    <Badge variant="outline">衝動度: {impulseLabel(run)}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-foreground">{formatted.sticker} {decisionLabels[run.output.decision]}</p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{formatted.shareTextDmShort}</p>
                    {marketMemos[run.runId] ? (
                      <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                        相場: {marketLevelLabels[marketMemos[run.runId].level]}
                      </p>
                    ) : null}
                    <p className={helperTextClass}>
                      {run.meta.itemName ?? "（商品名なし）"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                        決め切り度: {decisivenessLabels[run.decisiveness ?? "standard"]}
                      </p>
                      {run.useCase === "game_billing" ? (
                        <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                          種別: ゲーム課金
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Button
        variant="outline"
        className="w-full rounded-xl"
        onClick={() => router.push("/")}
      >
        Homeへ戻る
      </Button>
    </div>
  );
}

```

### post_merge_routine.ps1
```text
#requires -Version 5.1
<#!
post_merge_routine.ps1

Purpose
- Git parity preflight (origin/main by default)
- Build-first gate (npm ci -> npm run build)
- Vercel production parity gate via /api/version
- Optional dev server start
#>

param(
  [switch]$SkipPull,
  [switch]$SkipClean,
  [switch]$SkipKillPorts,
  [switch]$SkipNpmCi,
  [switch]$SkipLint,
  [switch]$SkipBuild,
  [switch]$SkipDev,
  [switch]$ProdSmoke,
  [Alias('ParityGate')]
  [switch]$RequireVercelSameCommit,
  [switch]$SkipVercelParity,
  [switch]$SkipPush,
  [switch]$AllowPreviewHost,
  [bool]$AutoCheckoutProdBranch = $true,
  [switch]$StrictParity,

  [Alias('ProdHost')]
  [Alias('VercelHost')]
  [string]$VercelProdUrlOrHost,
  [string]$PreviewHost = '',
  [string]$ProdBranch = '',
  [ValidateSet('auto','prod','preview','off')]
  [string]$ParityTarget = 'auto',
  [ValidateSet('production','preview','any')]
  [string]$VercelEnv = 'production',
  [int]$VercelMaxWaitSec = 0,
  [int]$VercelPollIntervalSec = 10,
  [int]$VercelParityRetries = 60,
  [ValidateSet('enforce','warn','off')]
  [string]$VercelParityMode = 'enforce',

  [int]$DevPort = 3000,
  [int[]]$KillPorts = @(3000,3001,3002),

  [string[]]$Expect = @(),
  [ValidateSet('code','all')]
  [string]$ExpectScope = 'code',
  [switch]$ExpectRegex
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  $message = if ($_.Exception -and -not [string]::IsNullOrWhiteSpace($_.Exception.Message)) { $_.Exception.Message } else { [string]$_ }
  Write-Host ("ERROR: {0}" -f $message) -ForegroundColor Red
  exit 1
}

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor DarkGray
  Write-Host ("[post_merge_routine] {0}" -f $Title) -ForegroundColor Cyan
  Write-Host ("=" * 72) -ForegroundColor DarkGray
}

function Run([string]$Command, [string[]]$CmdArgs = @()) {
  $display = if ($CmdArgs.Count -gt 0) { "$Command $($CmdArgs -join ' ')" } else { $Command }
  Write-Host "Running: $display" -ForegroundColor DarkGray
  Invoke-Exec -Command $Command -CmdArgs $CmdArgs -Display $display
}

function Invoke-Exec(
  [Parameter(Mandatory = $true)]
  [string]$Command,
  [string[]]$CmdArgs = @(),
  [string]$Display = ''
) {
  $label = if ([string]::IsNullOrWhiteSpace($Display)) {
    if ($CmdArgs.Count -gt 0) { "$Command $($CmdArgs -join ' ')" } else { $Command }
  } else {
    $Display
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $Command
  if ($CmdArgs -and $CmdArgs.Count -gt 0) {
    $psi.Arguments = [string]::Join(' ', ($CmdArgs | ForEach-Object {
      $arg = [string]$_
      if ($arg -match '[\s"]') {
        '"' + ($arg -replace '"', '\"') + '"'
      } else {
        $arg
      }
    }))
  }
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi

  [void]$process.Start()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  $exitCode = $process.ExitCode

  if (-not [string]::IsNullOrEmpty($stdout)) {
    Write-Host ($stdout.TrimEnd("`r", "`n"))
  }
  if (-not [string]::IsNullOrEmpty($stderr)) {
    Write-Host ($stderr.TrimEnd("`r", "`n")) -ForegroundColor Yellow
  }

  if ($exitCode -ne 0) {
    Write-Host '---- Captured stdout ----' -ForegroundColor DarkYellow
    if ([string]::IsNullOrWhiteSpace($stdout)) { Write-Host '(empty)' -ForegroundColor DarkGray }
    else { Write-Host ($stdout.TrimEnd("`r", "`n")) }

    Write-Host '---- Captured stderr ----' -ForegroundColor DarkYellow
    if ([string]::IsNullOrWhiteSpace($stderr)) { Write-Host '(empty)' -ForegroundColor DarkGray }
    else { Write-Host ($stderr.TrimEnd("`r", "`n")) -ForegroundColor Yellow }

    throw "Command failed (exit=$exitCode): $label"
  }
}

function Ensure-RepoRoot() {
  $root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
  Set-Location $root
  if (-not (Test-Path ".\package.json")) {
    throw "package.json not found. Run at repo root. Current: $root"
  }
  return (Get-Location).Path
}

function Get-GitValue([string[]]$Args, [string]$ErrorMessage) {
  $value = (& git @Args) 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
    throw $ErrorMessage
  }
  return ($value | Select-Object -First 1).Trim()
}

function Shorten-Text([string]$Text, [int]$MaxLen = 240) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return '' }
  $flat = ($Text -replace "[\r\n]+", ' ').Trim()
  if ($flat.Length -le $MaxLen) { return $flat }
  return ($flat.Substring(0, $MaxLen) + '...')
}

function Assert-ScriptParses([string]$ScriptPath) {
  $tokens = $null
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$tokens, [ref]$errors)
  if ($errors -and $errors.Count -gt 0) {
    $firstError = $errors | Select-Object -First 1
    throw ("PowerShell parser error in {0}: {1}" -f $ScriptPath, $firstError.Message)
  }
}

function Start-LocalReadyProbeProcess(
  [Parameter(Mandatory = $true)]
  [string]$Url,
  [int]$TimeoutSec = 180,
  [int]$IntervalSec = 1
) {
  # Keep this as plain PS 5.1 syntax; no PS7-only features.
  $safeTimeoutSec = if ($TimeoutSec -gt 0) { $TimeoutSec } else { 180 }
  $safeIntervalSec = if ($IntervalSec -gt 0) { $IntervalSec } else { 1 }

  $encodedUrl = $Url.Replace("'", "''")
  $probeScript = @"
`$ErrorActionPreference = 'SilentlyContinue'
`$url = '$encodedUrl'
`$timeoutSec = $safeTimeoutSec
`$intervalSec = $safeIntervalSec
if (`$intervalSec -lt 1) { `$intervalSec = 1 }
`$deadline = (Get-Date).AddSeconds(`$timeoutSec)
while ((Get-Date) -lt `$deadline) {
  try {
    `$resp = Invoke-WebRequest -Uri `$url -UseBasicParsing -TimeoutSec 1
    if (`$resp -and `$resp.StatusCode -ge 200 -and `$resp.StatusCode -lt 400) {
      Write-Host ('✅ Local 起動OK: {0}' -f `$url) -ForegroundColor Green
      exit 0
    }
  } catch {}
  Start-Sleep -Seconds `$intervalSec
}
Write-Host ('⚠️ Local 起動待機 timeout: {0} sec ({1})' -f `$timeoutSec, `$url) -ForegroundColor Yellow
exit 0
"@

  $bytes = [System.Text.Encoding]::Unicode.GetBytes($probeScript)
  $encoded = [Convert]::ToBase64String($bytes)
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded) -NoNewWindow | Out-Null
}

function Run-DevWithReadyBanner(
  [Parameter(Mandatory = $true)]
  [int]$Port
) {
  $localUrl = "http://localhost:$Port"
  Start-LocalReadyProbeProcess -Url $localUrl -TimeoutSec 180 -IntervalSec 1
  Write-Host ("⏳ Waiting for {0} ..." -f $localUrl) -ForegroundColor DarkYellow

  # Keep npm dev in foreground so Ctrl+C reaches the dev process directly.
  & npm run dev -- --webpack -p "$Port"

  $devExitCode = $LASTEXITCODE
  if ($devExitCode -ne 0) {
    throw ("Command failed (exit={0}): npm run dev -- --webpack -p {1}" -f $devExitCode, $Port)
  }
}

function Stop-Port([int]$Port) {
  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    try {
      $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
      if (-not $conns) { return }
      $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
      foreach ($pid in $pids) {
        if ($pid -and $pid -ne 0) {
          $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
          if ($p) {
            Write-Host "Killing PID=$pid on port=$Port ($($p.ProcessName))" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
          }
        }
      }
    } catch {}
    return
  }

  try {
    $lines = netstat -ano | Select-String -Pattern (":$Port\s") -ErrorAction SilentlyContinue
    foreach ($line in $lines) {
      $parts = ($line -replace "\s+", " ").Trim().Split(" ")
      if ($parts.Count -ge 5) {
        $pid = [int]$parts[-1]
        if ($pid -and $pid -ne 0) {
          $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
          if ($p) {
            Write-Host "Killing PID=$pid on port=$Port ($($p.ProcessName))" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
          }
        }
      }
    }
  } catch {}
}

function Test-GitOperationInProgress() {
  $gitDir = (& git rev-parse --git-dir) 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitDir)) { return $false }

  $ops = @(
    (Join-Path $gitDir 'MERGE_HEAD'),
    (Join-Path $gitDir 'rebase-apply'),
    (Join-Path $gitDir 'rebase-merge'),
    (Join-Path $gitDir 'CHERRY_PICK_HEAD'),
    (Join-Path $gitDir 'REVERT_HEAD')
  )
  foreach ($path in $ops) {
    if (Test-Path $path) { return $true }
  }
  return $false
}

function Resolve-UpstreamRef() {
  $upstream = (& git rev-parse --abbrev-ref --symbolic-full-name "@{u}") 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($upstream)) {
    return ($upstream | Select-Object -First 1).Trim()
  }
  return 'origin/main'
}

function Assert-NoConflictMarkers() {
  $paths = @('app','src','components','ops','post_merge_routine.ps1')
  $existingPaths = @()
  foreach ($path in $paths) {
    if (Test-Path ".\$path") { $existingPaths += $path }
  }

  if ($existingPaths.Count -eq 0) { return }

  $output = (& git grep -n -I -E -e '^<<<<<<<' -e '^=======$' -e '^>>>>>>>' -- @existingPaths) 2>$null
  $exitCode = $LASTEXITCODE

  if ($exitCode -eq 0) {
    Write-Host 'Conflict markers found:' -ForegroundColor Red
    foreach ($line in $output) {
      Write-Host $line -ForegroundColor Red
    }
    throw 'Conflict markers detected in code/script paths. Resolve them before rerunning .\post_merge_routine.ps1.'
  }

  if ($exitCode -eq 1) { return }

  throw "Conflict marker scan failed (git grep exit=$exitCode)."
}

function Ensure-CleanWorkingTree() {
  $dirty = (& git status --porcelain) 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect working tree (git status failed).'
  }

  if (-not [string]::IsNullOrWhiteSpace(($dirty -join "`n"))) {
    throw "Working tree is not clean. Commit or stash local changes before running .\post_merge_routine.ps1.`nTip: git status --short"
  }
}

function Test-WorkingTreeClean() {
  $dirty = (& git status --porcelain) 2>$null
  if ($LASTEXITCODE -ne 0) { return $false }
  return [string]::IsNullOrWhiteSpace(($dirty -join "`n"))
}

function Ensure-OnProdBranchIfNeeded([string]$EffectiveProdBranch, [bool]$EnableAutoCheckout) {
  if (-not $EnableAutoCheckout) {
    Write-Host 'AutoCheckoutProdBranch disabled.' -ForegroundColor DarkGray
    return
  }

  $currentBranch = Get-GitValue -Args @('rev-parse','--abbrev-ref','HEAD') -ErrorMessage 'Unable to determine current branch.'
  if ($currentBranch -eq $EffectiveProdBranch) { return }

  if (-not (Test-WorkingTreeClean)) {
    Write-Host ("AutoCheckoutProdBranch skipped: working tree is dirty (current={0}, prod={1})." -f $currentBranch, $EffectiveProdBranch) -ForegroundColor Yellow
    return
  }

  Write-Host ("AutoCheckoutProdBranch: switching {0} -> {1}" -f $currentBranch, $EffectiveProdBranch) -ForegroundColor Yellow
  Run 'git' @('checkout',$EffectiveProdBranch)
  Run 'git' @('pull','--ff-only')
}

function Get-AheadBehind([string]$UpstreamRef) {
  $countRaw = (& git rev-list --left-right --count "$UpstreamRef...HEAD") 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($countRaw)) {
    throw "Unable to compare local with '$UpstreamRef'."
  }

  $parts = ($countRaw -replace "\s+", ' ').Trim().Split(' ')
  if ($parts.Count -lt 2) {
    throw "Unable to parse ahead/behind count from git rev-list output '$countRaw'."
  }

  return @([int]$parts[0], [int]$parts[1])
}

function Ensure-GitRemoteParity([switch]$SkipAutoPush) {
  $branch = Get-GitValue -Args @('rev-parse','--abbrev-ref','HEAD') -ErrorMessage 'Unable to determine current branch.'
  $upstreamRef = Resolve-UpstreamRef

  $localSha = Get-GitValue -Args @('rev-parse','HEAD') -ErrorMessage 'Unable to determine local SHA via git rev-parse HEAD.'
  $originSha = Get-GitValue -Args @('rev-parse',$upstreamRef) -ErrorMessage "Unable to determine remote SHA for '$upstreamRef'."

  $pair = Get-AheadBehind -UpstreamRef $upstreamRef
  $behind = $pair[0]
  $ahead = $pair[1]

  if ($behind -gt 0 -and $ahead -gt 0) {
    throw ("Git parity failed: local diverged from {0} (behind={1}, ahead={2}). Fix with git pull --rebase, resolve conflicts, then rerun." -f $upstreamRef, $behind, $ahead)
  }

  if ($behind -gt 0) {
    throw ("Git parity failed: local is behind {0} by {1} commit(s). Run git pull --ff-only (or rebase), then rerun." -f $upstreamRef, $behind)
  }

  if ($ahead -gt 0) {
    if ($SkipAutoPush) {
      throw ("Git parity failed: local is ahead of {0} by {1} commit(s). Run git push, then rerun." -f $upstreamRef, $ahead)
    }

    if ($branch -ne 'main') {
      throw ("Auto-push blocked: current branch is '{0}'. Auto-push is allowed only on branch 'main'." -f $branch)
    }

    Write-Host ("Local is ahead of {0} by {1} commit(s); auto-pushing main..." -f $upstreamRef, $ahead) -ForegroundColor Yellow
    Run 'git' @('push','origin','main')
    Run 'git' @('fetch','--all','--prune')

    $originSha = Get-GitValue -Args @('rev-parse',$upstreamRef) -ErrorMessage "Unable to determine remote SHA for '$upstreamRef' after push."
    $pairAfter = Get-AheadBehind -UpstreamRef $upstreamRef
    if ($pairAfter[0] -ne 0 -or $pairAfter[1] -ne 0) {
      throw ("Auto-push completed but branch still not in parity with {0} (behind={1}, ahead={2})." -f $upstreamRef, $pairAfter[0], $pairAfter[1])
    }
  }

  $localSha = Get-GitValue -Args @('rev-parse','HEAD') -ErrorMessage 'Unable to read local HEAD after parity check.'
  $originSha = Get-GitValue -Args @('rev-parse',$upstreamRef) -ErrorMessage "Unable to read $upstreamRef after parity check."

  if ($localSha -ne $originSha) {
    throw ("Git parity failed unexpectedly: local={0}, remote={1}." -f $localSha, $originSha)
  }

  return [PSCustomObject]@{
    Branch = $branch
    UpstreamRef = $upstreamRef
    LocalSha = $localSha
    OriginSha = $originSha
  }
}

function Resolve-VercelProdHost([string]$ProvidedValue) {
  $target = ''

  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    $target = $ProvidedValue
  }

  $hostFilePath = '.\ops\vercel_prod_host.txt'
  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PROD_HOST)) {
    $target = $env:OSH_VERCEL_PROD_HOST
  }

  if ([string]::IsNullOrWhiteSpace($target) -and (Test-Path $hostFilePath)) {
    $line = Get-Content -Path $hostFilePath -TotalCount 1 -ErrorAction SilentlyContinue
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $target = $line
    }
  }

  if ([string]::IsNullOrWhiteSpace($target)) { return $null }

  $target = $target.Trim()
  $target = $target -replace '^https?://', ''
  $target = ($target -split '[/?#]', 2)[0]
  $target = $target.TrimEnd('/')

  if ($target -notmatch '^[A-Za-z0-9.-]+(:\d+)?$' -or $target -notmatch '[A-Za-z0-9.-]') {
    throw "Invalid Vercel production host '$target'."
  }

  return $target
}

function Resolve-HostValue([string]$ProvidedValue, [string]$EnvName, [string]$FilePath, [string]$Label) {
  $target = ''

  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    $target = $ProvidedValue
  }

  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($EnvName)) {
    $envValue = [Environment]::GetEnvironmentVariable($EnvName)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
      $target = $envValue
    }
  }

  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($FilePath) -and (Test-Path $FilePath)) {
    $line = Get-Content -Path $FilePath -TotalCount 1 -ErrorAction SilentlyContinue
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $target = $line
    }
  }

  if ([string]::IsNullOrWhiteSpace($target)) { return $null }

  $target = $target.Trim()
  $target = $target -replace '^https?://', ''
  $target = ($target -split '[/?#]', 2)[0]
  $target = $target.TrimEnd('/')

  if ($target -notmatch '^[A-Za-z0-9.-]+(:\d+)?$' -or $target -notmatch '[A-Za-z0-9.-]') {
    throw ("Invalid {0} host '{1}'." -f $Label, $target)
  }

  return $target
}

function Resolve-VercelPreviewHost([string]$ProvidedValue) {
  return Resolve-HostValue -ProvidedValue $ProvidedValue -EnvName 'OSH_VERCEL_PREVIEW_HOST' -FilePath '.\ops\vercel_preview_host.txt' -Label 'Vercel preview'
}

function Infer-ProdBranchFromOriginHead([string]$FallbackBranch = 'main') {
  $symbolic = (& git symbolic-ref --quiet --short refs/remotes/origin/HEAD) 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($symbolic)) {
    $remoteRef = ($symbolic | Select-Object -First 1).Trim()
    if ($remoteRef -match '^origin/(.+)$') {
      return $Matches[1]
    }
  }
  return $FallbackBranch
}

function Resolve-VercelProdBranch([string]$ProvidedValue, [string]$FallbackBranch = 'main') {
  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    return $ProvidedValue.Trim()
  }

  $branchFilePath = '.\ops\vercel_prod_branch.txt'
  if (Test-Path $branchFilePath) {
    $line = Get-Content -Path $branchFilePath -TotalCount 1 -ErrorAction SilentlyContinue
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      return $line.Trim()
    }
  }

  return Infer-ProdBranchFromOriginHead -FallbackBranch $FallbackBranch
}

function Resolve-ParityTargetHost([string]$CurrentBranch, [string]$EffectiveProdBranch, [string]$RequestedTarget, [string]$ProvidedProdHost, [string]$ProvidedPreviewHost) {
  $productionHost = Resolve-VercelProdHost -ProvidedValue $ProvidedProdHost
  $previewHost = Resolve-VercelPreviewHost -ProvidedValue $ProvidedPreviewHost

  if ($RequestedTarget -eq 'prod') {
    if ([string]::IsNullOrWhiteSpace($productionHost)) {
      return [PSCustomObject]@{ ShouldRun = $false; Target = 'prod'; Host = ''; Message = 'Missing Vercel production host. Set -ProdHost / -VercelHost or ops/vercel_prod_host.txt.' }
    }
    return [PSCustomObject]@{ ShouldRun = $true; Target = 'prod'; Host = $productionHost; Message = '' }
  }

  if ($RequestedTarget -eq 'preview') {
    if ([string]::IsNullOrWhiteSpace($previewHost)) {
      return [PSCustomObject]@{ ShouldRun = $false; Target = 'preview'; Host = ''; Message = 'Missing preview host. Set -PreviewHost or ops/vercel_preview_host.txt.' }
    }
    return [PSCustomObject]@{ ShouldRun = $true; Target = 'preview'; Host = $previewHost; Message = '' }
  }

  if ($CurrentBranch -eq $EffectiveProdBranch) {
    if ([string]::IsNullOrWhiteSpace($productionHost)) {
      return [PSCustomObject]@{ ShouldRun = $false; Target = 'prod'; Host = ''; Message = 'Missing Vercel production host for prod branch parity. Set -ProdHost / -VercelHost or ops/vercel_prod_host.txt.' }
    }
    return [PSCustomObject]@{ ShouldRun = $true; Target = 'prod'; Host = $productionHost; Message = '' }
  }

  if (-not [string]::IsNullOrWhiteSpace($previewHost)) {
    return [PSCustomObject]@{ ShouldRun = $true; Target = 'preview'; Host = $previewHost; Message = '' }
  }

  return [PSCustomObject]@{
    ShouldRun = $false
    Target = 'skip'
    Host = ''
    Message = ("你在 feature branch（{0}），Production 不會是這個 commit；請設定 preview host 或先 merge。" -f $CurrentBranch)
  }
}

function Invoke-VersionEndpoint([string]$ProdHost) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $timestamp = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $url = "https://$ProdHost/api/version?t=$timestamp"
  $response = Invoke-WebRequest -Uri $url -Method Get -Headers @{ 'Cache-Control'='no-cache'; 'Pragma'='no-cache' } -TimeoutSec 15 -ErrorAction Stop

  $body = $response.Content
  $json = $null
  if (-not [string]::IsNullOrWhiteSpace($body)) {
    try {
      $json = $body | ConvertFrom-Json
    } catch {
      throw "Unable to parse /api/version response JSON. Body=$((Shorten-Text $body 240))"
    }
  }

  return [PSCustomObject]@{
    StatusCode = [int]$response.StatusCode
    Json = $json
    Body = $body
    Url = $url
  }
}

function Get-WebExceptionStatusCode([System.Exception]$Exception) {
  if ($null -eq $Exception) { return $null }
  if ($Exception -is [System.Net.WebException] -and $Exception.Response) {
    try {
      return [int]([System.Net.HttpWebResponse]$Exception.Response).StatusCode
    } catch {}
  }
  if ($Exception.PSObject.Properties['Response'] -and $Exception.Response) {
    try {
      return [int]$Exception.Response.StatusCode
    } catch {}
  }
  return $null
}

function Assert-VersionRouteExistsInHead() {
  & git cat-file -e 'HEAD:app/api/version/route.ts' 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw 'Missing app/api/version/route.ts in HEAD commit. The route may exist only in your working tree. Please git add/commit/push this route, then rerun parity gate.'
  }
}

function Wait-VercelCommitParity([string]$ProdHost, [string]$LocalSha, [string]$ExpectedEnv, [switch]$AllowPreview, [int]$MaxWaitSec = 600, [int]$PollIntervalSec = 10) {
  $started = Get-Date
  $attempt = 0
  $safeIntervalSec = [Math]::Max(1, $PollIntervalSec)
  $maxAttempts = [Math]::Max(1, [int][Math]::Floor($MaxWaitSec / $safeIntervalSec) + 1)
  $lastStatusCode = $null
  $hadParsedCommitSha = $false
  $branchName = Get-GitValue -Args @('rev-parse','--abbrev-ref','HEAD') -ErrorMessage 'Unable to determine current branch for diagnostics.'
  $did404Diagnosis = $false

  $result = [PSCustomObject]@{
    CommitSha = ''
    VercelEnv = ''
    VercelUrl = ''
    GitRef = ''
    StatusCode = 0
    TelemetryHealthStatus = ''
  }

  while ($attempt -lt $maxAttempts) {
    $attempt++
    $elapsedSec = [int]((Get-Date) - $started).TotalSeconds

    try {
      $versionResponse = Invoke-VersionEndpoint -ProdHost $ProdHost
      $statusCode = $versionResponse.StatusCode
      $lastStatusCode = $statusCode
      $result.StatusCode = $statusCode

      if ($statusCode -eq 404) {
        throw "404"
      }

      if ($statusCode -ne 200) {
        throw ("Unexpected status {0} from {1}." -f $statusCode, $versionResponse.Url)
      }

      $json = $versionResponse.Json
      $vercelSha = if ($json -and $json.commitSha) { [string]$json.commitSha } else { '' }
      $vercelEnvValue = if ($json -and $json.vercelEnv) { [string]$json.vercelEnv } else { '' }
      $vercelUrl = if ($json -and $json.vercelUrl) { [string]$json.vercelUrl } else { '' }
      $gitRef = if ($json -and $json.gitRef) { [string]$json.gitRef } else { '' }

      $result.CommitSha = $vercelSha
      $result.VercelEnv = $vercelEnvValue
      $result.VercelUrl = $vercelUrl
      $result.GitRef = $gitRef

      if (-not $AllowPreview -and $vercelEnvValue -eq 'preview') {
        throw "Host '$ProdHost' is preview (vercelEnv=preview). Use Production domain or rerun with -AllowPreviewHost."
      }

      if ($ExpectedEnv -ne 'any' -and -not [string]::IsNullOrWhiteSpace($vercelEnvValue) -and $vercelEnvValue -ne $ExpectedEnv) {
        throw ("Vercel environment mismatch: expected={0} actual={1} host={2}." -f $ExpectedEnv, $vercelEnvValue, $ProdHost)
      }

      if ([string]::IsNullOrWhiteSpace($vercelSha) -or $vercelSha -eq 'unknown') {
        Write-Host ("/api/version returned commitSha='$vercelSha'. waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
        if ($attempt -lt $maxAttempts) { Start-Sleep -Seconds $safeIntervalSec }
        continue
      }

      $hadParsedCommitSha = $true
      if ($vercelSha -ne $LocalSha) {
        Write-Host ("Vercel commit mismatch: local=$LocalSha vercel=$vercelSha host=$ProdHost vercelEnv=$vercelEnvValue waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
        if ($attempt -lt $maxAttempts) { Start-Sleep -Seconds $safeIntervalSec }
        continue
      }

      Write-Host ("VERCEL == LOCAL ✅ ({0}) (vercelEnv={1})" -f $LocalSha, $vercelEnvValue) -ForegroundColor Green
      $result | Add-Member -NotePropertyName Success -NotePropertyValue $true -Force
      $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue '' -Force
      return $result
    } catch {
      $statusCode = Get-WebExceptionStatusCode -Exception $_.Exception
      if ($_.Exception.Message -eq '404') { $statusCode = 404 }
      if ($null -ne $statusCode) {
        $lastStatusCode = $statusCode
        $result.StatusCode = $statusCode
      }

      if ($statusCode -eq 404) {
        if (-not $did404Diagnosis) {
          $did404Diagnosis = $true
          $probeUrl = "https://$ProdHost/api/telemetry/health"
          $probeStatus = 'unavailable'
          try {
            $probeResp = Invoke-WebRequest -Uri $probeUrl -Method Get -TimeoutSec 10 -ErrorAction Stop
            $probeStatus = [string]$probeResp.StatusCode
          } catch {
            $probeCode = Get-WebExceptionStatusCode -Exception $_.Exception
            if ($null -ne $probeCode) { $probeStatus = [string]$probeCode }
          }
          $result.TelemetryHealthStatus = $probeStatus
          Write-Host ("/api/version 404 diagnosed once: host={0}, branch={1}, telemetryHealth={2}." -f $ProdHost, $branchName, $probeStatus) -ForegroundColor Yellow
        } elseif (($attempt % 10) -eq 0 -or $attempt -eq $maxAttempts) {
          Write-Host ("/api/version still 404 (attempt {0}/{1}); waiting..." -f $attempt, $maxAttempts) -ForegroundColor DarkYellow
        }
      } else {
        $shortMsg = Shorten-Text -Text $_.Exception.Message -MaxLen 240
        Write-Host ("Vercel parity probe retry: status=$statusCode detail=$shortMsg waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
      }

      if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds $safeIntervalSec
        continue
      }
    }
  }

  if ($lastStatusCode -eq 404) {
    $result | Add-Member -NotePropertyName Success -NotePropertyValue $false -Force
    $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue ("PARITY 404: /api/version not found after {0} tries (host={1}, branch={2}, telemetryHealth={3}). 檢查 host 是否指向正確環境，或等待部署完成。" -f $maxAttempts, $ProdHost, $branchName, $result.TelemetryHealthStatus) -Force
    return $result
  }

  if (-not $hadParsedCommitSha) {
    $result | Add-Member -NotePropertyName Success -NotePropertyValue $false -Force
    $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue ("VERCEL PARITY PROBE FAILED: unable to obtain commitSha from /api/version after {0} tries (host={1}, branch={2}, lastStatus={3})." -f $maxAttempts, $ProdHost, $branchName, $lastStatusCode) -Force
    return $result
  }

  $result | Add-Member -NotePropertyName Success -NotePropertyValue $false -Force
  $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue ("VERCEL MISMATCH after {0} tries: host={1}, remoteSha={2}, localSha={3}, vercelEnv={4}" -f $maxAttempts, $ProdHost, $result.CommitSha, $LocalSha, $result.VercelEnv) -Force
  return $result
}

function Write-ParitySnapshot([string]$LocalSha, [string]$OriginSha, [string]$VercelSha, [string]$VercelEnvValue, [string]$ProdHost) {
  $snapshot = [ordered]@{
    timestamp = (Get-Date).ToString('o')
    localSha = $LocalSha
    originSha = $OriginSha
    vercelCommitSha = $VercelSha
    vercelEnv = $VercelEnvValue
    productionHost = $ProdHost
  }

  $opsDir = '.\ops'
  if (-not (Test-Path $opsDir)) {
    New-Item -ItemType Directory -Path $opsDir -Force | Out-Null
  }

  $snapshotPath = Join-Path $opsDir 'parity_snapshot_latest.json'
  ($snapshot | ConvertTo-Json -Depth 4) | Out-File -FilePath $snapshotPath -Encoding utf8
  Write-Host ("Saved parity snapshot: {0}" -f $snapshotPath) -ForegroundColor Green
}

Write-Section "Boot"
$repoRoot = Ensure-RepoRoot
Write-Host ("Time: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -ForegroundColor Gray
Write-Host ("Repo: {0}" -f $repoRoot) -ForegroundColor Gray

Assert-ScriptParses -ScriptPath (Join-Path $repoRoot "post_merge_routine.ps1")
Write-Host "PowerShell parser check: OK" -ForegroundColor Green

Write-Section "Git context"
$gitOk = $false
if (Get-Command git -ErrorAction SilentlyContinue) {
  $isRepo = (& git rev-parse --is-inside-work-tree) 2>$null
  if ($LASTEXITCODE -eq 0 -and $isRepo -eq 'true') { $gitOk = $true }
}

if (-not $gitOk) {
  throw 'git is required for this routine (not a git repo or git not found).'
}

$branch = (& git rev-parse --abbrev-ref HEAD) 2>$null
$commit = (& git rev-parse --short HEAD) 2>$null
$head = (& git log -1 --oneline) 2>$null
Write-Host ("Branch: {0}" -f $branch) -ForegroundColor Green
Write-Host ("Commit: {0}" -f $commit) -ForegroundColor Green
Write-Host ("Head:   {0}" -f $head) -ForegroundColor Green

Write-Section "Git preflight parity"
if (Test-GitOperationInProgress) {
  throw "Git operation in progress (merge/rebase/cherry-pick). Run git status, resolve or abort, then rerun .\post_merge_routine.ps1."
}

$unmerged = (& git diff --name-only --diff-filter=U) 2>$null
if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($unmerged -join "`n"))) {
  throw "Unmerged files detected. Run git status and resolve conflicts before rerunning .\post_merge_routine.ps1."
}

Assert-NoConflictMarkers
Ensure-CleanWorkingTree
Run 'git' @('fetch','--all','--prune')

$effectiveProdBranch = Resolve-VercelProdBranch -ProvidedValue $ProdBranch -FallbackBranch 'main'
Write-Host ("Resolved production branch: {0}" -f $effectiveProdBranch) -ForegroundColor Green
Ensure-OnProdBranchIfNeeded -EffectiveProdBranch $effectiveProdBranch -EnableAutoCheckout $AutoCheckoutProdBranch

if (-not $SkipPull) {
  $upstream = Resolve-UpstreamRef
  if (-not [string]::IsNullOrWhiteSpace($upstream)) {
    Run 'git' @('pull','--ff-only')
  }
} else {
  Write-Host 'SkipPull enabled.' -ForegroundColor DarkGray
}

Write-Host 'Preflight: OK' -ForegroundColor Green

Write-Section "Optional: feature fingerprint check"
if ($Expect.Count -gt 0) {
  $paths = @()
  switch ($ExpectScope) {
    'code' { $paths = @('app','src','components','ops') }
    'all'  { $paths = @() }
  }

  $existingExpectPaths = @()
  foreach ($path in $paths) {
    if (Test-Path ".\$path") { $existingExpectPaths += $path }
  }
  if ($ExpectScope -eq 'code' -and $existingExpectPaths.Count -eq 0) {
    throw 'EXPECT FAILED: code scope paths (app/src/components/ops) not found. Likely wrong branch/commit.'
  }

  foreach ($pat in $Expect) {
    if ([string]::IsNullOrWhiteSpace($pat)) { continue }
    $expectMode = if ($ExpectRegex) { 'regex' } else { 'fixed-string' }
    Write-Host ("Expect: {0} (scope={1}, mode={2})" -f $pat, $ExpectScope, $expectMode) -ForegroundColor Cyan

    $expectArgs = @('grep','-n')
    if (-not $ExpectRegex) { $expectArgs += '-F' }
    $expectArgs += '--'
    $expectArgs += $pat

    if ($ExpectScope -eq 'all') {
      & git @expectArgs | Out-Null
    } else {
      & git @expectArgs -- @existingExpectPaths | Out-Null
    }

    if ($LASTEXITCODE -ne 0) {
      throw "EXPECT FAILED: pattern '$pat' not found (scope=$ExpectScope, mode=$expectMode). Likely wrong branch/commit."
    }
  }
  Write-Host 'Expect check: OK' -ForegroundColor Green
} else {
  Write-Host 'Expect check: (skipped)' -ForegroundColor DarkGray
}

Write-Section "Clean build artifacts"
if ($SkipClean) {
  Write-Host 'SkipClean enabled.' -ForegroundColor DarkGray
} else {
  if (Test-Path '.\.next') {
    Write-Host 'Removing .next directory' -ForegroundColor Yellow
    Remove-Item -Recurse -Force '.\.next' -ErrorAction SilentlyContinue
  } else {
    Write-Host '.next not found (skip)' -ForegroundColor DarkGray
  }
}

Write-Section "Kill ports"
if ($SkipKillPorts) {
  Write-Host 'SkipKillPorts enabled.' -ForegroundColor DarkGray
} else {
  foreach ($port in $KillPorts) { Stop-Port -Port $port }
}

Write-Section "Install (npm ci)"
if (-not $SkipNpmCi) { Run 'npm' @('ci') }
else { Write-Host 'SkipNpmCi enabled.' -ForegroundColor DarkGray }

Write-Section "Lint (npm run lint)"
if ($SkipLint) {
  Write-Host 'SkipLint enabled.' -ForegroundColor DarkGray
} else {
  try {
    Run 'npm' @('run','lint')
    Write-Host 'LINT OK' -ForegroundColor Green
  } catch {
    throw 'Lint failed; fix before build/deploy'
  }
}

Write-Section "Build (npm run build)"
if (-not $SkipBuild) {
  Run 'npm' @('run','build')
  Write-Host 'BUILD OK' -ForegroundColor Green
} else {
  Write-Host 'SkipBuild enabled.' -ForegroundColor DarkGray
}

Write-Section "Vercel parity gate (branch-aware)"
$runVercelParity = $false
if ($ParityTarget -eq 'off') {
  $runVercelParity = $false
} elseif ($VercelParityMode -ne 'off' -and ((-not $SkipVercelParity) -or $RequireVercelSameCommit)) {
  $runVercelParity = $true
}
$finalLocalSha = ''
$finalOriginSha = ''
$finalVercelSha = ''
$finalVercelEnv = ''
$productionDomainHost = ''
$parityFailed = $false
$parityFailureMessage = ''

if ($runVercelParity) {
  Assert-VersionRouteExistsInHead

  Ensure-CleanWorkingTree
  $parityState = Ensure-GitRemoteParity -SkipAutoPush:$SkipPush
  $finalLocalSha = $parityState.LocalSha
  $finalOriginSha = $parityState.OriginSha

  $hostTarget = Resolve-ParityTargetHost -CurrentBranch $parityState.Branch -EffectiveProdBranch $effectiveProdBranch -RequestedTarget $ParityTarget -ProvidedProdHost $VercelProdUrlOrHost -ProvidedPreviewHost $PreviewHost
  if (-not $hostTarget.ShouldRun) {
    Write-Host ("Vercel parity skipped: {0}" -f $hostTarget.Message) -ForegroundColor Yellow
  } else {
    $productionDomainHost = $hostTarget.Host
    $expectedVercelEnv = if ($hostTarget.Target -eq 'preview') { 'preview' } elseif ($VercelEnv -eq 'preview') { 'production' } else { $VercelEnv }

    $effectiveParityRetries = if (-not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PARITY_RETRIES)) { [int]$env:OSH_VERCEL_PARITY_RETRIES } else { $VercelParityRetries }
    $effectiveParityDelaySec = if (-not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PARITY_DELAY_SEC)) { [int]$env:OSH_VERCEL_PARITY_DELAY_SEC } else { $null }
    $effectivePollIntervalSec = if ($effectiveParityDelaySec -and $effectiveParityDelaySec -gt 0) { $effectiveParityDelaySec } else { $VercelPollIntervalSec }
    $effectiveMaxWaitSec = 0
    if ($VercelMaxWaitSec -and $VercelMaxWaitSec -gt 0) {
      $effectiveMaxWaitSec = $VercelMaxWaitSec
    } elseif ($effectiveParityRetries -and $effectiveParityRetries -gt 0) {
      $effectiveMaxWaitSec = [Math]::Max(1, ($effectivePollIntervalSec * ([Math]::Max(1, $effectiveParityRetries - 1))) + 1)
    } else {
      $effectiveMaxWaitSec = 600
    }

    $allowPreviewForTarget = $AllowPreviewHost -or $hostTarget.Target -eq 'preview'
    $vercelState = Wait-VercelCommitParity -ProdHost $productionDomainHost -LocalSha $finalLocalSha -ExpectedEnv $expectedVercelEnv -AllowPreview:$allowPreviewForTarget -MaxWaitSec $effectiveMaxWaitSec -PollIntervalSec $effectivePollIntervalSec
    if (-not $vercelState.Success) {
      $parityFailed = $true
      $parityFailureMessage = $vercelState.FailureMessage
      Write-Host ("Vercel parity failed: {0}" -f $parityFailureMessage) -ForegroundColor Yellow
    }
    $finalVercelSha = $vercelState.CommitSha
    $finalVercelEnv = $vercelState.VercelEnv

    Write-Host ("PARITY TARGET: {0}" -f $hostTarget.Target) -ForegroundColor Green
    Write-Host ("LOCAL SHA:     {0}" -f $finalLocalSha) -ForegroundColor Green
    Write-Host ("ORIGIN SHA:    {0}" -f $finalOriginSha) -ForegroundColor Green
    Write-Host ("VERCEL SHA:    {0}" -f $finalVercelSha) -ForegroundColor Green
    Write-Host ("VERCEL ENV:    {0}" -f $finalVercelEnv) -ForegroundColor Green

    Write-ParitySnapshot -LocalSha $finalLocalSha -OriginSha $finalOriginSha -VercelSha $finalVercelSha -VercelEnvValue $finalVercelEnv -ProdHost $productionDomainHost
  }
} else {
  if ($ParityTarget -eq 'off' -or $VercelParityMode -eq 'off') {
    Write-Host 'Vercel parity skipped (off).' -ForegroundColor Yellow
  } else {
    Write-Host 'SkipVercelParity enabled.' -ForegroundColor Yellow
  }
}

Write-Section "Summary"
if ($parityFailed) {
  Write-Host ("PARITY SUMMARY: FAIL - {0}" -f $parityFailureMessage) -ForegroundColor Yellow
  Write-Host 'Next step: verify host mapping for current branch and retry parity after deployment is ready.' -ForegroundColor Yellow
  if ($StrictParity) {
    Write-Host 'StrictParity enabled: exiting with non-zero code.' -ForegroundColor Red
    exit 2
  }
} else {
  Write-Host 'PARITY SUMMARY: OK or skipped.' -ForegroundColor Green
}

Write-Section "Runtime server"
if (-not $SkipDev) {
  if ($ProdSmoke) {
    Write-Host 'ProdSmoke approximates Vercel runtime; dev may differ.' -ForegroundColor Yellow
    Write-Host ("Starting prod smoke: npm run start -- -p {0}" -f $DevPort) -ForegroundColor Cyan
    Run 'npm' @('run','start','--','-p',"$DevPort")
  } else {
    Write-Host ("Starting dev: npm run dev -- --webpack -p {0}" -f $DevPort) -ForegroundColor Cyan
    Run-DevWithReadyBanner -Port $DevPort
  }
} else {
  Write-Host 'SkipDev enabled.' -ForegroundColor DarkGray
}

```

### docs/oshihapi_ops_windows.md
```text
# 🧭 oshihapi 操作守則（Windows / PowerShell 版）v3（覆蓋用）

> 你可以把本檔整段原封不動貼到 `docs/oshihapi_ops_windows.md` 覆蓋原本。

## 0) 只建一個捷徑就夠（必做）
✅ Repo 根目錄（所有 dev / git / localhost 都從這裡開始）  
`C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

> 建議：桌面捷徑指到 repo 根目錄（見第 12 節）

---

## 1) 檔案地圖（找檔案就照這張）

### A) 規格/文件（最常看）
- `./SPEC.md`
- `./docs/`
  - `decision_engine_report_ja.md`
  - `decision_engine_report_zh_TW.md`
  - `開発状況まとめ_latest.md`
  - `発想メモ_latest.md`
  - `result_ui_update_notes.txt`
  - `codex_prompt_*.txt`（貼給 Codex 的任務都在這）
  - `ai_product_brief_ja_mvp.md`（給 AI 的大框架指令）
  - `ai_next_phase_ml_ui.md`（下一階段給 AI 的指令）

✅ 全 repo 找 Codex prompt：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
Get-ChildItem -Recurse -Filter "codex_prompt*.txt" | Select-Object FullName
```

### B) UI（Next.js App Router）
- `./app/page.tsx`（Home）
- `./app/flow/page.tsx`（Flow）
- `./app/result/[runId]/page.tsx`（Result）
- `./app/history/page.tsx`（History）
- `./app/layout.tsx`

### C) 引擎/題庫/規則（核心）
- `./src/oshihapi/engine.ts`
- `./src/oshihapi/engineConfig.ts`
- `./src/oshihapi/merch_v2_ja.ts`
- `./src/oshihapi/reasonRules.ts`
- `./src/oshihapi/runStorage.ts`
- `./src/oshihapi/promptBuilder.ts`（長診斷 prompt）
- `./src/oshihapi/modeGuide/*`
- `./src/oshihapi/telemetryClient.ts`（匿名送信 client）

### D) 共用元件
- `./components/DecisionScale.tsx`

---

## 2) repo 內搜尋（rg 不一定有，用這兩套）
### A) 有 ripgrep（rg）就用 rg（快）
```powershell
rg "匿名データ" -n
rg "送信する" -n
rg "l1Label" -n
rg "/api/telemetry" -n
```

### B) 沒 rg 就用 Select-String（PowerShell 內建）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
Get-ChildItem -Recurse -File | Select-String -Pattern "匿名データ" -List
```

---

## 3) zip 包下載/解壓（永遠用同一個目的地）
✅ 固定解壓根目錄：  
`C:\Users\User\Downloads\_oshihapi_packs\`

```powershell
$zipName = "some_pack.zip"  # ← 改這個
$zip  = Join-Path $env:USERPROFILE "Downloads\$zipName"
$dest = Join-Path $env:USERPROFILE "Downloads\_oshihapi_packs\$($zipName -replace '\.zip$','')"

Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Expand-Archive -Path $zip -DestinationPath $dest -Force

dir $dest
dir (Join-Path $dest "docs") -Recurse -ErrorAction SilentlyContinue
dir (Join-Path $dest "src") -Recurse -ErrorAction SilentlyContinue
dir (Join-Path $dest "components") -Recurse -ErrorAction SilentlyContinue
```

---

## 4) 手動導入 zip 內容到 repo（推薦 PowerShell 版）
✅ 標準 Copy 模板（docs/src/components 覆蓋貼進 repo）

```powershell
$repo = "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis"
$pack = Join-Path $env:USERPROFILE "Downloads\_oshihapi_packs\some_pack"  # ← 改 pack 資料夾名

Copy-Item -Recurse -Force (Join-Path $pack "docs\*") (Join-Path $repo "docs") -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force (Join-Path $pack "src\*")  (Join-Path $repo "src")  -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force (Join-Path $pack "components\*") (Join-Path $repo "components") -ErrorAction SilentlyContinue

cd $repo
git status
```

---

## 5) 每天開工固定流程（照做就不亂）
### A) 同步最新（先確認分支）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git fetch origin
git branch --show-current
git log -1 --oneline
```

### B) 目前實務規則（固定）
- 看最新 UI/flow/result：✅ `feature/urgent-medium-long`
- 對外穩定/Production：✅ `main`（但要先把 feature merge 回 main）

切到 feature 並更新：
```powershell
git checkout feature/urgent-medium-long
git pull
```

### C) 跑本機（Windows 固定 webpack）
```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run dev -- --webpack
```

打開：  
- http://localhost:3000

---

## 6) 用 Codex 時：分支要選哪個？
✅ 原則：你希望 PR 最後合到哪，就選哪個 base branch

- 繼續在最新流程上迭代：✅ Codex base 選 `feature/urgent-medium-long`
- 直接更新 Production（main）：✅ Codex base 選 `main`
- 不要選 `codex/*` 當 base（那是工作分支）

---

## 7) PR merge 完後：本機要下什麼（固定版）
### PR merge 到 feature
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git checkout feature/urgent-medium-long
git pull
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run dev -- --webpack
```

### PR merge 到 main
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git checkout main
git pull
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run dev -- --webpack
```


### Vercel parity gate（Production == Local == origin/main）
合併後只要跑一個命令：
```powershell
./post_merge_routine.ps1
```

> ⚠️ PowerShell 通常也可用 `.\post_merge_routine.ps1`，但文件統一示範 `./post_merge_routine.ps1`。

> ℹ️ 新版 conflict scan 只掃 `app/`、`src/`、`components/`、`ops/` 與 `post_merge_routine.ps1`，且用行首錨定 `^<<<<<<<` / `^=======$` / `^>>>>>>>`，不掃 `docs/` 可避免誤判。

> ℹ️ Vercel parity 可用 `-VercelParityMode warn`（不阻塞、僅警告）或 `-VercelParityMode enforce`（嚴格失敗即中止）。

#### 一次性設定（只做一次）
1. Vercel Project → **Settings** → **Git**，確認 **Production Branch** 就是你平常 merge 的分支（通常是 `main`）。
2. 設定 Production domain host（只放 host，不含 `https://`、不含 `/path`）：

```powershell
setx OSH_VERCEL_PROD_HOST "oshihapi-pushi-buy-diagnosis.vercel.app"
```
或：
```powershell
Copy-Item .\ops\vercel_prod_host.sample.txt .\ops\vercel_prod_host.txt
# 編輯 ops/vercel_prod_host.txt 第一行，只填 host
```

#### 腳本做了什麼（重點）
- `git fetch --all --prune`
- 工作樹必須乾淨（dirty 直接 fail-fast）
- 檢查本機與 `origin/main`（或 upstream）是否一致
  - 若本機 ahead，且目前在 `main`、無 dirty、無 divergence，預設自動 push（可加 `-SkipPush` 關閉）
- `npm ci` → `npm run build`（build 是硬性 gate）
- 輪詢 `https://<prod-host>/api/version`（最多等待 `-VercelMaxWaitSec`，預設 180 秒）
  - `404` 代表 Production 還沒更新到包含 `/api/version` 的 commit（或 Production Branch 設錯）
  - `200` 會比對 `commitSha` 是否等於本機 `HEAD`
- 印出：LOCAL SHA / ORIGIN SHA / VERCEL commitSha / VERCEL env
- 寫入：`ops/parity_snapshot_latest.json`

#### `/api/version` 回傳 404 代表什麼？
這不是本機腳本 bug。通常表示：Production 尚未提供包含 `/api/version` 的 commit、Production Branch 設錯，或 deployment 失敗 / 被 rate limit。
- 先跑 `git cat-file -e HEAD:app/api/version/route.ts`，確認 route 在 **HEAD commit**（不是只存在工作目錄）
- 先確認 Vercel **Production Branch** 設定正確
- 查看 Vercel Deployments 的最新 **Production** deployment 狀態
- 若遇到 rate limit（例如 `api-deployments-free-per-day`），需等待 / 升級 / 降低部署頻率
- 若你急著先開發，可先用 `./post_merge_routine.ps1 -SkipVercelParity` 暫時跳過 parity gate

快速檢查（PowerShell）：
```powershell
$prod=(Get-Content .\ops\vercel_prod_host.txt|Select-Object -First 1).Trim(); irm "https://$prod/api/version?t=$([int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" -TimeoutSec 10
```

#### Troubleshooting（常見錯誤）
- `Working tree is not clean`：先 `git status --short`，commit/stash 後重跑。
- `local diverged from origin/main`：先解 divergence（通常 `git pull --rebase` + 解衝突）再重跑。
- `Production domain is not serving the commit that contains app/api/version/route.ts`：
  - 檢查 Vercel Production Branch 是否等於 merge 目標分支
  - 或手動 promote 最新 deployment 到 Production
- `Vercel commit mismatch` timeout：通常是 Production deploy 還在跑或 deploy 失敗，去 Vercel Deployments 看狀態。

#### 緊急暫時跳過 parity gate（不建議常態）
```powershell
./post_merge_routine.ps1 -SkipVercelParity
```

⚠️ 重要：feature 併完後，最後一定要 merge 回 main（你自己的規則）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git checkout main
git pull
git merge feature/urgent-medium-long
git push
```

---

## 7.5) Git 救援手順（non-fast-forward / stash / rebase / 衝突標記）【新增】

### A) `git push` 被拒（non-fast-forward）
**症狀**：`rejected (non-fast-forward)`，遠端分支比本機新。

✅ 最穩流程（含 untracked files）：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git stash push -u -m "wip before rebase"
git fetch origin
git pull --rebase origin feature/urgent-medium-long
git stash pop
```

### B) ⚠️ PowerShell 的 `stash@{0}` 要加引號
不然會出現 `error: unknown switch`。
```powershell
git stash list
git stash drop 'stash@{0}'
```

### C) ⚠️ 看到 `No local changes to save` 時，不要立刻 `git stash pop`
`stash pop` 會套用「既有的 stash@{0}」（可能是舊的那包），很容易把衝突又帶回來。

### D) stash pop 後出現衝突標記導致 build 爆（`<<<<<<< Updated upstream`）
**症狀**：`npm run build` 報 Turbopack 解析失敗，並指向某個檔案含 `<<<<<<<`。

✅ 最短救援（回到乾淨 HEAD + 清掉 untracked）：
```powershell
git reset --hard HEAD
git clean -fd
npm run build
```

> 如果你確定那包 stash 不要了：先救乾淨，再用 `git stash drop 'stash@{0}'` 刪掉，避免下次手滑。

---

---

## 8) Telemetry / Neon 檢查（最短路徑）
### A) 前端：Result 頁送信流程（正確設計）
- 必須是：✅ opt-in（預設不勾）＋ ✅ 點「送信する」才送  
- 價格/商品名敏感欄位：必須正向 opt-in 且預設不勾

### B) 本機確認 API 有沒有被打到（看 dev server 視窗）
- `POST /api/telemetry 200` ✅
- `POST /api/telemetry 500` ❌ → 看回傳 JSON / toast 訊息

### C) 不要用 irm 看 500（常常只顯示例外）
改用瀏覽器或 curl.exe

瀏覽器直接開：  
- http://localhost:3000/api/telemetry/health

或用：
```powershell
curl.exe -i http://localhost:3000/api/telemetry/health
```

---

## 9) LF/CRLF（行末）雜訊處理（Windows 必看）【新增】

### 目標
- Git 不再一直提示 `LF will be replaced by CRLF`
- 團隊/CI/Vercel 以同一種行末（建議 LF）為準

### A) repo 內統一規則（已導入）
- `.gitattributes`：指定 `*.ts/*.tsx/*.md/...` 使用 LF
- `.gitignore`：忽略 `*.lnk`（Windows 捷徑不要進 repo）

### B) 重要：`.gitattributes` 要先被追蹤才會生效
如果 `.gitattributes` 還是 untracked，規則不會套用。

✅ 推薦順序（首次導入時）：
```powershell
git add .gitattributes .gitignore
git commit -m "chore: add gitattributes and ignore windows shortcuts"
git add --renormalize .
git status
```

### C) 建議：本 repo 把 autocrlf 關掉（只影響此 repo）
你可以保持全域 Git 設定不動，單獨針對這個 repo 設：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git config core.autocrlf false
```

---

---

## 10) Neon SQL（常用查詢清單）【新增】

> 目的：不用猜「有沒有寫入」，直接以 DB 為準。

### A) 最新 20 筆（原始 payload）
```sql
SELECT id, created_at, session_id, source, data
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 20;
```

### B) 最近 50 筆摘要（抽 event/runId/l1Label）
```sql
SELECT
  created_at,
  source,
  data->>'event' AS event,
  data->>'runId' AS run_id,
  data->>'l1Label' AS l1_label
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 50;
```

### C) L1 分佈（未填顯示 (none)）
```sql
SELECT
  COALESCE(data->>'l1Label', '(none)') AS l1_label,
  COUNT(*) AS cnt
FROM telemetry_runs
GROUP BY 1
ORDER BY cnt DESC;
```

### D) 若有獨立事件 `source='l1_feedback'`
```sql
SELECT COUNT(*) AS cnt
FROM telemetry_runs
WHERE source = 'l1_feedback';
```

---

## 11) ESLint / lint 現況
你目前看到錯誤：  
- ESLint v9 找不到 `eslint.config.(js|mjs|cjs)` → 代表 repo 缺少 flat config 檔或 lint script 不對

✅ MVP 不一定要先擋住，但建議下一步修成「能跑 lint 不爆」

快速確認：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
dir eslint.config.*
type package.json
```

---

## 11.5) If Vercel checks stay pending
### Steps
a) Open the Vercel check details (to confirm it is truly pending)  
b) Run locally:
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
npm ci
npm run build
```
c) Retrigger with an empty commit:
```powershell
git commit --allow-empty -m "chore: retrigger ci"
git push
```
d) Use GitHub Actions CI (lint + build) as the merge criteria while Vercel is pending

---

## 11.6) Vercel checks stuck (Waiting for status...)
### Steps
a) First, run local checks to confirm the code is OK:
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
npm ci
npm run build
```
b) Re-trigger checks via an empty commit:
```powershell
git commit --allow-empty -m "chore: retrigger ci"
git push
```
c) If branch protection requires Vercel checks, adjust required checks to prefer GitHub Actions CI (if permitted)

---

## 12) 手機 / 給朋友測（最短路徑）
- 給朋友：用 Vercel Preview 或 Production URL（不要用 localhost）
- 朋友測最新：丟 feature 的 Preview URL
- 朋友測穩定：Production URL（main）

---

## 13) 一鍵打開常用位置
```powershell
ii "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis"
ii "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\docs"
notepad "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\SPEC.md"
```

---

## 14) 一次建立桌面捷徑（repo / docs / GitHub）— 跑一次就好
```powershell
$repo = "C:\Users\User\dev\oshihapi-pushi-buy-diagnosis"
$docs = Join-Path $repo "docs"
$desktop = [Environment]::GetFolderPath("Desktop")
$wsh = New-Object -ComObject WScript.Shell

# Repo shortcut
$sc1 = $wsh.CreateShortcut((Join-Path $desktop "oshihapi-repo.lnk"))
$sc1.TargetPath = $repo
$sc1.WorkingDirectory = $repo
$sc1.Save()

# Docs shortcut
$sc2 = $wsh.CreateShortcut((Join-Path $desktop "oshihapi-docs.lnk"))
$sc2.TargetPath = $docs
$sc2.WorkingDirectory = $docs
$sc2.Save()

# GitHub URL shortcut
$urlFile = Join-Path $desktop "oshihapi-github.url"
@"
[InternetShortcut]
URL=https://github.com/Chipwwwwww/oshihapi-pushi-buy-diagnosis
"@ | Set-Content -Encoding ASCII $urlFile

"Done. Shortcuts created on Desktop."
```

---

## 15) ✅ 60 秒速查（最常用的 6 行）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git checkout feature/urgent-medium-long
git pull
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run dev -- --webpack
```

---

## 16) Vercel だけ `送信失敗 /api/telemetry 500` になる時（pg / env / integration）【2026-02-09 追加】

### 症状A：Vercel Logs に `Error: Cannot find module 'pg'`
- **原因**：`pg` が `devDependencies` にしかなく、Vercel Functions（node runtime）に入らない
- **対処**：`pg` を **dependencies** に入れる

```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
npm i pg
npm i -D @types/pg

git add package.json package-lock.json
git commit -m "fix: add pg to dependencies for Vercel runtime"
git push origin feature/urgent-medium-long
```

### 症状B：`/api/telemetry/health` が HTTP 500（ブラウザで 500 ページ）
- **見方**：Vercel → Project → **Logs** → Route で `/api/telemetry/health` を選んで、Error を見る
- **よくある原因**：
  1) DB 接続 ENV が入っていない（`POSTGRES_URL_NON_POOLING` or `POSTGRES_URL` or `DATABASE_URL`）
  2) Neon 側の接続先 / パスワードを変えたのに、Vercel の ENV が古い

### 症状C：Vercel の Environment Variables に「Edit」がない
- Neon/Vercel の **連携（Storage integration）** で作られた ENV は「管理対象」になり、値を直接編集できないことがある
- 対処の方針（どれか1つ）
  - ① 連携の **Manage Connection** 側から更新
  - ② 一度連携を外して、ENV を手動で追加し直す
  - ③ 別 Key 名で（例：`POSTGRES_URL_NON_POOLING`）を手動で追加して、アプリ側はその Key を優先する

### まずの検証（最短）
1) ブラウザで `https://<your-vercel>/api/telemetry/health`
- `{"ok":true}` → API/DB は生きてる
- `{"ok":false,"error":"db_env_missing"...}` → ENV が不足
- 500 page → Vercel logs で stacktrace（`pg` 不在が多い）

2) 送信ボタン押下→Vercel logs で `/api/telemetry` の status を見る

---

## 17) セキュリティ（重要）
- DB 接続文字列（ユーザー名/パスワード）は **チャットやスクショに出した時点で漏洩扱い**
- Neon 側でパスワードをローテートし、Vercel/ローカル `.env.local` を更新してください

```

### (missing) docs/pmr_safety_checklist.md

### docs/status_summary_latest.md
```text
# docs/status_summary_latest.md（開發現況總結：時間線＋驗收點）

> 用途：一眼掌握「現在穩了什麼 / 剩下什麼」，並留下可複製的驗收清單。

---

## TL;DR（2026-02-09 更新）

### ✅ 已完成（本機 & Vercel 都驗證過）
- ✅ 分支：`feature/urgent-medium-long`
- ✅ `npm run build`：成功（TypeScript 0 error）
- ✅ Vercel build / runtime 連續阻塞已排除
  - build（TS）：`pg` 型別宣告缺失 → 補 `@types/pg`
  - runtime（Vercel Functions）：`Error: Cannot find module 'pg'` → 把 `pg` 放到 **dependencies**（不是 devDependencies）
- ✅ `src/oshihapi/modeGuide/recommendMode.ts`：`boolean | undefined` 型別問題已修
- ✅ `/api/telemetry/health`：
  - 本機：可回 `{"ok":true}`
  - Vercel：可回 `{"ok":true}`（不再 500）
- ✅ Result 頁：「匿名データ送信」在 Vercel 成功寫入 Neon
- ✅ Windows Git 雜訊收斂：
  - 新增 `.gitattributes`（統一 LF 規則）
  - 更新 `.gitignore`：忽略 `*.lnk`
  - 本 repo 設定：`git config core.autocrlf false`（只影響此 repo）

### ✅ Parity Gate（Production == Local）摘要（本次補充）
- `post_merge_routine.ps1` 現在維持作為 merge 後唯一入口，預設執行 build 與 Vercel parity gate。
- parity gate 會先驗證本機 commit 與 upstream 一致，再輪詢 `https://<prod-host>/api/version` 比對 `commitSha`。
- 本次修正衝突標記誤判：`Assert-NoConflictMarkers` 改為只檢查**行首** `<<<<<<< / ======= / >>>>>>>`，避免腳本內說明文字被當成衝突。
- 衝突掃描範圍固定為 `app/`、`src/`、`components/`、`ops/` 與 `post_merge_routine.ps1`（不掃 `docs/` 與 repo root），降低文件字樣誤判風險。
- 新增 `-Expect` / `-ExpectScope (code|all)`（`code` 僅掃 app/src/components/ops，預設 fixed-string，`-ExpectRegex` 可切 regex），找不到時會 fail-fast 並提示可能跑錯 branch/commit。
- 新增 `-VercelParityMode (enforce|warn|off)`；預設等待強化為 retries 60、每次 10 秒（可由既有環境變數覆蓋），`warn` 模式超時只警告不中止。
- parity gate 現在會先用 `git cat-file -e HEAD:app/api/version/route.ts` 驗證 route 存在於 HEAD commit（非僅工作目錄），缺少時會 fail-fast 提示先 git add/commit/push。
- 當 `/api/version` 最終為 404 時，錯誤訊息改為明確指出 Production 尚未提供該 route，並提示檢查 HEAD commit、Vercel Production deployment commit 與 Production domain。
- 影響：在無衝突 repo 上，PowerShell 5.1 執行 `./post_merge_routine.ps1` 不會因誤判中止；若檔案真的含行首衝突標記仍會正確中止。

### 🟡 仍需做/確認（建議下一步）
- [ ] 合併到 `main` → 拿到固定 Production URL（給朋友測更方便）
- [ ] Telemetry 事件結構／匿名化規則：補齊 docs（價格 bucket、商品名 hash/不送）
- [ ] Neon 查詢清單（SQL）：快速看「回饋分佈／模式分佈／判定分佈」
- [ ] 朋友測試腳本（日文）+ 回收回饋表單（Google Form 也行）
- [ ] ゲーム課金（中立）v1: 種別追加 + Short/Medium + 情報チェック（検索）

---

## 這次對話的復盤（為什麼卡、怎麼解）

### 1) Vercel build 失敗：`pg` typings
**症狀**：Vercel build logs 顯示 TypeScript 無法找到 `pg` 的宣告檔（例如 `app/api/telemetry/health/route.ts` 內有 `import ... from "pg";`）。

**處理**：
- 新增 `@types/pg` 到 devDependencies
- commit + push

✅ 驗收：Vercel build 不再卡在 TS。

---

### 2) Vercel runtime 500：`Cannot find module 'pg'`
**症狀**：Vercel Logs 出現：
- `GET /api/telemetry/health 500` / `POST /api/telemetry 500`
- message：`Error: Cannot find module 'pg'`

**原因**：
- `@types/pg` 只解決「編譯期」
- 但 Vercel Function runtime 需要真的有 `pg` 套件

**處理**：
- `npm i pg`（確保在 dependencies）
- commit + push → 觸發 redeploy

✅ 驗收：
- `/api/telemetry/health` 不再 500
- Result 頁「送信する」成功，Neon 有新增 row

---

### 3) push 被拒（non-fast-forward）→ stash + rebase
**症狀**：`git push` 被拒，提示遠端分支更新、你本機落後。

✅ 最穩流程（Windows）：
1) `git stash push -u ...`（包含 untracked）
2) `git pull --rebase origin feature/urgent-medium-long`
3) `git stash pop`

**踩坑**：stash pop 產生衝突後，不能 commit；且衝突標記（`<<<<<<<`）會讓 build 直接炸。

---

### 4) stash pop 衝突標記導致 build 爆
**症狀**：`src/oshihapi/telemetryClient.ts` 出現 `<<<<<<< Updated upstream` 等衝突標記，Turbopack 解析失敗。

✅ 最短救援：
- `git reset --hard HEAD`
- `git clean -fd`

（如果那包 stash 本來就不要了，這是最快。）

---

### 5) TypeScript 嚴格型別錯：`boolean | undefined`
**症狀**：`src/oshihapi/modeGuide/recommendMode.ts` 內 `pushIf(isInStore, ...)`，但 `isInStore` 是 `boolean | undefined`。

**處理**：讓 helper 接受可選 boolean。

✅ 驗收：`npm run build` 全綠。

---

### 6) LF/CRLF warning 與 `.gitattributes`
**症狀**：`LF will be replaced by CRLF` 反覆出現（尤其 stash 時）。

**處理**：
- 新增 `.gitattributes` + `.gitignore`（忽略 `*.lnk`）並 commit
- 本 repo 設 `core.autocrlf=false`（只影響此 repo）

✅ 小提醒：`.gitattributes` 沒被 git 追蹤（untracked）時，不會生效。

---

### 7) PowerShell 對 `stash@{0}` 的坑
**症狀**：`git stash drop stash@{0}` 報 `unknown switch`。

**處理**：PowerShell 需要引號：
- `git stash drop 'stash@{0}'`

---

## 固定驗收清單（每次改完都跑）

### A) 本機（必跑）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm ci
npm run build
npm run dev -- --webpack
```

### B) 功能（手動 1 分鐘）
- [ ] Home → Flow → Result 能跑完
- [ ] History 看得到剛剛那筆（刷新後仍存在）
- [ ] `/api/telemetry/health` 回 `{"ok":true}`（本機/Vercel 都要）
- [ ] Result 頁：點「送信する」→ toast 顯示成功

### C) Vercel（發佈驗收）
- [ ] 最新 commit 對應 Deployment ✅ Ready
- [ ] 用手機開啟 Preview/Production URL 跑完一次 Flow
- [ ] Vercel Logs：`/api/telemetry` 不再 500

---

## 安全提醒（P0）
- 如果你曾在聊天/截圖中貼出資料庫連線字串或密碼：**立刻在 Neon 旋轉密碼 / 換新 role**，並同步更新 Vercel env。

---

## 下一步建議（最短路徑）
- P0：把 feature 合併到 `main`，讓 Production URL 固定（更好分享）
- P1：補「Neon SQL 查詢清單」與「事件 schema」到 docs
- P2：加一個 Result 頁的「JSON 匯出」按鈕（給你做 ML / debug）

```

### docs/file_map_current.md
```text
# oshihapi 檔案地圖（Current）

> 用途：給自己找檔案、給 AI/Codex 對齊用。  
> Repo（Windows）：`C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

---

## 0) 專案根目錄（建桌面捷徑就建這個）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\`

### Git/換行規則（新增）
- `.gitattributes`（統一 LF；Windows 建議保留）
- `.gitignore`（已加入 `*.lnk`，避免 Windows 捷徑混進 repo）

---

## 1) Docs（最常打開/貼給 Codex/貼給 AI）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\docs\`
  - `oshihapi_ops_windows.md`（Windows 操作守則）
  - `ai_next_phase_ml_ui.md`（下一階段：ML + UI 的 AI 指令）
  - `status_summary_latest.md`（目前做到哪裡：時間線＋驗收點）
  - `decision_engine_report_ja.md`（引擎/題庫/設計報告：日文）
  - `decision_engine_report_zh_TW.md`（同上：繁中）
  - `開発状況まとめ_latest.md`（開發現況備忘）
  - `発想メモ_latest.md`（Backlog/發想/方向）
  - `codex_prompt_*.txt`（貼給 Codex 開 PR 的任務指令）

✅ 一鍵找 Codex prompt：
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
Get-ChildItem -Recurse -Filter "codex_prompt*.txt" | Select-Object FullName
```

---

## 2) UI（Next.js App Router）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\app\`
  - `page.tsx`（Home）
  - `flow\page.tsx`（Flow：問答）
  - `result\[runId]\page.tsx`（Result：結果頁、L1 回饋、送信 UI）
  - `history\page.tsx`（History：本機紀錄）
  - `layout.tsx`（lang/metadata/全域 layout）

### API（Next route handlers）
- `app\api\telemetry\route.ts`（`POST /api/telemetry`）
- `app\api\telemetry\health\route.ts`（`GET /api/telemetry/health`）
  - ※ 這裡會用到 `pg`：
- `app\api\version\route.ts`（`GET /api/version`，給 Vercel parity gate 比對 commit）
  - build（TypeScript）：需要 `@types/pg`
  - runtime（Vercel Functions）：需要 `pg` 在 dependencies（不是 devDependencies）

---

## 3) 核心引擎/題庫/規則（TS）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\src\oshihapi\`
  - `engine.ts`（evaluate() 決策本體）
  - `engineConfig.ts`（權重/閾值/可調參）
  - `merch_v2_ja.ts`（題庫：urgentCore/standard/longOnly）
  - `reasonRules.ts`（理由/行動/分享文案規則）
  - `runStorage.ts`（localStorage 保存/讀取 runs）
  - `promptBuilder.ts`（長診斷的 AI prompt 組裝）
  - `telemetryClient.ts`（前端送信 payload/build/send）
  - `modeGuide\recommendMode.ts`（自動推薦：短/中/長；曾修正 pushIf 的 optional boolean 型別）
  - `supportData.ts`（搜尋連結等）
  - `model.ts`（型別：DecisionRun/InputMeta 等）

---

## 4) 共用元件（UI 呈現）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\components\`
  - `DecisionScale.tsx`（結果頁刻度尺）

---

## 4.5) Ops 腳本 / parity 設定
- `post_merge_routine.ps1`（merge 後唯一入口腳本；含 Vercel parity gate）
- `ops\vercel_prod_host.txt`（Production host，供 parity gate 使用）
- `docs\retro_report_latest.txt`（最新回顧記錄）

---

## 5) 本機環境設定（非常重要：不要 commit）
- `C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\.env.local`
  - 例：`POSTGRES_URL_NON_POOLING=...`（Neon 連線字串）

### Git（本 repo 建議）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git config core.autocrlf false
```

---

## 6) 下載/解壓包（建議固定位置，避免 copy 找不到）
- 下載（zip）：`C:\Users\User\Downloads\`
- 固定解壓根：`C:\Users\User\Downloads\_oshihapi_packs\`

---

## 7) 資料去哪裡看（Telemetry / L1）
- 本機（local）：瀏覽器 localStorage（Runs/History/L1 label 都在這）
- 遠端（Neon）：`telemetry_runs` table（只有 opt-in + 送信 才會有）

Neon 常用查詢（抽 event/runId/l1Label）：
```sql
SELECT
  created_at,
  source,
  data->>'event'   AS event,
  data->>'runId'   AS run_id,
  data->>'l1Label' AS l1_label
FROM telemetry_runs
ORDER BY created_at DESC
LIMIT 50;
```

---

## 8) 給 AI/Codex 對齊用（直接複製貼上）
```text
Repo 根目錄（Windows）：
C:\Users\User\dev\oshihapi-pushi-buy-diagnosis\

重要檔案地圖：
1) docs
- docs/oshihapi_ops_windows.md
- docs/ai_next_phase_ml_ui.md
- docs/status_summary_latest.md
- docs/decision_engine_report_ja.md
- docs/decision_engine_report_zh_TW.md
- docs/codex_prompt_*.txt

2) UI（Next App Router）
- app/page.tsx
- app/flow/page.tsx
- app/result/[runId]/page.tsx
- app/history/page.tsx
- app/layout.tsx
- app/api/telemetry/route.ts
- app/api/telemetry/health/route.ts
- app/api/version/route.ts
- post_merge_routine.ps1
- ops/vercel_prod_host.txt
- docs/retro_report_latest.txt

3) Core
- src/oshihapi/engine.ts
- src/oshihapi/engineConfig.ts
- src/oshihapi/merch_v2_ja.ts
- src/oshihapi/reasonRules.ts
- src/oshihapi/runStorage.ts
- src/oshihapi/promptBuilder.ts
- src/oshihapi/telemetryClient.ts
- src/oshihapi/model.ts
- src/oshihapi/supportData.ts

4) Components
- components/DecisionScale.tsx

環境變數（不要 commit）：
- .env.local（例 POSTGRES_URL_NON_POOLING=Neon 連線字串）

資料查看位置：
- localStorage：所有 runs/history + L1 label（本機）
- Neon：telemetry_runs（opt-in 勾選 + 點「送信する」才會寫入）
```

```

### (missing) docs/* matching keywords: ver0|ver1|ver2|mode branch report|mode branch|presentation mode|style mode
