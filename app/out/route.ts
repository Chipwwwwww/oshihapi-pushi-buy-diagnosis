import { NextRequest, NextResponse } from "next/server";
import { buildMercariSearchAffiliateUrl } from "@/src/oshihapi/affiliateConfig";

const MAX_KEYWORD_LENGTH = 120;

export function GET(request: NextRequest): NextResponse {
  const params = request.nextUrl.searchParams;
  const dest = params.get("dest");
  const keyword = params.get("keyword")?.trim() ?? "";

  if (dest === "mercari-search") {
    if (!keyword || keyword.length > MAX_KEYWORD_LENGTH) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.redirect(buildMercariSearchAffiliateUrl(keyword));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
