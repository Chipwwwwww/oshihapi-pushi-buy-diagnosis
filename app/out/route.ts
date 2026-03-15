import { NextRequest, NextResponse } from "next/server";
import { buildMercariSearchAffiliateUrl } from "@/src/oshihapi/affiliateConfig";
import {
  findAmazonAffiliateDestinationById,
  resolveAmazonAffiliateDestination,
} from "@/src/oshihapi/amazonAffiliateConfig";
import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

export function GET(request: NextRequest): NextResponse {
  const params = request.nextUrl.searchParams;
  const dest = params.get("dest");
  const keyword = params.get("keyword")?.trim() ?? "";

  if (dest === "mercari-search" && keyword) {
    const targetUrl = buildMercariSearchAffiliateUrl(keyword);
    return NextResponse.redirect(targetUrl);
  }

  if (dest === "amazon-static") {
    const id = params.get("id")?.trim() ?? "";
    const itemKind = (params.get("itemKind")?.trim() ?? undefined) as ItemKind | undefined;
    const goodsClass = (params.get("gc")?.trim() ?? undefined) as GoodsClass | undefined;
    const target =
      (id ? findAmazonAffiliateDestinationById(id) : null) ??
      resolveAmazonAffiliateDestination({ itemKind, goodsClass });
    return NextResponse.redirect(target.href);
  }

  const fallbackUrl = new URL("/", request.url);
  return NextResponse.redirect(fallbackUrl);
}
