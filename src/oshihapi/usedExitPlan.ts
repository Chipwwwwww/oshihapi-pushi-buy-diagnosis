import { isMercariRelevantScenario } from "@/src/oshihapi/mercariKeyword";
import type {
  Decision,
  GoodsClass,
  HoldSubtype,
  ItemKind,
  UsedExitPlan,
  UsedExitPlanMode,
  UsedExitProviderKey,
  UsedExitProviderRole,
  UsedExitProviderVisibility,
} from "@/src/oshihapi/model";
import { isSurugayaRelevantScenario } from "@/src/oshihapi/surugayaConfig";

type BuildUsedExitPlanInput = {
  decision: Decision;
  holdSubtype?: HoldSubtype;
  itemKind?: ItemKind;
  goodsClass?: GoodsClass;
  resultTags?: string[];
  holdTriggers?: string[];
};

const TIMING_WAIT_TAGS = [
  "random_goods_path_stop_drawing_buy_singles",
  "random_goods_path_stop_drawing_check_used_market",
  "random_goods_used_market_fallback",
  "media_edition_path_wait_and_patch_holes_later",
  "media_edition_path_use_secondary_market_for_missing_items",
  "media_used_market_completion_detected",
  "media_secondary_market_fallback_changed_recommendation",
  "venue_limited_path_fallback_to_used_market_if_missed",
  "venue_limited_path_skip_onsite_chase_and_check_later",
  "venue_limited_used_market_safer_path",
];

const RECHECK_TAGS = [
  "venue_limited_path_wait_for_post_event_mailorder",
  "venue_limited_path_wait_for_post_event_followup",
  "venue_limited_followup_high",
];

function hasAnyTag(tags: string[], candidates: string[]) {
  return candidates.some((candidate) => tags.includes(candidate));
}

function isUsedExitRelevant(itemKind?: ItemKind, goodsClass?: GoodsClass, resultTags: string[] = []) {
  return (
    isMercariRelevantScenario(itemKind, goodsClass) ||
    isSurugayaRelevantScenario(itemKind, goodsClass) ||
    hasAnyTag(resultTags, TIMING_WAIT_TAGS) ||
    itemKind === "used"
  );
}

function getProviders(
  itemKind: ItemKind | undefined,
  goodsClass: GoodsClass | undefined,
  mode: UsedExitPlanMode,
): UsedExitPlan["providers"] {
  const visibility: UsedExitProviderVisibility =
    mode === "timing_wait_route"
      ? "primary"
      : mode === "delayed_recheck"
        ? "collapsed"
        : "secondary";
  const providers: UsedExitPlan["providers"] = [];

  if (isMercariRelevantScenario(itemKind, goodsClass)) {
    const role: UsedExitProviderRole =
      mode === "reference_only" || mode === "secondary_compare"
        ? "price_reference"
        : "used_fallback";
    providers.push({ key: "mercari", role, visibility });
  }

  if (isSurugayaRelevantScenario(itemKind, goodsClass)) {
    const role: UsedExitProviderRole =
      goodsClass === "media" || mode === "timing_wait_route"
        ? "stock_check"
        : mode === "reference_only" || mode === "secondary_compare"
          ? "price_reference"
          : "used_fallback";
    providers.push({ key: "surugaya", role, visibility });
  }

  return providers;
}

function getWhatToCheck(holdTriggers: string[], resultTags: string[]) {
  const checks: string[] = [];
  if (holdTriggers.includes("trust_gate_active") || holdTriggers.includes("high_impact_unknowns")) {
    checks.push("価格・状態・版差のうち、結論を動かす未確認点を1つ先に確定する");
  }
  if (holdTriggers.includes("storage_or_readiness_check") || holdTriggers.includes("readiness_not_locked")) {
    checks.push("置き場所・使い道・回収優先度を先に固定する");
  }
  if (resultTags.includes("bonus_pressure_high") || resultTags.includes("bonus_pressure_mid")) {
    checks.push("特典や限定条件が本当に必要かを先に切り分ける");
  }
  return checks;
}

function getWhyForTimingWait(resultTags: string[]) {
  const why = ["中古導線は主役ではなく、待つ判断を支える補位ルートです。"];
  if (hasAnyTag(resultTags, ["random_goods_path_stop_drawing_buy_singles", "random_goods_path_stop_drawing_check_used_market"])) {
    why.push("追加で引くより、後から単品で埋める方が損失を抑えやすい状態です。");
  }
  if (hasAnyTag(resultTags, ["media_edition_path_wait_and_patch_holes_later", "media_edition_path_use_secondary_market_for_missing_items"])) {
    why.push("初動で抱えず、欠けた分だけ後で埋める方が診断に合っています。");
  }
  if (hasAnyTag(resultTags, ["venue_limited_path_fallback_to_used_market_if_missed", "venue_limited_path_skip_onsite_chase_and_check_later"])) {
    why.push("会場・現地の焦りより、あとから回収可能性を確認する方が安全です。");
  }
  return why;
}

function getWhenToRecheck(resultTags: string[]) {
  if (hasAnyTag(resultTags, ["random_goods_path_stop_drawing_buy_singles", "random_goods_path_stop_drawing_check_used_market"])) {
    return "引き足し前ではなく、いったん冷やしてから単品相場と送料込み総額を見直す";
  }
  if (hasAnyTag(resultTags, ["media_edition_path_wait_and_patch_holes_later", "media_edition_path_use_secondary_market_for_missing_items"])) {
    return "初動価格が落ち着いた頃に、欠けた版・特典だけを再確認する";
  }
  if (hasAnyTag(resultTags, ["venue_limited_path_fallback_to_used_market_if_missed", "venue_limited_path_skip_onsite_chase_and_check_later"])) {
    return "イベント後の通販・出品・中古在庫が出そろう頃に再確認する";
  }
  if (hasAnyTag(resultTags, RECHECK_TAGS)) {
    return "公式の後日販売や在庫の動きが見えたタイミングで再確認する";
  }
  return "焦って動かず、必要性が残っている時だけ後日あらためて確認する";
}

export function buildUsedExitPlan(input: BuildUsedExitPlanInput): UsedExitPlan | undefined {
  const resultTags = input.resultTags ?? [];
  const holdTriggers = input.holdTriggers ?? [];
  const relevant = isUsedExitRelevant(input.itemKind, input.goodsClass, resultTags);
  if (!relevant) return undefined;

  if (input.decision === "BUY") {
    return {
      mode: "secondary_compare",
      why: [
        "買う判断が主で、中古導線は比較用の参照です。",
        "外部リンクは比較のための参照です。結論を押し付けません。",
      ],
      providers: getProviders(input.itemKind, input.goodsClass, "secondary_compare"),
      suppressPurchaseTone: false,
    };
  }

  if (input.decision === "SKIP") {
    return {
      mode: "delayed_recheck",
      why: [
        "今回は止める判断を優先します。",
        "必要性が戻った時だけ、後で中古在庫や相場を静かに見直せます。",
      ],
      providers: getProviders(input.itemKind, input.goodsClass, "delayed_recheck"),
      whenToRecheck: getWhenToRecheck(resultTags),
      suppressPurchaseTone: true,
    };
  }

  if (input.holdSubtype === "needs_check") {
    const whatToCheck = getWhatToCheck(holdTriggers, resultTags);
    return {
      mode: "check_first",
      why: [
        "先に1つだけ重要条件を確定した方が、相場チェックの精度が上がります。",
        "中古リンクは確認後の補助で、今すぐ探しに行くための主導線ではありません。",
      ],
      whatToCheck,
      afterChecklist: [
        "確認後に必要ならメルカリで相場感を見る",
        "必要なら駿河屋で中古在庫や版の残り方を確認する",
      ],
      providers: getProviders(input.itemKind, input.goodsClass, "check_first"),
      suppressPurchaseTone: true,
    };
  }

  if (input.holdSubtype === "conflicting") {
    return {
      mode: "reference_only",
      why: [
        "買う理由と止める理由がぶつかっているため、今は相場を見て落ち着く用途に限定します。",
        "外部リンクは比較のための参照です。結論を押し付けません。",
      ],
      providers: getProviders(input.itemKind, input.goodsClass, "reference_only"),
      whenToRecheck: "気持ちが落ち着いた後に、送料込み総額や状態差だけを確認する",
      suppressPurchaseTone: true,
    };
  }

  if (input.holdSubtype === "timing_wait") {
    return {
      mode: "timing_wait_route",
      why: getWhyForTimingWait(resultTags),
      whatToCheck: [
        "送料込み総額",
        "状態差・版差・特典の有無",
        "今すぐ埋める必要がある欠けかどうか",
      ],
      providers: getProviders(input.itemKind, input.goodsClass, "timing_wait_route"),
      whenToRecheck: getWhenToRecheck(resultTags),
      suppressPurchaseTone: false,
    };
  }

  return undefined;
}

export function getUsedExitModeLabel(mode: UsedExitPlanMode) {
  switch (mode) {
    case "secondary_compare":
      return "比較参照";
    case "check_first":
      return "確認優先";
    case "timing_wait_route":
      return "後日回収ルート";
    case "delayed_recheck":
      return "後で再確認";
    case "reference_only":
      return "参考のみ";
  }
}

export function getUsedExitProviderLabel(provider: UsedExitProviderKey) {
  return provider === "mercari" ? "メルカリ" : "駿河屋";
}
