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
  | "multi_edition_media"
  | "limited_vs_standard_media"
  | "full_set_pressure"
  | "used_market_completion"
  | "single_vs_set_decision"
  | "completion_pressure_refinement"
  | "missed_item_hole_filling"
  | "motive_refined_explanation"
  | "mixed_media_random_goods"
  | "store_bonus_collection"
  | "multi_store_bonus_split"
  | "new_book_bonus_decision"
  | "collection_vs_budget"
  | "impulse_cooling"
  | "venue_limited_goods"
  | "post_event_mailorder"
  | "missed_onsite_recovery"
  | "limited_goods_fomo"
  | "mixed_media_live_goods"
  | "cast_live_goods_followup"
  | "bonus_pressure_followup"
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
    shopperIntent: "CD・映像・書籍を今買うか、比較して決めたい（VT メディアを含む）",
    recommendedEntryLabel: "CD・映像・書籍を買うべきか迷う",
    compactEntryHint: "仕様差・特典差・再生環境を比較できます。VT の CD / BD / 書籍もこの枠です。",
    providerEcologyHint: "メディア系は再生/閲覧環境、特典差、限定版、再入手性の比較が中心です。VT 文脈も既存メディア provider の範囲で扱います。",
    resultExplanationHint: "保存・視聴・特典のバランスを見て、どこに価値があるかを説明します。VT でも診断の軸はメディア差分確認のままです。",
    optimizationSummary: "仕様差・特典差・使い道のバランス",
    questionHint: "このフローでは、視聴環境・限定版圧・中身目的か特典目的かをはっきりさせます。",
    flowHelperHint: "仕様差と特典の優先度を確認中",
    verificationHint: "仕様違い、店舗別特典、視聴環境、在庫状況は外部で最終確認してください。VT の CD / BD / 書籍でも、版違い・法人特典・初回条件の確認が重要です。",
    shortVerificationHint: "仕様差・法人/店舗特典・在庫は外部で最終確認。",
    scopeDisclosure: "メディア購入判断は強めで、VT の CD / BD / 書籍も既存 media 枠で扱います。一方でチケット、遠征、会員/サブスク、スパチャ、ボイス系デジタル商品は対象外です。",
    shortScopeDisclosure: "VT は CD / BD / 書籍のみ media 枠で対応。チケット・遠征・会員/スパチャ・ボイスは対象外です。",
    diagnosticsTag: "coverage_media_strong",
  },
  multi_edition_media: {
    key: "multi_edition_media",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "primary",
    heroOrder: 4,
    shopperIntent: "複数版のある CD / BD / 映像作品をどこまで買うか整理したい",
    recommendedEntryLabel: "複数版メディアをどこまで買うか整理したい",
    compactEntryHint: "1種で十分か、限定版が妥当か、全版追いかを分けます。",
    providerEcologyHint: "複数版メディアは仕様差・限定版・推しバージョンの relevance を見つつ、一般ECと専門店の役割を分けます。",
    resultExplanationHint: "版違いの価値とコンプ圧を切り分け、どこまで買うのが合理的か説明します。",
    optimizationSummary: "複数版の価値とコンプ圧の切り分け",
    questionHint: "このフローでは、キャラ/演者 motive、単推しか箱推しか、版違い ambition を確認します。",
    flowHelperHint: "複数版の relevance と買い分けを整理中",
    verificationHint: "収録差・封入差・店舗別特典・在庫は外部で最終確認してください。",
    shortVerificationHint: "仕様差・特典差・在庫は外部で最終確認。",
    scopeDisclosure: "複数版メディア判断は強め対応ですが、多店舗特典の完全回収計画までは対象外です。",
    shortScopeDisclosure: "複数版メディア判断は強め対応。多店舗特典完走は対象外。",
    diagnosticsTag: "coverage_multi_edition_media_strong",
  },
  limited_vs_standard_media: {
    key: "limited_vs_standard_media",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 5,
    shopperIntent: "通常版で十分か、限定版に意味があるかを整理したい",
    recommendedEntryLabel: "通常版か限定版かを整理したい",
    compactEntryHint: "限定版の relevance と bonus pressure を分けて見ます。",
    providerEcologyHint: "限定版判断では HMV・Gamers などの specialty と Amazon の安定入手を使い分けます。",
    resultExplanationHint: "限定版の必要性は認めつつ、何となくの版違い追いを抑える説明を優先します。",
    optimizationSummary: "通常版と限定版の best fit を見つける",
    questionHint: "このフローでは、限定版が必要な根拠と 1種で満足できるかを見ます。",
    flowHelperHint: "通常版/限定版の best fit を整理中",
    verificationHint: "限定版の中身差、封入物、店舗差、再入手性は外部で確認してください。",
    shortVerificationHint: "限定版の中身差・店舗差は外部確認。",
    scopeDisclosure: "限定版判断には対応しますが、全店舗 bonus の総当たり比較は対象外です。",
    shortScopeDisclosure: "限定版判断に対応。全店舗 bonus 総当たりは対象外。",
    diagnosticsTag: "coverage_limited_vs_standard_media_strong",
  },
  full_set_pressure: {
    key: "full_set_pressure",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 6,
    shopperIntent: "全版追いが本当に必要か、それともコンプ圧か整理したい",
    recommendedEntryLabel: "全版追いが必要か整理したい",
    compactEntryHint: "単推し・予算・ completeness motive の整合を見る診断です。",
    providerEcologyHint: "ここでは provider 比較より、全版追いを正当化できる条件の見極めが中心です。",
    resultExplanationHint: "全版追いが rational な条件と、 pressure を clamp した方がよい条件を分けます。",
    optimizationSummary: "全版追いの妥当性と clamp 条件を見極める",
    questionHint: "このフローでは、箱推しか、 completeness をどこまで優先するか、予算が追いつくかを見ます。",
    flowHelperHint: "全版追いの妥当性を確認中",
    verificationHint: "全版購入時の総額、収録差、特典差、後から満足できるかを外部情報込みで確認してください。",
    shortVerificationHint: "総額・収録差・特典差は外部確認。",
    scopeDisclosure: "全版追いの診断には対応しますが、中古 completion の本格最適化までは含みません。",
    shortScopeDisclosure: "全版追い診断に対応。中古 completion 最適化は対象外。",
    diagnosticsTag: "coverage_full_set_pressure_strong",
  },
  used_market_completion: {
    key: "used_market_completion",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 6,
    shopperIntent: "初動で抱え込まず、後から中古・二次流通で欠けを埋めるか整理したい",
    recommendedEntryLabel: "あとで穴埋め回収する前提で整理したい",
    compactEntryHint: "今すぐ抱え込むか、後から穴埋めするかを分けます。",
    providerEcologyHint: "Mercari・駿河屋は穴埋め recovery の補助先として扱い、新品導線を置き換える前提にはしません。",
    resultExplanationHint: "後追い recovery を使うなら、価格・状態・在庫の不確実さも含めて慎重に説明します。",
    optimizationSummary: "初動の抱え込みを減らし、後追い recovery を慎重に使う",
    questionHint: "このフローでは、後から埋める意思と二次流通への抵抗感を先に確認します。",
    flowHelperHint: "後追い穴埋めが本当に合うかを確認中",
    verificationHint: "中古価格、状態、送料込み総額、出品説明は外部で最終確認してください。",
    shortVerificationHint: "中古価格・状態・送料込み総額は外部確認。",
    scopeDisclosure: "中古穴埋めの判断整理は強め対応ですが、真贋や適正価格の保証はしません。",
    shortScopeDisclosure: "中古穴埋め整理は強め対応。真贋/価格保証はしません。",
    diagnosticsTag: "coverage_used_market_completion_strong",
  },
  single_vs_set_decision: {
    key: "single_vs_set_decision",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 6,
    shopperIntent: "1点で止めるか、選抜回収か、セットに行くかを整理したい",
    recommendedEntryLabel: "1点/選抜回収/フルセットを整理したい",
    compactEntryHint: "single と set の満足線を分けて見ます。",
    providerEcologyHint: "provider より先に、1点で十分か、選抜回収が妥当か、フルセット reward があるかを見ます。",
    resultExplanationHint: "何を最適化して 1点/選抜/フルセットを勧めるかを明示します。",
    optimizationSummary: "single と set の満足差を整理する",
    questionHint: "このフローでは、1点で止まれるか、全部そろわなくても満足できるかを確認します。",
    flowHelperHint: "single と set の満足線を整理中",
    verificationHint: "版差、セット報酬、収納特典、総額差は外部で最終確認してください。",
    shortVerificationHint: "版差・セット報酬・総額差は外部確認。",
    scopeDisclosure: "single/set 判断は強め対応ですが、新カテゴリの収集文化までは広げません。",
    shortScopeDisclosure: "single/set 判断は強め対応。新カテゴリ拡張はしません。",
    diagnosticsTag: "coverage_single_vs_set_strong",
  },
  completion_pressure_refinement: {
    key: "completion_pressure_refinement",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 7,
    shopperIntent: "揃えたい圧が価値由来か anxiety 由来かを整理したい",
    recommendedEntryLabel: "コンプ圧の正体を整理したい",
    compactEntryHint: "completion burden と reward の差を見ます。",
    providerEcologyHint: "provider 比較より、completion pressure を clamp する根拠を優先します。",
    resultExplanationHint: "コンプ圧が意味のある回収か、 anxiety 寄りかを分けて説明します。",
    optimizationSummary: "completion anxiety と実利を切り分ける",
    questionHint: "このフローでは、揃えたい圧の正体とセット報酬の実体を確認します。",
    flowHelperHint: "completion pressure の根拠を確認中",
    verificationHint: "セット報酬の有無、版差、総額、保存負担は外部で最終確認してください。",
    shortVerificationHint: "セット報酬・版差・総額は外部確認。",
    scopeDisclosure: "コンプ圧整理は強め対応ですが、心理評価を万能診断として扱うものではありません。",
    shortScopeDisclosure: "コンプ圧整理は強め対応。万能心理診断ではありません。",
    diagnosticsTag: "coverage_completion_pressure_refinement_strong",
  },
  missed_item_hole_filling: {
    key: "missed_item_hole_filling",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 7,
    shopperIntent: "取り逃しや欠けを、あとで安全寄りに埋めるか整理したい",
    recommendedEntryLabel: "取り逃し/欠けをあとで埋めるか整理したい",
    compactEntryHint: "初動 overspend ではなく穴埋め戦略を出します。",
    providerEcologyHint: "Mercari・駿河屋は missing-item recovery の補助線として上がりますが、保証つき主導線としては扱いません。",
    resultExplanationHint: "いま無理に抱えず、後から穴埋めする方がよい時を説明します。",
    optimizationSummary: "missing-item recovery を慎重に使う",
    questionHint: "このフローでは、後追い回収 willingness と二次流通の許容度を確認します。",
    flowHelperHint: "missing-item recovery の筋を確認中",
    verificationHint: "相場、送料、状態差、説明文は外部で最終確認してください。",
    shortVerificationHint: "相場・送料・状態差は外部確認。",
    scopeDisclosure: "穴埋め回収には強め対応ですが、公平価格や真贋の保証は対象外です。",
    shortScopeDisclosure: "穴埋め回収は強め対応。価格/真贋保証は対象外。",
    diagnosticsTag: "coverage_missed_item_hole_filling_strong",
  },
  motive_refined_explanation: {
    key: "motive_refined_explanation",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 8,
    shopperIntent: "キャラ寄り/演者寄り、単推し/箱推しの違いを説明に反映したい",
    recommendedEntryLabel: "推し方の違いを説明に反映して整理したい",
    compactEntryHint: "character vs cast と one-oshi vs box を説明軸に使います。",
    providerEcologyHint: "provider routing の主軸ではなく、なぜ single/set が合うかの説明精度を上げるための軸です。",
    resultExplanationHint: "character vs cast、one-oshi vs box を hard rule にしすぎず説明へ反映します。",
    optimizationSummary: "motive explanation の精度を上げる",
    questionHint: "このフローでは、キャラ/演者 motive と単推し/箱推しの向きを確認します。",
    flowHelperHint: "motive explanation の軸を整理中",
    verificationHint: "版差・出演差・推し分だけで満足できるかは外部情報とあわせて確認してください。",
    shortVerificationHint: "版差・出演差・推し分満足線は外部確認。",
    scopeDisclosure: "motive 軸は説明補助です。 universal law として固定するものではありません。",
    shortScopeDisclosure: "motive 軸は説明補助。 universal law ではありません。",
    diagnosticsTag: "coverage_motive_refined_explanation_strong",
  },
  mixed_media_random_goods: {
    key: "mixed_media_random_goods",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 7,
    shopperIntent: "複数版メディア判断と一緒にランダム特典/付随グッズの止めどきも整理したい",
    recommendedEntryLabel: "複数版メディア + ランダム特典の止めどきを整理したい",
    compactEntryHint: "メディア診断に stop-line addon を重ねます。",
    providerEcologyHint: "主軸はメディア provider のまま、ランダム要素は stop-line 診断として添える構成です。",
    resultExplanationHint: "版違い判断を主軸にしつつ、ランダム特典側は既存の停止線ロジックで clamp します。",
    optimizationSummary: "メディア判断を主軸にランダム stop-line を併設",
    questionHint: "このフローでは、版違い判断に加えて、ランダム特典の撤退ラインも追加で確認します。",
    flowHelperHint: "複数版メディアとランダム addon を整理中",
    verificationHint: "ランダム特典の封入条件、上限、交換前提、相場は外部確認すると安定します。",
    shortVerificationHint: "ランダム特典条件・上限・相場は外部確認。",
    scopeDisclosure: "ランダム addon は既存の stop-line 整理を再利用します。イベント goods や中古 completion の本格拡張は対象外です。",
    shortScopeDisclosure: "メディア+ランダム addon に対応。後続フェーズの拡張は対象外。",
    diagnosticsTag: "coverage_mixed_media_random_goods_strong",
  },
  store_bonus_collection: {
    key: "store_bonus_collection",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 8,
    shopperIntent: "店舗別 bonus の圧で複数店舗を追うべきか整理したい",
    recommendedEntryLabel: "店舗別 bonus をどこまで追うか整理したい",
    compactEntryHint: "1店舗最適化と all-bonus 圧を分けて見ます。",
    providerEcologyHint: "HMV・Gamers などの specialty を軸にしつつ、bonus の重要度が弱い時は 1店舗最適化へ寄せます。",
    resultExplanationHint: "商品価値と店舗 bonus 圧を切り分けて、1店舗で十分かどうかを説明します。",
    optimizationSummary: "商品価値を残しつつ店舗 bonus 圧を整理",
    questionHint: "このフローでは、bonus が本体か・1店舗で満足できるか・比較疲れしそうかを見ます。",
    flowHelperHint: "店舗別 bonus 圧と 1店舗最適化を整理中",
    verificationHint: "各店舗の bonus 条件、対象版、送料、締切は外部で最終確認してください。",
    shortVerificationHint: "店舗 bonus 条件・送料・締切は外部確認。",
    scopeDisclosure: "mixed-media の店舗別 bonus 圧には強め対応しますが、全店舗完全回収の最適化は対象外です。",
    shortScopeDisclosure: "店舗別 bonus 圧には強め対応。全店舗完走最適化は対象外。",
    diagnosticsTag: "coverage_store_bonus_collection_strong",
  },
  multi_store_bonus_split: {
    key: "multi_store_bonus_split",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 9,
    shopperIntent: "複数店舗 split order が本当に見合うか整理したい",
    recommendedEntryLabel: "複数店舗 split order が見合うか整理したい",
    compactEntryHint: "送料・管理負担・後悔を込みで multi-store chase を見ます。",
    providerEcologyHint: "bonus specialty は残しつつ、split order の負担が高い時は 1店舗に clamp します。",
    resultExplanationHint: "bonus 差より split order burden が重い時は、明示的に multi-store chase を弱めます。",
    optimizationSummary: "multi-store chase と split order burden のバランス",
    questionHint: "このフローでは、複数注文の許容度・送料増・取りこぼしストレスを確認します。",
    flowHelperHint: "multi-store split の妥当性を確認中",
    verificationHint: "各店舗の同梱条件、送料、発売日差、注文管理負担は外部で再確認してください。",
    shortVerificationHint: "同梱条件・送料・発売日差は外部確認。",
    scopeDisclosure: "複数店舗 split の妥当性には対応しますが、実際の在庫取り回し最適化まではしません。",
    shortScopeDisclosure: "split 判断に対応。在庫取り回し最適化は対象外。",
    diagnosticsTag: "coverage_multi_store_bonus_split_strong",
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
  mixed_media_live_goods: {
    key: "mixed_media_live_goods",
    itemKind: "goods",
    goodsClass: "small_collection",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 12,
    shopperIntent: "mixed-media の live / venue goods を今買うべきか整理したい",
    recommendedEntryLabel: "mixed-media の live / 会場グッズを今買うか整理したい",
    compactEntryHint: "core motive と event atmosphere を分けて見ます。",
    providerEcologyHint: "live goods はまず motive と follow-up plausibility を見て、一般ECを急がせすぎない方針です。",
    resultExplanationHint: "event の空気だけでなく、後から残る価値と follow-up 余地を分けて説明します。",
    optimizationSummary: "live goods の durable value と event pressure の切り分け",
    questionHint: "このフローでは、後からも意味が残る品か・待てるか・取り逃しと overpay のどちらが重いかを見ます。",
    flowHelperHint: "live goods の motive と follow-up 余地を整理中",
    verificationHint: "公式 follow-up 告知、販売条件、購入制限、後日通販例は外部で確認してください。",
    shortVerificationHint: "follow-up 告知・販売条件は外部確認。",
    scopeDisclosure: "mixed-media の live goods 判断には対応しますが、参加・遠征・チケット判断は対象外です。",
    shortScopeDisclosure: "live goods 判断に対応。参加/遠征/チケットは対象外。",
    diagnosticsTag: "coverage_mixed_media_live_goods_strong",
  },
  cast_live_goods_followup: {
    key: "cast_live_goods_followup",
    itemKind: "goods",
    goodsClass: "small_collection",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 13,
    shopperIntent: "キャスト/音楽文脈の live goods を follow-up 待ちできるか整理したい",
    recommendedEntryLabel: "cast-live goods の follow-up を待つべきか整理したい",
    compactEntryHint: "cast attachment は尊重しつつ、follow-up plausibility を強めに見ます。",
    providerEcologyHint: "follow-up 待ちが plausible な時は公式寄り確認を優先し、中古 fallback の出しすぎを避けます。",
    resultExplanationHint: "キャスト愛着がある場合でも、follow-up の見込みがあるなら urgency を下げて説明します。",
    optimizationSummary: "cast attachment を残しつつ follow-up 余地を評価",
    questionHint: "このフローでは、キャスト愛着の強さと、最初の窓を逃しても平気かを確認します。",
    flowHelperHint: "cast-live goods の follow-up 可否を確認中",
    verificationHint: "follow-up 告知の有無、例年傾向、売り切れ後の再案内は外部で確認してください。",
    shortVerificationHint: "follow-up 告知・例年傾向は外部確認。",
    scopeDisclosure: "cast-live goods の follow-up 判断に対応しますが、参加/整理券計画は対象外です。",
    shortScopeDisclosure: "cast-live follow-up 判断に対応。参加計画は対象外。",
    diagnosticsTag: "coverage_cast_live_goods_followup_strong",
  },
  bonus_pressure_followup: {
    key: "bonus_pressure_followup",
    itemKind: "goods",
    goodsClass: "small_collection",
    supportLevel: "strong",
    homepagePriority: "secondary",
    heroOrder: 14,
    shopperIntent: "live 後の bonus / FOMO 圧から一歩引くべきか整理したい",
    recommendedEntryLabel: "bonus / FOMO 圧から一歩引くべきか整理したい",
    compactEntryHint: "本当の scarcity と bonus inflation を分けます。",
    providerEcologyHint: "ここでは販売先の多さより、follow-up plausibility と mood-driven pressure の切り分けを優先します。",
    resultExplanationHint: "限定感や bonus 圧が recommendation をどの程度歪めているかを説明します。",
    optimizationSummary: "bonus inflation と true scarcity の識別",
    questionHint: "このフローでは、あとからも欲しいか・待てるか・その場の空気に押されていないかを見ます。",
    flowHelperHint: "bonus/FOMO 圧の根拠を確認中",
    verificationHint: "限定表記、follow-up 告知、販売条件、相場の急騰根拠は外部で確認してください。",
    shortVerificationHint: "限定表記・follow-up 告知は外部確認。",
    scopeDisclosure: "bonus/FOMO の整理には対応しますが、used-market 完全最適化は対象外です。",
    shortScopeDisclosure: "bonus/FOMO 整理に対応。used-market 最適化は対象外。",
    diagnosticsTag: "coverage_bonus_pressure_followup_strong",
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
  "multi_edition_media",
  "limited_vs_standard_media",
  "full_set_pressure",
  "used_market_completion",
  "single_vs_set_decision",
  "completion_pressure_refinement",
  "missed_item_hole_filling",
  "motive_refined_explanation",
  "mixed_media_random_goods",
  "store_bonus_collection",
  "multi_store_bonus_split",
  "blind_draw_stopline",
  "exchange_path",
  "random_goods_completion",
  "collection_vs_budget",
  "impulse_cooling",
  "venue_limited_goods",
  "post_event_mailorder",
  "missed_onsite_recovery",
  "limited_goods_fomo",
  "mixed_media_live_goods",
  "cast_live_goods_followup",
  "bonus_pressure_followup",
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
  return Boolean(parsedSearchClues?.itemTypeCandidates.some((candidate) => candidate === "CD" || candidate === "Blu-ray" || candidate === "書籍"));
}

function hasMediaEditionSignals(input: ScenarioResolutionInput): boolean {
  return (
    input.answers?.q_addon_media_edition_intent != null ||
    input.answers?.q_addon_media_single_vs_set_intent != null ||
    input.answers?.q_addon_media_completion_satisfaction != null ||
    input.answers?.q_addon_media_member_version != null ||
    input.answers?.q_addon_media_bonus_importance != null ||
    input.answers?.q_addon_media_multi_store_tolerance != null ||
    Boolean(input.parsedSearchClues?.editionClues.length)
  );
}

function hasUsedMarketCompletionSignals(input: ScenarioResolutionInput): boolean {
  const recovery = input.answers?.q_addon_media_used_market_recovery;
  const comfort = input.answers?.q_addon_media_used_market_comfort;
  return recovery === "wait_and_patch" || recovery === "reference_only" || comfort === "high" || comfort === "medium" || comfort === "reference_only";
}

function hasSingleVsSetSignals(input: ScenarioResolutionInput): boolean {
  const intent = input.answers?.q_addon_media_single_vs_set_intent;
  const satisfaction = input.answers?.q_addon_media_completion_satisfaction;
  return intent != null || satisfaction != null;
}

function hasCompletionPressureRefinementSignals(input: ScenarioResolutionInput): boolean {
  const pressureType = input.answers?.q_addon_media_completion_pressure_type;
  const rewardStrength = input.answers?.q_addon_media_set_reward_strength;
  return pressureType != null || rewardStrength != null;
}

function hasMotiveRefinedExplanationSignals(input: ScenarioResolutionInput): boolean {
  return input.answers?.q_addon_media_motive != null || input.answers?.q_addon_media_support_scope != null;
}

function hasStoreBonusCollectionSignals(input: ScenarioResolutionInput): boolean {
  const bonusImportance = input.answers?.q_addon_media_bonus_importance;
  const storeTolerance = input.answers?.q_addon_media_multi_store_tolerance;
  return (
    input.goodsClass === "media" &&
    (bonusImportance === "medium" ||
      bonusImportance === "high" ||
      storeTolerance === "compare_then_one" ||
      storeTolerance === "multi_store_considered" ||
      storeTolerance === "all_bonuses_or_bust" ||
      hasBonusSignals(input.parsedSearchClues, input.searchClueRaw))
  );
}

function hasMultiStoreSplitSignals(input: ScenarioResolutionInput): boolean {
  const storeTolerance = input.answers?.q_addon_media_multi_store_tolerance;
  const splitBurden = input.answers?.q_addon_media_split_order_burden;
  return (
    input.goodsClass === "media" &&
    (storeTolerance === "multi_store_considered" ||
      storeTolerance === "all_bonuses_or_bust" ||
      splitBurden === "high" ||
      splitBurden === "medium")
  );
}

function hasMixedMediaRandomGoodsSignals(input: ScenarioResolutionInput): boolean {
  return input.answers?.q_addon_media_random_goods_intent === "present";
}

function hasFullSetPressureSignals(input: ScenarioResolutionInput): boolean {
  const editionIntent = input.answers?.q_addon_media_edition_intent;
  const supportScope = input.answers?.q_addon_media_support_scope;
  const collectionBudget = input.answers?.q_addon_media_collection_budget;
  const memberVersion = input.answers?.q_addon_media_member_version;
  return (
    editionIntent === "all_editions" ||
    collectionBudget === "complete" ||
    memberVersion === "multiple_versions" ||
    (supportScope === "box_group" && editionIntent === "limited_preferred")
  );
}

function hasLimitedVsStandardSignals(input: ScenarioResolutionInput): boolean {
  const editionIntent = input.answers?.q_addon_media_edition_intent;
  return (
    editionIntent === "standard_only" ||
    editionIntent === "limited_preferred" ||
    editionIntent === "one_best_fit" ||
    Boolean(input.parsedSearchClues?.editionClues.length)
  );
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

function hasMixedMediaLiveGoodsSignals(input: ScenarioResolutionInput): boolean {
  const liveGoodsMotive = input.answers?.q_addon_goods_live_goods_motive;
  const motives = Array.isArray(input.answers?.q_motives_multi) ? input.answers?.q_motives_multi : [];
  return hasVenueLimitedSignals(input) && (liveGoodsMotive != null || motives.includes("seiyuu_cast") || motives.includes("memory"));
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
  if (input.goodsClass === "media" || hasMediaSignals(input.parsedSearchClues)) {
    if (hasMixedMediaRandomGoodsSignals(input)) return "mixed_media_random_goods";
    if (hasMultiStoreSplitSignals(input)) return "multi_store_bonus_split";
    if (hasStoreBonusCollectionSignals(input)) return "store_bonus_collection";
    if (input.answers?.q_addon_media_used_market_recovery === "wait_and_patch") return "missed_item_hole_filling";
    if (hasUsedMarketCompletionSignals(input)) return "used_market_completion";
    if (hasSingleVsSetSignals(input)) return "single_vs_set_decision";
    if (hasFullSetPressureSignals(input)) return "full_set_pressure";
    if (hasCompletionPressureRefinementSignals(input)) return "completion_pressure_refinement";
    if (hasLimitedVsStandardSignals(input)) return "limited_vs_standard_media";
    if (hasMotiveRefinedExplanationSignals(input)) return "motive_refined_explanation";
    if (hasMediaEditionSignals(input)) return "multi_edition_media";
    return "media_purchase_decision";
  }
  if (hasMixedMediaLiveGoodsSignals(input)) {
    if (input.answers?.q_addon_goods_post_event_mailorder === "likely" || input.answers?.q_addon_goods_post_event_mailorder === "maybe") {
      return "cast_live_goods_followup";
    }
    if (input.answers?.q_addon_goods_live_goods_motive === "event_atmosphere" || hasFomoClampSignals(input)) {
      return "bonus_pressure_followup";
    }
    return "mixed_media_live_goods";
  }
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
    entry.key === "multi_edition_media" ||
    entry.key === "limited_vs_standard_media" ||
    entry.key === "full_set_pressure" ||
    entry.key === "mixed_media_random_goods" ||
    entry.key === "store_bonus_collection" ||
    entry.key === "multi_store_bonus_split"
  ) {
    return { itemKind: "goods", goodsClass: "media" };
  }
  if (
    entry.key === "collection_vs_budget" ||
    entry.key === "impulse_cooling" ||
    entry.key === "venue_limited_goods" ||
    entry.key === "post_event_mailorder" ||
    entry.key === "missed_onsite_recovery" ||
    entry.key === "limited_goods_fomo" ||
    entry.key === "mixed_media_live_goods" ||
    entry.key === "cast_live_goods_followup" ||
    entry.key === "bonus_pressure_followup"
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
