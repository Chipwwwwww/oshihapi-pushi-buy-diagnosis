/**
 * copy_dictionary.ts
 * - ver0/ver1/ver2 の「質問文」「選択肢文」「結果説明/提案文」をまとめた辞書
 * - ロジック(ID/判定/タグ/アクション)は不変。ここは “言い回し” だけ。
 */

export type StyleMode = "standard" | "kawaii" | "oshi";

export type QuestionId =
  | "core_budget_impact"
  | "core_deadline_urgency"
  | "core_market_price_check"
  | "core_regret_if_skip"
  | "core_regret_if_buy"
  | "core_use_frequency"
  | "core_space_storage"
  | "core_duplicate_inventory"
  | "core_substitute_satisfaction"
  | "core_impulse_state"
  | "core_opportunity_cost"
  | "core_exit_plan_resell"
  // gacha
  | "gacha_ceiling_cap"
  | "gacha_target_clarity"
  | "gacha_duplicate_tolerance"
  | "gacha_trade_exit"
  // ticket
  | "ticket_total_cost"
  | "ticket_schedule_health"
  | "ticket_experience_value"
  | "ticket_alternative_options"
  // figure
  | "figure_shipping_risk"
  | "figure_display_plan"
  | "figure_boredom_risk"
  | "figure_maintenance"
  // digital
  | "digital_expiration"
  | "digital_replay_value"
  | "digital_ownership_saving"
  | "digital_bundle_discount"
  // preorder
  | "preorder_payment_timing"
  | "preorder_cancel_policy"
  | "preorder_bonus_exclusive"
  | "preorder_wait_tolerance";

export type OptionId =
  | "a"
  | "b"
  | "c"
  | "d";

export type Verdict = "BUY" | "WAIT" | "SKIP";
export type WaitType = "cooldown_24h" | "wait_market" | "wait_restock" | "wait_prepare";
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

export interface QuestionCopy {
  title: string;
  help?: string;
  options: Record<OptionId, { label: string; help?: string }>;
}

export interface ResultCopy {
  verdictTitle: Record<Verdict, string>;
  verdictLead: Record<Verdict, string>;
  waitTypeLabel: Record<WaitType, string>;
  reasonTagLabel: Record<ReasonTag, string>;
  actionLabel: Record<NextAction, string>;
  actionHelp: Partial<Record<NextAction, string>>;
}

export interface UiCopy {
  stylePickerTitle: string;
  stylePickerHelp: string;
  styleOption: Record<StyleMode, { label: string; help: string }>;
  modeDisclaimer: string;
}

export const COPY_BY_MODE: Record<
  StyleMode,
  {
    ui: UiCopy;
    questions: Record<QuestionId, QuestionCopy>;
    result: ResultCopy;
  }
> = {
  standard: {
    ui: {
      stylePickerTitle: "表示の雰囲気",
      stylePickerHelp: "質問と結果の文言だけが変わります（判定ロジックは同じ）",
      styleOption: {
        standard: { label: "標準", help: "中立・短く・実務寄り" },
        kawaii: { label: "かわいい", help: "やさしい・共有しやすい" },
        oshi: { label: "推し活用語", help: "推し活っぽい言い回し（安全版）" },
      },
      modeDisclaimer: "判定ロジックは変わりません（表示だけ変わります）",
    },
    questions: {
      core_budget_impact: {
        title: "この出費、今月の予算に効く？",
        help: "生活費や固定費に触れるなら“待ち/見送り”寄り。",
        options: {
          a: { label: "余裕がある", help: "問題なし" },
          b: { label: "少し痛い", help: "他を削ればOK" },
          c: { label: "かなり痛い", help: "生活に影響が出る" },
          d: { label: "未確認", help: "今は判断できない" },
        },
      },
      core_deadline_urgency: {
        title: "締切/発売日/在庫の期限は近い？",
        options: {
          a: { label: "今日〜数日以内" },
          b: { label: "今週〜今月" },
          c: { label: "急がない（不明/余裕）" },
          d: { label: "常設/後でも買える" },
        },
      },
      core_market_price_check: {
        title: "相場（価格の妥当性）を確認できた？",
        options: {
          a: { label: "確認して納得できた" },
          b: { label: "確認したが高い/迷う" },
          c: { label: "まだ確認していない" },
          d: { label: "相場が分からない（新作/限定）" },
        },
      },
      core_regret_if_skip: {
        title: "見送ったら後悔しそう？",
        options: {
          a: { label: "かなり後悔する" },
          b: { label: "少し後悔するかも" },
          c: { label: "たぶん大丈夫" },
          d: { label: "分からない" },
        },
      },
      core_regret_if_buy: {
        title: "買った後に後悔しそう？",
        options: {
          a: { label: "ほぼ後悔しない" },
          b: { label: "少し不安" },
          c: { label: "後悔しそう" },
          d: { label: "分からない" },
        },
      },
      core_use_frequency: {
        title: "使う/飾る頻度は想像できる？",
        options: {
          a: { label: "頻繁に使う/毎日見える" },
          b: { label: "たまに使う/時々飾る" },
          c: { label: "ほぼ使わない（コレクション）" },
          d: { label: "まだイメージできない" },
        },
      },
      core_space_storage: {
        title: "置き場所・収納は確保できる？",
        options: {
          a: { label: "確保できている" },
          b: { label: "工夫すれば何とか" },
          c: { label: "厳しい（溢れそう）" },
          d: { label: "未確認" },
        },
      },
      core_duplicate_inventory: {
        title: "似た物/同じ物を既に持っていない？",
        options: {
          a: { label: "持っていない" },
          b: { label: "似た物はある" },
          c: { label: "同じ/近いものがある" },
          d: { label: "把握できていない" },
        },
      },
      core_substitute_satisfaction: {
        title: "代替（別の満足）で埋められる？",
        options: {
          a: { label: "代替できない（これが必要）" },
          b: { label: "一部は代替できる" },
          c: { label: "代替で十分" },
          d: { label: "分からない" },
        },
      },
      core_impulse_state: {
        title: "いまの状態は？（衝動/疲れ/テンション）",
        options: {
          a: { label: "落ち着いて判断できる" },
          b: { label: "テンション高め" },
          c: { label: "疲れている/眠い" },
          d: { label: "焦り/FOMOが強い" },
        },
      },
      core_opportunity_cost: {
        title: "同じ予算で優先したい推し活が他にある？",
        options: {
          a: { label: "ない（これが最優先）" },
          b: { label: "あるが両立できる" },
          c: { label: "ある（優先度が高い）" },
          d: { label: "未定" },
        },
      },
      core_exit_plan_resell: {
        title: "手放す選択肢（保管/譲渡/売却）はある？",
        help: "“買い”に寄せるためではなく、リスク見積もり用。",
        options: {
          a: { label: "出口がある（想定できる）" },
          b: { label: "たぶん何とかなる" },
          c: { label: "出口がない（抱える）" },
          d: { label: "考えていない" },
        },
      },

      gacha_ceiling_cap: {
        title: "天井/撤退ライン（上限）は決めてる？",
        options: {
          a: { label: "決めている（上限厳守）" },
          b: { label: "目安はある" },
          c: { label: "決めていない" },
          d: { label: "そもそも天井がない/不明" },
        },
      },
      gacha_target_clarity: {
        title: "狙いは明確？（1点狙い/広く欲しい）",
        options: {
          a: { label: "1点狙い（これが欲しい）" },
          b: { label: "2〜3点欲しい" },
          c: { label: "何が出ても嬉しい" },
          d: { label: "迷っている" },
        },
      },
      gacha_duplicate_tolerance: {
        title: "被り（重複）への耐性は？",
        options: {
          a: { label: "被りはOK（楽しめる）" },
          b: { label: "少しならOK" },
          c: { label: "被りが辛い" },
          d: { label: "状況次第" },
        },
      },
      gacha_trade_exit: {
        title: "交換/譲渡など、回収手段はある？",
        options: {
          a: { label: "ある（具体的に動ける）" },
          b: { label: "たぶんある" },
          c: { label: "ない/不安" },
          d: { label: "やらない" },
        },
      },

      ticket_total_cost: {
        title: "チケット以外の総費用（遠征/宿/交通）は把握できた？",
        options: {
          a: { label: "把握して予算内" },
          b: { label: "把握したが厳しい" },
          c: { label: "まだ計算していない" },
          d: { label: "遠征なし（近場）" },
        },
      },
      ticket_schedule_health: {
        title: "休み/体力/翌日の負担は大丈夫？",
        options: {
          a: { label: "問題ない" },
          b: { label: "工夫すれば大丈夫" },
          c: { label: "厳しい（無理が出る）" },
          d: { label: "未定/読めない" },
        },
      },
      ticket_experience_value: {
        title: "現場の価値は大きい？（思い出/推しの節目）",
        options: {
          a: { label: "節目で最優先" },
          b: { label: "行けたら嬉しい" },
          c: { label: "今回は必須ではない" },
          d: { label: "迷う" },
        },
      },
      ticket_alternative_options: {
        title: "代替（配信/後日/別公演）はある？",
        options: {
          a: { label: "代替がない" },
          b: { label: "一部代替できる" },
          c: { label: "代替で十分" },
          d: { label: "分からない" },
        },
      },

      figure_shipping_risk: {
        title: "輸送/初期不良などのリスクは許容できる？",
        options: {
          a: { label: "許容できる（対処できる）" },
          b: { label: "少し不安" },
          c: { label: "不安が大きい" },
          d: { label: "店舗受取などで回避できる" },
        },
      },
      figure_display_plan: {
        title: "飾る場所・見せ方は具体的？",
        options: {
          a: { label: "具体的に決まっている" },
          b: { label: "だいたい決まっている" },
          c: { label: "未定" },
          d: { label: "飾らず保管中心" },
        },
      },
      figure_boredom_risk: {
        title: "半年後も“好き”が続きそう？（飽き耐性）",
        options: {
          a: { label: "続く自信がある" },
          b: { label: "たぶん続く" },
          c: { label: "飽きそう" },
          d: { label: "分からない" },
        },
      },
      figure_maintenance: {
        title: "手入れ/ホコリ/劣化の管理はできそう？",
        options: {
          a: { label: "できる" },
          b: { label: "最低限なら" },
          c: { label: "苦手" },
          d: { label: "ケース等で対策する" },
        },
      },

      digital_expiration: {
        title: "期限（販売/視聴/特典）はある？",
        options: {
          a: { label: "期限が近い" },
          b: { label: "期限はあるが余裕" },
          c: { label: "期限なし" },
          d: { label: "分からない" },
        },
      },
      digital_replay_value: {
        title: "見返す/使い続ける価値はある？",
        options: {
          a: { label: "何度も使う/見る" },
          b: { label: "たまに" },
          c: { label: "一回で満足しそう" },
          d: { label: "分からない" },
        },
      },
      digital_ownership_saving: {
        title: "保存性（消える/移行できない）リスクは？",
        options: {
          a: { label: "リスク低い/納得" },
          b: { label: "少し不安" },
          c: { label: "不安が大きい" },
          d: { label: "ダウンロード等で対策できる" },
        },
      },
      digital_bundle_discount: {
        title: "後からセール/バンドルで安くなる可能性は？",
        options: {
          a: { label: "低い（今が最安級）" },
          b: { label: "ありそう" },
          c: { label: "高い（待つ価値）" },
          d: { label: "分からない" },
        },
      },

      preorder_payment_timing: {
        title: "支払いタイミングは？（今/後/分割）",
        options: {
          a: { label: "今すぐ支払いでもOK" },
          b: { label: "今は厳しいが後ならOK" },
          c: { label: "厳しい" },
          d: { label: "不明/未確認" },
        },
      },
      preorder_cancel_policy: {
        title: "キャンセル可否・条件は確認した？",
        options: {
          a: { label: "確認済み（柔軟）" },
          b: { label: "確認済み（厳しい）" },
          c: { label: "未確認" },
          d: { label: "キャンセル不可" },
        },
      },
      preorder_bonus_exclusive: {
        title: "予約特典の“代替不可能度”は？",
        options: {
          a: { label: "これが決め手（代替なし）" },
          b: { label: "あれば嬉しい" },
          c: { label: "別に無くてもOK" },
          d: { label: "分からない" },
        },
      },
      preorder_wait_tolerance: {
        title: "発売まで待てる？（熱量の持続）",
        options: {
          a: { label: "余裕で待てる" },
          b: { label: "たぶん待てる" },
          c: { label: "冷めそう" },
          d: { label: "分からない" },
        },
      },
    },
    result: {
      verdictTitle: { BUY: "買い", WAIT: "待ち", SKIP: "見送り" },
      verdictLead: {
        BUY: "条件が揃っています。無理のない範囲で実行へ。",
        WAIT: "今は判断材料が不足/リスクが高め。待って最適化。",
        SKIP: "コストやリスクが大きい。今回は守りの選択が合理的。",
      },
      waitTypeLabel: {
        cooldown_24h: "24h冷却",
        wait_market: "相場待ち",
        wait_restock: "再販待ち",
        wait_prepare: "準備優先",
      },
      reasonTagLabel: {
        budget: "予算",
        urgency: "期限",
        market: "相場",
        space: "収納",
        impulse: "衝動",
        duplicate: "重複",
        use: "使用頻度",
        regret: "後悔",
        risk: "リスク",
      },
      actionLabel: {
        buy_now: "購入する（今）",
        set_price_cap: "上限価格を決める",
        market_check: "相場を確認する",
        cooldown_24h: "24時間置く",
        declutter_first: "先に整理する",
        check_inventory: "所持品を確認する",
        set_spending_cap: "推し活予算枠を作る",
        rerun_later: "後で再診断する",
      },
      actionHelp: {
        set_price_cap: "“いくらまでならOK”を固定してブレを減らす",
        cooldown_24h: "衝動が落ちた後に同じ結論か確認する",
        declutter_first: "置き場所ができたら判断が変わることがある",
      },
    },
  },

  kawaii: {
    ui: {
      stylePickerTitle: "ふんいき",
      stylePickerHelp: "ことばだけ変わるよ（判定は同じ！）",
      styleOption: {
        standard: { label: "標準", help: "スッキリ" },
        kawaii: { label: "かわいい", help: "やさしめ" },
        oshi: { label: "推し活", help: "推し活っぽく（安全）" },
      },
      modeDisclaimer: "判定ロジックは同じだよ（口調だけ変わるよ）",
    },
    questions: {
      core_budget_impact: {
        title: "この出費、おさいふ大丈夫？",
        help: "生活費に触れそうなら、いったん守ろっ。",
        options: {
          a: { label: "よゆう〜！" },
          b: { label: "ちょい痛い…" },
          c: { label: "けっこうキツい…" },
          d: { label: "まだ分からない" },
        },
      },
      core_deadline_urgency: {
        title: "締切、近い？",
        options: {
          a: { label: "すぐ！(今日〜数日)" },
          b: { label: "今週〜今月" },
          c: { label: "まだ余裕〜" },
          d: { label: "いつでも買える" },
        },
      },
      core_market_price_check: {
        title: "相場チェックした？",
        options: {
          a: { label: "見て納得！" },
          b: { label: "見たけど高いかも" },
          c: { label: "まだ見てない" },
          d: { label: "相場わかんない" },
        },
      },
      core_regret_if_skip: {
        title: "見送ったら泣いちゃう？",
        options: {
          a: { label: "泣く（後悔大）" },
          b: { label: "ちょい後悔かも" },
          c: { label: "たぶん平気" },
          d: { label: "わかんない" },
        },
      },
      core_regret_if_buy: {
        title: "買ったら後悔しそう？",
        options: {
          a: { label: "しない！" },
          b: { label: "ちょっと不安" },
          c: { label: "後悔しそう…" },
          d: { label: "わかんない" },
        },
      },
      core_use_frequency: {
        title: "どれくらい使う/飾る？",
        options: {
          a: { label: "いっぱい！" },
          b: { label: "たまに〜" },
          c: { label: "ほぼ飾り/保管" },
          d: { label: "まだ想像できない" },
        },
      },
      core_space_storage: {
        title: "置き場所ある？",
        options: {
          a: { label: "あるよ！" },
          b: { label: "なんとかする！" },
          c: { label: "きびしい…" },
          d: { label: "未確認" },
        },
      },
      core_duplicate_inventory: {
        title: "同じの持ってない？",
        options: {
          a: { label: "持ってない！" },
          b: { label: "似てるのはある" },
          c: { label: "たぶん被る…" },
          d: { label: "わかんない" },
        },
      },
      core_substitute_satisfaction: {
        title: "他で満たせる？",
        options: {
          a: { label: "これじゃないとダメ" },
          b: { label: "ちょっとなら代わりOK" },
          c: { label: "代わりで十分" },
          d: { label: "わかんない" },
        },
      },
      core_impulse_state: {
        title: "いまの気分は？",
        options: {
          a: { label: "冷静〜" },
          b: { label: "テンション高め！" },
          c: { label: "つかれ/ねむい…" },
          d: { label: "焦り強め…" },
        },
      },
      core_opportunity_cost: {
        title: "他に優先したい推し活ある？",
        options: {
          a: { label: "ない！（最優先）" },
          b: { label: "あるけど両立できる" },
          c: { label: "ある（そっち優先）" },
          d: { label: "まだ未定" },
        },
      },
      core_exit_plan_resell: {
        title: "もし手放すなら、道ある？",
        options: {
          a: { label: "あるよ！" },
          b: { label: "たぶん何とか" },
          c: { label: "ない…抱える" },
          d: { label: "考えてない" },
        },
      },

      gacha_ceiling_cap: {
        title: "天井/撤退ライン決めてる？",
        options: {
          a: { label: "決めて守る！" },
          b: { label: "目安ある〜" },
          c: { label: "決めてない…" },
          d: { label: "天井ない/不明" },
        },
      },
      gacha_target_clarity: {
        title: "狙いは？",
        options: {
          a: { label: "一点狙い！" },
          b: { label: "2〜3点ほしい" },
          c: { label: "何でもうれしい" },
          d: { label: "迷う〜" },
        },
      },
      gacha_duplicate_tolerance: {
        title: "被り、どこまでOK？",
        options: {
          a: { label: "OK！（楽しめる）" },
          b: { label: "少しならOK" },
          c: { label: "つらい…" },
          d: { label: "状況次第" },
        },
      },
      gacha_trade_exit: {
        title: "交換/譲渡で回収できそう？",
        options: {
          a: { label: "できる！" },
          b: { label: "たぶんできる" },
          c: { label: "むずかしい" },
          d: { label: "やらない" },
        },
      },

      ticket_total_cost: {
        title: "遠征ふくめた総費用、出した？",
        options: {
          a: { label: "出した＆予算内" },
          b: { label: "出したけど厳しい" },
          c: { label: "まだ出してない" },
          d: { label: "近場（遠征なし）" },
        },
      },
      ticket_schedule_health: {
        title: "休み/体力、大丈夫？",
        options: {
          a: { label: "大丈夫！" },
          b: { label: "工夫でいける" },
          c: { label: "きびしい…" },
          d: { label: "まだ不明" },
        },
      },
      ticket_experience_value: {
        title: "現場の価値、でかい？",
        options: {
          a: { label: "節目で最優先！" },
          b: { label: "行けたらうれしい" },
          c: { label: "今回は必須じゃない" },
          d: { label: "迷う〜" },
        },
      },
      ticket_alternative_options: {
        title: "代わり（配信/別日）ある？",
        options: {
          a: { label: "ない！" },
          b: { label: "ちょっとある" },
          c: { label: "それで十分" },
          d: { label: "わかんない" },
        },
      },

      figure_shipping_risk: {
        title: "輸送/初期不良の不安、OK？",
        options: {
          a: { label: "OK（対処できる）" },
          b: { label: "ちょい不安" },
          c: { label: "不安大…" },
          d: { label: "回避策ある！" },
        },
      },
      figure_display_plan: {
        title: "飾る場所、決まってる？",
        options: {
          a: { label: "決まってる！" },
          b: { label: "だいたい決まってる" },
          c: { label: "未定…" },
          d: { label: "保管メイン" },
        },
      },
      figure_boredom_risk: {
        title: "半年後も好きでいられそう？",
        options: {
          a: { label: "いられる！" },
          b: { label: "たぶん" },
          c: { label: "飽きそう…" },
          d: { label: "わかんない" },
        },
      },
      figure_maintenance: {
        title: "お手入れ、できそう？",
        options: {
          a: { label: "できる！" },
          b: { label: "最低限なら" },
          c: { label: "苦手…" },
          d: { label: "ケースで対策" },
        },
      },

      digital_expiration: {
        title: "期限ある？",
        options: {
          a: { label: "近い！" },
          b: { label: "あるけど余裕" },
          c: { label: "ないよ" },
          d: { label: "わかんない" },
        },
      },
      digital_replay_value: {
        title: "見返す？使い続ける？",
        options: {
          a: { label: "何度も！" },
          b: { label: "たまに" },
          c: { label: "一回で満足" },
          d: { label: "わかんない" },
        },
      },
      digital_ownership_saving: {
        title: "保存リスク、平気？",
        options: {
          a: { label: "平気！" },
          b: { label: "ちょい不安" },
          c: { label: "不安…" },
          d: { label: "対策できる" },
        },
      },
      digital_bundle_discount: {
        title: "あとで安くなりそう？",
        options: {
          a: { label: "なりにくい" },
          b: { label: "なりそう" },
          c: { label: "待つ価値ある" },
          d: { label: "わかんない" },
        },
      },

      preorder_payment_timing: {
        title: "支払いタイミング、だいじょうぶ？",
        options: {
          a: { label: "今でもOK" },
          b: { label: "後ならOK" },
          c: { label: "厳しい…" },
          d: { label: "未確認" },
        },
      },
      preorder_cancel_policy: {
        title: "キャンセル、確認した？",
        options: {
          a: { label: "確認した（ゆるめ）" },
          b: { label: "確認した（きびしめ）" },
          c: { label: "まだ" },
          d: { label: "不可" },
        },
      },
      preorder_bonus_exclusive: {
        title: "特典、どれくらい大事？",
        options: {
          a: { label: "これが決め手！" },
          b: { label: "あるとうれしい" },
          c: { label: "なくてもOK" },
          d: { label: "わかんない" },
        },
      },
      preorder_wait_tolerance: {
        title: "発売まで待てる？",
        options: {
          a: { label: "余裕！" },
          b: { label: "たぶん" },
          c: { label: "冷めそう…" },
          d: { label: "わかんない" },
        },
      },
    },
    result: {
      verdictTitle: { BUY: "買ってOK", WAIT: "いったん待ち", SKIP: "今回は見送り" },
      verdictLead: {
        BUY: "条件そろってるよ。無理しない範囲でいこっ。",
        WAIT: "いまは整えるとこから。待ってからの方が安心だよ。",
        SKIP: "守れたのがえらい。今回はおさいふ優先でOK。",
      },
      waitTypeLabel: {
        cooldown_24h: "（24h）",
        wait_market: "（相場）",
        wait_restock: "（再販）",
        wait_prepare: "（準備）",
      },
      reasonTagLabel: {
        budget: "おさいふ",
        urgency: "期限",
        market: "相場",
        space: "収納",
        impulse: "衝動",
        duplicate: "ダブり",
        use: "使う頻度",
        regret: "後悔",
        risk: "リスク",
      },
      actionLabel: {
        buy_now: "買う（今）",
        set_price_cap: "上限きめる",
        market_check: "相場みる",
        cooldown_24h: "24hおく",
        declutter_first: "先に整理する",
        check_inventory: "所持チェック",
        set_spending_cap: "推し活枠つくる",
        rerun_later: "また診断する",
      },
      actionHelp: {
        cooldown_24h: "いったん寝て、同じ気持ちか確認しよっ",
        set_price_cap: "“ここまで”を決めると心がラク",
      },
    },
  },

  oshi: {
    ui: {
      stylePickerTitle: "語り口",
      stylePickerHelp: "推し活っぽく言い換える（判定は同じ・安全版）",
      styleOption: {
        standard: { label: "標準", help: "中立" },
        kawaii: { label: "かわいい", help: "やさしめ" },
        oshi: { label: "推し活用語", help: "共感寄り（安全）" },
      },
      modeDisclaimer: "判定ロジックは同じ（語り口だけ変わる）",
    },
    questions: {
      core_budget_impact: {
        title: "今月の推し活枠、耐える？",
        help: "生活を削る課金は長期的にしんどい。",
        options: {
          a: { label: "耐える（余裕）" },
          b: { label: "ちょい痛い（調整でいける）" },
          c: { label: "厳しい（生活に触る）" },
          d: { label: "未確認（まず計算）" },
        },
      },
      core_deadline_urgency: {
        title: "供給の締切、近い？",
        options: {
          a: { label: "目前（今日〜数日）" },
          b: { label: "今週〜今月" },
          c: { label: "急がない" },
          d: { label: "常設/後追い可" },
        },
      },
      core_market_price_check: {
        title: "相場、把握できた？",
        options: {
          a: { label: "把握して納得" },
          b: { label: "把握したが熱い（高い）" },
          c: { label: "未チェック" },
          d: { label: "相場不明（新作/限定）" },
        },
      },
      core_regret_if_skip: {
        title: "見送ると後悔、強い？",
        options: {
          a: { label: "強い（刺さる）" },
          b: { label: "少しある" },
          c: { label: "大丈夫そう" },
          d: { label: "分からない" },
        },
      },
      core_regret_if_buy: {
        title: "買って後悔の可能性は？",
        options: {
          a: { label: "低い（解釈一致）" },
          b: { label: "少し不安" },
          c: { label: "高い（地雷）" },
          d: { label: "分からない" },
        },
      },
      core_use_frequency: {
        title: "使用/鑑賞の頻度、見える？",
        options: {
          a: { label: "高い（毎日触れる）" },
          b: { label: "中（たまに）" },
          c: { label: "低（保管寄り）" },
          d: { label: "未定" },
        },
      },
      core_space_storage: {
        title: "収納、現場、確保できる？",
        options: {
          a: { label: "確保済み" },
          b: { label: "工夫でいける" },
          c: { label: "厳しい（溢れる）" },
          d: { label: "未確認" },
        },
      },
      core_duplicate_inventory: {
        title: "所持、かぶってない？",
        options: {
          a: { label: "かぶらない" },
          b: { label: "似たのはある" },
          c: { label: "かぶりそう" },
          d: { label: "未把握" },
        },
      },
      core_substitute_satisfaction: {
        title: "代替で満足できる？",
        options: {
          a: { label: "代替不可（これ）" },
          b: { label: "一部いける" },
          c: { label: "代替で十分" },
          d: { label: "分からない" },
        },
      },
      core_impulse_state: {
        title: "今の情緒、安定してる？",
        options: {
          a: { label: "安定（冷静）" },
          b: { label: "高揚（勢い）" },
          c: { label: "疲労（判断ブレ）" },
          d: { label: "焦り（FOMO）" },
        },
      },
      core_opportunity_cost: {
        title: "同予算で優先する供給、他にある？",
        options: {
          a: { label: "ない（これ最優先）" },
          b: { label: "あるが両立可" },
          c: { label: "ある（そっち優先）" },
          d: { label: "未定" },
        },
      },
      core_exit_plan_resell: {
        title: "出口（保管/譲渡/整理）の目処は？",
        options: {
          a: { label: "ある（具体）" },
          b: { label: "だいたいある" },
          c: { label: "ない（抱える）" },
          d: { label: "未検討" },
        },
      },

      gacha_ceiling_cap: {
        title: "天井/撤退ライン、決めた？",
        options: {
          a: { label: "決めた（厳守）" },
          b: { label: "目安はある" },
          c: { label: "決めてない" },
          d: { label: "天井なし/不明" },
        },
      },
      gacha_target_clarity: {
        title: "狙い、明確？",
        options: {
          a: { label: "一点（必須）" },
          b: { label: "複数（2〜3）" },
          c: { label: "全部当たり" },
          d: { label: "迷う" },
        },
      },
      gacha_duplicate_tolerance: {
        title: "被り耐性、ある？",
        options: {
          a: { label: "ある（回せる）" },
          b: { label: "少しなら" },
          c: { label: "ない（辛い）" },
          d: { label: "状況次第" },
        },
      },
      gacha_trade_exit: {
        title: "交換/譲渡で回収できる？",
        options: {
          a: { label: "できる（動ける）" },
          b: { label: "たぶん" },
          c: { label: "難しい" },
          d: { label: "やらない" },
        },
      },

      ticket_total_cost: {
        title: "現場コスト（交通/宿含む）、出した？",
        options: {
          a: { label: "出した＆枠内" },
          b: { label: "出したが厳しい" },
          c: { label: "未計算" },
          d: { label: "近場" },
        },
      },
      ticket_schedule_health: {
        title: "体力/休み、現実的？",
        options: {
          a: { label: "問題なし" },
          b: { label: "工夫で可" },
          c: { label: "無理が出る" },
          d: { label: "未定" },
        },
      },
      ticket_experience_value: {
        title: "現場の価値、節目級？",
        options: {
          a: { label: "節目（最優先）" },
          b: { label: "行けたら最高" },
          c: { label: "今回は必須じゃない" },
          d: { label: "迷う" },
        },
      },
      ticket_alternative_options: {
        title: "代替（配信/別公演）ある？",
        options: {
          a: { label: "ない" },
          b: { label: "一部ある" },
          c: { label: "代替で足りる" },
          d: { label: "分からない" },
        },
      },

      figure_shipping_risk: {
        title: "輸送/初期不良リスク、許容？",
        options: {
          a: { label: "許容（対処可）" },
          b: { label: "少し不安" },
          c: { label: "不安強い" },
          d: { label: "回避策あり" },
        },
      },
      figure_display_plan: {
        title: "飾る導線、作れてる？",
        options: {
          a: { label: "作れてる" },
          b: { label: "だいたい" },
          c: { label: "未定" },
          d: { label: "保管寄り" },
        },
      },
      figure_boredom_risk: {
        title: "半年後も熱量、持つ？",
        options: {
          a: { label: "持つ（確信）" },
          b: { label: "たぶん" },
          c: { label: "落ちそう" },
          d: { label: "分からない" },
        },
      },
      figure_maintenance: {
        title: "管理（ホコリ/劣化）、回る？",
        options: {
          a: { label: "回る" },
          b: { label: "最低限なら" },
          c: { label: "苦手" },
          d: { label: "ケースで対策" },
        },
      },

      digital_expiration: {
        title: "期限、ある？",
        options: {
          a: { label: "近い" },
          b: { label: "あるが余裕" },
          c: { label: "ない" },
          d: { label: "不明" },
        },
      },
      digital_replay_value: {
        title: "リピ価値、ある？",
        options: {
          a: { label: "高い" },
          b: { label: "中" },
          c: { label: "低い" },
          d: { label: "不明" },
        },
      },
      digital_ownership_saving: {
        title: "保存性リスク、納得できる？",
        options: {
          a: { label: "納得" },
          b: { label: "少し不安" },
          c: { label: "不安強い" },
          d: { label: "対策できる" },
        },
      },
      digital_bundle_discount: {
        title: "後から安くなる可能性、ある？",
        options: {
          a: { label: "低い" },
          b: { label: "ありそう" },
          c: { label: "高い（待つ）" },
          d: { label: "不明" },
        },
      },

      preorder_payment_timing: {
        title: "支払いタイミング、耐える？",
        options: {
          a: { label: "今でもOK" },
          b: { label: "後ならOK" },
          c: { label: "厳しい" },
          d: { label: "未確認" },
        },
      },
      preorder_cancel_policy: {
        title: "キャンセル条件、確認した？",
        options: {
          a: { label: "確認済み（柔軟）" },
          b: { label: "確認済み（厳しい）" },
          c: { label: "未確認" },
          d: { label: "不可" },
        },
      },
      preorder_bonus_exclusive: {
        title: "特典の代替不可能度、どれ？",
        options: {
          a: { label: "代替なし（決め手）" },
          b: { label: "あれば嬉しい" },
          c: { label: "なくてもOK" },
          d: { label: "不明" },
        },
      },
      preorder_wait_tolerance: {
        title: "発売まで待って熱量、保てる？",
        options: {
          a: { label: "保てる" },
          b: { label: "たぶん" },
          c: { label: "落ちそう" },
          d: { label: "不明" },
        },
      },
    },
    result: {
      verdictTitle: { BUY: "買い", WAIT: "待ち", SKIP: "見送り" },
      verdictLead: {
        BUY: "解釈一致。条件揃ってるなら勝ち筋。",
        WAIT: "待てるオタク、強い。整えてから最適化。",
        SKIP: "守りの判断も推し活。長期戦で勝つ。",
      },
      waitTypeLabel: {
        cooldown_24h: "（24h冷却）",
        wait_market: "（相場）",
        wait_restock: "（再販）",
        wait_prepare: "（準備）",
      },
      reasonTagLabel: {
        budget: "推し活枠",
        urgency: "締切",
        market: "相場",
        space: "収納",
        impulse: "情緒",
        duplicate: "所持かぶり",
        use: "使用頻度",
        regret: "後悔",
        risk: "リスク",
      },
      actionLabel: {
        buy_now: "買う（今）",
        set_price_cap: "上限を決める",
        market_check: "相場を当たる",
        cooldown_24h: "24h冷却",
        declutter_first: "収納を作る",
        check_inventory: "所持チェック",
        set_spending_cap: "枠を作る",
        rerun_later: "後で再診断",
      },
      actionHelp: {
        set_price_cap: "上限＝ブレ防止。熱い相場でも守れる",
        cooldown_24h: "情緒が落ち着いた後も同じ結論か確認",
      },
    },
  },
};
