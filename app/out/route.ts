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
    if (target) {
      return NextResponse.redirect(target.href);
    }
    const fallbackUrl = new URL("/", request.url);
    return NextResponse.redirect(fallbackUrl);
  }

  if (dest === "rakuten-item") {
    const href = params.get("href")?.trim() ?? "";
    if (href) {
      try {
        const parsed = new URL(href);
        if (parsed.hostname.endsWith("rakuten.co.jp") || parsed.hostname.endsWith("rakuten.ne.jp")) {
          return NextResponse.redirect(parsed);
        }
      } catch {
        // noop: fallback to home below
      }
    }
    const fallbackUrl = new URL("/", request.url);
    return NextResponse.redirect(fallbackUrl);
  }

  const fallbackUrl = new URL("/", request.url);
  return NextResponse.redirect(fallbackUrl);
}
