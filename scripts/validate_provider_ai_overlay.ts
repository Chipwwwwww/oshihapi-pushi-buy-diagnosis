import { planProviderCards } from "@/src/oshihapi/providerPlanner";

type ProviderPlanInput = Parameters<typeof planProviderCards>[0];

const BASE_INPUT: ProviderPlanInput = {
  runId: "ai-overlay-test",
  itemKind: "goods",
  goodsClass: "small_collection",
  verdict: "THINK",
  confidence: 55,
  resultTags: ["bonus_pressure_high"],
  mercariRelevant: true,
  mercariKeyword: "テスト",
  amazonDestination: { id: "fallback", label: "Amazon", href: "https://example.com/amazon" },
  rakutenAffiliateUrl: "https://example.com/rakuten",
  surugayaDestination: "https://example.com/surugaya",
  amiamiDestination: "https://example.com/amiami",
  gamersDestination: "https://example.com/gamers",
  hmvDestination: "https://example.com/hmv",
};

type EnvPatch = Partial<Record<"AI_RERANK_ENABLED" | "GOOGLE_GENERATIVE_AI_API_KEY" | "AI_RERANK_MODEL" | "AI_RERANK_TIMEOUT_MS", string | undefined>>;

type MinimalCard = { providerId: string; tier: string | undefined; rank: number };

function snapshotCards(cards: Awaited<ReturnType<typeof planProviderCards>>["cards"]): MinimalCard[] {
  return cards.map((card) => ({ providerId: card.providerId, tier: card.tier, rank: card.rank }));
}

async function withEnv<T>(patch: EnvPatch, run: () => Promise<T>): Promise<T> {
  const previous = {
    AI_RERANK_ENABLED: process.env.AI_RERANK_ENABLED,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    AI_RERANK_MODEL: process.env.AI_RERANK_MODEL,
    AI_RERANK_TIMEOUT_MS: process.env.AI_RERANK_TIMEOUT_MS,
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withMockFetch<T>(
  factory: () => Promise<Response>,
  run: () => Promise<T>,
): Promise<T> {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => factory()) as unknown as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = previousFetch;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const baseline = await withEnv({ AI_RERANK_ENABLED: "false", GOOGLE_GENERATIVE_AI_API_KEY: undefined }, async () =>
    planProviderCards({ ...BASE_INPUT }),
  );
  const baselineCards = snapshotCards(baseline.cards);
  assert(baseline.diagnostics.aiRerankEnabled === false, "disabled baseline should report AI disabled");
  assert(JSON.stringify(baselineCards) === JSON.stringify(snapshotCards(baseline.cards)), "disabled baseline should stay deterministic");

  const missingKey = await withEnv({ AI_RERANK_ENABLED: "true", GOOGLE_GENERATIVE_AI_API_KEY: undefined }, async () =>
    planProviderCards({ ...BASE_INPUT }),
  );
  assert(JSON.stringify(snapshotCards(missingKey.cards)) === JSON.stringify(baselineCards), "missing key should preserve deterministic cards");
  assert(missingKey.diagnostics.aiRerankFallbackReason === "missing_api_key", "missing key should report fallback reason");

  const malformed = await withEnv({ AI_RERANK_ENABLED: "true", GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }, async () =>
    withMockFetch(
      async () => new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "```json\n{\"adjustments\":\"bad\"}\n```" }] } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
      async () => planProviderCards({ ...BASE_INPUT }),
    ),
  );
  assert(JSON.stringify(snapshotCards(malformed.cards)) === JSON.stringify(baselineCards), "malformed AI output should fail closed");
  assert(malformed.diagnostics.aiRerankFallbackReason === "invalid_shape", "malformed AI output should report invalid shape");

  const bounded = await withEnv({ AI_RERANK_ENABLED: "true", GOOGLE_GENERATIVE_AI_API_KEY: "test-key" }, async () =>
    withMockFetch(
      async () => new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      adjustments: [
                        { provider: "towerRecords", action: "promote_one_level", reason: "hidden should stay hidden" },
                        { provider: "a8Generic", action: "promote_one_level", reason: "pending should stay hidden" },
                        { provider: "rakuten", action: "promote_one_level", reason: "borderline useful" },
                        { provider: "amiami", action: "promote_one_level", reason: "already top tier" },
                      ],
                      capRecommendedTo: 2,
                      confidenceNote: "keep concise",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
      async () => planProviderCards({ ...BASE_INPUT }),
    ),
  );

  const boundedCards = snapshotCards(bounded.cards);
  const recommendedProviders = boundedCards.filter((card) => card.tier === "recommended").map((card) => card.providerId);
  assert(!boundedCards.some((card) => card.providerId === "towerRecords"), "hidden provider must not be resurrected");
  assert(!boundedCards.some((card) => card.providerId === "a8Generic"), "suppressed provider must not be resurrected");
  assert(recommendedProviders.length === 2, "capRecommendedTo should safely reduce crowded recommendations");
  assert(recommendedProviders.join(",") === "amiami,gamers", "capRecommendedTo should keep the best deterministic recommendations");
  assert(boundedCards.find((card) => card.providerId === "rakuten")?.tier === "okay", "AI promotion must move at most one tier");
  assert(boundedCards.find((card) => card.providerId === "amiami")?.tier === "recommended", "top-tier provider cannot be promoted beyond one level");
  assert(bounded.diagnostics.aiRerankApplied === true, "legal bounded adjustments should be marked as applied");
  assert(bounded.diagnostics.aiRerankAdjustments.length === 1, "diagnostics should only keep legal visible adjustments");

  console.log("provider ai overlay checks pass");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
