import { NextRequest, NextResponse } from "next/server";
import { buildMercariSearchAffiliateUrl } from "@/src/oshihapi/affiliateConfig";
import {
  findAmazonAffiliateDestinationById,
  resolveAmazonAffiliateDestination,
} from "@/src/oshihapi/amazonAffiliateConfig";
import { getProviderConfig, type ProviderId } from "@/src/oshihapi/providerRegistry";
import { resolveSurugayaAffiliateDestination } from "@/src/oshihapi/surugayaConfig";
import { resolveAmiamiAffiliateDestination } from "@/src/oshihapi/amiamiConfig";
import { resolveGamersAffiliateDestination } from "@/src/oshihapi/gamersConfig";
import { resolveHmvAffiliateDestination } from "@/src/oshihapi/hmvConfig";
import type { GoodsClass, ItemKind } from "@/src/oshihapi/model";

function isAllowlistedDomain(providerId: ProviderId, hostname: string): boolean {
  const allowlist = getProviderConfig(providerId).allowlistedDomains;
  return allowlist.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

function fallbackToHome(request: NextRequest): NextResponse {
  const fallbackUrl = new URL("/", request.url);
  return NextResponse.redirect(fallbackUrl);
}

export function GET(request: NextRequest): NextResponse {
  const params = request.nextUrl.searchParams;
  const dest = params.get("dest");
  const keyword = params.get("keyword")?.trim() ?? "";

  if (dest === "mercari-search" && keyword) {
    const targetUrl = new URL(buildMercariSearchAffiliateUrl(keyword));
    if (isAllowlistedDomain("mercari", targetUrl.hostname)) {
      return NextResponse.redirect(targetUrl);
    }
    return fallbackToHome(request);
  }

  if (dest === "surugaya-affiliate") {
    const itemKind = (params.get("itemKind")?.trim() ?? undefined) as ItemKind | undefined;
    const goodsClass = (params.get("gc")?.trim() ?? undefined) as GoodsClass | undefined;
    const target = resolveSurugayaAffiliateDestination({ itemKind, goodsClass });
    if (target) {
      const targetUrl = new URL(target);
      if (isAllowlistedDomain("surugaya", targetUrl.hostname)) {
        return NextResponse.redirect(targetUrl);
      }
    }
    return fallbackToHome(request);
  }


  if (dest === "amiami-affiliate") {
    const itemKind = (params.get("itemKind")?.trim() ?? undefined) as ItemKind | undefined;
    const goodsClass = (params.get("gc")?.trim() ?? undefined) as GoodsClass | undefined;
    const target = resolveAmiamiAffiliateDestination({ itemKind, goodsClass });
    if (target) {
      try {
        const parsed = new URL(target);
        if (isAllowlistedDomain("amiami", parsed.hostname)) {
          return NextResponse.redirect(parsed);
        }
      } catch {
        // noop: fallback to home below
      }
    }
    return fallbackToHome(request);
  }


  if (dest === "gamers-affiliate") {
    const itemKind = (params.get("itemKind")?.trim() ?? undefined) as ItemKind | undefined;
    const goodsClass = (params.get("gc")?.trim() ?? undefined) as GoodsClass | undefined;
    const target = resolveGamersAffiliateDestination({ itemKind, goodsClass });
    if (target) {
      try {
        const parsed = new URL(target);
        if (isAllowlistedDomain("gamers", parsed.hostname)) {
          return NextResponse.redirect(parsed);
        }
      } catch {
        // noop: fallback to home below
      }
    }
    return fallbackToHome(request);
  }

  if (dest === "hmv-affiliate") {
    const itemKind = (params.get("itemKind")?.trim() ?? undefined) as ItemKind | undefined;
    const goodsClass = (params.get("gc")?.trim() ?? undefined) as GoodsClass | undefined;
    const target = resolveHmvAffiliateDestination({ itemKind, goodsClass });
    if (target) {
      try {
        const parsed = new URL(target);
        if (isAllowlistedDomain("hmv", parsed.hostname)) {
          return NextResponse.redirect(parsed);
        }
      } catch {
        // noop: fallback to home below
      }
    }
    return fallbackToHome(request);
  }

  if (dest === "amazon-static") {
    const id = params.get("id")?.trim() ?? "";
    const itemKind = (params.get("itemKind")?.trim() ?? undefined) as ItemKind | undefined;
    const goodsClass = (params.get("gc")?.trim() ?? undefined) as GoodsClass | undefined;
    const target =
      (id ? findAmazonAffiliateDestinationById(id) : null) ??
      resolveAmazonAffiliateDestination({ itemKind, goodsClass });
    if (target) {
      try {
        const parsed = new URL(target.href);
        if (isAllowlistedDomain("amazon", parsed.hostname)) {
          return NextResponse.redirect(parsed);
        }
      } catch {
        // noop: fallback to home below
      }
    }
    return fallbackToHome(request);
  }

  if (dest === "rakuten-item") {
    const href = params.get("href")?.trim() ?? "";
    if (href) {
      try {
        const parsed = new URL(href);
        if (isAllowlistedDomain("rakuten", parsed.hostname)) {
          return NextResponse.redirect(parsed);
        }
      } catch {
        // noop: fallback to home below
      }
    }
    return fallbackToHome(request);
  }

  return fallbackToHome(request);
}
