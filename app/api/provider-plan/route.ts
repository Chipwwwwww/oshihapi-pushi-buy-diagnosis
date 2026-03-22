import { NextRequest, NextResponse } from "next/server";
import { findAmazonAffiliateDestinationById } from "@/src/oshihapi/amazonAffiliateConfig";
import { planProviderCards } from "@/src/oshihapi/providerPlanner";
import type { ParsedSearchClues } from "@/src/oshihapi/input/types";
import type { GoodsClass, ItemKind, Decision, DisplayVerdictKey, HoldSubtype } from "@/src/oshihapi/model";

type ProviderPlanRequest = {
  runId?: string;
  itemKind?: string;
  goodsClass?: string;
  verdict?: string;
  holdSubtype?: string;
  displayVerdictKey?: string;
  confidence?: number;
  resultTags?: string[];
  mercariRelevant?: boolean;
  mercariKeyword?: string | null;
  surugayaKeyword?: string | null;
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

const ITEM_KIND_VALUES: ItemKind[] = ["goods", "blind_draw", "used", "preorder", "ticket", "game_billing"];
const GOODS_CLASS_VALUES: GoodsClass[] = ["small_collection", "paper", "wearable", "display_large", "tech", "media", "itabag_badge"];
const DECISION_VALUES: Decision[] = ["BUY", "THINK", "SKIP"];
const HOLD_SUBTYPE_VALUES: HoldSubtype[] = ["needs_check", "conflicting", "timing_wait"];
const DISPLAY_VERDICT_VALUES: DisplayVerdictKey[] = ["buy", "stop", "hold_needs_check", "hold_conflicting", "hold_timing_wait"];

function isItemKind(value: string): value is ItemKind {
  return ITEM_KIND_VALUES.includes(value as ItemKind);
}

function isGoodsClass(value: string): value is GoodsClass {
  return GOODS_CLASS_VALUES.includes(value as GoodsClass);
}

function isDecision(value: string): value is Decision {
  return DECISION_VALUES.includes(value as Decision);
}

function isHoldSubtype(value: string): value is HoldSubtype {
  return HOLD_SUBTYPE_VALUES.includes(value as HoldSubtype);
}

function isDisplayVerdictKey(value: string): value is DisplayVerdictKey {
  return DISPLAY_VERDICT_VALUES.includes(value as DisplayVerdictKey);
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
    itemKind: typeof body.itemKind === "string" && isItemKind(body.itemKind) ? body.itemKind : undefined,
    goodsClass: typeof body.goodsClass === "string" && isGoodsClass(body.goodsClass) ? body.goodsClass : undefined,
    verdict: typeof body.verdict === "string" && isDecision(body.verdict) ? body.verdict : undefined,
    holdSubtype: typeof body.holdSubtype === "string" && isHoldSubtype(body.holdSubtype) ? body.holdSubtype : undefined,
    displayVerdictKey:
      typeof body.displayVerdictKey === "string" && isDisplayVerdictKey(body.displayVerdictKey) ? body.displayVerdictKey : undefined,
    confidence: typeof body.confidence === "number" ? body.confidence : undefined,
    resultTags: Array.isArray(body.resultTags) ? body.resultTags.filter((value): value is string => typeof value === "string") : undefined,
    mercariRelevant: body.mercariRelevant === true,
    mercariKeyword: typeof body.mercariKeyword === "string" ? body.mercariKeyword : null,
    surugayaKeyword: typeof body.surugayaKeyword === "string" ? body.surugayaKeyword : null,
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
