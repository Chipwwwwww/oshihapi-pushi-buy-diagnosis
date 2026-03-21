import type { AnswerValue, GoodsClass, InputMeta, ItemKind } from "@/src/oshihapi/model";
import type { ParsedSearchClues } from "@/src/oshihapi/input/types";

export type ScenarioSupportLevel = "strong" | "partial" | "not_now";

export type ScenarioKey =
  | "preorder_decision"
  | "used_market_check"
  | "blind_draw_stopline"
  | "exchange_path"
  | "random_goods_completion"
  | "media_purchase_decision"
  | "new_book_bonus_decision"
  | "collection_vs_budget"
  | "impulse_cooling"
  | "venue_limited_goods"
  | "post_event_mailorder"
  | "missed_onsite_recovery"
  | "limited_goods_fomo"
  | "not_now_ticket"
  | "not_now_travel"
  | "not_now_3d_idol"
  | "not_now_kpop"
  | "not_now_niche_merchants";

export type HomepagePriority = "primary" | "secondary" | "partial" | "not_now";

export type ScenarioCoverageEntry = {
  key: ScenarioKey;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  supportLevel: ScenarioSupportLevel;
  homepagePriority: HomepagePriority;
  heroOrder: number;
  shopperIntent: string;
  recommendedEntryLabel: string;
  compactEntryHint: string;
  providerEcologyHint: string;
  resultExplanationHint: string;
  optimizationSummary: string;
  questionHint: string;
  flowHelperHint: string;
  verificationHint: string;
  shortVerificationHint: string;
  scopeDisclosure: string;
  shortScopeDisclosure: string;
  diagnosticsTag?: string;
};

export type ScenarioResolutionInput = {
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  parsedSearchClues?: ParsedSearchClues;
  searchClueRaw?: string;
  answers?: Record<string, AnswerValue>;
};

export type ScenarioCoverageSummary = {
  key: ScenarioKey;
  supportLevel: ScenarioSupportLevel;
  recommendedEntryLabel: string;
  shopperIntent: string;
  compactEntryHint: string;
  providerEcologyHint: string;
  resultExplanationHint: string;
  optimizationSummary: string;
  questionHint: string;
  flowHelperHint: string;
  verificationHint: string;
  shortVerificationHint: string;
  scopeDisclosure: string;
  shortScopeDisclosure: string;
  diagnosticsTag?: string;
};

export const SCENARIO_COVERAGE_MAP: Record<ScenarioKey, ScenarioCoverageEntry> = {
  preorder_decision: {
    key: "preorder_decision",
    itemKind: "preorder",
    supportLevel: "strong",
    homepagePriority: "primary",
    heroOrder: 1,
    shopperIntent: "予約を今入れるか、締切前に整理したい判断",
    recommendedEntryLabel: "予約を今入れるか迷っている",
    compactEntryHint: "締切・再販・待てる余地を短く整理できます。",
    providerEcologyHint: "予約系は公式・大手EC・特典差の比較が中心です。再販余地や締切の確度も重視します。",
    resultExplanationHint: "予約の待機コスト、締切圧、後から比較できる余地を優先して整理します。",
    optimizationSummary: "締切圧と待てる余地のバランス",
    questionHint: "このフローでは、締切の確度・再販見込み・待っても困らないかを先に確認します。",
    flowHelperHint: "締切・再販・今決める必要を確認中",
    verificationHint: "締切日時、予約特典、キャンセル条件は外部ページで最終確認すると安全です。",
    shortVerificationHint: "締切・特典・キャンセル条件は外部で最終確認。",
    scopeDisclosure: "予約判断は強めに対応していますが、遠征やイベント日程まで絡む判断は別扱いです。",
    shortScopeDisclosure: "予約判断は強め対応。遠征や日程調整は別扱いです。",
    diagnosticsTag: "coverage_preorder_strong",
  },
  used_market_check: {
    key: "used_market_check",
    itemKind: "used",
    supportLevel: "strong",
    homepagePriority: "primary",
    heroOrder: 2,
    shopperIntent: "中古・再販市場の相場とリスクを見て買うか決めたい",
    recommendedEntryLabel: "中古の相場を見て判断したい",
    compactEntryHint: "相場差・状態・返品条件を中心に見ます。",
    providerEcologyHint: "中古系は相場差、状態、返品条件、出品者/店舗信頼性の確認を優先します。",
    resultExplanationHint: "新品の勢いではなく、相場差とリスク差を見て判断しやすい形に寄せます。",
    optimizationSummary: "相場差と中古リスクの見極め",
    questionHint: "このフローでは、相場差・状態差・返品可否が判断材料の中心になります。",
    flowHelperHint: "相場・状態・返品条件を確認中",
    verificationHint: "状態説明、付属品、真贋不安、返品条件は外部で再確認してください。",
    shortVerificationHint: "状態・付属品・返品条件は外部で再確認。",
    scopeDisclosure: "中古・相場チェックは強めですが、希少市場全体の完全追跡までは対象外です。",
    shortScopeDisclosure: "中古判断は強め対応。市場全体の完全追跡は対象外です。",
    diagnosticsTag: "coverage_used_strong",
  },
  blind_draw_stopline: {
    key: "blind_draw_stopline",
    itemKind: "blind_draw",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 5,
    shopperIntent: "くじやブラインド商品をどこで止めるか決めたい",
    recommendedEntryLabel: "くじ/ブラインド商品をどこで止めるか決めたい",
    compactEntryHint: "被りと上限を崩さない撤退ライン向けです。",
    providerEcologyHint: "ランダム商材は上限、被り、交換前提、中古移行ラインの整理が重要です。",
    resultExplanationHint: "楽しさを否定せず、被りと予算崩壊を防ぐ stopping-line 設計を優先します。",
    optimizationSummary: "被りと予算崩壊を防ぐ止めどき",
    questionHint: "このフローでは、上限回数・被り許容・撤退ラインを先に固めます。",
    flowHelperHint: "上限回数と撤退ラインを確認中",
    verificationHint: "BOX仕様、封入率、交換先の有無は外部で確認すると判断が安定します。",
    shortVerificationHint: "封入仕様・交換先の有無は外部で確認。",
    scopeDisclosure: "ランダム商品の上限整理は強めですが、イベント運営ルールまで含む判断は対象外です。",
    shortScopeDisclosure: "止めどき整理は強め対応。運営ルール判断は対象外です。",
    diagnosticsTag: "coverage_blind_draw_strong",
  },
  exchange_path: {
    key: "exchange_path",
    itemKind: "blind_draw",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 6,
    shopperIntent: "ブラインド商品を交換前提でどこで止めるか整理したい",
    recommendedEntryLabel: "交換前提でブラインド商品をどこで止めるか整理したい",
    compactEntryHint: "交換前提でも手間と待ち時間を織り込んで止めどきを出します。",
    providerEcologyHint: "交換は実行機能ではなく判断材料として扱い、負担が高い時は中古単品や相場確認へ寄せます。",
    resultExplanationHint: "交換前提の有効性と、その前提が崩れた時の撤退線を明示します。",
    optimizationSummary: "交換前提でも崩れにくい撤退線",
    questionHint: "このフローでは、交換意欲だけでなく、連絡・梱包・待機の負担も確認します。",
    flowHelperHint: "交換前提の成立条件と撤退ラインを確認中",
    verificationHint: "交換候補の有無、発送・手渡し条件、待機コストは外部の実情に合わせて再確認してください。",
    shortVerificationHint: "交換候補と発送/待機コストは外部で再確認。",
    scopeDisclosure: "交換の実行機能はありません。交換前提が有効かどうかの判断整理に特化しています。",
    shortScopeDisclosure: "交換実行は未対応。交換前提の判断整理に特化。",
    diagnosticsTag: "coverage_exchange_path_strong",
  },
  random_goods_completion: {
    key: "random_goods_completion",
    itemKind: "blind_draw",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 7,
    shopperIntent: "ブラインド商品のコンプ圧を整理して単品・中古へ切り替えたい",
    recommendedEntryLabel: "ブラインド商品を続けるより単品/中古に切り替えるか整理したい",
    compactEntryHint: "コンプ圧・被り・予算を見て、中古/単品移行をはっきり出します。",
    providerEcologyHint: "Mercari・駿河屋などの中古単品確認を優先し、一般ECは重複リスク回復の主経路としては扱いません。",
    resultExplanationHint: "揃えたい気持ちは尊重しつつ、くじ継続より単品/中古 completion が合理的かを説明します。",
    optimizationSummary: "コンプ圧を単品/中古へ安全に逃がす",
    questionHint: "このフローでは、被り許容・交換負担・単品移行意向を先に確認します。",
    flowHelperHint: "単品/中古へ切り替える条件を確認中",
    verificationHint: "中古単品の相場、在庫、状態差、送料込み総額は外部で最終確認してください。",
    shortVerificationHint: "中古単品の相場・在庫・総額は外部で最終確認。",
    scopeDisclosure: "ブラインド completion の判断整理は強めですが、全マーケットを横断した完全最適化までは対象外です。",
    shortScopeDisclosure: "ブラインド completion 整理は強め対応。全市場最適化は対象外。",
    diagnosticsTag: "coverage_random_goods_completion_strong",
  },
  media_purchase_decision: {
    key: "media_purchase_decision",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "primary",
    heroOrder: 4,
    shopperIntent: "CD・映像・書籍を今買うか、比較して決めたい",
    recommendedEntryLabel: "CD・映像・書籍を買うべきか迷う",
    compactEntryHint: "仕様差・特典差・再生環境を比較できます。",
    providerEcologyHint: "メディア系は再生/閲覧環境、特典差、限定版、再入手性の比較が中心です。",
    resultExplanationHint: "保存・視聴・特典のバランスを見て、どこに価値があるかを説明します。",
    optimizationSummary: "仕様差・特典差・使い道のバランス",
    questionHint: "このフローでは、視聴環境・限定版圧・中身目的か特典目的かをはっきりさせます。",
    flowHelperHint: "仕様差と特典の優先度を確認中",
    verificationHint: "仕様違い、店舗別特典、視聴環境、在庫状況は外部で最終確認してください。",
    shortVerificationHint: "仕様差・店舗特典・在庫は外部で最終確認。",
    scopeDisclosure: "メディア購入判断は強めですが、配信サービス横断の完全比較まではしていません。",
    shortScopeDisclosure: "メディア購入は強め対応。配信横断の完全比較は対象外です。",
    diagnosticsTag: "coverage_media_strong",
  },
  new_book_bonus_decision: {
    key: "new_book_bonus_decision",
    itemKind: "goods",
    goodsClass: "paper",
    supportLevel: "strong",
    homepagePriority: "primary",
    heroOrder: 3,
    shopperIntent: "新刊・新譜・店舗別特典をどこまで追うか整理したい",
    recommendedEntryLabel: "特典つき新刊をどこまで追うか迷う",
    compactEntryHint: "店舗特典の優先度と複数買いを整理できます。",
    providerEcologyHint: "特典系は店舗差、取りこぼし不安、複数買い圧、書店/専門店の相性を重視します。",
    resultExplanationHint: "特典回収の優先度と予算圧のバランスを取る前提で説明します。",
    optimizationSummary: "特典優先度と複数買い圧のバランス",
    questionHint: "このフローでは、特典が本体なのか・複数店舗を追う価値があるかを見ます。",
    flowHelperHint: "特典優先度と追い方を確認中",
    verificationHint: "特典絵柄、配布条件、対象店舗、発売日周辺の在庫は外部で確認してください。",
    shortVerificationHint: "特典条件・対象店舗・在庫は外部確認。",
    scopeDisclosure: "新刊+特典判断は強めですが、作品ごとの全店舗網羅や niche 店舗の完全対応はまだしていません。",
    shortScopeDisclosure: "新刊+特典は強め対応。全店舗網羅まではしていません。",
    diagnosticsTag: "coverage_new_book_bonus_strong",
  },
  collection_vs_budget: {
    key: "collection_vs_budget",
    itemKind: "goods",
    supportLevel: "partial",
    homepagePriority: "secondary",
    heroOrder: 6,
    shopperIntent: "コレクション優先か予算優先か整理したい",
    recommendedEntryLabel: "コレクション優先か予算優先か整理したい",
    compactEntryHint: "本命優先か量優先かを先に整える向けです。",
    providerEcologyHint: "この領域は買い方整理が中心で、具体的な回収経路はケース差が大きめです。",
    resultExplanationHint: "コンプ欲と予算圧の整理を優先し、完全な回収戦略より先に軸を整えます。",
    optimizationSummary: "コンプ欲と予算上限の整理",
    questionHint: "このフローでは、本命優先か、量を取りに行くか、今月の上限を中心に整理します。",
    flowHelperHint: "本命優先か予算優先かを整理中",
    verificationHint: "回収候補の全量チェックや長期相場の追跡は外部メモと併用すると安心です。",
    shortVerificationHint: "全量チェックや長期相場は外部メモ併用が安心。",
    scopeDisclosure: "コレクション整理は部分対応です。全回収計画の最適化まではまだ対象外です。",
    shortScopeDisclosure: "整理は一部対応。全回収計画の最適化は対象外です。",
    diagnosticsTag: "coverage_collection_partial",
  },
  venue_limited_goods: {
    key: "venue_limited_goods",
    itemKind: "goods",
    goodsClass: "small_collection",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 8,
    shopperIntent: "会場限定・イベント限定グッズを今追うか整理したい",
    recommendedEntryLabel: "会場限定グッズを今追うか迷っている",
    compactEntryHint: "本当の希少性か、一時的な現地圧かを分けて見ます。",
    providerEcologyHint: "現地限定系は、後日通販の可能性と中古回復の相性を優先し、一般ECは継続販売の根拠がある時だけ重く見ます。",
    resultExplanationHint: "現地の熱量ではなく、回復経路の強さと待てる余地を診断軸にします。",
    optimizationSummary: "本当の希少性と回復可能性の切り分け",
    questionHint: "このフローでは、会場限定かどうか・後日通販の見込み・待てるかを先に確認します。",
    flowHelperHint: "現地圧と回復経路を確認中",
    verificationHint: "公式告知、事後通販案内、購入制限、完売後の再案内は外部で最終確認してください。",
    shortVerificationHint: "公式告知・事後通販案内・購入制限は外部で最終確認。",
    scopeDisclosure: "会場限定グッズの購入判断には対応しますが、チケット・遠征・参加計画は対象外です。",
    shortScopeDisclosure: "会場限定グッズ判断は対応。参加計画や遠征は対象外。",
    diagnosticsTag: "coverage_venue_limited_goods_strong",
  },
  post_event_mailorder: {
    key: "post_event_mailorder",
    itemKind: "goods",
    goodsClass: "small_collection",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 9,
    shopperIntent: "事後通販がありそうなら待つべきか整理したい",
    recommendedEntryLabel: "事後通販を待つべきか整理したい",
    compactEntryHint: "『今しかない』圧より、後日回復の見込みを優先して見ます。",
    providerEcologyHint: "公式の後日通販は保証せず、待ち判断と中古 fallback の両方を控えめに整理します。",
    resultExplanationHint: "後日通販が plausible なら、現地での追い買いを急がない診断に寄せます。",
    optimizationSummary: "後日通販待ちで後悔を減らす",
    questionHint: "このフローでは、公式の後日販売らしさと、待っても大丈夫かを確認します。",
    flowHelperHint: "事後通販待ちが安全か確認中",
    verificationHint: "事後通販は保証扱いにせず、告知の有無・例年傾向・完売後の案内を外部確認してください。",
    shortVerificationHint: "事後通販の告知有無・例年傾向は外部確認。",
    scopeDisclosure: "事後通販の可能性整理に対応しますが、参加判断や整理券の攻略は対象外です。",
    shortScopeDisclosure: "事後通販の可能性整理に対応。参加攻略は対象外。",
    diagnosticsTag: "coverage_post_event_mailorder_strong",
  },
  missed_onsite_recovery: {
    key: "missed_onsite_recovery",
    itemKind: "goods",
    goodsClass: "small_collection",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 10,
    shopperIntent: "現地で逃した後の回復ルートを冷静に整理したい",
    recommendedEntryLabel: "現地で逃したグッズの回復ルートを整理したい",
    compactEntryHint: "中古 fallback と後日確認の優先順を診断します。",
    providerEcologyHint: "取り逃し後は Mercari・駿河屋などの中古回復を主軸にし、一般ECは継続販売の根拠がある時だけ補助的に扱います。",
    resultExplanationHint: "逃した直後の焦りではなく、後から取り戻せる現実的なルートを優先して説明します。",
    optimizationSummary: "取り逃し後の回復ルートを冷静に選ぶ",
    questionHint: "このフローでは、待てるか・中古 fallback を使うか・初回機会への執着度を確認します。",
    flowHelperHint: "取り逃し後の回復ルートを整理中",
    verificationHint: "相場の跳ね方、在庫の戻り、再販告知、送料込み総額は外部で最終確認してください。",
    shortVerificationHint: "相場・再販告知・送料込み総額は外部確認。",
    scopeDisclosure: "取り逃し後のグッズ回復判断には対応しますが、現地再入場や参加方法の案内はしません。",
    shortScopeDisclosure: "取り逃し後の判断に対応。再入場や参加方法は対象外。",
    diagnosticsTag: "coverage_missed_onsite_recovery_strong",
  },
  limited_goods_fomo: {
    key: "limited_goods_fomo",
    itemKind: "goods",
    goodsClass: "small_collection",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 11,
    shopperIntent: "限定グッズの FOMO 圧が本当に根拠あるか整理したい",
    recommendedEntryLabel: "限定グッズの FOMO 圧を整理したい",
    compactEntryHint: "雰囲気の焦りと、本当に回復しにくい scarcity を分けます。",
    providerEcologyHint: "ここは店舗比較より、FOMO を冷やして回復可能性を見る診断が主です。",
    resultExplanationHint: "限定感そのものではなく、根拠の薄い焦りを clamp できるかを見ます。",
    optimizationSummary: "根拠薄い scarcity 圧を冷やす",
    questionHint: "このフローでは、希少性の根拠・待てるか・高値後悔と取り逃し後悔のどちらが重いかを見ます。",
    flowHelperHint: "FOMO 圧の根拠を確認中",
    verificationHint: "限定表記、販売数、購入制限、後日販売例は外部で確かめると判断が安定します。",
    shortVerificationHint: "限定表記・販売数・後日販売例は外部確認。",
    scopeDisclosure: "FOMO の整理には対応しますが、感情ケア全般や参加スケジュール判断は扱いません。",
    shortScopeDisclosure: "FOMO 整理には対応。参加スケジュールは対象外。",
    diagnosticsTag: "coverage_limited_goods_fomo_strong",
  },
  impulse_cooling: {
    key: "impulse_cooling",
    itemKind: "goods",
    supportLevel: "partial",
    homepagePriority: "secondary",
    heroOrder: 7,
    shopperIntent: "勢いで買いそうな時に冷やして後悔を減らしたい",
    recommendedEntryLabel: "勢い買いを少し冷やして考えたい",
    compactEntryHint: "FOMO や疲れで押される時の停止線向けです。",
    providerEcologyHint: "ここは店舗比較よりも判断停止線の設計が中心で、商材差は二段目で見ます。",
    resultExplanationHint: "勢いを否定せず、いま決めるべきか・少し待つべきかの安全線を説明します。",
    optimizationSummary: "勢いを冷やしつつ後悔を減らす停止線",
    questionHint: "このフローでは、疲れ・焦り・FOMO が判断を押していないかを見ます。",
    flowHelperHint: "勢いに押されていないかを確認中",
    verificationHint: "期限や在庫が本当に切迫しているかは外部で確かめると過熱を抑えやすいです。",
    shortVerificationHint: "期限や在庫の切迫度は外部で再確認。",
    scopeDisclosure: "衝動クールダウンは部分対応です。感情ケア全般や継続的な消費管理までは扱っていません。",
    shortScopeDisclosure: "冷却整理は一部対応。継続的な消費管理までは扱いません。",
    diagnosticsTag: "coverage_impulse_partial",
  },
  not_now_ticket: {
    key: "not_now_ticket",
    itemKind: "ticket",
    supportLevel: "not_now",
    homepagePriority: "not_now",
    heroOrder: 1,
    shopperIntent: "チケット取得や日程判断をしたい",
    recommendedEntryLabel: "チケット取得を判断したい",
    compactEntryHint: "今は強い対応対象ではない領域です。",
    providerEcologyHint: "チケットは座席、同行、規約、移動、代替公演が絡み、現行ロジックの守備範囲外です。",
    resultExplanationHint: "このプロダクトはチケット判断を現在の主戦場にしていません。",
    optimizationSummary: "物販系判断を優先した設計",
    questionHint: "現状の質問はチケット専用に最適化されていないため、参考度は低めです。",
    flowHelperHint: "チケット専用設計ではありません",
    verificationHint: "規約、リセール可否、同行条件、日程負荷は必ず別途確認してください。",
    shortVerificationHint: "規約・リセール・同行条件は別途確認。",
    scopeDisclosure: "チケット判断は not now 扱いです。誤って強対応に見せないよう明示しています。",
    shortScopeDisclosure: "チケット判断は今は対象外です。",
    diagnosticsTag: "coverage_ticket_not_now",
  },
  not_now_travel: {
    key: "not_now_travel",
    supportLevel: "not_now",
    homepagePriority: "not_now",
    heroOrder: 2,
    shopperIntent: "遠征・宿・交通を含めて判断したい",
    recommendedEntryLabel: "遠征・旅行ごと判断したい",
    compactEntryHint: "物販判断とは別系統として扱っています。",
    providerEcologyHint: "遠征は物販判断より不確実性の種類が違うため、別系統の設計が必要です。",
    resultExplanationHint: "遠征判断は今の結果ロジックの対象外として扱います。",
    optimizationSummary: "物販系の判断軸を優先",
    questionHint: "移動・宿泊・複数イベント調整までは現行フローでは見ません。",
    flowHelperHint: "遠征判断は現行フロー外です",
    verificationHint: "交通費、宿泊費、キャンセル条件、体力負荷は専用に整理してください。",
    shortVerificationHint: "交通費・宿泊費・体力負荷は別整理を推奨。",
    scopeDisclosure: "遠征/旅行判断は今は対象外です。",
    shortScopeDisclosure: "遠征/旅行判断は今は対象外です。",
    diagnosticsTag: "coverage_travel_not_now",
  },
  not_now_3d_idol: {
    key: "not_now_3d_idol",
    supportLevel: "not_now",
    homepagePriority: "not_now",
    heroOrder: 3,
    shopperIntent: "3D idol 文脈に特化した購買判断をしたい",
    recommendedEntryLabel: "3D idol 文脈で判断したい",
    compactEntryHint: "現在の最適化対象外です。",
    providerEcologyHint: "現行の provider/flow は 2D・ACG 系 merch 想定が主で、文脈差を十分に吸収できません。",
    resultExplanationHint: "3D idol 特有の商流・イベント性は現在の最適化対象外です。",
    optimizationSummary: "現行の 2D・ACG 系物販判断を優先",
    questionHint: "現行フローは 3D idol 向けに明示最適化されていません。",
    flowHelperHint: "3D idol 専用最適化は未対応です",
    verificationHint: "特典商流や販売チャネル差は個別確認が必要です。",
    shortVerificationHint: "特典商流や販路差は個別確認が必要です。",
    scopeDisclosure: "3D idol 文脈は not now 扱いです。",
    shortScopeDisclosure: "3D idol 文脈は今は対象外です。",
    diagnosticsTag: "coverage_3d_idol_not_now",
  },
  not_now_kpop: {
    key: "not_now_kpop",
    supportLevel: "not_now",
    homepagePriority: "not_now",
    heroOrder: 4,
    shopperIntent: "K-pop 文脈で特典・輸入・共同購入を判断したい",
    recommendedEntryLabel: "K-pop 文脈で判断したい",
    compactEntryHint: "共同購入や輸入前提の判断は未対応です。",
    providerEcologyHint: "輸入、共同購入、特典商流の差が大きく、現行ロジックでは誤案内リスクがあります。",
    resultExplanationHint: "K-pop 特有の購入動線は今の重点対応外です。",
    optimizationSummary: "現行の国内物販寄り判断を優先",
    questionHint: "共同購入や輸入前提の判断は現行フローに含まれていません。",
    flowHelperHint: "共同購入や輸入前提は未対応です",
    verificationHint: "共同購入条件、輸入費、特典付与条件は必ず外部確認してください。",
    shortVerificationHint: "共同購入条件・輸入費は外部確認が必要です。",
    scopeDisclosure: "K-pop 文脈は now focus 外です。",
    shortScopeDisclosure: "K-pop 文脈は今は対象外です。",
    diagnosticsTag: "coverage_kpop_not_now",
  },
  not_now_niche_merchants: {
    key: "not_now_niche_merchants",
    supportLevel: "not_now",
    homepagePriority: "not_now",
    heroOrder: 5,
    shopperIntent: "対応外の niche 店舗まで含めて最適ルートを知りたい",
    recommendedEntryLabel: "対応外店舗まで含めて判断したい",
    compactEntryHint: "provider fit が見える店舗を優先しています。",
    providerEcologyHint: "プロダクト適合が薄い niche merchant は現状の provider 生態系に入れていません。",
    resultExplanationHint: "対応外店舗は、無理に推薦せず対象外として扱う方針です。",
    optimizationSummary: "provider fit が見える販路を優先",
    questionHint: "現行フローは provider fit が見える店舗を優先します。",
    flowHelperHint: "対応範囲の販路を優先しています",
    verificationHint: "専門店・個店は在庫・条件・送料を個別確認してください。",
    shortVerificationHint: "専門店・個店は条件を個別確認してください。",
    scopeDisclosure: "merchant fit が薄い領域は intentionally out of scope です。",
    shortScopeDisclosure: "provider fit が薄い販路は対象外です。",
    diagnosticsTag: "coverage_niche_not_now",
  },
};

const ENTRY_ORDER: ScenarioKey[] = [
  "preorder_decision",
  "used_market_check",
  "new_book_bonus_decision",
  "media_purchase_decision",
  "blind_draw_stopline",
  "exchange_path",
  "random_goods_completion",
  "collection_vs_budget",
  "impulse_cooling",
  "venue_limited_goods",
  "post_event_mailorder",
  "missed_onsite_recovery",
  "limited_goods_fomo",
  "not_now_ticket",
  "not_now_travel",
  "not_now_3d_idol",
  "not_now_kpop",
  "not_now_niche_merchants",
];

export type EntryCoverageGroups = {
  primaryStrong: ScenarioCoverageEntry[];
  secondaryStrong: ScenarioCoverageEntry[];
  partial: ScenarioCoverageEntry[];
  notNow: ScenarioCoverageEntry[];
};

function getOrderedCoverageEntries(): ScenarioCoverageEntry[] {
  return ENTRY_ORDER.map(getScenarioCoverageEntry).sort((left, right) => {
    if (left.heroOrder !== right.heroOrder) return left.heroOrder - right.heroOrder;
    return ENTRY_ORDER.indexOf(left.key) - ENTRY_ORDER.indexOf(right.key);
  });
}

function hasBonusSignals(parsedSearchClues?: ParsedSearchClues, searchClueRaw?: string): boolean {
  if (parsedSearchClues?.bonusClues.length || parsedSearchClues?.editionClues.length) return true;
  const raw = `${parsedSearchClues?.raw ?? ""} ${searchClueRaw ?? ""}`;
  return ["特典", "店舗特典", "有償特典", "新刊", "新譜", "限定版"].some((keyword) => raw.includes(keyword));
}

function hasMediaSignals(parsedSearchClues?: ParsedSearchClues): boolean {
  return Boolean(parsedSearchClues?.itemTypeCandidates.some((candidate) => candidate === "CD" || candidate === "Blu-ray"));
}

function hasCollectionSignals(input: ScenarioResolutionInput): boolean {
  const goal = input.answers?.q_goal;
  const motives = Array.isArray(input.answers?.q_motives_multi) ? input.answers?.q_motives_multi : [];
  return goal === "set" || motives?.includes("complete") || input.goodsClass === "itabag_badge";
}

function resolveRandomGoodsTargetStyle(input: ScenarioResolutionInput): "one_or_few" | "full_set" | "fun_casual" | "mixed" | "unknown" {
  if (input.answers?.q_goal === "fun") return "fun_casual";
  if (input.answers?.q_goal === "set") return "full_set";
  if (input.answers?.q_goal === "single") return "one_or_few";

  const blindDrawExit = input.answers?.q_addon_blind_draw_exit;
  if (blindDrawExit === "complete") return "full_set";
  if (blindDrawExit === "oshi_only") return "one_or_few";
  if (blindDrawExit === "mixed") return "mixed";
  if (blindDrawExit === "fun") return "fun_casual";
  return "unknown";
}

function hasExchangePathSignals(input: ScenarioResolutionInput): boolean {
  const tradeIntent = input.answers?.q_addon_blind_draw_trade_intent;
  const exchangeFriction = input.answers?.q_addon_blind_draw_exchange_friction;
  return (
    (tradeIntent === "yes" || tradeIntent === "maybe") &&
    exchangeFriction !== "high" &&
    exchangeFriction !== "unknown"
  );
}

function hasRandomGoodsCompletionSignals(input: ScenarioResolutionInput): boolean {
  const targetStyle = resolveRandomGoodsTargetStyle(input);
  const duplicateTolerance = input.answers?.q_addon_blind_draw_duplicate_tolerance;
  const singlesFallback = input.answers?.q_addon_blind_draw_single_fallback;
  const stopBudget = input.answers?.q_addon_blind_draw_stop_budget;
  return (
    targetStyle === "full_set" ||
    singlesFallback === "now" ||
    singlesFallback === "after_stop" ||
    duplicateTolerance === "low" ||
    stopBudget === "over_limit"
  );
}


function hasVenueKeyword(raw?: string): boolean {
  if (!raw) return false;
  return ["会場限定", "イベント限定", "会場先行", "現地限定", "現地販売", "会場物販", "会場グッズ", "事後通販", "事後受注"].some((keyword) => raw.includes(keyword));
}

function getVenueContextAnswer(input: ScenarioResolutionInput): string | undefined {
  const value = input.answers?.q_addon_goods_event_limit_context;
  return typeof value === "string" ? value : undefined;
}

function hasVenueLimitedSignals(input: ScenarioResolutionInput): boolean {
  const answer = getVenueContextAnswer(input);
  if (answer && answer !== "none" && answer !== "unknown") return true;
  return hasVenueKeyword(input.parsedSearchClues?.raw) || hasVenueKeyword(input.parsedSearchClues?.normalized) || hasVenueKeyword(input.searchClueRaw);
}

function hasRecoverySignals(input: ScenarioResolutionInput): boolean {
  const answer = getVenueContextAnswer(input);
  if (answer === "missed_onsite") return true;
  return [input.answers?.q_addon_goods_post_event_mailorder, input.answers?.q_addon_goods_used_fallback].some((value) => typeof value === "string" && value !== "unknown");
}

function hasFomoClampSignals(input: ScenarioResolutionInput): boolean {
  const scarcity = input.answers?.q_addon_goods_scarcity_pressure;
  const regretAxis = input.answers?.q_addon_goods_regret_axis;
  const motives = Array.isArray(input.answers?.q_motives_multi) ? input.answers?.q_motives_multi : [];
  return hasVenueLimitedSignals(input) && (scarcity === "high" || motives.includes("fomo") || regretAxis === "overpay_more");
}

function hasImpulseSignals(input: ScenarioResolutionInput): boolean {
  const state = input.answers?.q_regret_impulse;
  return state === "excited" || state === "tired" || state === "fomo";
}

export function resolveScenarioKey(input: ScenarioResolutionInput): ScenarioKey {
  if (input.itemKind === "ticket") return "not_now_ticket";
  if (input.itemKind === "used") return "used_market_check";
  if (input.itemKind === "blind_draw") {
    if (hasExchangePathSignals(input)) return "exchange_path";
    if (hasRandomGoodsCompletionSignals(input)) return "random_goods_completion";
    return "blind_draw_stopline";
  }
  if (hasVenueLimitedSignals(input)) {
    if (getVenueContextAnswer(input) === "missed_onsite") return "missed_onsite_recovery";
    if (input.answers?.q_addon_goods_post_event_mailorder === "likely" || input.answers?.q_addon_goods_post_event_mailorder === "maybe") {
      return "post_event_mailorder";
    }
    if (hasFomoClampSignals(input)) return "limited_goods_fomo";
    return "venue_limited_goods";
  }
  if (hasRecoverySignals(input)) return "missed_onsite_recovery";
  if (
    input.goodsClass === "paper" &&
    (input.itemKind === "preorder" || input.itemKind === "goods" || hasBonusSignals(input.parsedSearchClues, input.searchClueRaw))
  ) {
    return "new_book_bonus_decision";
  }
  if (input.itemKind === "preorder") return "preorder_decision";
  if (input.goodsClass === "media" || hasMediaSignals(input.parsedSearchClues)) return "media_purchase_decision";
  if (hasCollectionSignals(input)) return "collection_vs_budget";
  if (hasImpulseSignals(input) || input.itemKind === "game_billing") return "impulse_cooling";
  return "collection_vs_budget";
}

export function getScenarioCoverageEntry(key: ScenarioKey): ScenarioCoverageEntry {
  return SCENARIO_COVERAGE_MAP[key];
}

export function getScenarioCoverageSummary(input: ScenarioResolutionInput): ScenarioCoverageSummary {
  const entry = getScenarioCoverageEntry(resolveScenarioKey(input));
  return {
    key: entry.key,
    supportLevel: entry.supportLevel,
    recommendedEntryLabel: entry.recommendedEntryLabel,
    shopperIntent: entry.shopperIntent,
    compactEntryHint: entry.compactEntryHint,
    providerEcologyHint: entry.providerEcologyHint,
    resultExplanationHint: entry.resultExplanationHint,
    optimizationSummary: entry.optimizationSummary,
    questionHint: entry.questionHint,
    flowHelperHint: entry.flowHelperHint,
    verificationHint: entry.verificationHint,
    shortVerificationHint: entry.shortVerificationHint,
    scopeDisclosure: entry.scopeDisclosure,
    shortScopeDisclosure: entry.shortScopeDisclosure,
    diagnosticsTag: entry.diagnosticsTag,
  };
}

export function getEntryCoverageGroups(): EntryCoverageGroups {
  const entries = getOrderedCoverageEntries();
  return {
    primaryStrong: entries.filter((entry) => entry.homepagePriority === "primary"),
    secondaryStrong: entries.filter((entry) => entry.homepagePriority === "secondary"),
    partial: entries.filter((entry) => entry.homepagePriority === "partial"),
    notNow: entries.filter((entry) => entry.homepagePriority === "not_now"),
  };
}

export function getCoveragePreset(entryKey: ScenarioKey): Pick<InputMeta, "itemKind" | "goodsClass"> {
  const entry = getScenarioCoverageEntry(entryKey);
  if (entry.key === "new_book_bonus_decision") {
    return { itemKind: "goods", goodsClass: "paper" };
  }
  if (entry.key === "media_purchase_decision") {
    return { itemKind: "goods", goodsClass: "media" };
  }
  if (
    entry.key === "collection_vs_budget" ||
    entry.key === "impulse_cooling" ||
    entry.key === "venue_limited_goods" ||
    entry.key === "post_event_mailorder" ||
    entry.key === "missed_onsite_recovery" ||
    entry.key === "limited_goods_fomo"
  ) {
    return { itemKind: "goods", goodsClass: "small_collection" };
  }
  if (entry.key === "exchange_path" || entry.key === "random_goods_completion") {
    return { itemKind: "blind_draw", goodsClass: "small_collection" };
  }
  return { itemKind: entry.itemKind ?? "goods", goodsClass: entry.goodsClass ?? "small_collection" };
}

export function getSupportLevelBadgeLabel(level: ScenarioSupportLevel): string {
  if (level === "strong") return "強めに対応";
  if (level === "partial") return "一部対応";
  return "今は対象外";
}
