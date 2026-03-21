import { parseSearchClues } from "@/src/oshihapi/input/parseSearchClues";
import { planProviderCards } from "@/src/oshihapi/providerPlanner";
import type { ProviderDiagnostics } from "@/src/oshihapi/providerPlanner";
import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type ProviderPlanInput = Parameters<typeof planProviderCards>[0];
type ScenarioSpec = {
  id: string;
  rawClue: string;
  itemKind: ItemKind;
  goodsClass: GoodsClass;
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
    verdict: "THINK",
    itemKind: spec.itemKind,
    goodsClass: spec.goodsClass,
    confidence: spec.confidence,
    resultTags: spec.resultTags ?? [],
    searchClues,
    ...DELIVERY_READY_BASE,
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
  {
    id: "blind_draw_buy_singles_path",
    rawClue: "ブラインド アクキー 単品回収",
    itemKind: "blind_draw",
    goodsClass: "small_collection",
    confidence: 84,
    resultTags: [
      "blind_draw_planner_path_stop_drawing_buy_singles",
      "blind_draw_duplicate_tolerance_low",
      "blind_draw_exchange_willingness_low",
      "blind_draw_exchange_friction_high",
      "blind_draw_singles_fallback_high",
      "blind_draw_stop_line_hard",
      "blind_draw_stop_budget_visible",
      "blind_draw_clamp_single_target_duplicate_risk",
    ],
    expected: [
      "Single-target blind draw fallback should favor Mercari and Surugaya.",
      "Generic retail should not dominate when the stop-line resolves to buy singles.",
      "Diagnostics should explain that secondary-market fallback was preferred.",
    ],
    improvedVsOldLogic: "When the blind-draw stop-line resolves to buying singles, the provider plan now deterministically shifts toward Mercari/Surugaya instead of generic new-retail recovery paths.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids[0] === "mercari", "blind_draw_buy_singles_path: Mercari should lead buy-singles fallback");
      assert(ids.includes("surugaya"), "blind_draw_buy_singles_path: Surugaya should stay visible for buy-singles fallback");
      assert(!result.cards.some((card) => (card.providerId === "amazon" || card.providerId === "rakuten") && card.tier === "recommended"), "blind_draw_buy_singles_path: generic retail must not dominate");
      assert(
        findEvaluation(result.diagnostics, "amazon")?.demotionReasons.includes("blind_draw_secondary_market_preferred"),
        "blind_draw_buy_singles_path: diagnostics should show secondary-market preference",
      );
    },
  },
  {
    id: "blind_draw_used_market_path",
    rawClue: "ブラインド 缶バッジ コンプ 厳しめ",
    itemKind: "blind_draw",
    goodsClass: "small_collection",
    confidence: 79,
    resultTags: [
      "blind_draw_planner_path_stop_drawing_check_used_market",
      "blind_draw_duplicate_tolerance_medium",
      "blind_draw_exchange_willingness_medium",
      "blind_draw_exchange_friction_high",
      "blind_draw_singles_fallback_high",
      "blind_draw_stop_line_visible",
      "blind_draw_stop_budget_hard",
      "blind_draw_clamp_secondary_market_completion_is_safer",
    ],
    expected: [
      "Completion fallback scenarios should still route to Mercari/Surugaya first.",
      "Used-market completion should outrank generic retail in strong duplicate-risk states.",
      "Diagnostics should preserve the stop-line fallback demotion reason.",
    ],
    improvedVsOldLogic: "Completion-heavy blind-draw fallback now keeps secondary-market completion routes in front of generic retail, making the acceptance path easy to verify.",
    assertions: (result) => {
      const ids = topIds(result);
      assert(ids[0] === "mercari" || ids[0] === "surugaya", "blind_draw_used_market_path: used-market fallback should lead");
      assert(ids.includes("mercari") && ids.includes("surugaya"), "blind_draw_used_market_path: Mercari and Surugaya should both be visible");
      assert(!result.cards.some((card) => (card.providerId === "amazon" || card.providerId === "rakuten") && card.tier === "recommended"), "blind_draw_used_market_path: generic retail must stay below fallback specialists");
      assert(
        findEvaluation(result.diagnostics, "rakuten")?.demotionReasons.includes("blind_draw_secondary_market_preferred"),
        "blind_draw_used_market_path: diagnostics should retain fallback demotion reason",
      );
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
