import type { AnswerValue, GoodsClass, InputMeta, ItemKind } from "@/src/oshihapi/model";
import type { ParsedSearchClues } from "@/src/oshihapi/input/types";

export type ScenarioSupportLevel = "strong" | "partial" | "not_now";

export type ScenarioKey =
  | "preorder_decision"
  | "used_market_check"
  | "blind_draw_stopline"
  | "media_purchase_decision"
  | "new_book_bonus_decision"
  | "collection_vs_budget"
  | "impulse_cooling"
  | "not_now_ticket"
  | "not_now_travel"
  | "not_now_3d_idol"
  | "not_now_kpop"
  | "not_now_niche_merchants";

export type ScenarioCoverageEntry = {
  key: ScenarioKey;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  supportLevel: ScenarioSupportLevel;
  shopperIntent: string;
  recommendedEntryLabel: string;
  providerEcologyHint: string;
  resultExplanationHint: string;
  questionHint: string;
  verificationHint: string;
  scopeDisclosure: string;
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
  providerEcologyHint: string;
  resultExplanationHint: string;
  questionHint: string;
  verificationHint: string;
  scopeDisclosure: string;
  diagnosticsTag?: string;
};

export const SCENARIO_COVERAGE_MAP: Record<ScenarioKey, ScenarioCoverageEntry> = {
  preorder_decision: {
    key: "preorder_decision",
    itemKind: "preorder",
    supportLevel: "strong",
    shopperIntent: "予約を今入れるか、締切前に整理したい判断",
    recommendedEntryLabel: "予約を今入れるか迷っている",
    providerEcologyHint: "予約系は公式・大手EC・特典差の比較が中心です。再販余地や締切の確度も重視します。",
    resultExplanationHint: "予約の待機コスト、締切圧、後から比較できる余地を優先して整理します。",
    questionHint: "このフローでは、締切の確度・再販見込み・待っても困らないかを先に確認します。",
    verificationHint: "締切日時、予約特典、キャンセル条件は外部ページで最終確認すると安全です。",
    scopeDisclosure: "予約判断は強めに対応していますが、遠征やイベント日程まで絡む判断は別扱いです。",
    diagnosticsTag: "coverage_preorder_strong",
  },
  used_market_check: {
    key: "used_market_check",
    itemKind: "used",
    supportLevel: "strong",
    shopperIntent: "中古・再販市場の相場とリスクを見て買うか決めたい",
    recommendedEntryLabel: "中古の相場を見て判断したい",
    providerEcologyHint: "中古系は相場差、状態、返品条件、出品者/店舗信頼性の確認を優先します。",
    resultExplanationHint: "新品の勢いではなく、相場差とリスク差を見て判断しやすい形に寄せます。",
    questionHint: "このフローでは、相場差・状態差・返品可否が判断材料の中心になります。",
    verificationHint: "状態説明、付属品、真贋不安、返品条件は外部で再確認してください。",
    scopeDisclosure: "中古・相場チェックは強めですが、希少市場全体の完全追跡までは対象外です。",
    diagnosticsTag: "coverage_used_strong",
  },
  blind_draw_stopline: {
    key: "blind_draw_stopline",
    itemKind: "blind_draw",
    supportLevel: "strong",
    shopperIntent: "くじやブラインド商品をどこで止めるか決めたい",
    recommendedEntryLabel: "くじ/ブラインド商品をどこで止めるか決めたい",
    providerEcologyHint: "ランダム商材は上限、被り、交換前提、中古移行ラインの整理が重要です。",
    resultExplanationHint: "楽しさを否定せず、被りと予算崩壊を防ぐ stopping-line 設計を優先します。",
    questionHint: "このフローでは、上限回数・被り許容・撤退ラインを先に固めます。",
    verificationHint: "BOX仕様、封入率、交換先の有無は外部で確認すると判断が安定します。",
    scopeDisclosure: "ランダム商品の上限整理は強めですが、イベント運営ルールまで含む判断は対象外です。",
    diagnosticsTag: "coverage_blind_draw_strong",
  },
  media_purchase_decision: {
    key: "media_purchase_decision",
    itemKind: "goods",
    goodsClass: "media",
    supportLevel: "strong",
    shopperIntent: "CD・映像・書籍を今買うか、比較して決めたい",
    recommendedEntryLabel: "CD・映像・書籍を買うべきか迷う",
    providerEcologyHint: "メディア系は再生/閲覧環境、特典差、限定版、再入手性の比較が中心です。",
    resultExplanationHint: "保存・視聴・特典のバランスを見て、どこに価値があるかを説明します。",
    questionHint: "このフローでは、視聴環境・限定版圧・中身目的か特典目的かをはっきりさせます。",
    verificationHint: "仕様違い、店舗別特典、視聴環境、在庫状況は外部で最終確認してください。",
    scopeDisclosure: "メディア購入判断は強めですが、配信サービス横断の完全比較まではしていません。",
    diagnosticsTag: "coverage_media_strong",
  },
  new_book_bonus_decision: {
    key: "new_book_bonus_decision",
    itemKind: "goods",
    goodsClass: "paper",
    supportLevel: "strong",
    shopperIntent: "新刊・新譜・店舗別特典をどこまで追うか整理したい",
    recommendedEntryLabel: "特典つき新刊をどこまで追うか迷う",
    providerEcologyHint: "特典系は店舗差、取りこぼし不安、複数買い圧、書店/専門店の相性を重視します。",
    resultExplanationHint: "特典回収の優先度と予算圧のバランスを取る前提で説明します。",
    questionHint: "このフローでは、特典が本体なのか・複数店舗を追う価値があるかを見ます。",
    verificationHint: "特典絵柄、配布条件、対象店舗、発売日周辺の在庫は外部で確認してください。",
    scopeDisclosure: "新刊+特典判断は強めですが、作品ごとの全店舗網羅や niche 店舗の完全対応はまだしていません。",
    diagnosticsTag: "coverage_new_book_bonus_strong",
  },
  collection_vs_budget: {
    key: "collection_vs_budget",
    itemKind: "goods",
    supportLevel: "partial",
    shopperIntent: "コレクション優先か予算優先か整理したい",
    recommendedEntryLabel: "コレクション優先か予算優先か整理したい",
    providerEcologyHint: "この領域は買い方整理が中心で、具体的な回収経路はケース差が大きめです。",
    resultExplanationHint: "コンプ欲と予算圧の整理を優先し、完全な回収戦略より先に軸を整えます。",
    questionHint: "このフローでは、本命優先か、量を取りに行くか、今月の上限を中心に整理します。",
    verificationHint: "回収候補の全量チェックや長期相場の追跡は外部メモと併用すると安心です。",
    scopeDisclosure: "コレクション整理は部分対応です。全回収計画の最適化まではまだ対象外です。",
    diagnosticsTag: "coverage_collection_partial",
  },
  impulse_cooling: {
    key: "impulse_cooling",
    itemKind: "goods",
    supportLevel: "partial",
    shopperIntent: "勢いで買いそうな時に冷やして後悔を減らしたい",
    recommendedEntryLabel: "勢い買いを少し冷やして考えたい",
    providerEcologyHint: "ここは店舗比較よりも判断停止線の設計が中心で、商材差は二段目で見ます。",
    resultExplanationHint: "勢いを否定せず、いま決めるべきか・少し待つべきかの安全線を説明します。",
    questionHint: "このフローでは、疲れ・焦り・FOMO が判断を押していないかを見ます。",
    verificationHint: "期限や在庫が本当に切迫しているかは外部で確かめると過熱を抑えやすいです。",
    scopeDisclosure: "衝動クールダウンは部分対応です。感情ケア全般や継続的な消費管理までは扱っていません。",
    diagnosticsTag: "coverage_impulse_partial",
  },
  not_now_ticket: {
    key: "not_now_ticket",
    itemKind: "ticket",
    supportLevel: "not_now",
    shopperIntent: "チケット取得や日程判断をしたい",
    recommendedEntryLabel: "チケット取得を判断したい",
    providerEcologyHint: "チケットは座席、同行、規約、移動、代替公演が絡み、現行ロジックの守備範囲外です。",
    resultExplanationHint: "このプロダクトはチケット判断を現在の主戦場にしていません。",
    questionHint: "現状の質問はチケット専用に最適化されていないため、参考度は低めです。",
    verificationHint: "規約、リセール可否、同行条件、日程負荷は必ず別途確認してください。",
    scopeDisclosure: "チケット判断は not now 扱いです。誤って強対応に見せないよう明示しています。",
    diagnosticsTag: "coverage_ticket_not_now",
  },
  not_now_travel: {
    key: "not_now_travel",
    supportLevel: "not_now",
    shopperIntent: "遠征・宿・交通を含めて判断したい",
    recommendedEntryLabel: "遠征・旅行ごと判断したい",
    providerEcologyHint: "遠征は物販判断より不確実性の種類が違うため、別系統の設計が必要です。",
    resultExplanationHint: "遠征判断は今の結果ロジックの対象外として扱います。",
    questionHint: "移動・宿泊・複数イベント調整までは現行フローでは見ません。",
    verificationHint: "交通費、宿泊費、キャンセル条件、体力負荷は専用に整理してください。",
    scopeDisclosure: "遠征/旅行判断は今は対象外です。",
    diagnosticsTag: "coverage_travel_not_now",
  },
  not_now_3d_idol: {
    key: "not_now_3d_idol",
    supportLevel: "not_now",
    shopperIntent: "3D idol 文脈に特化した購買判断をしたい",
    recommendedEntryLabel: "3D idol 文脈で判断したい",
    providerEcologyHint: "現行の provider/flow は 2D・ACG 系 merch 想定が主で、文脈差を十分に吸収できません。",
    resultExplanationHint: "3D idol 特有の商流・イベント性は現在の最適化対象外です。",
    questionHint: "現行フローは 3D idol 向けに明示最適化されていません。",
    verificationHint: "特典商流や販売チャネル差は個別確認が必要です。",
    scopeDisclosure: "3D idol 文脈は not now 扱いです。",
    diagnosticsTag: "coverage_3d_idol_not_now",
  },
  not_now_kpop: {
    key: "not_now_kpop",
    supportLevel: "not_now",
    shopperIntent: "K-pop 文脈で特典・輸入・共同購入を判断したい",
    recommendedEntryLabel: "K-pop 文脈で判断したい",
    providerEcologyHint: "輸入、共同購入、特典商流の差が大きく、現行ロジックでは誤案内リスクがあります。",
    resultExplanationHint: "K-pop 特有の購入動線は今の重点対応外です。",
    questionHint: "共同購入や輸入前提の判断は現行フローに含まれていません。",
    verificationHint: "共同購入条件、輸入費、特典付与条件は必ず外部確認してください。",
    scopeDisclosure: "K-pop 文脈は now focus 外です。",
    diagnosticsTag: "coverage_kpop_not_now",
  },
  not_now_niche_merchants: {
    key: "not_now_niche_merchants",
    supportLevel: "not_now",
    shopperIntent: "対応外の niche 店舗まで含めて最適ルートを知りたい",
    recommendedEntryLabel: "対応外店舗まで含めて判断したい",
    providerEcologyHint: "プロダクト適合が薄い niche merchant は現状の provider 生態系に入れていません。",
    resultExplanationHint: "対応外店舗は、無理に推薦せず対象外として扱う方針です。",
    questionHint: "現行フローは provider fit が見える店舗を優先します。",
    verificationHint: "専門店・個店は在庫・条件・送料を個別確認してください。",
    scopeDisclosure: "merchant fit が薄い領域は intentionally out of scope です。",
    diagnosticsTag: "coverage_niche_not_now",
  },
};

const STRONG_ENTRY_ORDER: ScenarioKey[] = [
  "preorder_decision",
  "used_market_check",
  "new_book_bonus_decision",
  "media_purchase_decision",
  "blind_draw_stopline",
];

const PARTIAL_ENTRY_ORDER: ScenarioKey[] = ["collection_vs_budget", "impulse_cooling"];
const NOT_NOW_ORDER: ScenarioKey[] = ["not_now_ticket", "not_now_travel", "not_now_3d_idol", "not_now_kpop", "not_now_niche_merchants"];

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

function hasImpulseSignals(input: ScenarioResolutionInput): boolean {
  const state = input.answers?.q_regret_impulse;
  return state === "excited" || state === "tired" || state === "fomo";
}

export function resolveScenarioKey(input: ScenarioResolutionInput): ScenarioKey {
  if (input.itemKind === "ticket") return "not_now_ticket";
  if (input.itemKind === "used") return "used_market_check";
  if (input.itemKind === "blind_draw") return "blind_draw_stopline";
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
    providerEcologyHint: entry.providerEcologyHint,
    resultExplanationHint: entry.resultExplanationHint,
    questionHint: entry.questionHint,
    verificationHint: entry.verificationHint,
    scopeDisclosure: entry.scopeDisclosure,
    diagnosticsTag: entry.diagnosticsTag,
  };
}

export function getEntryCoverageGroups() {
  return {
    strong: STRONG_ENTRY_ORDER.map(getScenarioCoverageEntry),
    partial: PARTIAL_ENTRY_ORDER.map(getScenarioCoverageEntry),
    notNow: NOT_NOW_ORDER.map(getScenarioCoverageEntry),
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
  if (entry.key === "collection_vs_budget" || entry.key === "impulse_cooling") {
    return { itemKind: "goods", goodsClass: "small_collection" };
  }
  return { itemKind: entry.itemKind ?? "goods", goodsClass: entry.goodsClass ?? "small_collection" };
}

export function getSupportLevelBadgeLabel(level: ScenarioSupportLevel): string {
  if (level === "strong") return "強めに対応";
  if (level === "partial") return "一部対応";
  return "今は対象外";
}
