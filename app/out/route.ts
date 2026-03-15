import { NextRequest, NextResponse } from "next/server";
import { buildMercariSearchAffiliateUrl } from "@/src/oshihapi/affiliateConfig";

export function GET(request: NextRequest): NextResponse {
  const params = request.nextUrl.searchParams;
  const dest = params.get("dest");
  const keyword = params.get("keyword")?.trim() ?? "";

  if (dest === "mercari-search" && keyword) {
    const targetUrl = buildMercariSearchAffiliateUrl(keyword);
    return NextResponse.redirect(targetUrl);
  }

  const fallbackUrl = new URL("/", request.url);
  return NextResponse.redirect(fallbackUrl);
}
