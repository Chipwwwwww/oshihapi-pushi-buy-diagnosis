/**
 * mode_copy_ja.ts — FULL questionbank copy for JP oshikatsu
 * Presentation only. Must NOT change decision logic.
 */
import type { ModeId, Verdict, WaitType, ReasonTag, NextAction } from "./mode_dictionary";

export type ItemType = "goods" | "gacha" | "ticket" | "figure" | "digital" | "preorder";
export type QuestionId =
  // Core (complete)
  | "chance_now"
  | "urgency_deadline"
  | "budget_impact"
  | "total_cost"
  | "market_heat"
  | "price_cap"
  | "regret_if_skip"
  | "regret_if_buy"
  | "use_frequency"
  | "space_storage"
  | "duplicate_check"
  | "alt_satisfaction"
  | "impulse_state"
  | "upcoming_supply"
  | "authenticity_risk"
  | "shipping_risk"
  | "cancel_policy"
  | "payment_timing"
  | "memory_value"
  | "oshi_priority"
  // goods addon
  | "goods_bundle_trap"
  | "goods_size_weight"
  | "goods_shipping_fee"
  | "goods_wearability"
  | "goods_usage_scene"
  // gacha addon
  | "gacha_spending_cap"
  | "gacha_pity_system"
  | "gacha_duplicate_tolerance"
  | "gacha_trade_option"
  | "gacha_stop_rule"
  // ticket addon
  | "ticket_travel_total"
  | "ticket_schedule_conflict"
  | "ticket_stamina_load"
  | "ticket_seat_value"
  | "ticket_purpose_clarity"
  // figure addon
  | "figure_size_scale"
  | "figure_display_plan"
  | "figure_dust_maintenance"
  | "figure_boredom_risk"
  | "figure_long_storage"
  // digital addon
  | "digital_time_limit"
  | "digital_rewatch_value"
  | "digital_drm_risk"
  | "digital_language_support"
  | "digital_bundle_value"
  // preorder addon
  | "preorder_delay_risk"
  | "preorder_cancel_policy"
  | "preorder_payment_timing"
  | "preorder_after_drop"
  | "preorder_stock_after";

export interface QuestionCopy {
  title: string;
  help?: string;
  options?: Record<string, string>;
}

export interface ResultCopy {
  verdictTitle: Record<Verdict, string>;
  verdictBody: Record<Verdict, string>;
  waitTypeHint: Record<WaitType, string>;
  reasonTagLabel: Record<ReasonTag, string>;
  reasonTagExplain: Record<ReasonTag, string>;
  actionLabel: Record<NextAction, string>;
  actionExplain: Record<NextAction, string>;
  itemTypeHint: Record<ItemType, string>;
  ui: {
    styleSectionTitle: string;
    styleSectionHelp: string;
    styleStandard: string;
    styleKawaii: string;
    styleOshi: string;
  };
}

export const QUESTION_COPY: Record<ModeId, Record<QuestionId, QuestionCopy>> = {
  standard: {
    // --- Core ---
    chance_now: {
      title: "今、入手できる？",
      help: "在庫/受注/抽選。今しかないほど優先度が上がります。",
      options: { yes: "今なら取れる", maybe: "取れる可能性あり", no: "今は難しい", unknown: "不明" },
    },
    urgency_deadline: {
      title: "締切（期限）は近い？",
      help: "締切/受注終了/現場。近いほど先に判断。",
      options: { now: "今日〜数日", soon: "1〜2週間", later: "まだ余裕", none: "期限なし/不明" },
    },
    budget_impact: {
      title: "生活費を圧迫しない？",
      help: "固定費・食費を削るなら危険信号。",
      options: { ok: "圧迫しない", tight: "少しキツい", ng: "圧迫する/後悔しそう" },
    },
    total_cost: {
      title: "総額（送料/手数料/遠征含む）は把握できてる？",
      options: { known_ok: "把握済み（想定内）", known_tight: "把握済み（重い）", unknown: "未計算" },
    },
    market_heat: {
      title: "相場（価格）は高騰してる？",
      help: "高騰中なら上限価格を決めて冷静に。",
      options: { low: "安い/適正", mid: "相場どおり", high: "高い/高騰", unknown: "不明" },
    },
    price_cap: {
      title: "上限価格（cap）を決められる？",
      help: "capがあると相場に飲まれにくい。",
      options: { set: "決められる", maybe: "迷う", no: "決められない" },
    },
    regret_if_skip: {
      title: "見送ったら後悔しそう？",
      options: { high: "かなり後悔する", mid: "少し残る", low: "たぶん平気" },
    },
    regret_if_buy: {
      title: "買った後に後悔しそう？",
      options: { high: "後悔しそう", mid: "どちらとも", low: "後悔しにくい" },
    },
    use_frequency: {
      title: "使う/飾る頻度は？",
      options: { often: "高い", sometimes: "中", rarely: "低い" },
    },
    space_storage: {
      title: "置き場所（収納）は確保できる？",
      options: { ready: "確保済み", make: "片付ければ可能", no: "厳しい" },
    },
    duplicate_check: {
      title: "所持/被りは確認した？",
      options: { checked: "確認済み（問題なし）", unsure: "未確認/怪しい", dup: "既に持っている" },
    },
    alt_satisfaction: {
      title: "代替で満足できる？",
      help: "配信/画像/中古待ち等で埋められるならWAIT寄り。",
      options: { none: "無理（これが必要）", some: "一部ならOK", plenty: "代替で十分" },
    },
    impulse_state: {
      title: "いまは衝動？それとも冷静？",
      help: "疲れ/ストレス時は判断がブレやすい。",
      options: { calm: "冷静", excited: "高揚", tired: "疲れ/ストレス" },
    },
    upcoming_supply: {
      title: "近々の供給（他の出費予定）は？",
      options: { none: "特にない", some: "少しある", many: "多い/集中してる", unknown: "不明" },
    },
    authenticity_risk: {
      title: "偽物/信用リスクは？（中古/個人取引）",
      options: { low: "低い", mid: "少し不安", high: "不安が強い", na: "該当なし/公式" },
    },
    shipping_risk: {
      title: "配送/破損リスクは許容できる？",
      options: { ok: "許容できる", mid: "不安あり", ng: "怖い" },
    },
    cancel_policy: {
      title: "キャンセル/返品条件は確認した？",
      options: { yes: "確認済み", unsure: "未確認", no: "不可/厳しい" },
    },
    payment_timing: {
      title: "支払いタイミングは問題ない？",
      options: { ok: "問題ない", tight: "時期が厳しい", ng: "厳しい" },
    },
    memory_value: {
      title: "記念性は高い？（誕生日/周年/初現場など）",
      options: { high: "高い", mid: "まあまあ", low: "低い" },
    },
    oshi_priority: {
      title: "推し順位/熱量は？",
      help: "“本命”ほど後悔の重みが増えやすい。",
      options: { top: "本命", strong: "かなり好き", casual: "ライト", unknown: "言語化むずい" },
    },

    // --- goods addon ---
    goods_bundle_trap: {
      title: "セット販売/抱き合わせ要素はある？",
      options: { none: "ない", some: "少しある", strong: "強い（罠っぽい）" },
    },
    goods_size_weight: {
      title: "サイズ/重さは想定内？",
      options: { ok: "想定内", mid: "やや大きい", ng: "想定外に大きい" },
    },
    goods_shipping_fee: {
      title: "送料/手数料で割高になってない？",
      options: { ok: "問題ない", mid: "少し割高", ng: "かなり割高" },
    },
    goods_wearability: {
      title: "使い方（着る/使う/飾る）は明確？",
      options: { clear: "明確", maybe: "たぶん", unclear: "未定" },
    },
    goods_usage_scene: {
      title: "用途は？（現場/日常/保存/布教）",
      options: { live: "現場", daily: "日常", display: "飾る/保存", share: "布教/プレゼント" },
    },

    // --- gacha addon ---
    gacha_spending_cap: { title: "撤退ライン（上限）は決めてる？", options: { set: "決めてる", not_set: "まだ", no_limit: "決めたくない" } },
    gacha_pity_system: { title: "天井/確定（救済）はある？", options: { yes: "ある", no: "ない", unknown: "不明" } },
    gacha_duplicate_tolerance: { title: "被り耐性は？", options: { ok: "被りでもOK", some: "少しならOK", ng: "被りは避けたい" } },
    gacha_trade_option: { title: "交換/譲渡で回収できる？", options: { yes: "できる", maybe: "場合による", no: "難しい" } },
    gacha_stop_rule: { title: "止める条件（当たり出たら/◯回まで）は決まってる？", options: { yes: "決まってる", maybe: "曖昧", no: "決めてない" } },

    // --- ticket addon ---
    ticket_travel_total: { title: "遠征込み総額は？", options: { low: "想定内", mid: "やや重い", high: "重い", unknown: "未計算" } },
    ticket_schedule_conflict: { title: "日程の衝突/休み問題は？", options: { none: "ない", some: "調整必要", hard: "厳しい" } },
    ticket_stamina_load: { title: "体力/メンタル負荷は？", options: { ok: "耐える", mid: "不安", ng: "厳しい" } },
    ticket_seat_value: { title: "席/体験価値は納得できる？", options: { high: "納得", mid: "普通", low: "微妙/不明" } },
    ticket_purpose_clarity: { title: "目的は明確？（推しを見る/友達/雰囲気）", options: { must: "絶対行く理由ある", nice: "行けたら嬉しい", fomo: "不安で申し込みたい" } },

    // --- figure addon ---
    figure_size_scale: { title: "サイズ（スケール）と置き場所は噛み合う？", options: { ok: "噛み合う", mid: "工夫必要", ng: "厳しい" } },
    figure_display_plan: { title: "飾り方/保管方法は決まってる？", options: { yes: "決まってる", maybe: "なんとなく", no: "未定" } },
    figure_dust_maintenance: { title: "ホコリ/メンテの手間は許容？", options: { ok: "許容", mid: "少し不安", ng: "無理そう" } },
    figure_boredom_risk: { title: "飽きにくい（長く好き）？", options: { high: "長く好き", mid: "不明", low: "飽きそう" } },
    figure_long_storage: { title: "長期の収納は確保できる？", options: { yes: "確保済み", make: "片付けで捻出", no: "未定/厳しい" } },

    // --- digital addon ---
    digital_time_limit: { title: "購入/視聴期限は近い？", options: { now: "近い", later: "余裕", none: "期限なし/不明" } },
    digital_rewatch_value: { title: "見返す/聞き返す価値は高い？", options: { high: "高い", mid: "普通", low: "低い" } },
    digital_drm_risk: { title: "DRM/配信終了の不安は？", options: { ok: "許容", mid: "不安", ng: "不安が強い" } },
    digital_language_support: { title: "言語/端末対応はOK？", options: { ok: "OK", mid: "怪しい", ng: "厳しい" } },
    digital_bundle_value: { title: "特典/同梱の価値は？", options: { high: "高い", mid: "普通", low: "低い/不要" } },

    // --- preorder addon ---
    preorder_delay_risk: { title: "延期/仕様変更の可能性は？", options: { low: "低い", mid: "ありそう", high: "高そう" } },
    preorder_cancel_policy: { title: "キャンセル可否は？", options: { ok: "可能/緩い", mid: "条件あり", ng: "不可/厳しい", unknown: "不明" } },
    preorder_payment_timing: { title: "支払い時期は？", options: { now: "今すぐ/前払い", later: "発送時/後払い", split: "分割/段階", unknown: "不明" } },
    preorder_after_drop: { title: "発売後に値下がりしそう？", options: { low: "しにくい", mid: "あり得る", high: "しそう" } },
    preorder_stock_after: { title: "発売後に普通に買えそう？", options: { no: "難しそう", maybe: "わからない", yes: "買えそう" } },
  },

  // kawaii / oshi：同じ質問でも「言い方」を変える（完全版）
  // ここでは“主要差分”をきっちり変えつつ、選択肢キーは同一に保つ（ロジックを壊さないため）
  kawaii: {
    chance_now: { title: "いま手に入るかな？", help: "今だけっぽい？でも深呼吸🫧", options: { yes:"今ならいける！", maybe:"いけるかも", no:"今はむずかしい", unknown:"わかんない" } },
    urgency_deadline: { title: "締切ちかい？", help: "近いほど先に決めよっ", options: { now:"すぐ！", soon:"1〜2週間", later:"まだ余裕", none:"期限なし/不明" } },
    budget_impact: { title: "おさいふ、泣かない？", help: "生活がしんどくなるならストップ💸", options: { ok:"だいじょうぶ", tight:"ちょいキツい", ng:"やめとこ（危険）" } },
    total_cost: { title: "ぜんぶでいくら？（送料/手数料/遠征）", options: { known_ok:"計算した（想定内）", known_tight:"計算した（重い）", unknown:"まだ計算してない" } },
    market_heat: { title: "お値段、あつい？", help: "あつい時は上限きめて守ろ💸", options: { low:"いい感じ！", mid:"ふつう", high:"あつい（高い）", unknown:"わかんない" } },
    price_cap: { title: "上限（cap）きめられる？", help: "capあると安心だよ", options: { set:"きめられる", maybe:"迷う…", no:"きめられない" } },
    regret_if_skip: { title: "見送ったら泣いちゃう？", options: { high:"泣く…", mid:"ちょいモヤ", low:"平気！" } },
    regret_if_buy: { title: "買ってから『やっちゃった…』なりそう？", options: { high:"なりそう…", mid:"わかんない", low:"なりにくい！" } },
    use_frequency: { title: "どれくらい使う/飾る？", options: { often:"いっぱい！", sometimes:"たまに", rarely:"あんまり" } },
    space_storage: { title: "置き場所ある？📦", options: { ready:"あるよ！", make:"片付けたらいける", no:"むずかしい…" } },
    duplicate_check: { title: "ダブり…ない？", options: { checked:"確認した！", unsure:"ちょっと怪しい", dup:"持ってた…" } },
    alt_satisfaction: { title: "別ので満足できる？", help: "代わりで落ち着けるなら待ってもOK🫶", options: { none:"無理！これがいい", some:"ちょっとなら", plenty:"代わりでOK" } },
    impulse_state: { title: "いまの気持ち、衝動？🫧", help:"疲れの時は明日にしよ", options: { calm:"冷静", excited:"テンション高い", tired:"つかれ/ストレス" } },
    upcoming_supply: { title: "近々ほかの出費ある？", options: { none:"ない", some:"少し", many:"多い/集中", unknown:"わかんない" } },
    authenticity_risk: { title: "偽物こわい？（中古/個人取引）", options: { low:"へいき", mid:"ちょい不安", high:"不安つよい", na:"公式だよ" } },
    shipping_risk: { title: "配送こわくない？", options: { ok:"へいき！", mid:"ちょい不安", ng:"こわい…" } },
    cancel_policy: { title: "キャンセル/返品みた？", options: { yes:"見た！", unsure:"まだ", no:"できない/むずい" } },
    payment_timing: { title: "支払い時期だいじょうぶ？", options: { ok:"だいじょうぶ", tight:"きびしい", ng:"むり" } },
    memory_value: { title: "記念（誕生日/周年）つよい？", options: { high:"つよい！", mid:"まあまあ", low:"ふつう" } },
    oshi_priority: { title: "推しの熱量どれくらい？", options: { top:"本命", strong:"かなり好き", casual:"ライト", unknown:"むずかしい" } },

    goods_bundle_trap: { title:"セット罠っぽい？", options:{ none:"ない", some:"少し", strong:"強い（罠）" } },
    goods_size_weight: { title:"サイズ大丈夫？", options:{ ok:"OK", mid:"ちょい大きい", ng:"想定外に大きい" } },
    goods_shipping_fee: { title:"送料で割高になってない？", options:{ ok:"OK", mid:"ちょい割高", ng:"かなり割高" } },
    goods_wearability: { title:"使い方決まってる？", options:{ clear:"決まってる", maybe:"たぶん", unclear:"未定" } },
    goods_usage_scene: { title:"用途どれ？", options:{ live:"現場", daily:"日常", display:"飾る/保存", share:"布教/ギフト" } },

    gacha_spending_cap: { title:"上限きめた？💸", options:{ set:"きめた！", not_set:"まだ…", no_limit:"きめたくない" } },
    gacha_pity_system: { title:"天井ある？", options:{ yes:"ある", no:"ない", unknown:"わかんない" } },
    gacha_duplicate_tolerance: { title:"ダブり耐性ある？", options:{ ok:"ある！", some:"ちょいなら", ng:"ない！" } },
    gacha_trade_option: { title:"交換/譲渡できそう？", options:{ yes:"できそう", maybe:"場合による", no:"むずかしい" } },
    gacha_stop_rule: { title:"止め時きめてる？", options:{ yes:"きめてる", maybe:"曖昧", no:"きめてない" } },

    ticket_travel_total: { title:"遠征こみ総額は？", options:{ low:"想定内", mid:"ちょい重い", high:"重い", unknown:"未計算" } },
    ticket_schedule_conflict: { title:"日程だいじょうぶ？", options:{ none:"OK", some:"調整いる", hard:"むりかも" } },
    ticket_stamina_load: { title:"体力だいじょうぶ？", options:{ ok:"いける", mid:"不安", ng:"厳しい" } },
    ticket_seat_value: { title:"体験価値、納得？", options:{ high:"納得！", mid:"ふつう", low:"微妙/不明" } },
    ticket_purpose_clarity: { title:"行く理由ハッキリ？", options:{ must:"絶対行きたい！", nice:"行けたら嬉しい", fomo:"不安で…" } },

    figure_size_scale: { title:"サイズと置き場合う？", options:{ ok:"合う！", mid:"工夫する", ng:"厳しい" } },
    figure_display_plan: { title:"飾り方きまってる？", options:{ yes:"きまってる", maybe:"なんとなく", no:"未定" } },
    figure_dust_maintenance: { title:"メンテの手間OK？", options:{ ok:"OK", mid:"不安", ng:"むり" } },
    figure_boredom_risk: { title:"飽きにくい？", options:{ high:"長く好き", mid:"わかんない", low:"飽きそう" } },
    figure_long_storage: { title:"長期の収納ある？", options:{ yes:"ある", make:"片付けで作る", no:"ない/未定" } },

    digital_time_limit: { title:"期限ちかい？", options:{ now:"ちかい！", later:"余裕", none:"なし/不明" } },
    digital_rewatch_value: { title:"見返す？", options:{ high:"たくさん", mid:"そこそこ", low:"あんまり" } },
    digital_drm_risk: { title:"消えちゃう不安へいき？", options:{ ok:"へいき", mid:"ちょい不安", ng:"不安つよい" } },
    digital_language_support: { title:"対応（言語/端末）OK？", options:{ ok:"OK", mid:"怪しい", ng:"厳しい" } },
    digital_bundle_value: { title:"特典の価値ある？", options:{ high:"ある！", mid:"ふつう", low:"いらない" } },

    preorder_delay_risk: { title:"延期こわい？", options:{ low:"へいき", mid:"ありそう", high:"高そう" } },
    preorder_cancel_policy: { title:"キャンセルできる？", options:{ ok:"できる", mid:"条件あり", ng:"できない", unknown:"不明" } },
    preorder_payment_timing: { title:"支払いはいつ？", options:{ now:"今すぐ", later:"発送時", split:"段階", unknown:"不明" } },
    preorder_after_drop: { title:"あとで値下がりしそう？", options:{ low:"しにくい", mid:"あり得る", high:"しそう" } },
    preorder_stock_after: { title:"発売後も買えそう？", options:{ no:"難しそう", maybe:"不明", yes:"買えそう" } },
  },

  oshi: {
    chance_now: { title:"供給、今ある？", help:"今しかない寄りなら優先度↑（でも冷静）", options:{ yes:"今しかない寄り", maybe:"いけるかも", no:"今は難しい", unknown:"不明" } },
    urgency_deadline: { title:"締切、近い？", options:{ now:"至近", soon:"1〜2週間", later:"余裕", none:"なし/不明" } },
    budget_impact: { title:"課金枠、生きてる？", help:"枠外課金は事故りやすい。枠守るのも推し活。", options:{ ok:"枠内", tight:"枠ギリ", ng:"枠外/危険" } },
    total_cost: { title:"総額（送料/手数料/遠征）把握できてる？", options:{ known_ok:"把握済み（想定内）", known_tight:"把握済み（重い）", unknown:"未計算" } },
    market_heat: { title:"相場、燃えてる？", help:"燃えてる時はcap決めて勝つ。", options:{ low:"適正/うまい", mid:"相場", high:"燃えてる（高い）", unknown:"不明" } },
    price_cap: { title:"cap（上限）引ける？", options:{ set:"引ける", maybe:"迷う", no:"引けない" } },
    regret_if_skip: { title:"見送ると沼る？", options:{ high:"沼る（後悔強）", mid:"少し残る", low:"大丈夫" } },
    regret_if_buy: { title:"買って後悔しそう？（金/置き場/飽き）", options:{ high:"しそう", mid:"不明", low:"しにくい" } },
    use_frequency: { title:"回収後、回す？（使う/飾る頻度）", options:{ often:"高", sometimes:"中", rarely:"低" } },
    space_storage: { title:"収納が現場。置き場は？", options:{ ready:"確保済み", make:"片付けで捻出", no:"厳しい" } },
    duplicate_check: { title:"所持チェック済み？", options:{ checked:"済（問題なし）", unsure:"未確認/怪しい", dup:"既に所持" } },
    alt_satisfaction: { title:"代替（配信/画像/中古待ち）で埋められる？", options:{ none:"無理（これ）", some:"一部なら", plenty:"代替でOK" } },
    impulse_state: { title:"情緒、安定してる？", options:{ calm:"安定", excited:"高揚", tired:"荒れ/疲れ" } },
    upcoming_supply: { title:"近々の供給（他出費）ある？", options:{ none:"ない", some:"少し", many:"多い/集中", unknown:"不明" } },
    authenticity_risk: { title:"偽物/信用リスクは？", options:{ low:"低", mid:"不安", high:"不安強", na:"公式" } },
    shipping_risk: { title:"配送/破損リスク許容？", options:{ ok:"許容", mid:"不安", ng:"怖い" } },
    cancel_policy: { title:"キャンセル条件確認した？", options:{ yes:"確認済み", unsure:"未確認", no:"不可/厳しい" } },
    payment_timing: { title:"支払い時期、枠的にOK？", options:{ ok:"OK", tight:"ギリ", ng:"厳しい" } },
    memory_value: { title:"記念性（誕生日/周年/初現場）強い？", options:{ high:"強い", mid:"中", low:"低" } },
    oshi_priority: { title:"推し順位/熱量は？", options:{ top:"本命", strong:"強め", casual:"ライト", unknown:"言語化むずい" } },

    goods_bundle_trap: { title:"抱き合わせ要素ある？", options:{ none:"なし", some:"少し", strong:"強い（罠寄り）" } },
    goods_size_weight: { title:"サイズ想定内？", options:{ ok:"想定内", mid:"やや大", ng:"想定外に大" } },
    goods_shipping_fee: { title:"送料/手数料で割高？", options:{ ok:"問題なし", mid:"少し", ng:"かなり" } },
    goods_wearability: { title:"使い道（回す/飾る）明確？", options:{ clear:"明確", maybe:"たぶん", unclear:"未定" } },
    goods_usage_scene: { title:"用途どれ？", options:{ live:"現場", daily:"日常", display:"飾る/保存", share:"布教/ギフト" } },

    gacha_spending_cap: { title:"撤退線、引けてる？", options:{ set:"引けてる", not_set:"まだ", no_limit:"引かない派" } },
    gacha_pity_system: { title:"救済（天井）ある？", options:{ yes:"ある", no:"ない", unknown:"不明" } },
    gacha_duplicate_tolerance: { title:"被り耐性どれくらい？", options:{ ok:"OK", some:"少しなら", ng:"NG" } },
    gacha_trade_option: { title:"交換/譲渡で回収できる？", options:{ yes:"回収可", maybe:"運次第", no:"難しい" } },
    gacha_stop_rule: { title:"止め時（当たり/回数）決まってる？", options:{ yes:"決まってる", maybe:"曖昧", no:"決めてない" } },

    ticket_travel_total: { title:"遠征込み総額は？", options:{ low:"想定内", mid:"やや重い", high:"重い", unknown:"未計算" } },
    ticket_schedule_conflict: { title:"日程/休み問題は？", options:{ none:"なし", some:"調整必要", hard:"厳しい" } },
    ticket_stamina_load: { title:"体力/情緒耐える？", options:{ ok:"耐える", mid:"不安", ng:"厳しい" } },
    ticket_seat_value: { title:"体験価値（席/演出）納得？", options:{ high:"納得", mid:"普通", low:"微妙/不明" } },
    ticket_purpose_clarity: { title:"目的明確？", options:{ must:"絶対行く理由あり", nice:"行けたら嬉しい", fomo:"不安で申し込みたい" } },

    figure_size_scale: { title:"サイズ×置き場、成立？", options:{ ok:"成立", mid:"工夫", ng:"厳しい" } },
    figure_display_plan: { title:"飾り/保管プランある？", options:{ yes:"ある", maybe:"なんとなく", no:"ない" } },
    figure_dust_maintenance: { title:"メンテ負荷、許容？", options:{ ok:"許容", mid:"不安", ng:"無理" } },
    figure_boredom_risk: { title:"飽き耐性ある？", options:{ high:"ある", mid:"不明", low:"薄い" } },
    figure_long_storage: { title:"長期収納、確保できる？", options:{ yes:"確保済み", make:"片付けで捻出", no:"未定/厳しい" } },

    digital_time_limit: { title:"期限ある？（供給期限）", options:{ now:"近い", later:"余裕", none:"なし/不明" } },
    digital_rewatch_value: { title:"リピートする？", options:{ high:"高", mid:"中", low:"低" } },
    digital_drm_risk: { title:"DRM/終了の不安は？", options:{ ok:"許容", mid:"不安", ng:"不安強" } },
    digital_language_support: { title:"言語/端末対応OK？", options:{ ok:"OK", mid:"怪しい", ng:"厳しい" } },
    digital_bundle_value: { title:"特典価値ある？", options:{ high:"ある", mid:"普通", low:"薄い" } },

    preorder_delay_risk: { title:"延期リスクは？", options:{ low:"低", mid:"ありそう", high:"高" } },
    preorder_cancel_policy: { title:"キャンセル可否は？", options:{ ok:"可", mid:"条件あり", ng:"不可/厳しい", unknown:"不明" } },
    preorder_payment_timing: { title:"支払いタイミングは？", options:{ now:"前払い", later:"発送時", split:"段階", unknown:"不明" } },
    preorder_after_drop: { title:"発売後値下がりしそう？", options:{ low:"しにくい", mid:"あり得る", high:"しそう" } },
    preorder_stock_after: { title:"発売後も買えそう？", options:{ no:"難しい", maybe:"不明", yes:"買えそう" } },
  },
};

export const RESULT_COPY: Record<ModeId, ResultCopy> = {
  standard: {
    verdictTitle: { BUY:"買い", WAIT:"待ち", SKIP:"見送り" },
    verdictBody: {
      BUY: "条件が揃っています。無理のない範囲で進めましょう。",
      WAIT: "整えてから再判断が安全です。",
      SKIP: "今回は守る判断が合理的です。",
    },
    waitTypeHint: {
      cooldown_24h: "24時間置いて再判断。",
      wait_market: "相場を見て上限価格を決める。",
      wait_restock: "再販/在庫情報を待つ。",
      wait_prepare: "予算/収納/確認など準備を優先。",
    },
    reasonTagLabel: {
      budget:"予算", urgency:"期限", market:"相場", space:"収納",
      impulse:"衝動", duplicate:"重複", use:"使用頻度", regret:"後悔", risk:"リスク",
    },
    reasonTagExplain: {
      budget:"生活に影響するなら危険。",
      urgency:"今しかない度合い。",
      market:"高騰時はcapを決める。",
      space:"置き場が確定しているか。",
      impulse:"衝動が強い時は冷却。",
      duplicate:"所持確認でムダを避ける。",
      use:"使う/飾る頻度が価値。",
      regret:"見送る/買う後悔の比較。",
      risk:"偽物/配送/条件など不確実性。",
    },
    actionLabel: {
      buy_now:"買う/申し込む",
      set_price_cap:"上限価格を決める",
      market_check:"相場を確認",
      cooldown_24h:"24h冷却",
      declutter_first:"先に片付け",
      check_inventory:"所持確認",
      set_spending_cap:"支出枠を作る",
      rerun_later:"後で再診断",
    },
    actionExplain: {
      buy_now:"条件が揃っているなら実行。",
      set_price_cap:"これ以上出さない線を決める。",
      market_check:"相場で過熱を確認。",
      cooldown_24h:"衝動を落として判断。",
      declutter_first:"置き場を作ってから。",
      check_inventory:"ダブり購入を防ぐ。",
      set_spending_cap:"推し活枠を可視化。",
      rerun_later:"状況が変わったら再度。",
    },
    itemTypeHint: {
      goods:"グッズは用途/置き場/送料が満足度を左右。",
      gacha:"ガチャは撤退線と被り回避が勝敗。",
      ticket:"チケットは総額（遠征）と体力が本体。",
      figure:"フィギュアは置き場と長期メンテが核心。",
      digital:"デジタルは期限/DRM/見返し価値。",
      preorder:"予約は支払い時期とキャンセル可否が要。",
    },
    ui: {
      styleSectionTitle:"表現スタイル（文案）",
      styleSectionHelp:"質問や結果の言い方だけが変わります（判定ロジックは同じ）。",
      styleStandard:"標準",
      styleKawaii:"かわいい",
      styleOshi:"推し活用語",
    },
  },

  kawaii: {
    verdictTitle: { BUY:"買ってOK", WAIT:"いったん待ち", SKIP:"見送り" },
    verdictBody: {
      BUY:"いける！無理しない範囲でGOだよ✨",
      WAIT:"いったん整えてからが安心だよ🫧",
      SKIP:"見送れるのえらい🫶 自分守ろっ",
    },
    waitTypeHint: {
      cooldown_24h:"今日は寝て、明日もう一回みよ🫧",
      wait_market:"上限きめて、おさいふ守ろ💸",
      wait_restock:"情報まってからでも遅くないよ🫶",
      wait_prepare:"準備（予算/収納/確認）してからね📦",
    },
    reasonTagLabel: {
      budget:"おさいふ", urgency:"期限", market:"お値段", space:"置き場所",
      impulse:"衝動", duplicate:"ダブり", use:"使う頻度", regret:"後悔", risk:"リスク",
    },
    reasonTagExplain: {
      budget:"生活がしんどくなるならストップ。",
      urgency:"今だけっぽいなら先に判断。",
      market:"高い時はcapで守ろ💸",
      space:"置けると満足UP📦",
      impulse:"衝動強いなら深呼吸🫧",
      duplicate:"ダブり回避が勝ち！",
      use:"使うほど満足が続くよ。",
      regret:"あとで泣かない選択を。",
      risk:"不安が強いなら無理しない。",
    },
    actionLabel: {
      buy_now:"今いっちゃお！",
      set_price_cap:"上限きめる",
      market_check:"相場みる",
      cooldown_24h:"24hまつ",
      declutter_first:"片付けする",
      check_inventory:"持ってるか確認",
      set_spending_cap:"推し活枠つくる",
      rerun_later:"あとで再診断",
    },
    actionExplain: {
      buy_now:"条件そろってたらOK！",
      set_price_cap:"ここまで！を決めると安心💸",
      market_check:"熱いかどうかチェック。",
      cooldown_24h:"明日の自分に聞こ🫧",
      declutter_first:"置けると満足UP📦",
      check_inventory:"ダブり防止！",
      set_spending_cap:"枠があると心が平和。",
      rerun_later:"状況変わったらまたね。",
    },
    itemTypeHint: {
      goods:"グッズは「使う？飾る？」が決まると幸せだよ🫶",
      gacha:"ガチャは上限きめて勝と💸",
      ticket:"チケは遠征含めた総額が大事！",
      figure:"フィギュアは置き場が最優先📦",
      digital:"デジタルは期限と見返しがカギ",
      preorder:"予約はキャンセルと支払い時期チェック！",
    },
    ui: {
      styleSectionTitle:"表現スタイル（文案）",
      styleSectionHelp:"質問や結果の言い方がかわいくなるよ（判定ロジックは同じ）",
      styleStandard:"標準",
      styleKawaii:"かわいい",
      styleOshi:"推し活用語",
    },
  },

  oshi: {
    verdictTitle: { BUY:"買い", WAIT:"待ち", SKIP:"見送り" },
    verdictBody: {
      BUY:"解釈一致なら勝ち。枠内でいこう。",
      WAIT:"待てるオタク、強い。最適化してから再戦。",
      SKIP:"温存も推し活。ここは守りで勝つ。",
    },
    waitTypeHint: {
      cooldown_24h:"情緒を冷却してから再戦。",
      wait_market:"cap決めて相場に勝つ。",
      wait_restock:"再販/情報待ちで最適化。",
      wait_prepare:"枠/収納/所持チェックを先に。",
    },
    reasonTagLabel: {
      budget:"課金枠", urgency:"期限", market:"相場", space:"収納",
      impulse:"情緒", duplicate:"所持", use:"回す頻度", regret:"後悔", risk:"リスク",
    },
    reasonTagExplain: {
      budget:"枠外課金は事故りやすい。",
      urgency:"今しかない度が高い。",
      market:"燃えてる時はcap必須。",
      space:"収納が現場。確保できる？",
      impulse:"情緒荒れてると判断ブレる。",
      duplicate:"所持チェックでムダ回避。",
      use:"回すほど満足が伸びる。",
      regret:"沼回避 or 後悔回避。",
      risk:"不確実性が高いなら温存。",
    },
    actionLabel: {
      buy_now:"課金する（勝つ）",
      set_price_cap:"cap決める",
      market_check:"相場チェック",
      cooldown_24h:"24h冷却",
      declutter_first:"収納整備",
      check_inventory:"所持確認",
      set_spending_cap:"課金枠つくる",
      rerun_later:"再診断",
    },
    actionExplain: {
      buy_now:"条件一致なら実行でOK。",
      set_price_cap:"capでブレない判断。",
      market_check:"熱量を数値で見る。",
      cooldown_24h:"情緒を落として勝つ。",
      declutter_first:"置き場作って満足UP。",
      check_inventory:"ダブりは敗北回避。",
      set_spending_cap:"枠管理が最強。",
      rerun_later:"状況変化で再戦。",
    },
    itemTypeHint: {
      goods:"グッズは用途と置き場の一致が正義。",
      gacha:"ガチャは撤退線で勝敗が決まる。",
      ticket:"チケは総額と体力が本体。",
      figure:"フィギュアは置き場＋メンテが核心。",
      digital:"デジタルは期限/DRM/リピート価値。",
      preorder:"予約はキャンセルと支払い時期。",
    },
    ui: {
      styleSectionTitle:"表現スタイル（文案）",
      styleSectionHelp:"推し活っぽい言い回しになる（判定ロジックは同じ・安全版）",
      styleStandard:"標準",
      styleKawaii:"かわいい",
      styleOshi:"推し活用語",
    },
  },
};
