import { NextRequest, NextResponse } from "next/server";
import { findAmazonAffiliateDestinationById } from "@/src/oshihapi/amazonAffiliateConfig";
import { planProviderCards } from "@/src/oshihapi/providerPlanner";
import type { ParsedSearchClues } from "@/src/oshihapi/input/types";

type ProviderPlanRequest = {
  runId?: string;
  itemKind?: string;
  goodsClass?: string;
  verdict?: string;
  confidence?: number;
  resultTags?: string[];
  mercariRelevant?: boolean;
  mercariKeyword?: string | null;
  amazonDestination?: { id?: string } | null;
  rakutenAffiliateUrl?: string | null;
  surugayaDestination?: string | null;
  amiamiDestination?: string | null;
  gamersDestination?: string | null;
  hmvDestination?: string | null;
  searchClues?: ParsedSearchClues | null;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json", cards: [], diagnostics: null }, { status: 400 });
  }

  if (!isObjectRecord(payload) || typeof payload.runId !== "string" || !payload.runId.trim()) {
    return NextResponse.json({ ok: false, reason: "invalid_payload", cards: [], diagnostics: null }, { status: 400 });
  }

  const body = payload as ProviderPlanRequest;
  const runId = payload.runId;
  const result = await planProviderCards({
    runId,
    itemKind: typeof body.itemKind === "string" ? (body.itemKind as any) : undefined,
    goodsClass: typeof body.goodsClass === "string" ? (body.goodsClass as any) : undefined,
    verdict: typeof body.verdict === "string" ? (body.verdict as any) : undefined,
    confidence: typeof body.confidence === "number" ? body.confidence : undefined,
    resultTags: Array.isArray(body.resultTags) ? body.resultTags.filter((value): value is string => typeof value === "string") : undefined,
    mercariRelevant: body.mercariRelevant === true,
    mercariKeyword: typeof body.mercariKeyword === "string" ? body.mercariKeyword : null,
    amazonDestination: isObjectRecord(body.amazonDestination) && typeof body.amazonDestination.id === "string"
      ? findAmazonAffiliateDestinationById(body.amazonDestination.id)
      : null,
    rakutenAffiliateUrl: typeof body.rakutenAffiliateUrl === "string" ? body.rakutenAffiliateUrl : null,
    surugayaDestination: typeof body.surugayaDestination === "string" ? body.surugayaDestination : null,
    amiamiDestination: typeof body.amiamiDestination === "string" ? body.amiamiDestination : null,
    gamersDestination: typeof body.gamersDestination === "string" ? body.gamersDestination : null,
    hmvDestination: typeof body.hmvDestination === "string" ? body.hmvDestination : null,
    searchClues: isObjectRecord(body.searchClues) ? (body.searchClues as ParsedSearchClues) : undefined,
  });

  return NextResponse.json({ ok: true, ...result });
}
