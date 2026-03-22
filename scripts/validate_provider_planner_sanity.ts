import { parseSearchClues } from "@/src/oshihapi/input/parseSearchClues";
import { planProviderCards } from "@/src/oshihapi/providerPlanner";
import type { ProviderDiagnostics } from "@/src/oshihapi/providerPlanner";
import type { DisplayVerdictKey, GoodsClass, HoldSubtype, ItemKind, Decision } from "@/src/oshihapi/model";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type ProviderPlanInput = Parameters<typeof planProviderCards>[0];
type ScenarioSpec = {
  id: string;
  rawClue: string;
  itemKind: ItemKind;
  goodsClass: GoodsClass;
  verdict?: Decision;
  holdSubtype?: HoldSubtype;
  displayVerdictKey?: DisplayVerdictKey;
  confidence: number;
  resultTags?: string[];
  expected: string[];
  improvedVsOldLogic: string;
  assertions: (result: Awaited<ReturnType<typeof planProviderCards>>) => void;
};

const DELIVERY_READY_BASE: Pick<
  ProviderPlanInput,
  | "mercariRelevant"
  | "mercariKeyword"
  | "amazonDestination"
  | "rakutenAffiliateUrl"
  | "surugayaDestination"
  | "amiamiDestination"
  | "gamersDestination"
  | "hmvDestination"
> = {
  mercariRelevant: true,
  mercariKeyword: "テスト",
  amazonDestination: { id: "fallback", label: "Amazon", href: "https://example.com/amazon" },
  rakutenAffiliateUrl: "https://example.com/rakuten",
  surugayaDestination: "https://example.com/surugaya",
  amiamiDestination: "https://example.com/amiami",
  gamersDestination: "https://example.com/gamers",
  hmvDestination: "https://example.com/hmv",
};

function topIds(result: Awaited<ReturnType<typeof planProviderCards>>): string[] {
  return result.cards.map((card) => card.providerId);
}

function renderedTiers(result: Awaited<ReturnType<typeof planProviderCards>>): string[] {
  return result.cards.map((card) => `${card.providerId}:${card.tier}:${card.rank}`);
}

function findEvaluation(diagnostics: ProviderDiagnostics, providerId: string) {
  return diagnostics.candidateEvaluations.find((entry) => entry.providerId === providerId);
}

async function runScenario(spec: ScenarioSpec) {
  const searchClues = parseSearchClues(spec.rawClue);
  const result = await planProviderCards({
    runId: `planner-sanity-${spec.id}`,
    verdict: spec.verdict ?? "THINK",
    holdSubtype: spec.holdSubtype,
    displayVerdictKey: spec.displayVerdictKey,
    itemKind: spec.itemKind,
    goodsClass: spec.goodsClass,
    confidence: spec.confidence,
    resultTags: spec.resultTags ?? [],
    searchClues,
    ...DELIVERY_READY_BASE,
    surugayaKeyword: spec.rawClue,
  });

  spec.assertions(result);

  return {
    ...spec,
    parsedMode: `${searchClues.mode}/${searchClues.confidence}`,
    rendered: renderedTiers(result),
    truthTop: result.diagnostics.truthRankedProviders.slice(0, 5).map((entry) => `${entry.providerId}:${entry.rank}`),
    filtered: result.diagnostics.deliveryFilteredProviders.map((entry) => `${entry.providerId}:${entry.reason}`),
  };
}

const SCENARIOS: ScenarioSpec[] = [
  {
    id: "small_collection_exact",
    rawClue: "ウマ娘 缶バッジ",
    itemKind: "goods",
    goodsClass: "itabag_badge",
    confidence: 78,
    expected: [
      "AmiAmi should not take a top slot for badge-ish small-collection clues.",
      "Fallback/general retail should stay below specialty or used-market fits.",
      "Used/specialty providers should occupy visible tiers.",
    ],
    improvedVsOldLogic: "Badge-like clues now keep hobby-broad/fallback providers out of the top tier while surfacing used-market and anime-specialty fits.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(result.cards[0]?.providerId === "mercari", "small_collection_exact: Mercari should lead badge-ish exact clues");
      assert(!result.cards.some((card) => card.providerId === "amiami"), "small_collection_exact: AmiAmi should be filtered from visible badge-ish results");
      assert(!ids.includes("amazon") && !ids.includes("rakuten"), "small_collection_exact: fallback retail should stay out of visible badge-ish results");
      assert(ids.includes("surugaya") && ids.includes("gamers"), "small_collection_exact: used/specialty fits should stay visible");
      assert(
        findEvaluation(result.diagnostics, "amiami")?.demotionReasons.includes("goods_class_mismatch"),
        "small_collection_exact: diagnostics should explain AmiAmi demotion",
      );
    },
  },
  {
    id: "fuzzy_badge",
    rawClue: "学マス ちな 缶バ",
    itemKind: "goods",
    goodsClass: "small_collection",
    confidence: 52,
    expected: [
      "Fuzzy badge-ish clues should still favor used-market/specialty paths.",
      "Low-confidence mode should remain conservative.",
      "Generic hobby-first and fallback providers should not rebound into recommended.",
    ],
    improvedVsOldLogic: "Even under fuzzy clues, the planner stays on the badge/small-collection path instead of snapping back to generic retail defaults.",
    assertions: (result) => {
      const recommended = result.cards.filter((card) => card.tier === "recommended");
      assert(recommended.length === 1 && recommended[0]?.providerId === "mercari", "fuzzy_badge: only Mercari should remain recommended");
      assert(!result.cards.some((card) => card.providerId === "amazon" || card.providerId === "rakuten"), "fuzzy_badge: fallback retail should not appear under low confidence");
      assert(!result.cards.some((card) => card.providerId === "amiami"), "fuzzy_badge: AmiAmi should not rebound on fuzzy badge clue");
      assert(
        findEvaluation(result.diagnostics, "amazon")?.demotionReasons.includes("low_confidence_clamp"),
        "fuzzy_badge: diagnostics should show low-confidence clamp for Amazon",
      );
    },
  },
  {
    id: "media_bonus_sensitive",
    rawClue: "うたプリ 特典付きCD",
    itemKind: "preorder",
    goodsClass: "media",
    confidence: 84,
    resultTags: ["bonus_pressure_high"],
    expected: [
      "Media-specialty and official-info-aware truth candidates should outrank generic fallback retail.",
      "Visible delivery should favor HMV while keeping non-book specialty references hidden unless the context fits.",
      "Hobby/preorder misfits should not overtake media-specialty delivery.",
    ],
    improvedVsOldLogic: "Bonus-sensitive media preorder routing now concentrates on HMV/Gamers and only surfaces Melonbooks when the clue actually points to bookstore-style bonus checking.",
    assertions: (result) => {
      assert(result.cards[0]?.providerId === "hmv", "media_bonus_sensitive: HMV should lead visible media delivery");
      assert(
        !result.cards.some((card) => card.providerId === "melonbooks"),
        "media_bonus_sensitive: Melonbooks should stay hidden when the clue is CD/media-only",
      );
      assert(
        findEvaluation(result.diagnostics, "amazon")?.demotionReasons.includes("bonus_specialty_mismatch"),
        "media_bonus_sensitive: diagnostics should demote Amazon for bonus-sensitive mismatch",
      );
    },
  },
  {
    id: "media_edition_clue",
    rawClue: "初回限定 Blu-ray",
    itemKind: "preorder",
    goodsClass: "media",
    confidence: 80,
    expected: [
      "Media route should remain correct for edition clues.",
      "Generic broad retail should not dominate visible delivery.",
      "Diagnostics should not mislabel edition-only clues as explicit bonus-sensitive mismatch.",
    ],
    improvedVsOldLogic: "Edition-driven media searches stay on the media path without inventing bonus-sensitive demotions for fallback retail.",
    assertions: (result) => {
      assert(result.cards[0]?.providerId === "hmv", "media_edition_clue: HMV should still lead edition-clue media routing");
      assert(!result.cards.some((card) => card.providerId === "amazon" && card.tier === "recommended"), "media_edition_clue: Amazon should not dominate edition-clue media results");
      assert(
        !findEvaluation(result.diagnostics, "amazon")?.demotionReasons.includes("bonus_specialty_mismatch"),
        "media_edition_clue: edition-only clue should not trigger bonus-specialty mismatch",
      );
    },
  },
  {
    id: "low_confidence_vague",
    rawClue: "just saw it in store unsure",
    itemKind: "goods",
    goodsClass: "small_collection",
    confidence: 24,
    expected: [
      "Recommended should be clamped to a narrow set.",
      "Fallback providers should not flood the result set.",
      "Visible list should stay conservative and short.",
    ],
    improvedVsOldLogic: "Very weak clues now clamp recommendations instead of spraying broad fallback providers into user-facing results.",
    assertions: (result) => {
      assert(result.cards.filter((card) => card.tier === "recommended").length <= 1, "low_confidence_vague: recommended tier should be clamped");
      assert(result.cards.length <= 4, "low_confidence_vague: visible cards should stay capped");
      assert(!result.cards.some((card) => card.providerId === "amazon" || card.providerId === "rakuten"), "low_confidence_vague: fallback retail should be suppressed from visible cards");
    },
  },
  {
    id: "blind_draw_used_market_fallback",
    rawClue: "ブルーロック ブラインド 缶バッジ",
    itemKind: "blind_draw",
    goodsClass: "itabag_badge",
    confidence: 86,
    resultTags: [
      "random_goods_path_stop_drawing_check_used_market",
      "random_goods_used_market_fallback",
      "random_goods_duplicate_low",
    ],
    expected: [
      "Used-market recovery should dominate visible blind-draw fallback routing.",
      "Generic retail should be demoted when the planner says to stop drawing and check used singles.",
      "Diagnostics should explain why generic retail is mismatched for duplicate-risk recovery.",
    ],
    improvedVsOldLogic: "When the diagnosis says to stop drawing and complete via used singles, the planner now concentrates on Mercari/Surugaya instead of drifting back to generic retail.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids[0] === "mercari" && ids[1] === "surugaya", "blind_draw_used_market_fallback: Mercari and Surugaya should lead used-market recovery");
      assert(!ids.includes("amazon") && !ids.includes("rakuten"), "blind_draw_used_market_fallback: generic retail should stay hidden");
      assert(
        findEvaluation(result.diagnostics, "amazon")?.demotionReasons.includes("duplicate_risk_recovery_mismatch"),
        "blind_draw_used_market_fallback: diagnostics should explain generic-retail mismatch",
      );
    },
  },
  {
    id: "hold_needs_check_used_exit_only",
    rawClue: "イベント限定 アクスタ",
    itemKind: "goods",
    goodsClass: "small_collection",
    verdict: "THINK",
    holdSubtype: "needs_check",
    displayVerdictKey: "hold_needs_check",
    confidence: 66,
    resultTags: ["trust_gate_venue_unknown_heavy"],
    expected: [
      "hold.needs_check should keep used-exit scope narrow.",
      "Only Mercari and Surugaya should remain visible for the used-exit layer.",
      "Surugaya should use deterministic /out search routing.",
    ],
    improvedVsOldLogic: "Checklist-first hold states no longer leak generic purchase-style provider cards into the visible stack.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids.every((id) => id === "mercari" || id === "surugaya"), "hold_needs_check_used_exit_only: only Mercari/Surugaya should remain visible");
      assert(
        result.cards.find((card) => card.providerId === "surugaya")?.outHref.includes("dest=surugaya-search"),
        "hold_needs_check_used_exit_only: Surugaya should use deterministic search out route",
      );
    },
  },
  {
    id: "hold_conflicting_reference_only_scope",
    rawClue: "中古 アクスタ",
    itemKind: "used",
    goodsClass: "small_collection",
    verdict: "THINK",
    holdSubtype: "conflicting",
    displayVerdictKey: "hold_conflicting",
    confidence: 74,
    expected: [
      "hold.conflicting should suppress generic purchase-style provider expansion.",
      "Visible provider scope should stay on Mercari/Surugaya only.",
    ],
    improvedVsOldLogic: "Conflicting hold states now keep the visible provider layer subdued instead of broadening into more shopping prompts.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids.length > 0 && ids.every((id) => id === "mercari" || id === "surugaya"), "hold_conflicting_reference_only_scope: only Mercari/Surugaya should stay visible");
    },
  },
  {
    id: "stop_delayed_recheck_used_scope",
    rawClue: "会場限定 缶バッジ",
    itemKind: "goods",
    goodsClass: "itabag_badge",
    verdict: "SKIP",
    displayVerdictKey: "stop",
    confidence: 82,
    resultTags: ["venue_limited_path_skip_atmosphere_driven_goods_chase"],
    expected: [
      "stop should keep used routing narrow and optional.",
      "Visible provider scope should stay on Mercari/Surugaya only.",
    ],
    improvedVsOldLogic: "Stop states keep a rollback-safe delayed recheck scope without reopening the full provider wall.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids.every((id) => id === "mercari" || id === "surugaya"), "stop_delayed_recheck_used_scope: only Mercari/Surugaya should remain visible");
    },
  },
  {
    id: "blind_draw_buy_singles_fallback",
    rawClue: "ハイキュー ブラインド アクスタ",
    itemKind: "blind_draw",
    goodsClass: "small_collection",
    confidence: 84,
    resultTags: [
      "random_goods_path_stop_drawing_buy_singles",
      "random_goods_used_market_fallback",
      "random_goods_target_full_set",
    ],
    expected: [
      "Singles/used fallback should still concentrate the stack on Mercari and Surugaya.",
      "Generic retail should not dominate strong completion-fallback states.",
      "Diagnostics should keep duplicate-risk recovery mismatches visible for fallback retail.",
    ],
    improvedVsOldLogic: "Completion-fallback blind-draw states now keep the visible provider stack centered on Mercari/Surugaya instead of letting generic retail reclaim the top slots.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids[0] === "mercari" && ids[1] === "surugaya", "blind_draw_buy_singles_fallback: Mercari and Surugaya should lead singles fallback");
      assert(!ids.includes("amazon") && !ids.includes("rakuten"), "blind_draw_buy_singles_fallback: generic retail should stay hidden");
      assert(
        findEvaluation(result.diagnostics, "amazon")?.demotionReasons.includes("duplicate_risk_recovery_mismatch"),
        "blind_draw_buy_singles_fallback: diagnostics should keep generic-retail mismatch explanation",
      );
      assert(
        result.diagnostics.truthRankedProviders
          .filter((entry) => entry.providerId === "mercari" || entry.providerId === "surugaya")
          .every((entry) => entry.rank < 20),
        "blind_draw_buy_singles_fallback: used-market specialists should remain truth-top for completion fallback",
      );
    },
  },
  {
    id: "blind_draw_unknown_heavy_gate",
    rawClue: "ブラインド グッズ",
    itemKind: "blind_draw",
    goodsClass: "small_collection",
    confidence: 44,
    resultTags: ["trust_gate_random_goods_unknown_heavy"],
    expected: [
      "Unknown-heavy blind-draw states should stay conservative.",
      "Singles/used fallback should not dominate before the diagnosis establishes that path.",
      "Visible cards should remain short and low-confidence clamped.",
    ],
    improvedVsOldLogic: "When stop-line inputs are still unknown, the provider layer now stays conservative instead of jumping straight to Mercari-heavy completion advice.",
    assertions: (result) => {
      assert(result.cards.length <= 4, "blind_draw_unknown_heavy_gate: visible cards should remain capped");
      assert(result.cards.filter((card) => card.tier === "recommended").length <= 1, "blind_draw_unknown_heavy_gate: recommended tier should stay conservative");
      assert(
        !result.cards.some((card) => (card.providerId === "mercari" || card.providerId === "surugaya") && card.tier === "recommended"),
        "blind_draw_unknown_heavy_gate: used-market fallback should not dominate before singles path is justified",
      );
    },
  },
  {
    id: "venue_limited_used_fallback",
    rawClue: "イベント限定 アクスタ",
    itemKind: "goods",
    goodsClass: "small_collection",
    confidence: 79,
    resultTags: [
      "venue_limited_path_fallback_to_used_market_if_missed",
      "venue_limited_used_market_safer_path",
      "venue_limited_recovery_medium",
    ],
    expected: [
      "Missed-onsite recovery should elevate Mercari/Surugaya above generic retail.",
      "Generic retail should be demoted when the safer path is later used-market recovery.",
      "Diagnostics should explain the used-market preference clearly.",
    ],
    improvedVsOldLogic: "Venue-limited recovery now routes later-check states toward Mercari/Surugaya instead of letting generic retail dominate a FOMO-heavy context.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids[0] === "mercari" && ids[1] === "surugaya", "venue_limited_used_fallback: Mercari and Surugaya should lead venue-limited recovery");
      assert(!ids.includes("amazon") && !ids.includes("rakuten"), "venue_limited_used_fallback: generic retail should stay hidden");
      assert(
        findEvaluation(result.diagnostics, "amazon")?.demotionReasons.includes("post_event_used_market_preferred"),
        "venue_limited_used_fallback: diagnostics should explain used-market preference",
      );
    },
  },
  {
    id: "media_patch_holes_later",
    rawClue: "うたプリ 特典 CD",
    itemKind: "goods",
    goodsClass: "media",
    confidence: 77,
    resultTags: [
      "media_edition_path_wait_and_patch_holes_later",
      "media_used_market_completion_detected",
      "media_secondary_market_fallback_changed_recommendation",
      "media_used_market_comfort_high",
      "media_recovery_preference_wait_and_patch",
    ],
    expected: [
      "Patch-holes-later media cases should elevate Mercari/Surugaya.",
      "New-media and generic retail should be demoted when the diagnosis prefers later recovery.",
      "Diagnostics should expose that secondary-market completion is preferred.",
    ],
    improvedVsOldLogic: "Media completion cases that explicitly prefer later hole-filling now surface used-market specialists instead of leaving HMV/Amazon in the lead by default.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids[0] === "mercari" && ids[1] === "surugaya", "media_patch_holes_later: Mercari and Surugaya should lead patch-holes-later guidance");
      assert(!ids.includes("amazon"), "media_patch_holes_later: Amazon should stay out of visible results");
      assert(
        findEvaluation(result.diagnostics, "hmv")?.demotionReasons.includes("new_media_not_primary_for_hole_filling"),
        "media_patch_holes_later: diagnostics should demote HMV for hole-filling path",
      );
      assert(
        findEvaluation(result.diagnostics, "amazon")?.demotionReasons.includes("secondary_market_completion_preferred"),
        "media_patch_holes_later: diagnostics should explain generic-retail demotion",
      );
    },
  },
  {
    id: "official_sold_out_secondary_alive",
    rawClue: "うたプリ 特典付きCD",
    itemKind: "used",
    goodsClass: "media",
    confidence: 73,
    resultTags: ["bonus_pressure_high"],
    expected: [
      "Official-info-oriented providers should be demoted when the pattern is sold-out/secondary-market alive.",
      "Used-market-check providers should float above official-info checks.",
      "Diagnostics should explain the secondary-market demotion.",
    ],
    improvedVsOldLogic: "When official stock is plausibly gone, used-market-aware providers now outrank official-info checks instead of ceding the top slot to them.",
    assertions: (result) => {
      assert(result.cards[0]?.providerId === "surugaya", "official_sold_out_secondary_alive: Surugaya should lead used-media recovery scenario");
      assert(findEvaluation(result.diagnostics, "hmv")?.demotionReasons.includes("secondary_market_alive"), "official_sold_out_secondary_alive: HMV should be demoted for secondary-market-alive pattern");
      assert(result.cards.some((card) => card.providerId === "hmv" && card.tier !== "recommended"), "official_sold_out_secondary_alive: HMV can remain visible but not lead");
    },
  },
  {
    id: "used_market_heavy",
    rawClue: "ウマ娘 缶バッジ 中古",
    itemKind: "used",
    goodsClass: "small_collection",
    confidence: 81,
    expected: [
      "Used-market providers should reliably float to the top.",
      "Official/fallback providers should not steal visible slots.",
      "Visible output should be tightly aligned with used-market intent.",
    ],
    improvedVsOldLogic: "Explicit used-market intent now produces a concentrated used-market stack rather than mixing in irrelevant official or fallback options.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids[0] === "mercari" && ids[1] === "surugaya", "used_market_heavy: Mercari and Surugaya should own the top slots");
      assert(ids.length === 2, "used_market_heavy: visible set should narrow to used-market specialists");
      assert(!ids.includes("amazon") && !ids.includes("amiami"), "used_market_heavy: fallback and hobby providers should stay out");
    },
  },
];

async function main() {
  const summaries = [];
  for (const scenario of SCENARIOS) {
    summaries.push(await runScenario(scenario));
  }

  for (const summary of summaries) {
    console.log(`\n[${summary.id}] ${summary.rawClue}`);
    console.log(`parsed=${summary.parsedMode}`);
    console.log(`expected=${summary.expected.join(" | ")}`);
    console.log(`actual=${summary.rendered.join(", ")}`);
    console.log(`truth_top=${summary.truthTop.join(", ")}`);
    console.log(`filtered=${summary.filtered.join(", ") || "(none)"}`);
    console.log(`improved=${summary.improvedVsOldLogic}`);
  }

  console.log("provider planner focused sanity checks pass");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
